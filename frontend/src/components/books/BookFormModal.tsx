import { useState } from 'react';
import type { Book, BookFormData } from '../../hooks/useBooks';

interface BookFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BookFormData) => Promise<void>;
  initialData?: Book;
  isSubmitting: boolean;
}

export default function BookFormModal({ isOpen, onClose, onSubmit, initialData, isSubmitting }: BookFormModalProps) {
  const [formData, setFormData] = useState<BookFormData>({
    title: initialData?.title || '',
    author: initialData?.author || '',
    isbn: initialData?.isbn || '',
    copies_count: 0,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative w-full max-w-md mx-auto my-6 z-50 px-4">
        <div className="relative flex flex-col w-full bg-white border-0 rounded-lg shadow-lg outline-none focus:outline-none">
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-solid rounded-t border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800">
              {initialData ? 'Editar Libro' : 'Añadir Nuevo Libro'}
            </h3>
            <button
              className="p-1 ml-auto bg-transparent border-0 text-slate-400 float-right text-3xl leading-none font-semibold outline-none focus:outline-none hover:text-slate-600 transition-colors"
              onClick={onClose}
            >
              <span className="block w-6 h-6 text-2xl outline-none focus:outline-none">×</span>
            </button>
          </div>
          {/* Body */}
          <div className="relative p-6 flex-auto">
            <form onSubmit={handleSubmit} id="book-form">
              <div className="mb-4">
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
              <div className="mb-4">
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
              <div className="mb-4">
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
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número de copias</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.copies_count}
                    onChange={(e) => setFormData({ ...formData, copies_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 transition-all"
                  />
                </div>
              )}
            </form>
          </div>
          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t border-solid rounded-b border-slate-200">
            <button
              className="px-6 py-2 mb-1 mr-3 text-sm font-bold text-red-500 uppercase transition-all duration-150 ease-linear outline-none background-transparent focus:outline-none hover:bg-red-50 rounded"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              className="px-6 py-3 mb-1 mr-1 text-sm font-bold text-white uppercase transition-all duration-150 ease-linear rounded shadow outline-none bg-sky-600 hover:bg-sky-700 hover:shadow-lg focus:outline-none disabled:opacity-50"
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
