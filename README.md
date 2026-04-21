# Library System MVP

A web-based library management system that supports book cataloging, reservations, loan management, and loan transfers between users.

## Key Features

- **Librarian Features:** Add, remove, and modify books in the catalog.
- **User Features:**
  - Reserve books for 1 hour (exclusive lock during this period).
  - Borrow books for 2 days (even if previously reserved by the same user).
  - Return books at any time.
  - Share/Transfer a book loan to another user, maintaining the original remaining time (requires confirmation).
  - View a list of current active loans.

## Tech Stack

- **Backend**: Django 5.2+ (Python) with Django REST Framework
- **Frontend**: React + Vite + Tailwind CSS v4
- **State Management**: 
  - **Server State**: `@tanstack/react-query` (with Axios)
  - **Client State**: `zustand` (for Auth persistence)
- **Authentication**: JWT (JSON Web Tokens) via `djangorestframework-simplejwt`
- **Database**: PostgreSQL (Production) / SQLite (Development)
- **Deployment**: Render (Web Services + PostgreSQL)

## Prerequisites

- **Node.js 20+**
- **Python 3.12+**
- **PostgreSQL 15+** (optional for local dev if using SQLite)
- **VS Code** (recommended with *Tailwind CSS IntelliSense* extension)

## Business Logic & Constraints

The system strictly enforces the following rules at both the application and database level:

1. **Catalog vs Copies:** The system follows a **1-to-N** model. There is a general `Book` catalog, and multiple physical `BookCopy` entities associated with it. Reservations and loans are made on specific copies.
2. **Reservation Lifecycle:** A reservation lasts exactly 1 hour. During this time, the specific copy cannot be reserved or borrowed by anyone else.
3. **Loan Lifecycle:** A loan lasts exactly 2 days. 
4. **Transfer Mechanism:** Transfers require **Confirmation**. 
   - User A initiates a transfer to User B via email.
   - The loan enters `pending_transfer` state and the book copy also becomes `pending_transfer` (locked).
   - User A can **cancel** the transfer if it hasn't been accepted yet.
   - User B sees an incoming request in their activity panel.
   - If User B **accepts**: 
     - The original loan is marked as `transferred`.
     - A **new** loan is created for User B with the **exact same original due_date**.
     - The copy status returns to `borrowed`.
   - If User B **rejects**:
     - The loan and copy statuses are restores to `active` and `borrowed` respectively.
5. **Strict Limits:** 
   - A user can have a maximum of **3 active loans** at any time.
   - A user can have a maximum of **5 active reservations** at any time.
   - A user **cannot** have more than one copy of the same book title (whether reserved or borrowed) simultaneously.
6. **Data Deletion Policy:** The system uses a **soft delete** approach for books (via an `is_active` flag). 
   - **Deletion Constraint:** A librarian **cannot** delete a book if any of its copies are currently reserved, borrowed, or pending transfer. The "Delete" button is disabled with an informative tooltip in such cases.
    - When a librarian deletes a book (only allowed if all copies are available), it is hidden from the active catalog.
    - All associated `BookCopy` records are updated to `deleted_by_librarian` status.
7. **Activity History:** Historical records of past reservations and loans are preserved and visible to users in their "Historial" tab for audit purposes. All lists (Catalog and Activity) include automatic scrolling for sets larger than 10 items.

## Project Structure

The project is organized as a monorepo with separate folders for backend and frontend:

```text
library-system/
├── backend/                    # Django REST Framework Backend
│   ├── librarySystemBackend/   # Main settings and models
│   ├── manage.py               # Django CLI
│   └── requirements.txt        # Python dependencies
├── frontend/                   # React + Vite + TypeScript Frontend
│   ├── src/                    # React source code
│   ├── package.json            # JS dependencies
│   └── vite.config.ts          # Vite configuration
└── database-schema.md          # Detailed ER diagram
```

## Architecture

### Database Schema (ER Model)

The conceptual data model uses the following structure to guarantee integrity and enforce business constraints:

```text
users
├── id (UUID/PK)
├── email (string, unique)
├── role (enum: librarian, library_user)
├── created_at (datetime)
└── updated_at (datetime)

books (Catalog)
├── id (UUID/PK)
├── title (string, UK with author)
├── author (string, UK with title)
├── isbn (string)
├── publication_year (int)
├── genre (enum: fiction, mystery, etc.)
├── publisher (string)
├── description (text)
├── is_active (boolean, default: true)
├── created_at (datetime)
└── updated_at (datetime)

book_copies (Physical Items)
├── id (UUID/PK)
├── book_id (FK → books)
├── status (enum: available, reserved, borrowed, pending_transfer, deleted_by_librarian)
└── condition (string)

reservations
├── id (UUID/PK)
├── user_id (FK → users)
├── book_copy_id (FK → book_copies)
├── created_at (datetime)
├── expires_at (datetime)  # Usually created_at + 1 hour
└── status (enum: active, fulfilled, expired, cancelled)

loans
├── id (UUID/PK)
├── user_id (FK → users)
├── book_copy_id (FK → book_copies)
├── created_at (datetime)
├── due_date (datetime)    # Usually created_at + 2 days
├── returned_at (datetime, nullable)
└── status (enum: active, overdue, returned, transferred, pending_transfer)

transfer_requests
├── id (UUID/PK)
├── loan_id (FK → loans)
├── from_user_id (FK → users)
├── to_user_id (FK → users)
├── created_at (datetime)
└── status (enum: pending, accepted, rejected, cancelled)
```

### Visual ER Diagram

[View the full Visual ER Diagram here (Mermaid)](./database-schema.md)

### Constraint Implementation Notes

To enforce concurrent limits and rules safely (avoiding race conditions), the application uses:
- **Database Transactions:** When creating a reservation or loan, the row for `book_copies` is locked (`SELECT FOR UPDATE`) to prevent double-booking.
- **Constraints/Triggers:** 
  - Partial Unique Indexes or application-level advisory locks to ensure a user doesn't exceed the 3 loans/5 reservations limit.
  - Partial Unique Indexes combining `user_id` and `book_id` (joined through `book_copy_id`) where status is active, to prevent a user from borrowing/reserving two copies of the same title.
    - **Note on Implementation:** Relational databases cannot use `JOIN`s inside a `UNIQUE` constraint or partial index. Therefore, the data is **denormalized** by storing `book_id` directly in the `reservations` and `loans` tables. This guarantees this rule natively and prevents race conditions at the database level.
- **Automated Expiration (Check-on-access + Cron):** 
  - Stale reservations (1h+) are automatically marked as `expired` and their copies freed. 
  - Overdue loans (2d+) are marked as `overdue` for visual feedback.
  - **Implementation:** The system uses a **Check-on-access** pattern (updates DB on every request) + a **Management Command** (`expire_reservations`) integrated with Render Cron Jobs (no extra Redis/Celery required).

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/dsalazarl/library-system.git
cd library-system
```

### 2. Backend Setup

Create and activate a virtual environment, then install dependencies:

```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data  # Optional: Seed initial data
python manage.py runserver
```

The API is available at `http://localhost:8000`.

### 3. Frontend Setup

Install dependencies and start the development server:

```bash
cd frontend
npm install
npm run dev
```

The application is available at `http://localhost:5173`.

## Available Scripts

| Command | Description |
| ------- | ----------- |
| `python manage.py runserver` | Starts the Django development server. |
| `python manage.py migrate` | Applies database migrations. |
| `python manage.py seed_data` | Populates the database with test users and books. |
| `python manage.py expire_reservations` | Manually triggers the expiration of reservations and marking of overdue loans. |
| `npm run dev` | Starts the Vite development server for React. |
| `npm run build` | Builds the frontend for production. |

## Troubleshooting

- **CORS Issues:** Ensure `FRONTEND_URL` in backend `settings.py` matches your frontend port (default: `http://localhost:5173`).
- **Tailwind v4 in Editor:** If you see `@theme` or `@apply` errors in your editor, ensure the **Tailwind CSS IntelliSense** extension is installed and the `.css` file is associated with the `tailwindcss` language mode (configured in `.vscode/settings.json`).

## Deployment (Render)

This project is configured for deployment on [Render](https://render.com) using a Blueprint (`render.yaml`).

### Steps to Deploy

1. **Push to GitHub**: Ensure all changes (including `render.yaml`) are pushed to your repository.
2. **Open Render Dashboard**: Go to the [Blueprints](https://dashboard.render.com/blueprints) section.
3. **Connect Repository**: Click "New Blueprint Instance" and select your repository.
4. **Configure Secrets**: Render will automatically detect the services. You may need to fill in any environment variables marked as secret.
5. **Apply**: Click "Apply" to start the deployment of the Database, Backend, and Frontend.

> [!TIP]
> After deployment, you can create a Django Superuser by going to the **Shell** tab of your `library-backend` service in Render and running: `python manage.py createsuperuser`.

### Blueprint Components (All Free Tier)

- **Database**: PostgreSQL.
- **Backend**: Django Web Service.
  - Automatically runs migrations, collects static files, and seeds data via `build.sh`.
  - Served via `gunicorn`.
- **Frontend**: React Web Service (Static Content).
  - Built using `npm run build`.
  - Automatically connects to the backend URL via `VITE_API_URL`.
- **Cron Job**: Automated Expiration.
  - Runs `expire_reservations` every 5 minutes to maintain data integrity.

### Environment Variables

| Service | Variable | Description |
| ------- | -------- | ----------- |
| **Backend** | `SECRET_KEY` | Django secret key (generated automatically by Render). |
| **Backend** | `DEBUG` | Set to `False` in production. |
| **Backend** | `ALLOWED_HOSTS` | Domain of your backend service. |
| **Frontend** | `VITE_API_URL` | URL of the backend service (provided by Render). |

