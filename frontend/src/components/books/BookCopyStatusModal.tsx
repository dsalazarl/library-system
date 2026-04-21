import { useState, useEffect } from 'react';
import { X, User, Clock, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import type { Book } from '../../hooks/useBooks';

interface CopyStatus {
  id: string;
  status: string;
  current_user: string | null;
  expires_at: string | null;
}

interface BookCopyStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  available: { label: 'Disponible', color: 'bg-emerald-100 text-emerald-700' },
  reserved: { label: 'Reservado', color: 'bg-amber-100 text-amber-700' },
  borrowed: { label: 'Prestado', color: 'bg-sky-100 text-sky-700' },
  pending_transfer: { label: 'Transf. Pendiente', color: 'bg-indigo-100 text-indigo-700' },
  deleted_by_librarian: { label: 'Eliminado', color: 'bg-slate-100 text-slate-500' },
};

export default function BookCopyStatusModal({ isOpen, onClose, book }: BookCopyStatusModalProps) {
  const [copies, setCopies] = useState<CopyStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchStatus = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const { data } = await api.get(`/books/${book.id}/copies_status/`);
          setCopies(data);
        } catch {
          setError('No se pudo cargar la información de las copias.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchStatus();
    }
  }, [isOpen, book.id]);

  if (!isOpen) return null;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl mx-auto my-6 z-50 px-4">
        <div className="relative flex flex-col w-full bg-white border-0 rounded-xl shadow-2xl outline-none focus:outline-none overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Estado de Copias</h3>
              <p className="text-sm text-slate-500 font-medium">{book.title} — {book.author}</p>
            </div>
            <button
              className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-all"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="relative p-6 flex-auto max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Cargando detalles...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-10 w-10 text-red-400 mb-2" />
                <p className="text-slate-600">{error}</p>
              </div>
            ) : copies.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No hay copias registradas para este libro.</div>
            ) : (
              <div className="grid gap-4">
                {copies.map((copy, index) => {
                  const statusInfo = STATUS_LABELS[copy.status] || { label: copy.status, color: 'bg-slate-100' };
                  return (
                    <div 
                      key={copy.id}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-sky-100 hover:bg-sky-50/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 shadow-sm">
                          {index + 1}
                        </div>
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">{copy.id.split('-')[0]}...</div>
                        </div>
                      </div>

                      {copy.current_user && (
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-sm text-slate-600 font-medium">{copy.current_user}</span>
                          </div>
                          {copy.expires_at && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-sm text-slate-600 font-medium">
                                Vence: <span className="text-slate-900">{formatTime(copy.expires_at)}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {!copy.current_user && copy.status === 'available' && (
                        <div className="text-xs text-emerald-600 font-medium italic">Lista para préstamo</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-end">
            <button
              className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all text-sm font-semibold shadow-md active:scale-95"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
