import { useState, useEffect } from 'react';
import { Clock, BookOpen, AlertTriangle, CheckCircle, X, ShoppingBag, Send, Check, XCircle } from 'lucide-react';
import { useReservations, type Reservation } from '../../hooks/useReservations';
import { useLoans, type Loan } from '../../hooks/useLoans';
import { useTransfers, type TransferRequest } from '../../hooks/useTransfers';

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
// Transfer Row (Incoming)
// ---------------------------------------------------------------------------
interface TransferRowProps {
  transfer: TransferRequest;
  onAccept: (id: string) => Promise<unknown>;
  onReject: (id: string) => Promise<unknown>;
  isActioning: boolean;
}

function TransferRow({ transfer, onAccept, onReject, isActioning }: TransferRowProps) {
  const remaining = useCountdown(transfer.time_remaining_seconds);

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-purple-50 border border-purple-100 shadow-sm gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="p-2 rounded-lg bg-white border border-purple-100 shrink-0">
          <Send className="h-4 w-4 text-purple-500" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-0.5">Transferencia Entrante</p>
          <p className="font-semibold text-slate-800 truncate">{transfer.book_title}</p>
          <p className="text-xs text-slate-500 truncate">De: {transfer.from_user_email}</p>
          <p className="text-xs font-mono mt-1 font-medium text-purple-700">
            ⏱ Tiempo restante: {formatDuration(remaining)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative inline-flex group">
          <button
            onClick={() => onAccept(transfer.id)}
            disabled={isActioning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            Aceptar
          </button>
          <span role="tooltip" className="absolute bottom-full right-0 mb-2 z-20 w-max whitespace-nowrap px-2.5 py-1.5 text-xs text-center text-white bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Aceptar transferencia.
            <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-700" />
          </span>
        </span>

        <span className="relative inline-flex group">
          <button
            onClick={() => onReject(transfer.id)}
            disabled={isActioning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Rechazar
          </button>
          <span role="tooltip" className="absolute bottom-full right-0 mb-2 z-20 w-max whitespace-nowrap px-2.5 py-1.5 text-xs text-center text-white bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Rechazar transferencia.
            <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-700" />
          </span>
        </span>
      </div>
    </div>
  );
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
  item: Reservation | Loan | TransferRequest;
  type: 'reservation' | 'loan' | 'transfer';
}

function HistoryRow({ item, type }: HistoryRowProps) {
  const isLoan = type === 'loan';
  const isReservation = type === 'reservation';
  const status = item.status;
  
  const getStatusDisplay = () => {
    switch (status) {
      case 'fulfilled': return { label: 'Prestado', color: 'bg-sky-100 text-sky-700' };
      case 'expired': return { label: 'Expirado', color: 'bg-slate-100 text-slate-600' };
      case 'cancelled': return { label: 'Cancelado', color: 'bg-red-50 text-red-600' };
      case 'returned': return { label: 'Devuelto', color: 'bg-emerald-100 text-emerald-700' };
      case 'transferred': return { label: 'Transferido', color: 'bg-purple-100 text-purple-700' };
      case 'accepted': return { label: 'Aceptado', color: 'bg-emerald-100 text-emerald-700' };
      case 'rejected': return { label: 'Rechazado', color: 'bg-red-50 text-red-600' };
      default: return { label: status, color: 'bg-slate-100 text-slate-600' };
    }
  };

  const { label, color } = getStatusDisplay();

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100 gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="p-2 rounded-lg bg-white border border-slate-100 shrink-0">
          {isLoan ? <BookOpen className="h-3.5 w-3.5 text-slate-400" /> : isReservation ? <Clock className="h-3.5 w-3.5 text-slate-400" /> : <Send className="h-3.5 w-3.5 text-slate-400" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">{item.book_title}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-tight">
            {isLoan ? 'Préstamo' : isReservation ? 'Reserva' : 'Transf. Enviada'} · {new Date(item.created_at).toLocaleDateString()}
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
  loan: Loan;
  onReturn: (id: string) => Promise<unknown>;
  onTransfer: (loan: Loan) => void;
  onCancelTransfer: (id: string) => Promise<unknown>;
  isReturning: boolean;
  isPendingTransfer: boolean;
  isCancelling: boolean;
}

function LoanRow({ loan, onReturn, onTransfer, onCancelTransfer, isReturning, isPendingTransfer, isCancelling }: LoanRowProps) {
  const remaining = useCountdown(loan.time_remaining_seconds);
  const isOverdue = loan.status === 'overdue';
  const isExpiringSoon = !isOverdue && remaining < 3600; // < 1 hour
  const isPending = loan.status === 'pending_transfer' || isPendingTransfer;

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border shadow-sm gap-4 ${
      isOverdue ? 'bg-red-50 border-red-200' : isPending ? 'bg-purple-50 border-purple-100' : 'bg-white border-emerald-100'
    }`}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className={`p-2 rounded-lg shrink-0 ${isOverdue ? 'bg-red-100' : isPending ? 'bg-purple-100' : 'bg-emerald-50'}`}>
          {isOverdue ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <BookOpen className="h-4 w-4 text-emerald-500" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 truncate">{loan.book_title}</p>
            {isOverdue && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                VENCIDO
              </span>
            )}
            {isPending && (
              <span className="px-2 py-0.5 text-xs font-bold bg-purple-500 text-white rounded-full">
                TRANSF. PENDIENTE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">{loan.book_author}</p>
          <p className={`text-xs font-mono mt-1 font-medium ${
            isOverdue ? 'text-red-600' : isExpiringSoon ? 'text-amber-600 animate-pulse' : isPending ? 'text-purple-700' : 'text-emerald-700'
          }`}>
            {isOverdue
              ? `Venció hace: ${formatDuration(Math.abs(loan.time_remaining_seconds))}`
              : `⏱ Devolver en: ${formatDuration(remaining)}`
            }
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isPending ? (
          <span className="relative inline-flex group">
            <button
              onClick={() => onCancelTransfer(loan.id)}
              disabled={isCancelling}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancelar
            </button>
            <span role="tooltip" className="absolute bottom-full right-0 mb-2 z-20 w-max whitespace-nowrap px-2.5 py-1.5 text-xs text-center text-white bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Retirar la solicitud de transferencia.
              <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-700" />
            </span>
          </span>
        ) : (
          <span className="relative inline-flex group">
            <button
              onClick={() => onTransfer(loan)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-600 border border-purple-200 text-xs font-medium rounded-lg transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              Transferir
            </button>
            <span role="tooltip" className="absolute bottom-full right-0 mb-2 z-20 w-max whitespace-nowrap px-2.5 py-1.5 text-xs text-center text-white bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Pasar este préstamo a otro usuario.
              <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-700" />
            </span>
          </span>
        )}

        <button
          onClick={() => onReturn(loan.id)}
          disabled={isReturning || isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Devolver
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------
export default function MyLoansPanel() {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [panelError, setPanelError] = useState<string | null>(null);
  const [transferModal, setTransferModal] = useState<{ isOpen: boolean, loan: Loan | null, email: string }>({
    isOpen: false,
    loan: null,
    email: '',
  });

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
    initiateTransfer,
    isInitiatingTransfer,
    cancelLoanTransfer,
    isCancellingTransfer,
  } = useLoans();

  const {
    transfers,
    history: transferHistory,
    isLoading: transfersLoading,
    acceptTransfer,
    isAccepting,
    rejectTransfer,
    isRejecting,
  } = useTransfers();

  const hasReservations = reservations.length > 0;
  const hasLoans = loans.length > 0;
  const hasTransfers = transfers.length > 0;
  const hasHistory = reservationHistory.length > 0 || loanHistory.length > 0 || transferHistory.length > 0;

  // Don't render panel at all if nothing active and no history
  if (!hasReservations && !hasLoans && !hasHistory && !hasTransfers) return null;

  const isLoading = reservationsLoading || loansLoading || transfersLoading;

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

  const handleTransfer = async () => {
    if (!transferModal.loan || !transferModal.email) return;
    await handleAction(
      () => initiateTransfer({ loanId: transferModal.loan!.id, email: transferModal.email }),
      'Error al iniciar transferencia.'
    );
    setTransferModal({ isOpen: false, loan: null, email: '' });
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
    ...loanHistory.map(l => ({ ...l, type: 'loan' as const })),
    ...transferHistory.map(t => ({ ...t, type: 'transfer' as const }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalItems = activeTab === 'current' ? (reservations.length + loans.length + transfers.length) : combinedHistory.length;
  const showScroll = totalItems > 10;

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm overflow-hidden flex flex-col">
      {/* Transfer Modal */}
      {transferModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Transferir Préstamo</h3>
              <p className="text-sm text-slate-500 mb-6">
                Ingresa el email del usuario al que deseas transferir el libro: <span className="font-semibold text-slate-700">{transferModal.loan?.book_title}</span>
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email del Receptor</label>
                  <input
                    type="email"
                    value={transferModal.email}
                    onChange={(e) => setTransferModal(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="usuario@ejemplo.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setTransferModal({ isOpen: false, loan: null, email: '' })}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleTransfer}
                disabled={isInitiatingTransfer || !transferModal.email}
                className="flex items-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
              >
                {isInitiatingTransfer ? 'Enviando...' : 'Enviar Invitación'}
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

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
              {hasLoans && (hasReservations || hasTransfers) && ' · '}
              {hasReservations && `${reservations.length} reserva${reservations.length !== 1 ? 's' : ''} activa${reservations.length !== 1 ? 's' : ''}`}
              {hasReservations && hasTransfers && ' · '}
              {hasTransfers && `${transfers.length} transferenc. entrante${transfers.length !== 1 ? 's' : ''}`}
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
            {!hasLoans && !hasReservations && !hasTransfers && (
              <div className="py-10 text-center">
                <p className="text-slate-400 text-sm">No tienes actividad pendiente en este momento.</p>
              </div>
            )}

            {/* Incoming Transfers */}
            {hasTransfers && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3 px-1">
                  Transferencias Entrantes
                </h3>
                <div className="space-y-2">
                  {transfers.map((t) => (
                    <TransferRow
                      key={t.id}
                      transfer={t}
                      onAccept={(id) => handleAction(() => acceptTransfer(id), 'Error al aceptar.')}
                      onReject={(id) => handleAction(() => rejectTransfer(id), 'Error al rechazar.')}
                      isActioning={isAccepting || isRejecting}
                    />
                  ))}
                </div>
              </section>
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
                      onReturn={(id) => handleAction(() => returnBook(id), "Error al devolver el libro")}
                      onTransfer={(loan) => setTransferModal({ isOpen: true, loan, email: '' })}
                      onCancelTransfer={(id) => handleAction(() => cancelLoanTransfer(id), "Error al cancelar la transferencia")}
                      isReturning={isReturning}
                      isCancelling={isCancellingTransfer}
                      isPendingTransfer={isInitiatingTransfer && transferModal.loan?.id === loan.id}
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

      {/* Transfer Modal */}
      {transferModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Transferir Libro</h2>
                  <p className="text-sm text-slate-500 mt-1">El receptor debe aceptar la transferencia.</p>
                </div>
                <button 
                  onClick={() => setTransferModal({ ...transferModal, isOpen: false })}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 mb-6 border border-purple-100">
                <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">Libro a transferir</p>
                <p className="font-semibold text-purple-900">{transferModal.loan?.book_title}</p>
                <p className="text-sm text-purple-700">{transferModal.loan?.book_author}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Email del receptor
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={transferModal.email}
                    onChange={(e) => setTransferModal({ ...transferModal, email: e.target.value })}
                    placeholder="ejemplo@correo.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setTransferModal({ ...transferModal, isOpen: false })}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!transferModal.loan || !transferModal.email) return;
                      await handleAction(
                        () => initiateTransfer({ loanId: transferModal.loan!.id, email: transferModal.email }),
                        "Error al iniciar transferencia"
                      );
                      setTransferModal({ ...transferModal, isOpen: false });
                    }}
                    disabled={isInitiatingTransfer || !transferModal.email}
                    className="flex-1 px-4 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
                  >
                    {isInitiatingTransfer ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Transferir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
