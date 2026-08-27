import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthContext } from './services/auth';
import { LoginPage } from './pages/login/LoginPage';
import { DashboardLayout } from './pages/dashboard/DashboardLayout';
import { OverviewPage } from './pages/dashboard/OverviewPage';
import { MovementsPage } from './pages/dashboard/MovementsPage';
import { ComingSoonPage } from './pages/dashboard/ComingSoonPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

function App() {
  const [token, setToken] = useState<string | null>(null);

  return (
    <AuthContext.Provider value={{ token, setToken }}>
      <Routes>
        {/* Standalone operation page was retired — operators now use the
            dashboard's "Movimentar" popup (MovementModal) instead. */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          {/* No dedicated shelf list yet — reuses the same Visão Geral view. */}
          <Route path="estantes" element={<OverviewPage />} />
          <Route path="movimentacoes" element={<MovementsPage />} />
          <Route path="produtos" element={<ComingSoonPage title="Produtos" />} />
          <Route path="relatorios" element={<ComingSoonPage title="Relatórios" />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
