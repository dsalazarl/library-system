from rest_framework import permissions


class IsLibrarianOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow librarians to edit objects.
    Library users can only read (GET, HEAD, OPTIONS).
    """

    def has_permission(self, request, view):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to users with 'librarian' role.
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "librarian"
        )
