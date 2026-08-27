import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Box,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutGrid,
  Layers,
  LogOut,
} from 'lucide-react';
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

// UI preference only (not sensitive) — fine to persist directly in
// localStorage rather than wiring up a backend setting for it.
const COLLAPSED_STORAGE_KEY = 'pantex-sidebar-collapsed';

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function Sidebar() {
  const { setToken } = useAuth();
  const [collapsed, setCollapsed] = useState(readStoredCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch {
      // Private browsing / storage disabled — the toggle still works for
      // the current session, it just won't persist across reloads.
    }
  }, [collapsed]);

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <img
          src={collapsed ? '/favicon.svg' : '/logo-pantex-sophisticated.svg'}
          alt="Pantex Embalagens Industriais"
          className={`sidebar__logo${collapsed ? ' sidebar__logo--mark' : ''}`}
        />
        <button
          type="button"
          className="sidebar__toggle"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <ChevronRight size={15} aria-hidden="true" />
          ) : (
            <ChevronLeft size={15} aria-hidden="true" />
          )}
        </button>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              `sidebar__item${isActive ? ' sidebar__item--active' : ''}`
            }
          >
            <Icon className="sidebar__item-icon" size={18} aria-hidden="true" />
            <span className="sidebar__item-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="sidebar__logout"
        onClick={() => setToken(null)}
        title="Log out"
      >
        <LogOut className="sidebar__item-icon" size={18} aria-hidden="true" />
        <span className="sidebar__item-label">Log out</span>
      </button>

      <div className="sidebar__footer">
        <span className="sidebar__footer-brand">PANTEX</span>
        <span className="sidebar__footer-tagline">Warehouse control</span>
      </div>
    </aside>
  );
}
