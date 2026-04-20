from rest_framework import serializers
from .models import User, Book


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
    copies_count = serializers.IntegerField(
        write_only=True, required=False, min_value=0, default=0
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
            "copies_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "is_active", "created_at", "updated_at")
