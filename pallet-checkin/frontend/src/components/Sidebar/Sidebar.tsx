import { ArrowLeftRight, Box, FileText, LayoutGrid, Layers, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Visão Geral', icon: LayoutGrid, end: true },
  { to: '/dashboard/estantes', label: 'Estantes', icon: Layers, end: false },
  { to: '/dashboard/movimentacoes', label: 'Movimentações', icon: ArrowLeftRight, end: false },
  { to: '/dashboard/produtos', label: 'Produtos', icon: Box, end: false },
  { to: '/dashboard/relatorios', label: 'Relatórios', icon: FileText, end: false },
];

export function Sidebar() {
  const { setToken } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img
          src="/logo-pantex-sophisticated.svg"
          alt="Pantex Embalagens Industriais"
          className="sidebar__logo"
        />
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `sidebar__item${isActive ? ' sidebar__item--active' : ''}`
            }
          >
            <Icon className="sidebar__item-icon" size={18} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <button type="button" className="sidebar__logout" onClick={() => setToken(null)}>
        <LogOut className="sidebar__item-icon" size={18} aria-hidden="true" />
        Log out
      </button>

      <div className="sidebar__footer">
        <span className="sidebar__footer-brand">PANTEX</span>
        <span className="sidebar__footer-tagline">Warehouse control</span>
      </div>
    </aside>
  );
}
