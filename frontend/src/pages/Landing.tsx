import { Link } from 'react-router-dom';
import { BookOpen, Search, Book, Clock, RefreshCw, LogIn } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-sky-500" />
              <span className="ml-2 text-xl font-bold text-slate-900">Biblioteca</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-black hover:bg-slate-800 transition-colors"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-50 pt-16 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center lg:text-left lg:grid lg:grid-cols-2 lg:gap-8 items-center">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl md:text-6xl tracking-tight">
                Tu próxima aventura <br />
                <span className="text-sky-500 font-serif italic">comienza aquí.</span>
              </h1>
              <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0">
                Descubre miles de historias, gestiona tus lecturas y comparte el conocimiento. 
                Nuestra biblioteca digital está diseñada para acompañarte en cada página.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                <Link
                  to="/register"
                  className="px-8 py-3 bg-black text-white font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl text-center"
                >
                  Únete ahora
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-3 bg-white text-slate-900 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-center"
                >
                  Explorar catálogo
                </Link>
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="absolute -inset-4 bg-sky-200/50 rounded-full blur-3xl animate-pulse"></div>
              <div className="relative glass-panel p-2 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <img 
                  src="/assets/landing-hero.png" 
                  alt="Library" 
                  className="rounded-xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Todo lo que puedes hacer</h2>
            <p className="mt-4 text-slate-600">Diseñado para amantes de la lectura como tú.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<Search className="h-6 w-6 text-sky-500" />}
              title="Busca y Filtra"
              description="Encuentra exactamente lo que buscas por título, autor o género en segundos."
            />
            <FeatureCard 
              icon={<Book className="h-6 w-6 text-sky-500" />}
              title="Préstamos Simples"
              description="Solicita libros con un clic. Sin papeleo, totalmente digital."
            />
            <FeatureCard 
              icon={<Clock className="h-6 w-6 text-sky-500" />}
              title="Control Total"
              description="Sigue el estado de tus préstamos y recibe alertas de vencimiento."
            />
            <FeatureCard 
              icon={<RefreshCw className="h-6 w-6 text-sky-500" />}
              title="Transfiere Lecturas"
              description="¿Quieres pasarle un libro a un amigo? Transfiere tu préstamo de forma segura."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-8 mb-8">
            <div className="flex items-center mb-4 md:mb-0">
              <BookOpen className="h-8 w-8 text-sky-500" />
              <span className="ml-2 text-xl font-bold text-white">Biblioteca</span>
            </div>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Términos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Contacto</a>
            </div>
          </div>
          <p className="text-center text-sm">
            © {new Date().getFullYear()} Sistema de Biblioteca. Hecho con ❤️ para lectores.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl transition-all group">
      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
