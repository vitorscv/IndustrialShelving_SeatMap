import './DashboardSkeleton.css';

const SKELETON_SHELVES = [0, 1];
const SKELETON_ROWS = [0, 1, 2];
const SKELETON_CELLS = Array.from({ length: 12 });

export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-hidden="true">
      {SKELETON_SHELVES.map((shelfIndex) => (
        <div key={shelfIndex} className="dashboard-skeleton__shelf">
          <div className="dashboard-skeleton__title" />
          {SKELETON_ROWS.map((rowIndex) => (
            <div key={rowIndex} className="dashboard-skeleton__row">
              {SKELETON_CELLS.map((_, cellIndex) => (
                <div key={cellIndex} className="dashboard-skeleton__cell" />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
