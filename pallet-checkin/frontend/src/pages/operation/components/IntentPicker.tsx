import type { MovementType } from '../../../types/position';
import './IntentPicker.css';

interface IntentPickerProps {
  onSelect: (intent: MovementType) => void;
}

export function IntentPicker({ onSelect }: IntentPickerProps) {
  return (
    <div className="intent-picker">
      <button
        type="button"
        className="intent-picker__button intent-picker__button--checkin"
        onClick={() => onSelect('CHECK_IN')}
      >
        Fazer check-in
      </button>
      <button
        type="button"
        className="intent-picker__button intent-picker__button--checkout"
        onClick={() => onSelect('CHECK_OUT')}
      >
        Fazer check-out
      </button>
    </div>
  );
}
