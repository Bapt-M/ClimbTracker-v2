import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useSession, signOut } from './lib/auth-client';
import Login from './pages/Login';
import Register from './pages/Register';

function Home() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">ClimbTracker v2</h1>
          <nav className="flex items-center gap-4">
            {session ? (
              <>
                <span className="text-gray-600">
                  Bonjour, {session.user.name}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-red-600 hover:text-red-800"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-blue-600 hover:text-blue-800">
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {session ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Bienvenue sur ClimbTracker v2!</h2>
            <p className="text-gray-600 mb-4">
              Migration en cours... Les fonctionnalités seront ajoutées progressivement.
            </p>
            <div className="bg-gray-50 rounded p-4">
              <h3 className="font-medium mb-2">Informations utilisateur:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><strong>ID:</strong> {session.user.id}</li>
                <li><strong>Nom:</strong> {session.user.name}</li>
                <li><strong>Email:</strong> {session.user.email}</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Bienvenue sur ClimbTracker
            </h2>
            <p className="text-gray-600 mb-8">
              Connectez-vous pour accéder à votre espace grimpeur
            </p>
            <div className="flex justify-center gap-4">
              <Link
                to="/login"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Se connecter
              </Link>
              <Link
                to="/register"
                className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Protected routes will go here */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
