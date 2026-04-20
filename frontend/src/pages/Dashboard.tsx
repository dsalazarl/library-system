import { useAuthStore } from '../store/authStore';
import { BookOpen, LogOut } from 'lucide-react';
import BookTable from '../components/books/BookTable';

export default function Dashboard() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  const isLibrarian = user?.role === 'librarian';
  const pageTitle = isLibrarian ? 'Bienvenido al Panel de Bibliotecario' : 'Bienvenido a la Biblioteca';
  const pageSubtitle = isLibrarian 
    ? 'Aquí podrás agregar, quitar y modificar libros en el catálogo.' 
    : 'Aquí podrás buscar libros, reservarlos y pedir préstamos.';
  const bgClass = isLibrarian ? 'bg-sky-200' : 'bg-slate-50';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${bgClass}`}>
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="shrink-0 flex items-center">
                <BookOpen className="h-8 w-8 text-sky-500" />
                <span className="ml-2 text-xl font-bold text-slate-900">Biblioteca</span>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-slate-600 mr-4">Hola, {user?.username}</span>
              <button
                onClick={logout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-8 mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">{pageTitle}</h1>
          <p className="text-slate-600">
            {pageSubtitle}
          </p>
        </div>

        <BookTable />
      </main>
    </div>
  );
}
