import { AlertCircle, CheckCircle2, Lock, Package } from 'lucide-react';
import type { OccupancySummary as OccupancySummaryData } from '../../../types/position';
import './OccupancySummary.css';

interface OccupancySummaryProps {
  summary: OccupancySummaryData | null;
  loading: boolean;
  error: string | null;
}

function OccupancySummarySkeleton() {
  return (
    <div className="occupancy-summary" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="occupancy-summary__stat occupancy-summary__stat--skeleton">
          <div className="occupancy-summary__skeleton-icon" />
          <div className="occupancy-summary__skeleton-value" />
          <div className="occupancy-summary__skeleton-label" />
        </div>
      ))}
    </div>
  );
}

function occupancyMessage(pct: number): string {
  if (pct < 30) return 'Muito espaço disponível!';
  if (pct < 70) return 'Ocupação moderada';
  if (pct < 90) return 'Estoque quase cheio';
  return 'Capacidade crítica!';
}

function OccupancyGauge({ rate }: { rate: number }) {
  const pct = rate * 100;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - rate);
  // Muted below 70% (the "nothing to worry about" range) so this doesn't
  // compete as its own bright accent — vivid color here is reserved for
  // when occupancy is genuinely high enough to be a real signal.
  const strokeColor =
    pct < 70
      ? 'var(--color-success-muted)'
      : pct < 90
        ? 'var(--color-warning)'
        : 'var(--color-danger)';

  return (
    <div className="occupancy-summary__stat occupancy-summary__stat--gauge">
      <svg width="64" height="64" viewBox="0 0 64 64" className="occupancy-summary__gauge">
        <circle cx="32" cy="32" r={radius} className="occupancy-summary__gauge-track" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          className="occupancy-summary__gauge-fill"
          style={{ stroke: strokeColor }}
          transform="rotate(-90 32 32)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text x="32" y="37" textAnchor="middle" className="occupancy-summary__gauge-text">
          {pct.toFixed(0)}%
        </text>
      </svg>
      <div className="occupancy-summary__gauge-info">
        <span className="occupancy-summary__label">Taxa de ocupação</span>
        <span className="occupancy-summary__gauge-message">{occupancyMessage(pct)}</span>
      </div>
    </div>
  );
}

export function OccupancySummary({ summary, loading, error }: OccupancySummaryProps) {
  if (loading && !summary) {
    return <OccupancySummarySkeleton />;
  }

  if (error) {
    return <p className="occupancy-summary__error">Failed to load occupancy summary: {error}</p>;
  }

  if (!summary) {
    return null;
  }

  const freePct = summary.total === 0 ? 0 : (summary.free / summary.total) * 100;
  const occupiedPct = summary.total === 0 ? 0 : (summary.occupied / summary.total) * 100;
  const blockedPct = summary.total === 0 ? 0 : (summary.blocked / summary.total) * 100;

  return (
    <div className="occupancy-summary">
      <div className="occupancy-summary__stat">
        <Package className="occupancy-summary__icon" size={18} aria-hidden="true" />
        <span className="occupancy-summary__value">{summary.total}</span>
        <span className="occupancy-summary__label">Posições totais</span>
        <span className="occupancy-summary__sublabel">100% da capacidade</span>
      </div>
      <div className="occupancy-summary__stat occupancy-summary__stat--free">
        <CheckCircle2
          className="occupancy-summary__icon occupancy-summary__icon--free"
          size={18}
          aria-hidden="true"
        />
        <span className="occupancy-summary__value occupancy-summary__value--free">
          {summary.free}
        </span>
        <span className="occupancy-summary__label">Livres</span>
        <span className="occupancy-summary__sublabel">{freePct.toFixed(0)}% disponível</span>
      </div>
      <div className="occupancy-summary__stat occupancy-summary__stat--occupied">
        <AlertCircle
          className="occupancy-summary__icon occupancy-summary__icon--occupied"
          size={18}
          aria-hidden="true"
        />
        <span className="occupancy-summary__value occupancy-summary__value--occupied">
          {summary.occupied}
        </span>
        <span className="occupancy-summary__label">Ocupadas</span>
        <span className="occupancy-summary__sublabel">{occupiedPct.toFixed(0)}% ocupadas</span>
      </div>
      <div className="occupancy-summary__stat occupancy-summary__stat--blocked">
        <Lock
          className="occupancy-summary__icon occupancy-summary__icon--blocked"
          size={18}
          aria-hidden="true"
        />
        <span className="occupancy-summary__value occupancy-summary__value--blocked">
          {summary.blocked}
        </span>
        <span className="occupancy-summary__label">Bloqueadas</span>
        <span className="occupancy-summary__sublabel">{blockedPct.toFixed(0)}% bloqueadas</span>
      </div>

      <OccupancyGauge rate={summary.occupancyRate} />
    </div>
  );
}
