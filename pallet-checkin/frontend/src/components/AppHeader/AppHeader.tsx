import type { ReactNode } from 'react';
import './AppHeader.css';

interface AppHeaderProps {
  subtitle?: string;
  children?: ReactNode;
}

export function AppHeader({ subtitle, children }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <img
          src="/logo-pantex-sophisticated.svg"
          alt="Pantex Embalagens Industriais"
          className="app-header__logo"
        />
        {subtitle && <h1 className="app-header__subtitle">{subtitle}</h1>}
      </div>

      {children && <div className="app-header__right">{children}</div>}
    </header>
  );
}
