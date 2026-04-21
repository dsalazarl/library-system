import { useState } from 'react';
import type { Book, BookFormData } from '../../hooks/useBooks';

interface BookFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BookFormData) => Promise<void>;
  initialData?: Book;
  isSubmitting: boolean;
}

const GENRES = [
  { value: 'fiction', label: 'Ficción' },
  { value: 'non_fiction', label: 'No Ficción' },
  { value: 'mystery', label: 'Misterio' },
  { value: 'sci_fi', label: 'Ciencia Ficción' },
  { value: 'fantasy', label: 'Fantasía' },
  { value: 'biography', label: 'Biografía' },
  { value: 'history', label: 'Historia' },
  { value: 'romance', label: 'Romance' },
  { value: 'horror', label: 'Terror' },
  { value: 'classics', label: 'Clásicos' },
];

const getInitialFormData = (book?: Book): BookFormData => ({
  title: book?.title || '',
  author: book?.author || '',
  isbn: book?.isbn || '',
  publication_year: book?.publication_year || null,
  genre: book?.genre || '',
  publisher: book?.publisher || '',
  description: book?.description || '',
  copies_count: 1,
});

export default function BookFormModal({ isOpen, onClose, onSubmit, initialData, isSubmitting }: BookFormModalProps) {
  const [formData, setFormData] = useState<BookFormData>(() => getInitialFormData(initialData));
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setFormData(getInitialFormData(initialData));
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit(formData);
      setFormData(getInitialFormData());
      onClose();
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { non_field_errors?: string[], error?: string } } };
      const msg = errorResponse.response?.data?.non_field_errors?.[0] || 
                  errorResponse.response?.data?.error || 
                  'Error al guardar el libro. Verifique que no exista ya.';
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose}></div>
      <div className="relative w-full max-w-lg mx-auto my-6 z-50 px-4">
        <div className="relative flex flex-col w-full bg-white border-0 rounded-lg shadow-lg outline-none focus:outline-none">
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-solid rounded-t border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800">
              {initialData ? 'Editar Libro' : 'Añadir Nuevo Libro'}
            </h3>
            <button
              className="p-1 ml-auto bg-transparent border-0 text-slate-400 float-right text-3xl leading-none font-semibold outline-none focus:outline-none hover:text-slate-600 transition-colors"
              onClick={handleClose}
            >
              <span className="block w-6 h-6 text-2xl outline-none focus:outline-none">×</span>
            </button>
          </div>

          {/* Body */}
          <div className="relative p-6 flex-auto max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-2">
                <span className="font-bold">!</span> {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} id="book-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 transition-all"
                    placeholder="El Gran Gatsby"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Autor *</label>
                  <input
                    type="text"
                    required
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 transition-all"
                    placeholder="F. Scott Fitzgerald"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ISBN</label>
                  <input
                    type="text"
                    value={formData.isbn || ''}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 transition-all"
                    placeholder="Opcional"
                  />
                </div>

                {!initialData && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Copias *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.copies_count ?? 1}
                      onChange={(e) =>
                        setFormData({ ...formData, copies_count: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 transition-all"
                    />
                  </div>
                )}

                {initialData && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Año Publicación</label>
                      <input
                        type="number"
                        value={formData.publication_year || ''}
                        onChange={(e) => setFormData({ ...formData, publication_year: parseInt(e.target.value) || null })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 transition-all"
                        placeholder="Ej: 1925"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Género</label>
                      <select
                        value={formData.genre || ''}
                        onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 transition-all"
                      >
                        <option value="">Seleccionar...</option>
                        {GENRES.map(g => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Editorial</label>
                      <input
                        type="text"
                        value={formData.publisher || ''}
                        onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 transition-all"
                        placeholder="Editorial"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Sinopsis</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 transition-all min-h-[100px]"
                        placeholder="Descripción del libro..."
                      />
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t border-solid rounded-b border-slate-200 gap-3">
            <button
              className="px-5 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-all outline-none focus:outline-none disabled:opacity-50"
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              className="px-5 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow transition-all outline-none focus:outline-none disabled:opacity-50"
              type="submit"
              form="book-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
