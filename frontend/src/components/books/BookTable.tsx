import { useState } from 'react';
import { useBooks, type Book, type BookFormData } from '../../hooks/useBooks';
import { useAuthStore } from '../../store/authStore';
import BookFormModal from './BookFormModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

export default function BookTable() {
  const { books, isLoading, error, createBook, isCreating, updateBook, isUpdating, deleteBook, isDeleting } = useBooks();
  const { user } = useAuthStore();
  const isLibrarian = user?.role === 'librarian';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | undefined>(undefined);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

  const handleAdd = () => {
    setEditingBook(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
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

  if (isLoading) return <div className="p-4 text-slate-500">Cargando libros...</div>;
  if (error) return <div className="p-4 text-red-500">Error al cargar los libros.</div>;

  return (
    <div className="bg-white rounded-lg shadow mt-6">
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">Catálogo de Libros</h2>
        {isLibrarian ? (
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
          >
            Añadir Nuevo Libro
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm uppercase">
              <th className="px-6 py-3 font-medium">Título</th>
              <th className="px-6 py-3 font-medium">Autor</th>
              <th className="px-6 py-3 font-medium">ISBN</th>
              <th className="px-6 py-3 font-medium">Copias Disponibles</th>
              {isLibrarian ? <th className="px-6 py-3 font-medium text-right">Acciones</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {books.length === 0 ? (
              <tr>
                <td colSpan={isLibrarian ? 4 : 3} className="px-6 py-8 text-center text-slate-500">
                  No se encontraron libros en el catálogo.
                </td>
              </tr>
            ) : (
              books.map((book) => (
                <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{book.title}</td>
                  <td className="px-6 py-4 text-slate-600">{book.author}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{book.isbn || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      book.available_copies_count > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {book.available_copies_count} / {book.total_copies_count}
                    </span>
                  </td>
                  {isLibrarian ? (
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(book)}
                        className="text-sky-600 hover:text-sky-900 mr-4 font-medium transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteClick(book)}
                        disabled={isDeleting}
                        className="text-red-600 hover:text-red-900 font-medium disabled:opacity-50 transition-colors"
                      >
                        Eliminar
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BookFormModal
        key={editingBook?.id || 'new-book'}
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
        title={bookToDelete?.title || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
}
