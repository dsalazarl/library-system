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
            },
            {"title": "1984", "author": "George Orwell", "isbn": "978-0451524935"},
            {
                "title": "El principito",
                "author": "Antoine de Saint-Exupéry",
                "isbn": "978-0156012195",
            },
            {
                "title": "Don Quijote de la Mancha",
                "author": "Miguel de Cervantes",
                "isbn": "978-8420412146",
            },
            {"title": "Rayuela", "author": "Julio Cortázar", "isbn": "978-0307474735"},
        ]

        for b_data in books_data:
            book, created = Book.objects.get_or_create(
                title=b_data["title"],
                author=b_data["author"],
                defaults={"isbn": b_data["isbn"]},
            )
            if created:
                self.stdout.write(f"Created book: {book.title}")
                # Create 2 copies for each book
                for i in range(2):
                    BookCopy.objects.create(
                        book=book,
                        status=BookCopy.StatusChoices.AVAILABLE,
                        condition="New" if i == 0 else "Good",
                    )
                self.stdout.write(f"  Added 2 copies for {book.title}")

        self.stdout.write(self.style.SUCCESS("Database populated successfully!"))
