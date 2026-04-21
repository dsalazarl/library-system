import { useState, useEffect } from 'react';
import { Clock, BookOpen, AlertTriangle, CheckCircle, X, ShoppingBag } from 'lucide-react';
import { useReservations, type Reservation } from '../../hooks/useReservations';
import { useLoans, type Loan } from '../../hooks/useLoans';

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
        <span className="relative inline-flex group">
          <button
            onClick={() => onCheckout(reservation.id)}
            disabled={isActioning || remaining === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Pedir prestado
          </button>
          
          {/* Terms tooltip (Duration) */}
          <span role="tooltip" className="absolute bottom-full right-0 mb-2 z-20 w-max whitespace-nowrap px-2.5 py-1.5 text-xs text-center text-white bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            2 días de duración.
            <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-700" />
          </span>
        </span>

        <span className="relative inline-flex group">
          <button
            onClick={() => onCancel(reservation.id)}
            disabled={isActioning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors border border-transparent"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Devolver
          </button>

          {/* Terms tooltip (Clarification for 'Devolver' which is a cancel) */}
          <span role="tooltip" className="absolute bottom-full right-0 mb-2 z-20 w-max whitespace-nowrap px-2.5 py-1.5 text-xs text-center text-white bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Libera tu reserva.
            <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-700" />
          </span>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History row
// ---------------------------------------------------------------------------
interface HistoryRowProps {
  item: Reservation | Loan;
  type: 'reservation' | 'loan';
}

function HistoryRow({ item, type }: HistoryRowProps) {
  const isLoan = type === 'loan';
  const status = item.status;
  
  const getStatusDisplay = () => {
    switch (status) {
      case 'fulfilled': return { label: 'Prestado', color: 'bg-sky-100 text-sky-700' };
      case 'expired': return { label: 'Expirado', color: 'bg-slate-100 text-slate-600' };
      case 'cancelled': return { label: 'Cancelado', color: 'bg-red-50 text-red-600' };
      case 'returned': return { label: 'Devuelto', color: 'bg-emerald-100 text-emerald-700' };
      case 'transferred': return { label: 'Transferido', color: 'bg-purple-100 text-purple-700' };
      default: return { label: status, color: 'bg-slate-100 text-slate-600' };
    }
  };

  const { label, color } = getStatusDisplay();

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100 gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="p-2 rounded-lg bg-white border border-slate-100 shrink-0">
          {isLoan ? <BookOpen className="h-3.5 w-3.5 text-slate-400" /> : <Clock className="h-3.5 w-3.5 text-slate-400" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">{item.book_title}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-tight">
            {isLoan ? 'Préstamo' : 'Reserva'} · {new Date(item.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color}`}>
        {label}
      </span>
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
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [panelError, setPanelError] = useState<string | null>(null);

  const {
    reservations,
    history: reservationHistory,
    isLoading: reservationsLoading,
    checkoutFromReservation,
    isCheckingOut,
    cancelReservation,
    isCancelling,
  } = useReservations();

  const {
    loans,
    history: loanHistory,
    isLoading: loansLoading,
    returnBook,
    isReturning,
  } = useLoans();

  const hasReservations = reservations.length > 0;
  const hasLoans = loans.length > 0;
  const hasHistory = reservationHistory.length > 0 || loanHistory.length > 0;

  // Don't render panel at all if nothing active and no history
  if (!hasReservations && !hasLoans && !hasHistory) return null;

  const isLoading = reservationsLoading || loansLoading;

  const handleAction = async (fn: () => Promise<unknown>, errorMsg: string) => {
    setPanelError(null);
    try {
      await fn();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      const msg = axiosError.response?.data?.error || errorMsg;
      setPanelError(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="mb-6 p-8 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Cargando tu actividad...</p>
      </div>
    );
  }

  // Combine and sort history
  const combinedHistory = [
    ...reservationHistory.map(r => ({ ...r, type: 'reservation' as const })),
    ...loanHistory.map(l => ({ ...l, type: 'loan' as const }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalItems = activeTab === 'current' ? (reservations.length + loans.length) : combinedHistory.length;
  const showScroll = totalItems > 10;

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm overflow-hidden flex flex-col">
      {/* Panel header */}
      <div className="px-6 pt-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
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

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'current' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Actual
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'history' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Historial
            </button>
          </div>
        </div>
      </div>

      {/* Action error banner */}
      {panelError && (
        <div className="mx-4 mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600 font-medium">{panelError}</span>
          </div>
          <button onClick={() => setPanelError(null)} className="text-red-400 hover:text-red-600 ml-3">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className={`p-4 ${showScroll ? 'max-h-[500px] overflow-y-auto' : ''}`}>
        {activeTab === 'current' ? (
          <div className="space-y-6">
            {!hasLoans && !hasReservations && (
              <div className="py-10 text-center">
                <p className="text-slate-400 text-sm">No tienes actividad pendiente en este momento.</p>
              </div>
            )}

            {/* Active Loans */}
            {hasLoans && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
                  Mis Préstamos
                </h3>
                <div className="space-y-2">
                  {loans.map((loan) => (
                    <LoanRow
                      key={loan.id}
                      loan={loan}
                      onReturn={(id) => handleAction(() => returnBook(id), 'Error al devolver.')}
                      isReturning={isReturning}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Active Reservations */}
            {hasReservations && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
                  Mis Reservas
                </h3>
                <div className="space-y-2">
                  {reservations.map((reservation) => (
                    <ReservationRow
                      key={reservation.id}
                      reservation={reservation}
                      onCheckout={(id) => handleAction(() => checkoutFromReservation(id), 'Error al pedir prestado.')}
                      onCancel={(id) => handleAction(() => cancelReservation(id), 'Error al cancelar.')}
                      isActioning={isCheckingOut || isCancelling}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {combinedHistory.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-slate-400 text-sm">Tu historial está vacío.</p>
              </div>
            ) : (
              combinedHistory.map((item) => (
                <HistoryRow key={item.id} item={item} type={item.type} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
