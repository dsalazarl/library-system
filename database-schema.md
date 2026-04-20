# Database Schema

This document contains the Entity Relationship Diagram (ERD) for the Library System MVP.

## Conceptual ER Diagram

The following diagram details the relationships between the core entities, including business logic constraints as relationship labels.

```mermaid
---
title: Library System - Conceptual ER Diagram
---
erDiagram
    %% Entities
    users {
        UUID id PK
        string email UK "Unique user identifier"
        string role "enum: librarian, library_user"
        datetime created_at
        datetime updated_at
    }

    books {
        UUID id PK
        string title
        string author
        string isbn "Optional but recommended"
        datetime created_at
        datetime updated_at
    }

    book_copies {
        UUID id PK
        UUID book_id FK
        string status "enum: available, reserved, borrowed, pending_transfer"
        string condition "Physical condition notes"
    }

    reservations {
        UUID id PK
        UUID user_id FK
        UUID book_copy_id FK
        datetime created_at
        datetime expires_at "Exactly 1 hour after creation"
        string status "enum: active, fulfilled, expired, cancelled"
    }

    loans {
        UUID id PK
        UUID user_id FK
        UUID book_copy_id FK
        datetime created_at
        datetime due_date "Exactly 2 days after creation"
        datetime returned_at "Nullable"
        string status "enum: active, overdue, returned, transferred"
    }

    transfer_requests {
        UUID id PK
        UUID loan_id FK
        UUID from_user_id FK
        UUID to_user_id FK
        datetime created_at
        string status "enum: pending, accepted, rejected, cancelled"
    }

    %% Relationships
    users ||--o{ reservations : "makes (max 5 active)"
    users ||--o{ loans : "has (max 3 active)"
    users ||--o{ transfer_requests : "initiates"
    users ||--o{ transfer_requests : "receives"
    
    books ||--o{ book_copies : "has physical copies of"
    
    book_copies ||--o{ reservations : "is reserved via (1 active max)"
    book_copies ||--o{ loans : "is borrowed via (1 active max)"
    
    loans ||--o{ transfer_requests : "is subject to"
```

## Data Types & Annotations

- **PK**: Primary Key
- **FK**: Foreign Key
- **UK**: Unique Key
- The labels on the relationships (e.g., `max 5 active`) reflect the application's constraint rules mapped in the database layer.
