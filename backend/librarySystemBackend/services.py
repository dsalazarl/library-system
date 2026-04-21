"""
Business logic for reservations, loans, and returns.
Centralises all state-machine transitions to keep views thin.
"""

from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from .models import Book, BookCopy, Reservation, Loan, TransferRequest, User

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


# ---------------------------------------------------------------------------
# Transfer actions
# ---------------------------------------------------------------------------


def initiate_transfer(from_user, loan: Loan, to_user_email: str) -> TransferRequest:
    """
    Initiates a transfer request from from_user to user with to_user_email.
    """
    if loan.user_id != from_user.id:
        raise ValueError("El préstamo no te pertenece.")
    if loan.status not in [Loan.StatusChoices.ACTIVE, Loan.StatusChoices.OVERDUE]:
        raise ValueError("Este préstamo no puede ser transferido.")

    try:
        to_user = User.objects.get(email=to_user_email)
    except User.DoesNotExist:
        raise ValueError(f"El usuario con email {to_user_email} no existe.")

    if to_user.id == from_user.id:
        raise ValueError("No puedes transferirte un libro a ti mismo.")

    # Check recipient limits
    active_loans = Loan.objects.filter(
        user=to_user,
        status__in=[
            Loan.StatusChoices.ACTIVE,
            Loan.StatusChoices.OVERDUE,
            Loan.StatusChoices.PENDING_TRANSFER,
        ],
    ).count()
    if active_loans >= MAX_ACTIVE_LOANS:
        raise ValueError(
            f"El receptor alcanzó el límite de {MAX_ACTIVE_LOANS} préstamos."
        )

    if Loan.objects.filter(
        user=to_user,
        book=loan.book,
        status__in=[
            Loan.StatusChoices.ACTIVE,
            Loan.StatusChoices.OVERDUE,
            Loan.StatusChoices.PENDING_TRANSFER,
        ],
    ).exists():
        raise ValueError("El receptor ya tiene un préstamo de este libro.")

    if Reservation.objects.filter(
        user=to_user, book=loan.book, status=Reservation.StatusChoices.ACTIVE
    ).exists():
        raise ValueError("El receptor ya tiene una reserva de este libro.")

    with transaction.atomic():
        # Lock loan and copy
        loan = Loan.objects.select_for_update().get(pk=loan.pk)
        copy = BookCopy.objects.select_for_update().get(pk=loan.book_copy_id)

        loan.status = Loan.StatusChoices.PENDING_TRANSFER
        loan.save(update_fields=["status"])

        copy.status = BookCopy.StatusChoices.PENDING_TRANSFER
        copy.save(update_fields=["status"])

        transfer = TransferRequest.objects.create(
            loan=loan,
            from_user=from_user,
            to_user=to_user,
        )

    return transfer


def accept_transfer(user, transfer: TransferRequest) -> Loan:
    """
    Recipient accepts the transfer.
    """
    if transfer.to_user_id != user.id:
        raise ValueError("Esta solicitud de transferencia no es para ti.")
    if transfer.status != TransferRequest.StatusChoices.PENDING:
        raise ValueError("La solicitud ya no está pendiente.")

    # Re-check limits at acceptance time
    active_loans = Loan.objects.filter(
        user=user,
        status__in=[
            Loan.StatusChoices.ACTIVE,
            Loan.StatusChoices.OVERDUE,
            Loan.StatusChoices.PENDING_TRANSFER,
        ],
    ).count()
    if active_loans >= MAX_ACTIVE_LOANS:
        raise ValueError(f"Alcanzaste el límite de {MAX_ACTIVE_LOANS} préstamos.")

    with transaction.atomic():
        transfer = TransferRequest.objects.select_for_update().get(pk=transfer.pk)
        loan = Loan.objects.select_for_update().get(pk=transfer.loan_id)
        copy = BookCopy.objects.select_for_update().get(pk=loan.book_copy_id)

        # Mark original loan as transferred
        loan.status = Loan.StatusChoices.TRANSFERRED
        loan.save(update_fields=["status"])

        # Mark transfer as accepted
        transfer.status = TransferRequest.StatusChoices.ACCEPTED
        transfer.save(update_fields=["status"])

        # Create NEW loan for recipient with same due_date
        new_loan = Loan.objects.create(
            user=user,
            book_copy=copy,
            book=loan.book,
            due_date=loan.due_date,
            status=Loan.StatusChoices.ACTIVE,
        )

        # Restore copy status to BORROWED
        copy.status = BookCopy.StatusChoices.BORROWED
        copy.save(update_fields=["status"])

        return new_loan


def reject_transfer(user, transfer: TransferRequest):
    """
    Recipient rejects the transfer.
    """
    if transfer.to_user_id != user.id:
        raise ValueError("Esta solicitud de transferencia no es para ti.")
    if transfer.status != TransferRequest.StatusChoices.PENDING:
        raise ValueError("La solicitud ya no está pendiente.")

    with transaction.atomic():
        transfer = TransferRequest.objects.select_for_update().get(pk=transfer.pk)
        loan = Loan.objects.select_for_update().get(pk=transfer.loan_id)
        copy = BookCopy.objects.select_for_update().get(pk=loan.book_copy_id)

        transfer.status = TransferRequest.StatusChoices.REJECTED
        transfer.save(update_fields=["status"])

        # Restore loan and copy status
        loan.status = Loan.StatusChoices.ACTIVE
        # Note: could be overdue, mark_overdue_loans will handle it on next access
        loan.save(update_fields=["status"])

        copy.status = BookCopy.StatusChoices.BORROWED
        copy.save(update_fields=["status"])


def cancel_transfer(user, transfer: TransferRequest):
    """
    Initiator cancels the transfer.
    """
    if transfer.from_user_id != user.id:
        raise ValueError("Solo el iniciador puede cancelar la transferencia.")
    if transfer.status != TransferRequest.StatusChoices.PENDING:
        raise ValueError("La solicitud ya no está pendiente.")

    with transaction.atomic():
        transfer = TransferRequest.objects.select_for_update().get(pk=transfer.pk)
        loan = Loan.objects.select_for_update().get(pk=transfer.loan_id)
        copy = BookCopy.objects.select_for_update().get(pk=loan.book_copy_id)

        transfer.status = TransferRequest.StatusChoices.CANCELLED
        transfer.save(update_fields=["status"])

        # Restore loan and copy status
        loan.status = Loan.StatusChoices.ACTIVE
        loan.save(update_fields=["status"])

        copy.status = BookCopy.StatusChoices.BORROWED
        copy.save(update_fields=["status"])


def cancel_transfer_by_loan(user, loan: Loan):
    """
    Cancel a pending transfer using the loan object.
    """
    transfer = TransferRequest.objects.filter(
        loan_id=loan.id,
        from_user_id=user.id,
        status=TransferRequest.StatusChoices.PENDING,
    ).first()

    if not transfer:
        raise ValueError("No hay una transferencia pendiente para este préstamo.")

    return cancel_transfer(user, transfer)
