import { Calendar } from 'lucide-react';
import './DateInput.css';

interface DateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

// Wraps a native <input type="date"> rather than building a calendar
// dropdown from scratch — the native picker's keyboard support,
// accessibility and mobile behavior all come for free, and its value is
// already exactly the YYYY-MM-DD string the report endpoints expect.
// What CSS alone can't do is recolor the native calendar icon, so it's
// hidden (kept clickable via its native hit area) and a themed Lucide
// icon is drawn in its place — see DateInput.css.
export function DateInput({ label, value, onChange }: DateInputProps) {
  return (
    <label className="date-input">
      <span className="date-input__label">{label}</span>
      <div className="date-input__field">
        <input
          type="date"
          className="date-input__native"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Calendar size={15} className="date-input__icon" aria-hidden="true" />
      </div>
    </label>
  );
}
