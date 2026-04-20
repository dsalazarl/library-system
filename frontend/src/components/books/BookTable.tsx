import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, X } from 'lucide-react';
import { useBooks, type Book, type BookFormData } from '../../hooks/useBooks';
import { useAuthStore } from '../../store/authStore';
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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <SortableHeader column="title" label="Título" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader column="author" label="Autor" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader column="isbn" label="ISBN" sortConfig={sortConfig} onSort={handleSort} />
              <th className="px-6 py-3 font-medium">Copias Disponibles</th>
              {isLibrarian && <th className="px-6 py-3 font-medium text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {processedBooks.length === 0 ? (
              <tr>
                <td
                  colSpan={isLibrarian ? 5 : 4}
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
                      <button
                        onClick={() => handleEdit(book)}
                        className="text-sky-600 hover:text-sky-800 mr-4 font-medium text-sm transition-colors"
                      >
                        Editar
                      </button>

                      {/* Delete button with tooltip when disabled */}
                      <span className="relative inline-block group">
                        <button
                          onClick={() => book.can_delete && handleDeleteClick(book)}
                          disabled={isDeleting || !book.can_delete}
                          className={`font-medium text-sm transition-colors ${
                            book.can_delete
                              ? 'text-red-500 hover:text-red-700 cursor-pointer'
                              : 'text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          Eliminar
                        </button>

                        {/* Tooltip — only visible when can_delete is false */}
                        {!book.can_delete && (
                          <span
                            role="tooltip"
                            className="
                              absolute bottom-full right-0 mb-2 z-20
                              w-64 px-3 py-2 text-xs leading-snug text-white
                              bg-slate-700 rounded-md shadow-lg
                              opacity-0 group-hover:opacity-100
                              transition-opacity duration-150
                              pointer-events-none
                            "
                          >
                            No se puede eliminar un libro sin que todas sus copias hayan sido devueltas.
                            <span className="absolute top-full right-4 border-4 border-transparent border-t-slate-700" />
                          </span>
                        )}
                      </span>
                    </td>
                  )}
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
