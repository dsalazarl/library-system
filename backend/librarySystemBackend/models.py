import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    class RoleChoices(models.TextChoices):
        LIBRARIAN = "librarian", _("Librarian")
        LIBRARY_USER = "library_user", _("Library User")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # We use email as the primary identifier
    email = models.EmailField(_("email address"), unique=True)
    role = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        default=RoleChoices.LIBRARY_USER,
    )

    # We keep username for compatibility with AbstractUser, but it can be nullable or auto-generated,
    # however, setting USERNAME_FIELD to 'email' handles authentication.
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = [
        "username"
    ]  # username is required by AbstractUser createsuperuser

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.email


class Book(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    isbn = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "books"

    def __str__(self):
        return f"{self.title} by {self.author}"

    @property
    def available_copies_count(self):
        return self.copies.filter(status="available").count()

    @property
    def total_copies_count(self):
        return self.copies.count()

    @property
    def can_delete(self):
        """A book can only be deleted if no copies are currently reserved, borrowed, or pending transfer."""
        return not self.copies.filter(
            status__in=["reserved", "borrowed", "pending_transfer"]
        ).exists()


class BookCopy(models.Model):
    class StatusChoices(models.TextChoices):
        AVAILABLE = "available", _("Available")
        RESERVED = "reserved", _("Reserved")
        BORROWED = "borrowed", _("Borrowed")
        PENDING_TRANSFER = "pending_transfer", _("Pending Transfer")
        DELETED_BY_LIBRARIAN = "deleted_by_librarian", _("Deleted by Librarian")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="copies")
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.AVAILABLE
    )
    condition = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "book_copies"

    def __str__(self):
        return f"{self.book.title} - Copy {self.id}"


class Reservation(models.Model):
    class StatusChoices(models.TextChoices):
        ACTIVE = "active", _("Active")
        FULFILLED = "fulfilled", _("Fulfilled")
        EXPIRED = "expired", _("Expired")
        CANCELLED = "cancelled", _("Cancelled")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="reservations"
    )
    book_copy = models.ForeignKey(
        BookCopy, on_delete=models.CASCADE, related_name="reservations"
    )

    # Denormalized book_id for unique constraints
    book = models.ForeignKey(
        Book, on_delete=models.CASCADE, related_name="all_reservations"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.ACTIVE
    )

    class Meta:
        db_table = "reservations"
        constraints = [
            # A user can only have one active reservation for a specific book title
            models.UniqueConstraint(
                fields=["user", "book"],
                condition=models.Q(status="active"),
                name="unique_active_reservation_per_book",
            ),
            # A book copy can only have one active reservation at a time
            models.UniqueConstraint(
                fields=["book_copy"],
                condition=models.Q(status="active"),
                name="unique_active_reservation_per_copy",
            ),
        ]

    def save(self, *args, **kwargs):
        # Automatically set the denormalized book field
        if not hasattr(self, "book") or not self.book_id:
            self.book = self.book_copy.book
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Reservation: {self.user.email} -> {self.book_copy.book.title}"


class Loan(models.Model):
    class StatusChoices(models.TextChoices):
        ACTIVE = "active", _("Active")
        OVERDUE = "overdue", _("Overdue")
        RETURNED = "returned", _("Returned")
        TRANSFERRED = "transferred", _("Transferred")
        PENDING_TRANSFER = "pending_transfer", _("Pending Transfer")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="loans")
    book_copy = models.ForeignKey(
        BookCopy, on_delete=models.CASCADE, related_name="loans"
    )

    # Denormalized book_id for unique constraints
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="all_loans")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateTimeField()
    returned_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.ACTIVE
    )

    class Meta:
        db_table = "loans"
        constraints = [
            # A user can only have one active/pending loan for a specific book title
            models.UniqueConstraint(
                fields=["user", "book"],
                condition=models.Q(
                    status__in=["active", "pending_transfer", "overdue"]
                ),
                name="unique_active_loan_per_book",
            ),
            # A book copy can only have one active/pending loan at a time
            models.UniqueConstraint(
                fields=["book_copy"],
                condition=models.Q(
                    status__in=["active", "pending_transfer", "overdue"]
                ),
                name="unique_active_loan_per_copy",
            ),
        ]

    def save(self, *args, **kwargs):
        # Automatically set the denormalized book field
        if not hasattr(self, "book") or not self.book_id:
            self.book = self.book_copy.book
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Loan: {self.user.email} -> {self.book_copy.book.title}"


class TransferRequest(models.Model):
    class StatusChoices(models.TextChoices):
        PENDING = "pending", _("Pending")
        ACCEPTED = "accepted", _("Accepted")
        REJECTED = "rejected", _("Rejected")
        CANCELLED = "cancelled", _("Cancelled")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    loan = models.ForeignKey(
        Loan, on_delete=models.CASCADE, related_name="transfer_requests"
    )
    from_user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_transfers"
    )
    to_user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="received_transfers"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING
    )

    class Meta:
        db_table = "transfer_requests"

    def __str__(self):
        return f"Transfer: {self.from_user.email} -> {self.to_user.email} (Loan {self.loan.id})"
