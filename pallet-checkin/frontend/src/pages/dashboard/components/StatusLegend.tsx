import type { OccupancySummary } from '../../../types/position';
import './StatusLegend.css';

interface StatusLegendProps {
  summary: OccupancySummary | null;
}

// Only the three real statuses (FREE/OCCUPIED/BLOCKED) — the reference
// mockup's legend also listed Reservada/Manutenção/Inventário, which don't
// exist in this system and were explicitly marked out of scope.
export function StatusLegend({ summary }: StatusLegendProps) {
  if (!summary) return null;

  return (
    <div className="status-legend">
      <span className="status-legend__item">
        <span className="status-legend__dot status-legend__dot--free" />
        Livre <strong>{summary.free}</strong>
      </span>
      <span className="status-legend__item">
        <span className="status-legend__dot status-legend__dot--occupied" />
        Ocupada <strong>{summary.occupied}</strong>
      </span>
      <span className="status-legend__item">
        <span className="status-legend__dot status-legend__dot--blocked" />
        Bloqueada <strong>{summary.blocked}</strong>
      </span>
    </div>
  );
}
