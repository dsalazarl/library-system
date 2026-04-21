from rest_framework import serializers
from django.utils import timezone
from .models import User, Book, Reservation, Loan


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "username", "role")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("email", "username", "password")

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            username=validated_data["username"],
            password=validated_data["password"],
            role=User.RoleChoices.LIBRARY_USER,  # Force role for registration
        )
        return user


class BookSerializer(serializers.ModelSerializer):
    available_copies_count = serializers.IntegerField(read_only=True)
    total_copies_count = serializers.IntegerField(read_only=True)
    can_delete = serializers.BooleanField(read_only=True)
    copies_count = serializers.IntegerField(
        write_only=True, required=False, min_value=1, default=1
    )

    class Meta:
        model = Book
        fields = (
            "id",
            "title",
            "author",
            "isbn",
            "is_active",
            "available_copies_count",
            "total_copies_count",
            "can_delete",
            "copies_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "is_active", "created_at", "updated_at")


class ReservationSerializer(serializers.ModelSerializer):
    book_id = serializers.UUIDField(source="book.id", read_only=True)
    book_title = serializers.CharField(source="book.title", read_only=True)
    book_author = serializers.CharField(source="book.author", read_only=True)
    time_remaining_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = (
            "id",
            "book_id",
            "book_title",
            "book_author",
            "book_copy",
            "created_at",
            "expires_at",
            "status",
            "time_remaining_seconds",
        )
        read_only_fields = (
            fields  # All fields are read-only; creation is handled by the view
        )

    def get_time_remaining_seconds(self, obj) -> int:
        if obj.status != Reservation.StatusChoices.ACTIVE:
            return 0
        delta = obj.expires_at - timezone.now()
        return max(0, int(delta.total_seconds()))


class LoanSerializer(serializers.ModelSerializer):
    book_id = serializers.UUIDField(source="book.id", read_only=True)
    book_title = serializers.CharField(source="book.title", read_only=True)
    book_author = serializers.CharField(source="book.author", read_only=True)
    time_remaining_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Loan
        fields = (
            "id",
            "book_id",
            "book_title",
            "book_author",
            "book_copy",
            "created_at",
            "due_date",
            "returned_at",
            "status",
            "time_remaining_seconds",
        )
        read_only_fields = fields

    def get_time_remaining_seconds(self, obj) -> int:
        if obj.status not in [Loan.StatusChoices.ACTIVE, Loan.StatusChoices.OVERDUE]:
            return 0
        delta = obj.due_date - timezone.now()
        return max(0, int(delta.total_seconds()))
