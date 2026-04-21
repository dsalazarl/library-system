"""
URL configuration for librarySystemBackend project.
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from librarySystemBackend.views import (
    RegisterView,
    MeView,
    BookViewSet,
    ReservationViewSet,
    LoanViewSet,
    TransferRequestViewSet,
)

router = DefaultRouter()
router.register(r"books", BookViewSet, basename="book")
router.register(r"reservations", ReservationViewSet, basename="reservation")
router.register(r"loans", LoanViewSet, basename="loan")
router.register(r"transfers", TransferRequestViewSet, basename="transfer")

urlpatterns = [
    path("admin/", admin.site.urls),
    # Auth endpoints
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", MeView.as_view(), name="auth_me"),
    # API endpoints
    path("api/", include(router.urls)),
]
