from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Book, BookCopy, Reservation, Loan, TransferRequest

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'username', 'role', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Roles', {'fields': ('role',)}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Roles', {'fields': ('role',)}),
    )

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'isbn', 'created_at')
    search_fields = ('title', 'author', 'isbn')

@admin.register(BookCopy)
class BookCopyAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_book_title', 'status', 'condition')
    list_filter = ('status',)
    search_fields = ('book__title', 'id')

    def get_book_title(self, obj):
        return obj.book.title
    get_book_title.short_description = 'Book Title'

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'get_book_title', 'status', 'expires_at')
    list_filter = ('status',)
    search_fields = ('user__email', 'book_copy__book__title')

    def get_book_title(self, obj):
        return obj.book_copy.book.title
    get_book_title.short_description = 'Book Title'

@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'get_book_title', 'status', 'due_date')
    list_filter = ('status',)
    search_fields = ('user__email', 'book_copy__book__title')

    def get_book_title(self, obj):
        return obj.book_copy.book.title
    get_book_title.short_description = 'Book Title'

@admin.register(TransferRequest)
class TransferRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'from_user', 'to_user', 'status', 'created_at')
    list_filter = ('status',)
