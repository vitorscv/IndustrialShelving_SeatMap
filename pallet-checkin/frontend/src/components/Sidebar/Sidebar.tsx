import { useState } from 'react';
import {
  ArrowLeftRight,
  Box,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutGrid,
  Layers,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth, useRole } from '../../services/auth';
import './Sidebar.css';

// adminOnly items are hidden entirely for OPERATOR — not just visually
// de-emphasized — since an operator's one job (check-in/check-out on the
// seat map) only ever needs Visão Geral.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Visão Geral', icon: LayoutGrid, end: true, adminOnly: false },
  { to: '/dashboard/estantes', label: 'Estantes', icon: Layers, end: false, adminOnly: true },
  {
    to: '/dashboard/movimentacoes',
    label: 'Movimentações',
    icon: ArrowLeftRight,
    end: false,
    adminOnly: true,
  },
  { to: '/dashboard/produtos', label: 'Produtos', icon: Box, end: false, adminOnly: true },
  { to: '/dashboard/relatorios', label: 'Relatórios', icon: FileText, end: false, adminOnly: true },
];

// UI preference only (not sensitive) — fine to persist directly in
// localStorage rather than wiring up a backend setting for it.
const COLLAPSED_STORAGE_KEY = 'pantex-sidebar-collapsed';

// Tablet width: auto-collapse to the icon-only rail by default, so the
// sidebar doesn't eat into the operational grid's width — but only until
// the operator explicitly overrides it via the toggle (see handleToggle
// below, which is the only place that ever writes to storage; nothing
// here writes eagerly on mount). Phone width is handled separately by the
// off-canvas drawer (mobileOpen), where the collapsed/expanded distinction
// doesn't apply — collapsed stays whatever it last was, simply unused.
function readInitialCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (stored !== null) return stored === 'true';
  } catch {
    // Private browsing / storage disabled — fall through to the
    // viewport-based default below.
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(min-width: 641px) and (max-width: 1024px)').matches;
  }
  return false;
}

export function Sidebar() {
  const { setToken } = useAuth();
  const role = useRole();
  const [collapsed, setCollapsed] = useState(readInitialCollapsed);
  // Off-canvas drawer state at phone width — independent of `collapsed`
  // (which only ever means "icon rail vs. full width" at desktop/tablet).
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || role === 'ADMIN');

  function handleToggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // The toggle still works for the current session either way.
      }
      return next;
    });
  }

  return (
    <>
      <button
        type="button"
        className="sidebar__mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      {mobileOpen && (
        <div
          className="sidebar__backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}${mobileOpen ? ' sidebar--mobile-open' : ''}`}
      >
        <div className="sidebar__brand">
          <img
            src={collapsed && !mobileOpen ? '/favicon.svg' : '/logo-pantex-sophisticated.svg'}
            alt="Pantex Embalagens Industriais"
            className={`sidebar__logo${collapsed && !mobileOpen ? ' sidebar__logo--mark' : ''}`}
          />
          {mobileOpen ? (
            // The icon-rail toggle doesn't apply to an overlay drawer — it's
            // either fully open or fully hidden, so this closes it instead.
            <button
              type="button"
              className="sidebar__toggle"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              title="Fechar menu"
            >
              <X size={15} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="sidebar__toggle"
              onClick={handleToggleCollapsed}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {collapsed ? (
                <ChevronRight size={15} aria-hidden="true" />
              ) : (
                <ChevronLeft size={15} aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        <nav className="sidebar__nav">
          {visibleNavItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              onClick={() => setMobileOpen(false)}
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
    </>
  );
}
