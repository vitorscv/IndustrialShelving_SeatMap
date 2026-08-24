import './LevelPicker.css';

interface LevelPickerProps {
  // Already sorted top-to-bottom (e.g. E, D, C, B, A) to match physical reading order.
  levels: string[];
  selectedLevel: string | null;
  onSelect: (level: string) => void;
}

export function LevelPicker({ levels, selectedLevel, onSelect }: LevelPickerProps) {
  return (
    <div className="level-picker">
      {levels.map((level) => (
        <button
          key={level}
          type="button"
          className={`level-picker__button${level === selectedLevel ? ' level-picker__button--selected' : ''}`}
          onClick={() => onSelect(level)}
        >
          {level}
        </button>
      ))}
    </div>
  );
}
