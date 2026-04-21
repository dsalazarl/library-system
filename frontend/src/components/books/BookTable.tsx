import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, X, Clock, ShoppingBag, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { useBooks, type Book, type BookFormData } from '../../hooks/useBooks';
import { useAuthStore } from '../../store/authStore';
import { useReservations } from '../../hooks/useReservations';
import { useLoans } from '../../hooks/useLoans';
import BookFormModal from './BookFormModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

type SortKey = 'title' | 'author' | 'isbn';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />;
  return direction === 'asc'
    ? <ChevronUp className="h-3.5 w-3.5 text-sky-600" />
    : <ChevronDown className="h-3.5 w-3.5 text-sky-600" />;
}

interface SortableHeaderProps {
  column: SortKey;
  label: string;
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;
}

function SortableHeader({ column, label, sortConfig, onSort }: SortableHeaderProps) {
  return (
    <th
      className="px-6 py-3 font-medium cursor-pointer select-none group"
      onClick={() => onSort(column)}
    >
      <span className="flex items-center gap-1 hover:text-sky-700 transition-colors">
        {label}
        <SortIcon active={sortConfig.key === column} direction={sortConfig.direction} />
      </span>
    </th>
  );
}

export default function BookTable() {
  const { books, isLoading, error, createBook, isCreating, updateBook, isUpdating, deleteBook, isDeleting } = useBooks();
  const { user } = useAuthStore();
  const isLibrarian = user?.role === 'librarian';
  const isLibraryUser = user?.role === 'library_user';

  // Reservations & loans (only used for library_user role)
  const {
    reservations,
    reserveBook,
    isReserving,
    checkoutFromReservation,
    isCheckingOut: isCheckingOutFromReservation,
  } = useReservations();
  const { loans, checkoutBook, isCheckingOut } = useLoans();

  // Track per-book pending actions to show spinner on correct row
  const [pendingBookId, setPendingBookId] = useState<string | null>(null);

  // Sets of book IDs already reserved/borrowed by the current user
  const reservedBookIds = new Set(reservations.map((r) => r.book_id));
  const borrowedBookIds = new Set(loans.map((l) => l.book_id));

  const [actionError, setActionError] = useState<string | null>(null);

  const handleReserve = async (book: Book) => {
    setActionError(null);
    setPendingBookId(book.id);
    try {
      await reserveBook(book.id);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setActionError(msg ?? 'Error al reservar.');
    } finally {
      setPendingBookId(null);
    }
  };

  const handleCheckout = async (book: Book) => {
    setActionError(null);
    setPendingBookId(book.id);
    try {
      // If user has an active reservation for this book, convert it; otherwise do direct checkout
      const reservation = reservations.find((r) => r.book_id === book.id);
      if (reservation) {
        await checkoutFromReservation(reservation.id);
      } else {
        await checkoutBook(book.id);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setActionError(msg ?? 'Error al pedir prestado.');
    } finally {
      setPendingBookId(null);
    }
  };

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalOpenKey, setModalOpenKey] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | undefined>(undefined);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

  // Sorting — default: title ascending
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'title', direction: 'asc' });

  // Search/filter
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<SortKey>('title');

  // --- Handlers ---
  const handleAdd = () => {
    setEditingBook(undefined);
    setModalOpenKey((k) => k + 1);
    setIsModalOpen(true);
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setModalOpenKey((k) => k + 1);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (book: Book) => {
    setBookToDelete(book);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (bookToDelete) {
      await deleteBook(bookToDelete.id);
      setIsDeleteModalOpen(false);
      setBookToDelete(null);
    }
  };

  const handleModalSubmit = async (data: BookFormData) => {
    if (editingBook) {
      await updateBook({ id: editingBook.id, ...data });
    } else {
      await createBook(data);
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // --- Derived data: filter + sort ---
  const processedBooks = useMemo(() => {
    let result = [...books];

    // Filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((book) => {
        const value = book[searchField];
        return (value ?? '').toLowerCase().includes(q);
      });
    }

    // Sort
    result.sort((a, b) => {
      const aVal = (a[sortConfig.key] ?? '').toLowerCase();
      const bVal = (b[sortConfig.key] ?? '').toLowerCase();
      const cmp = aVal.localeCompare(bVal, 'es', { sensitivity: 'base' });
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [books, searchQuery, searchField, sortConfig]);

  const showScroll = processedBooks.length > 10;

  // --- Render ---
  if (isLoading) return <div className="p-4 text-slate-500">Cargando libros...</div>;
  if (error) return <div className="p-4 text-red-500">Error al cargar los libros.</div>;



  return (
    <div className="bg-white rounded-lg shadow mt-6">
      {/* Table header */}
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">Catálogo de Libros</h2>
        {isLibrarian && (
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors text-sm font-medium"
          >
            Añadir Nuevo Libro
          </button>
        )}
      </div>

      {/* Search / Filter bar */}
      <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all bg-slate-50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as SortKey)}
          className="px-3 py-2 border border-slate-200 rounded-md text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-slate-50 transition-all"
        >
          <option value="title">Por Título</option>
          <option value="author">Por Autor</option>
          <option value="isbn">Por ISBN</option>
        </select>

        {searchQuery && (
          <span className="text-xs text-slate-400">
            {processedBooks.length} resultado{processedBooks.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Action error banner */}
      {actionError && (
        <div className="mx-6 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600 font-medium">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 ml-3">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className={`overflow-x-auto ${showScroll ? 'max-h-[600px] overflow-y-auto' : ''}`}>
        <table className="w-full text-left border-collapse">
          <thead className={showScroll ? 'sticky top-0 z-10' : ''}>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
              <SortableHeader column="title" label="Título" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader column="author" label="Autor" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader column="isbn" label="ISBN" sortConfig={sortConfig} onSort={handleSort} />
              <th className="px-6 py-3 font-medium">Copias Disponibles</th>
              {isLibrarian && <th className="px-6 py-3 font-medium text-right">Acciones</th>}
              {isLibraryUser && <th className="px-6 py-3 font-medium text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {processedBooks.length === 0 ? (
              <tr>
                <td
                  colSpan={isLibrarian || isLibraryUser ? 5 : 4}
                  className="px-6 py-10 text-center text-slate-400 text-sm"
                >
                  {searchQuery
                    ? `No se encontraron libros con "${searchQuery}".`
                    : 'No hay libros en el catálogo aún.'}
                </td>
              </tr>
            ) : (
              processedBooks.map((book) => (
                <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{book.title}</td>
                  <td className="px-6 py-4 text-slate-600">{book.author}</td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{book.isbn || '—'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        book.available_copies_count > 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {book.available_copies_count} / {book.total_copies_count}
                    </span>
                  </td>
                  {isLibrarian && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleEdit(book)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg transition-colors border border-sky-200 text-xs font-semibold shadow-sm"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>

                        {/* Delete button with tooltip when disabled */}
                        <span className="relative inline-flex group">
                          <button
                            onClick={() => book.can_delete && handleDeleteClick(book)}
                            disabled={isDeleting || !book.can_delete}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-semibold border shadow-sm ${
                              book.can_delete
                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 cursor-pointer'
                                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                            }`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Eliminar
                          </button>

                          {/* Tooltip — only visible when can_delete is false */}
                          {!book.can_delete && (
                            <span
                              role="tooltip"
                              className="
                                absolute bottom-full right-0 mb-2 z-20
                                w-max max-w-[200px] px-2.5 py-1.5 text-xs text-center text-white
                                bg-slate-700 rounded-md shadow-lg
                                opacity-0 group-hover:opacity-100
                                transition-opacity duration-200
                                pointer-events-none
                              "
                            >
                              No se puede eliminar: existen copias reservadas o prestadas.
                              <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-700" />
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                  )}

                  {/* Library user actions */}
                  {isLibraryUser && (() => {
                    const isReserved = reservedBookIds.has(book.id);
                    const isBorrowed = borrowedBookIds.has(book.id);
                    const noneAvailable = book.available_copies_count === 0;
                    const isPending = pendingBookId === book.id;
                    const anyPending = isReserving || isCheckingOut || isCheckingOutFromReservation;

                    return (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {/* Reserve button */}
                          <span className="relative inline-flex group">
                            <button
                              onClick={() => !isReserved && !isBorrowed && !noneAvailable && handleReserve(book)}
                              disabled={isPending || anyPending || isReserved || isBorrowed || noneAvailable}
                              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border w-28 ${
                                isReserved
                                  ? 'bg-amber-100 text-amber-700 border-amber-200 cursor-not-allowed opacity-80 shadow-sm'
                                  : isBorrowed || noneAvailable
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 hover:scale-[1.02] active:scale-[0.98] cursor-pointer border-amber-200/50 shadow-sm'
                              }`}
                            >
                              <Clock className="h-3.5 w-3.5" />
                              {isReserved ? 'Reservado' : 'Reservar'}
                            </button>
                            
                            {/* Terms tooltip (Duration) */}
                            {!isReserved && !isBorrowed && !noneAvailable && (
                              <span role="tooltip" className="absolute bottom-full right-0 mb-2 z-20 w-max whitespace-nowrap px-2.5 py-1.5 text-xs text-center text-white bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                1 hora de duración.
                                <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-700" />
                              </span>
                            )}

                            {(isBorrowed || isReserved || (noneAvailable && !isReserved)) && (
                              <span role="tooltip" className="absolute bottom-full right-0 mb-2 z-20 w-max whitespace-nowrap px-2.5 py-1.5 text-xs text-center text-white bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {isReserved ? 'Ya tienes este libro en reserva.' : isBorrowed ? 'Ya tienes este libro en préstamo.' : 'Sin copias disponibles.'}
                                <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-700" />
                              </span>
                            )}
                          </span>

                          {/* Checkout button */}
                          <span className="relative inline-flex group">
                            <button
                              onClick={() => !isBorrowed && (isReserved || !noneAvailable) && handleCheckout(book)}
                              disabled={isPending || anyPending || isBorrowed || (!isReserved && noneAvailable)}
                              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-sm w-36 ${
                                isBorrowed
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                  : (!isReserved && noneAvailable)
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100 hover:scale-[1.02] active:scale-[0.98] cursor-pointer border-sky-200/50'
                              }`}
                            >
                              <ShoppingBag className="h-3.5 w-3.5" />
                              {isBorrowed ? 'Prestado' : 'Pedir prestado'}
                            </button>
                            
                            {/* Terms tooltip (Duration) */}
                            {!isBorrowed && (isReserved || !noneAvailable) && (
                              <span role="tooltip" className="absolute bottom-full right-0 mb-2 z-20 w-max whitespace-nowrap px-2.5 py-1.5 text-xs text-center text-white bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                2 días de duración.
                                <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-700" />
                              </span>
                            )}

                            {isBorrowed && (
                              <span role="tooltip" className="absolute bottom-full right-0 mb-2 z-20 w-max whitespace-nowrap px-2.5 py-1.5 text-xs text-center text-white bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                Ya tienes este libro en préstamo.
                                <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-700" />
                              </span>
                            )}

                            {(!isReserved && noneAvailable && !isBorrowed) && (
                              <span role="tooltip" className="absolute bottom-full right-0 mb-2 z-20 w-max whitespace-nowrap px-2.5 py-1.5 text-xs text-center text-white bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                Sin copias disponibles.
                                <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-700" />
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                    );
                  })()}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <BookFormModal
        key={`${editingBook?.id ?? 'new'}-${modalOpenKey}`}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingBook}
        isSubmitting={isCreating || isUpdating}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={bookToDelete?.title ?? ''}
        isDeleting={isDeleting}
      />
    </div>
  );
}
