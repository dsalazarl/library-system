"""
Business logic for reservations, loans, and returns.
Centralises all state-machine transitions to keep views thin.
"""

from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from .models import Book, BookCopy, Reservation, Loan

RESERVATION_HOURS = 1
LOAN_DAYS = 2
MAX_ACTIVE_LOANS = 3
MAX_ACTIVE_RESERVATIONS = 5


# ---------------------------------------------------------------------------
# Background / check-on-access helpers
# ---------------------------------------------------------------------------


def expire_stale_reservations() -> int:
    """
    Marks expired active reservations and frees their book copies.
    Returns the number of reservations expired.
    Should be called on every list request (check-on-access) and by the
    'expire_reservations' management command (Render Cron Job).
    """
    now = timezone.now()
    stale = Reservation.objects.filter(
        status=Reservation.StatusChoices.ACTIVE, expires_at__lt=now
    )
    copy_ids = list(stale.values_list("book_copy_id", flat=True))
    count = stale.update(status=Reservation.StatusChoices.EXPIRED)
    if copy_ids:
        BookCopy.objects.filter(
            id__in=copy_ids, status=BookCopy.StatusChoices.RESERVED
        ).update(status=BookCopy.StatusChoices.AVAILABLE)
    return count


def mark_overdue_loans() -> int:
    """
    Marks active loans whose due date has passed as OVERDUE.
    The copy stays 'borrowed' — the status change is informational.
    Returns the number of loans updated.
    """
    now = timezone.now()
    count = Loan.objects.filter(
        status=Loan.StatusChoices.ACTIVE,
        due_date__lt=now,
    ).update(status=Loan.StatusChoices.OVERDUE)
    return count


# ---------------------------------------------------------------------------
# User actions
# ---------------------------------------------------------------------------


def _get_available_copy(book: Book) -> BookCopy | None:
    """Returns the first available copy of a book (no lock — caller must lock inside transaction)."""
    return BookCopy.objects.filter(
        book=book, status=BookCopy.StatusChoices.AVAILABLE
    ).first()


def reserve_book(user, book: Book) -> Reservation:
    """
    Creates a 1-hour reservation for an available copy.
    Raises ValueError with a user-facing Spanish message on any constraint violation.
    """
    # --- Pre-checks (fast, no lock needed) ---
    if Reservation.objects.filter(
        user=user, book=book, status=Reservation.StatusChoices.ACTIVE
    ).exists():
        raise ValueError("Ya tienes una reserva activa para este libro.")

    if Loan.objects.filter(
        user=user,
        book=book,
        status__in=[
            Loan.StatusChoices.ACTIVE,
            Loan.StatusChoices.OVERDUE,
            Loan.StatusChoices.PENDING_TRANSFER,
        ],
    ).exists():
        raise ValueError("Ya tienes un préstamo activo para este libro.")

    active_reservations = Reservation.objects.filter(
        user=user, status=Reservation.StatusChoices.ACTIVE
    ).count()
    if active_reservations >= MAX_ACTIVE_RESERVATIONS:
        raise ValueError(
            f"Alcanzaste el límite de {MAX_ACTIVE_RESERVATIONS} reservas activas."
        )

    if not _get_available_copy(book):
        raise ValueError("No hay copias disponibles para este libro.")

    # --- Critical section ---
    with transaction.atomic():
        try:
            copy = (
                BookCopy.objects.select_for_update(skip_locked=True)
                .filter(book=book, status=BookCopy.StatusChoices.AVAILABLE)
                .first()
            )
        except Exception:
            # Fallback for DBs that don't support skip_locked (e.g. SQLite in tests)
            copy = (
                BookCopy.objects.select_for_update()
                .filter(book=book, status=BookCopy.StatusChoices.AVAILABLE)
                .first()
            )

        if not copy:
            raise ValueError("No hay copias disponibles para este libro.")

        copy.status = BookCopy.StatusChoices.RESERVED
        copy.save(update_fields=["status"])

        reservation = Reservation.objects.create(
            user=user,
            book_copy=copy,
            book=book,
            expires_at=timezone.now() + timedelta(hours=RESERVATION_HOURS),
        )
    return reservation


def checkout_book(user, book: Book, reservation: Reservation | None = None) -> Loan:
    """
    Creates a 2-day loan.
    - If `reservation` is provided, fulfils it (copy already reserved).
    - Otherwise performs a direct checkout of an available copy.
    Raises ValueError on constraint violation.
    """
    if Loan.objects.filter(
        user=user,
        book=book,
        status__in=[
            Loan.StatusChoices.ACTIVE,
            Loan.StatusChoices.OVERDUE,
            Loan.StatusChoices.PENDING_TRANSFER,
        ],
    ).exists():
        raise ValueError("Ya tienes un préstamo activo para este libro.")

    active_loans = Loan.objects.filter(
        user=user,
        status__in=[
            Loan.StatusChoices.ACTIVE,
            Loan.StatusChoices.OVERDUE,
            Loan.StatusChoices.PENDING_TRANSFER,
        ],
    ).count()
    if active_loans >= MAX_ACTIVE_LOANS:
        raise ValueError(
            f"Alcanzaste el límite de {MAX_ACTIVE_LOANS} préstamos activos."
        )

    with transaction.atomic():
        if reservation:
            if reservation.user_id != user.id:
                raise ValueError("La reserva no pertenece a este usuario.")
            if reservation.status != Reservation.StatusChoices.ACTIVE:
                raise ValueError("La reserva no está activa o ya expiró.")
            # Re-fetch with lock
            reservation = Reservation.objects.select_for_update().get(pk=reservation.pk)
            if reservation.status != Reservation.StatusChoices.ACTIVE:
                raise ValueError("La reserva no está activa o ya expiró.")
            copy = reservation.book_copy
            reservation.status = Reservation.StatusChoices.FULFILLED
            reservation.save(update_fields=["status"])
        else:
            if not _get_available_copy(book):
                raise ValueError("No hay copias disponibles para este libro.")
            try:
                copy = (
                    BookCopy.objects.select_for_update(skip_locked=True)
                    .filter(book=book, status=BookCopy.StatusChoices.AVAILABLE)
                    .first()
                )
            except Exception:
                copy = (
                    BookCopy.objects.select_for_update()
                    .filter(book=book, status=BookCopy.StatusChoices.AVAILABLE)
                    .first()
                )
            if not copy:
                raise ValueError("No hay copias disponibles para este libro.")

        copy.status = BookCopy.StatusChoices.BORROWED
        copy.save(update_fields=["status"])

        loan = Loan.objects.create(
            user=user,
            book_copy=copy,
            book=book,
            due_date=timezone.now() + timedelta(days=LOAN_DAYS),
        )
    return loan


def return_book(user, loan: Loan) -> Loan:
    """
    Returns a loan. Marks the loan as RETURNED and the copy as AVAILABLE.
    Raises ValueError on constraint violation.
    """
    if loan.user_id != user.id:
        raise ValueError("El préstamo no pertenece a este usuario.")
    if loan.status not in [Loan.StatusChoices.ACTIVE, Loan.StatusChoices.OVERDUE]:
        raise ValueError("Este préstamo no puede ser devuelto.")

    with transaction.atomic():
        loan.status = Loan.StatusChoices.RETURNED
        loan.returned_at = timezone.now()
        loan.save(update_fields=["status", "returned_at"])

        loan.book_copy.status = BookCopy.StatusChoices.AVAILABLE
        loan.book_copy.save(update_fields=["status"])

    return loan
