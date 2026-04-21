import { useState, useEffect } from 'react';
import { Clock, BookOpen, AlertTriangle, CheckCircle, X, ShoppingBag } from 'lucide-react';
import { useReservations } from '../../hooks/useReservations';
import { useLoans } from '../../hooks/useLoans';

// ---------------------------------------------------------------------------
// Countdown hook — updates every second from a server-provided seconds value
// ---------------------------------------------------------------------------
function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);
  
  // Sync state when initialSeconds changes (e.g. after a server refetch)
  const [lastInitial, setLastInitial] = useState(initialSeconds);
  if (initialSeconds !== lastInitial) {
    setSeconds(initialSeconds);
    setLastInitial(initialSeconds);
  }

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [seconds, initialSeconds, lastInitial]); // Include seconds to satisfy ESLint and handle syncs

  return seconds;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Expirado';
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

// ---------------------------------------------------------------------------
// Reservation row
// ---------------------------------------------------------------------------
interface ReservationRowProps {
  reservation: {
    id: string;
    book_title: string;
    book_author: string;
    time_remaining_seconds: number;
  };
  onCheckout: (id: string) => Promise<unknown>;
  onCancel: (id: string) => Promise<unknown>;
  isActioning: boolean;
}

function ReservationRow({ reservation, onCheckout, onCancel, isActioning }: ReservationRowProps) {
  const remaining = useCountdown(reservation.time_remaining_seconds);
  const isExpiring = remaining < 300; // < 5 minutes

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-amber-100 shadow-sm gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="p-2 rounded-lg bg-amber-50 shrink-0">
          <Clock className="h-4 w-4 text-amber-500" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 truncate">{reservation.book_title}</p>
          <p className="text-xs text-slate-500 truncate">{reservation.book_author}</p>
          <p className={`text-xs font-mono mt-1 font-medium ${isExpiring ? 'text-red-500 animate-pulse' : 'text-amber-600'}`}>
            ⏱ Expira en: {formatDuration(remaining)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onCheckout(reservation.id)}
          disabled={isActioning || remaining === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Pedir prestado
        </button>
        <button
          onClick={() => onCancel(reservation.id)}
          disabled={isActioning}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
          title="Cancelar reserva"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loan row
// ---------------------------------------------------------------------------
interface LoanRowProps {
  loan: {
    id: string;
    book_title: string;
    book_author: string;
    status: string;
    time_remaining_seconds: number;
  };
  onReturn: (id: string) => Promise<unknown>;
  isReturning: boolean;
}

function LoanRow({ loan, onReturn, isReturning }: LoanRowProps) {
  const remaining = useCountdown(loan.time_remaining_seconds);
  const isOverdue = loan.status === 'overdue';
  const isExpiringSoon = !isOverdue && remaining < 3600; // < 1 hour

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border shadow-sm gap-4 ${
      isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-emerald-100'
    }`}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className={`p-2 rounded-lg shrink-0 ${isOverdue ? 'bg-red-100' : 'bg-emerald-50'}`}>
          {isOverdue
            ? <AlertTriangle className="h-4 w-4 text-red-500" />
            : <BookOpen className="h-4 w-4 text-emerald-500" />
          }
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 truncate">{loan.book_title}</p>
            {isOverdue && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                VENCIDO
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">{loan.book_author}</p>
          <p className={`text-xs font-mono mt-1 font-medium ${
            isOverdue ? 'text-red-600' : isExpiringSoon ? 'text-amber-600 animate-pulse' : 'text-emerald-700'
          }`}>
            {isOverdue
              ? `Venció hace: ${formatDuration(Math.abs(loan.time_remaining_seconds))}`
              : `⏱ Devolver en: ${formatDuration(remaining)}`
            }
          </p>
        </div>
      </div>
      <button
        onClick={() => onReturn(loan.id)}
        disabled={isReturning}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors shrink-0"
      >
        <CheckCircle className="h-3.5 w-3.5" />
        Devolver
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------
export default function MyLoansPanel() {
  const {
    reservations,
    isLoading: reservationsLoading,
    checkoutFromReservation,
    isCheckingOut,
    cancelReservation,
    isCancelling,
  } = useReservations();

  const {
    loans,
    isLoading: loansLoading,
    returnBook,
    isReturning,
  } = useLoans();

  const hasReservations = reservations.length > 0;
  const hasLoans = loans.length > 0;

  // Don't render panel at all if nothing active
  if (!hasReservations && !hasLoans) return null;

  const isLoading = reservationsLoading || loansLoading;

  if (isLoading) {
    return (
      <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-400 text-sm">
        Cargando actividad...
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm overflow-hidden">
      {/* Panel header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-sky-500" />
          Mi Actividad
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {hasLoans && `${loans.length} préstamo${loans.length !== 1 ? 's' : ''} activo${loans.length !== 1 ? 's' : ''}`}
          {hasLoans && hasReservations && ' · '}
          {hasReservations && `${reservations.length} reserva${reservations.length !== 1 ? 's' : ''} activa${reservations.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Active Loans */}
        {hasLoans && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Mis Préstamos
            </h3>
            <div className="space-y-2">
              {loans.map((loan) => (
                <LoanRow
                  key={loan.id}
                  loan={loan}
                  onReturn={returnBook}
                  isReturning={isReturning}
                />
              ))}
            </div>
          </section>
        )}

        {/* Active Reservations */}
        {hasReservations && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Mis Reservas
            </h3>
            <div className="space-y-2">
              {reservations.map((reservation) => (
                <ReservationRow
                  key={reservation.id}
                  reservation={reservation}
                  onCheckout={checkoutFromReservation}
                  onCancel={cancelReservation}
                  isActioning={isCheckingOut || isCancelling}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
