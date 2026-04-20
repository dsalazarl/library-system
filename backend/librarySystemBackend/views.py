from rest_framework import generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer, BookSerializer
from .models import Book
from .permissions import IsLibrarianOrReadOnly

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
        copies_count = serializer.validated_data.pop("copies_count", 0)
        book = serializer.save()
        if copies_count > 0:
            from .models import BookCopy

            BookCopy.objects.bulk_create(
                [BookCopy(book=book, condition="New") for _ in range(copies_count)]
            )

    def perform_destroy(self, instance):
        # Soft delete instead of real delete
        instance.is_active = False
        instance.save()
        # Update associated copies status
        instance.copies.all().update(status="deleted_by_librarian")
