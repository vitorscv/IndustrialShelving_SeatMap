import type { OccupancySummary as OccupancySummaryData } from '../../../types/position';
import './OccupancySummary.css';

interface OccupancySummaryProps {
  summary: OccupancySummaryData | null;
  loading: boolean;
  error: string | null;
}

export function OccupancySummary({ summary, loading, error }: OccupancySummaryProps) {
  if (loading && !summary) {
    return <p>Loading occupancy summary...</p>;
  }

  if (error) {
    return <p className="occupancy-summary__error">Failed to load occupancy summary: {error}</p>;
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="occupancy-summary">
      <div className="occupancy-summary__stat">
        <span className="occupancy-summary__value">{summary.total}</span>
        <span className="occupancy-summary__label">Total</span>
      </div>
      <div className="occupancy-summary__stat">
        <span className="occupancy-summary__value">{summary.free}</span>
        <span className="occupancy-summary__label">Free</span>
      </div>
      <div className="occupancy-summary__stat">
        <span className="occupancy-summary__value">{summary.occupied}</span>
        <span className="occupancy-summary__label">Occupied</span>
      </div>
      <div className="occupancy-summary__stat">
        <span className="occupancy-summary__value">{summary.blocked}</span>
        <span className="occupancy-summary__label">Blocked</span>
      </div>
      <div className="occupancy-summary__stat">
        <span className="occupancy-summary__value">
          {(summary.occupancyRate * 100).toFixed(1)}%
        </span>
        <span className="occupancy-summary__label">Occupancy rate</span>
      </div>
    </div>
  );
}
