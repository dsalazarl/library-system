"""
Management command: expire_reservations

Expires stale reservations, frees their copies, and marks overdue loans.
Designed to be run as a Render Cron Job every 5 minutes:
  python manage.py expire_reservations

render.yaml example:
  - type: cron
    name: expire-reservations
    schedule: "*/5 * * * *"
    buildCommand: pip install -r requirements.txt
    startCommand: python manage.py expire_reservations
"""

from django.core.management.base import BaseCommand

from librarySystemBackend.services import expire_stale_reservations, mark_overdue_loans


class Command(BaseCommand):
    help = "Expire stale reservations and mark overdue loans."

    def handle(self, *args, **options):
        expired = expire_stale_reservations()
        overdue = mark_overdue_loans()
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Reservations expired: {expired} | Loans marked overdue: {overdue}"
            )
        )
