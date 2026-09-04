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
  Users,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth, useRole } from '../../services/auth';
import type { Role } from '../../services/auth';
import './Sidebar.css';

// `roles` lists exactly who sees this item — hidden entirely for anyone
// else, not just visually de-emphasized. Omitted means every role sees it
// (currently just Visão Geral: an operator's one job is check-in/check-out
// on the seat map, and VENDEDOR's is viewing it read-only — both need it).
const NAV_ITEMS: Array<{
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  end: boolean;
  roles?: Role[];
}> = [
  { to: '/dashboard', label: 'Visão Geral', icon: LayoutGrid, end: true },
  { to: '/dashboard/estantes', label: 'Estantes', icon: Layers, end: false, roles: ['ADMIN'] },
  {
    to: '/dashboard/movimentacoes',
    label: 'Movimentações',
    icon: ArrowLeftRight,
    end: false,
    roles: ['ADMIN'],
  },
  { to: '/dashboard/produtos', label: 'Produtos', icon: Box, end: false, roles: ['ADMIN'] },
  { to: '/dashboard/vendedores', label: 'Vendedores', icon: Users, end: false, roles: ['ADMIN'] },
  {
    to: '/dashboard/relatorios',
    label: 'Relatórios',
    icon: FileText,
    end: false,
    // VENDEDOR sees a stripped-down Relatórios (Resumo atual only, see
    // RelatoriosPage) — OPERATOR still has no reason to be here at all.
    roles: ['ADMIN', 'VENDEDOR'],
  },
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
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));

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
