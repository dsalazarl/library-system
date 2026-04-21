from rest_framework import generics, permissions, viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.generics import get_object_or_404
from rest_framework.views import APIView
from django.contrib.auth import get_user_model

from .serializers import (
    RegisterSerializer,
    UserSerializer,
    BookSerializer,
    ReservationSerializer,
    LoanSerializer,
)
from .models import Book, BookCopy, Reservation, Loan
from .permissions import IsLibrarianOrReadOnly
from .services import (
    expire_stale_reservations,
    mark_overdue_loans,
    reserve_book,
    checkout_book,
    return_book,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer


class MeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class BookViewSet(viewsets.ModelViewSet):
    serializer_class = BookSerializer
    permission_classes = [permissions.IsAuthenticated, IsLibrarianOrReadOnly]

    def get_queryset(self):
        # By default, only return active books
        return Book.objects.filter(is_active=True).order_by("title")

    def perform_create(self, serializer):
        copies_count = serializer.validated_data.pop("copies_count", 1)
        book = serializer.save()
        if copies_count > 0:
            BookCopy.objects.bulk_create(
                [BookCopy(book=book, condition="New") for _ in range(copies_count)]
            )

    def perform_destroy(self, instance):
        # Soft delete instead of real delete
        instance.is_active = False
        instance.save()
        # Update associated copies status
        instance.copies.all().update(status="deleted_by_librarian")


class ReservationViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """
    GET  /api/reservations/          → list my active reservations
    POST /api/reservations/          → create a reservation  { "book_id": "<uuid>" }
    POST /api/reservations/{id}/checkout/ → convert reservation into a loan
    POST /api/reservations/{id}/cancel/  → cancel a reservation
    """

    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Check-on-access: expire stale reservations before returning data
        expire_stale_reservations()
        return (
            Reservation.objects.filter(
                user=self.request.user, status=Reservation.StatusChoices.ACTIVE
            )
            .select_related("book", "book_copy")
            .order_by("expires_at")
        )

    def create(self, request, *args, **kwargs):
        book_id = request.data.get("book_id")
        if not book_id:
            return Response(
                {"error": "Se requiere book_id."}, status=status.HTTP_400_BAD_REQUEST
            )

        book = get_object_or_404(Book, id=book_id, is_active=True)
        try:
            reservation = reserve_book(user=request.user, book=book)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(reservation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def checkout(self, request, pk=None):
        """Convert an active reservation into a loan."""
        reservation = get_object_or_404(Reservation, id=pk, user=request.user)
        try:
            loan = checkout_book(
                user=request.user, book=reservation.book, reservation=reservation
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = LoanSerializer(loan)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel an active reservation and free the copy."""
        reservation = get_object_or_404(Reservation, id=pk, user=request.user)
        if reservation.status != Reservation.StatusChoices.ACTIVE:
            return Response(
                {"error": "La reserva no está activa."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from django.db import transaction

        with transaction.atomic():
            reservation.status = Reservation.StatusChoices.CANCELLED
            reservation.save(update_fields=["status"])
            reservation.book_copy.status = BookCopy.StatusChoices.AVAILABLE
            reservation.book_copy.save(update_fields=["status"])

        return Response({"status": "cancelled"})

    @action(detail=False, methods=["get"])
    def history(self, request):
        """List my past reservations (fulfilled, expired, cancelled)."""
        expire_stale_reservations()
        qs = (
            Reservation.objects.filter(user=request.user)
            .exclude(status=Reservation.StatusChoices.ACTIVE)
            .select_related("book", "book_copy")
            .order_by("-updated_at")
        )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class LoanViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """
    GET  /api/loans/               → list my active/overdue loans
    POST /api/loans/               → direct checkout  { "book_id": "<uuid>" }
    POST /api/loans/{id}/return_book/ → return a loan
    """

    serializer_class = LoanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Check-on-access: mark overdue before returning data
        mark_overdue_loans()
        return (
            Loan.objects.filter(
                user=self.request.user,
                status__in=[Loan.StatusChoices.ACTIVE, Loan.StatusChoices.OVERDUE],
            )
            .select_related("book", "book_copy")
            .order_by("due_date")
        )

    def create(self, request, *args, **kwargs):
        book_id = request.data.get("book_id")
        if not book_id:
            return Response(
                {"error": "Se requiere book_id."}, status=status.HTTP_400_BAD_REQUEST
            )

        book = get_object_or_404(Book, id=book_id, is_active=True)
        try:
            loan = checkout_book(user=request.user, book=book)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(loan)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="return_book")
    def return_book(self, request, pk=None):
        """Return a borrowed copy."""
        loan = get_object_or_404(Loan, id=pk, user=request.user)
        try:
            loan = return_book(user=request.user, loan=loan)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(loan)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def history(self, request):
        """List my past loans (returned, transferred)."""
        mark_overdue_loans()
        qs = (
            Loan.objects.filter(user=request.user)
            .exclude(status__in=[Loan.StatusChoices.ACTIVE, Loan.StatusChoices.OVERDUE])
            .select_related("book", "book_copy")
            .order_by("-returned_at", "-updated_at")
        )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)
