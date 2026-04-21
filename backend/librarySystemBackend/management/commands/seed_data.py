from django.core.management.base import BaseCommand
from librarySystemBackend.models import User, Book, BookCopy


class Command(BaseCommand):
    help = "Populates the database with initial sample data"

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding data...")

        # 1. Create Librarian (if not exists)
        # Check by username first as it's common for superusers
        librarian = User.objects.filter(username="admin").first()
        if not librarian:
            librarian, created = User.objects.get_or_create(
                email="admin@library.com",
                defaults={
                    "username": "admin",
                    "role": User.RoleChoices.LIBRARIAN,
                    "is_staff": True,
                    "is_superuser": True,
                },
            )
            if created:
                librarian.set_password("admin123")
                librarian.save()
                self.stdout.write(
                    self.style.SUCCESS("Created librarian: admin@library.com")
                )
        else:
            self.stdout.write('Librarian "admin" already exists, skipping creation.')
            # Ensure it has the correct role
            if librarian.role != User.RoleChoices.LIBRARIAN:
                librarian.role = User.RoleChoices.LIBRARIAN
                librarian.save()

        # 2. Create Sample Users
        users_data = [
            {"email": "juan@example.com", "username": "juan"},
            {"email": "maria@example.com", "username": "maria"},
            {"email": "pedro@example.com", "username": "pedro"},
        ]

        for u_data in users_data:
            user, created = User.objects.get_or_create(
                email=u_data["email"],
                defaults={
                    "username": u_data["username"],
                    "role": User.RoleChoices.LIBRARY_USER,
                },
            )
            if created:
                user.set_password("user123")
                user.save()
                self.stdout.write(f"Created user: {user.email}")

        # 3. Create Books and Copies
        books_data = [
            {
                "title": "Cien años de soledad",
                "author": "Gabriel García Márquez",
                "isbn": "978-0307474728",
                "publication_year": 1967,
                "genre": "fiction",
                "publisher": "Editorial Sudamericana",
                "description": "La historia de la familia Buendía en el pueblo ficticio de Macondo.",
                "copies": 3,
            },
            {
                "title": "1984",
                "author": "George Orwell",
                "isbn": "978-0451524935",
                "publication_year": 1949,
                "genre": "fiction",
                "publisher": "Secker & Warburg",
                "description": "Una distopía sobre el totalitarismo y la vigilancia masiva.",
                "copies": 2,
            },
            {
                "title": "El principito",
                "author": "Antoine de Saint-Exupéry",
                "isbn": "978-0156012195",
                "publication_year": 1943,
                "genre": "classics",
                "publisher": "Reynal & Hitchcock",
                "description": "Un piloto perdido en el Sahara encuentra a un pequeño príncipe.",
                "copies": 4,
            },
            {
                "title": "Don Quijote de la Mancha",
                "author": "Miguel de Cervantes",
                "isbn": "978-8420412146",
                "publication_year": 1605,
                "genre": "classics",
                "publisher": "Juan de la Cuesta",
                "description": "Las aventuras de un hidalgo que enloquece leyendo libros de caballerías.",
                "copies": 2,
            },
            {
                "title": "Rayuela",
                "author": "Julio Cortázar",
                "isbn": "978-0307474735",
                "publication_year": 1963,
                "genre": "fiction",
                "publisher": "Editorial Sudamericana",
                "description": "Una novela interactiva que puede leerse en diferentes órdenes.",
                "copies": 2,
            },
            {
                "title": "Ficciones",
                "author": "Jorge Luis Borges",
                "isbn": "978-8420633138",
                "publication_year": 1944,
                "genre": "fiction",
                "publisher": "Editorial Sur",
                "description": "Colección de relatos cortos que exploran laberintos y espejos.",
                "copies": 3,
            },
            {
                "title": "El Hobbit",
                "author": "J.R.R. Tolkien",
                "isbn": "978-0547928227",
                "publication_year": 1937,
                "genre": "fantasy",
                "publisher": "George Allen & Unwin",
                "description": "Bilbo Bolsón se embarca en una aventura para recuperar un tesoro.",
                "copies": 3,
            },
            {
                "title": "Crónica de una muerte anunciada",
                "author": "Gabriel García Márquez",
                "isbn": "978-1400034956",
                "publication_year": 1981,
                "genre": "mystery",
                "publisher": "La Oveja Negra",
                "description": "Un asesinato en un pequeño pueblo contado de forma no lineal.",
                "copies": 2,
            },
            {
                "title": "Breve historia del tiempo",
                "author": "Stephen Hawking",
                "isbn": "978-0553380163",
                "publication_year": 1988,
                "genre": "non_fiction",
                "publisher": "Bantam Books",
                "description": "Exploración del origen y destino del universo.",
                "copies": 2,
            },
            {
                "title": "Fundación",
                "author": "Isaac Asimov",
                "isbn": "978-0553293357",
                "publication_year": 1951,
                "genre": "sci_fi",
                "publisher": "Gnome Press",
                "description": "Hari Seldon predice la caída del imperio galáctico.",
                "copies": 3,
            },
            {
                "title": "Crimen y castigo",
                "author": "Fiódor Dostoyevski",
                "isbn": "978-0140449136",
                "publication_year": 1866,
                "genre": "classics",
                "publisher": "El mensajero ruso",
                "description": "Raskólnikov comete un asesinato y lucha con su culpa.",
                "copies": 2,
            },
            {
                "title": "Sapiens",
                "author": "Yuval Noah Harari",
                "isbn": "978-0062316097",
                "publication_year": 2011,
                "genre": "history",
                "publisher": "Harper",
                "description": "Una breve historia de la humanidad.",
                "copies": 4,
            },
            {
                "title": "El código Da Vinci",
                "author": "Dan Brown",
                "isbn": "978-0385504201",
                "publication_year": 2003,
                "genre": "mystery",
                "publisher": "Doubleday",
                "description": "Robert Langdon investiga un asesinato en el Louvre.",
                "copies": 5,
            },
            {
                "title": "Orgullo y prejuicio",
                "author": "Jane Austen",
                "isbn": "978-0141439518",
                "publication_year": 1813,
                "genre": "romance",
                "publisher": "T. Egerton",
                "description": "La relación entre Elizabeth Bennet y el Sr. Darcy.",
                "copies": 3,
            },
            {
                "title": "Dune",
                "author": "Frank Herbert",
                "isbn": "978-0441172719",
                "publication_year": 1965,
                "genre": "sci_fi",
                "publisher": "Chilton Books",
                "description": "Paul Atreides lucha por el control del planeta Arrakis.",
                "copies": 3,
            },
            {
                "title": "Drácula",
                "author": "Bram Stoker",
                "isbn": "978-0141439846",
                "publication_year": 1897,
                "genre": "horror",
                "publisher": "Archibald Constable",
                "description": "El conde Drácula viaja de Transilvania a Inglaterra.",
                "copies": 2,
            },
            {
                "title": "Steve Jobs",
                "author": "Walter Isaacson",
                "isbn": "978-1451648539",
                "publication_year": 2011,
                "genre": "biography",
                "publisher": "Simon & Schuster",
                "description": "Biografía autorizada del cofundador de Apple.",
                "copies": 2,
            },
            {
                "title": "Harry Potter y la piedra filosofal",
                "author": "J.K. Rowling",
                "isbn": "978-8478884451",
                "publication_year": 1997,
                "genre": "fantasy",
                "publisher": "Bloomsbury",
                "description": "Un niño descubre que es un mago.",
                "copies": 6,
            },
            {
                "title": "El nombre de la rosa",
                "author": "Umberto Eco",
                "isbn": "978-8422614838",
                "publication_year": 1980,
                "genre": "mystery",
                "publisher": "Bompiani",
                "description": "Investigación de crímenes en un monasterio medieval.",
                "copies": 3,
            },
            {
                "title": "Cosmos",
                "author": "Carl Sagan",
                "isbn": "978-0345331359",
                "publication_year": 1980,
                "genre": "non_fiction",
                "publisher": "Random House",
                "description": "Exploración del universo y la ciencia.",
                "copies": 2,
            },
        ]

        for b_data in books_data:
            book, created = Book.objects.get_or_create(
                title=b_data["title"],
                author=b_data["author"],
                defaults={
                    "isbn": b_data["isbn"],
                    "publication_year": b_data["publication_year"],
                    "genre": b_data["genre"],
                    "publisher": b_data["publisher"],
                    "description": b_data["description"],
                },
            )
            if created:
                self.stdout.write(f"Created book: {book.title}")
                # Create specified copies for each book
                num_copies = b_data.get("copies", 1)
                for i in range(num_copies):
                    BookCopy.objects.create(
                        book=book,
                        status=BookCopy.StatusChoices.AVAILABLE,
                        condition="New" if i == 0 else "Good",
                    )
                self.stdout.write(f"  Added {num_copies} copies for {book.title}")

        self.stdout.write(self.style.SUCCESS("Database populated successfully!"))
