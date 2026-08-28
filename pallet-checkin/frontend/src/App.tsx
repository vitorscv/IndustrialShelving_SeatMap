import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthContext } from './services/auth';
import { LoginPage } from './pages/login/LoginPage';
import { DashboardLayout } from './pages/dashboard/DashboardLayout';
import { OverviewPage } from './pages/dashboard/OverviewPage';
import { EstantesPage } from './pages/dashboard/EstantesPage';
import { MovementsPage } from './pages/dashboard/MovementsPage';
import { ProdutosPage } from './pages/dashboard/ProdutosPage';
import { RelatoriosPage } from './pages/dashboard/RelatoriosPage';
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
          <Route path="estantes" element={<EstantesPage />} />
          <Route path="movimentacoes" element={<MovementsPage />} />
          <Route path="produtos" element={<ProdutosPage />} />
          <Route path="relatorios" element={<RelatoriosPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
