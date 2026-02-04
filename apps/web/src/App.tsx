import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from './lib/auth-client';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import RoutesHub from './pages/RoutesHub';
import RouteDetail from './pages/RouteDetail';
import CreateRoute from './pages/CreateRoute';
import Leaderboard from './pages/Leaderboard';
import Friends from './pages/Friends';
import UserProfile from './pages/UserProfile';

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-hold-pink border-r-transparent"></div>
        <p className="mt-4 text-climb-dark/60 font-bold">Chargement...</p>
      </div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <LoadingSpinner />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public route wrapper - redirect to dashboard if already logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <LoadingSpinner />;
  }

  if (session) {
    return <Navigate to="/routes" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/routes"
          element={
            <ProtectedRoute>
              <RoutesHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/routes/create"
          element={
            <ProtectedRoute>
              <CreateRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/routes/:id"
          element={
            <ProtectedRoute>
              <RouteDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <Friends />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
