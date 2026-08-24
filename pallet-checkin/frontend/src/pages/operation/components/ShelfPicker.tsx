import type { Shelf } from '../../../types/position';
import './ShelfPicker.css';

interface ShelfPickerProps {
  shelves: Shelf[];
  selectedShelfId: string | null;
  onSelect: (shelf: Shelf) => void;
}

export function ShelfPicker({ shelves, selectedShelfId, onSelect }: ShelfPickerProps) {
  return (
    <div className="shelf-picker">
      {shelves.map((shelf) => (
        <button
          key={shelf.id}
          type="button"
          className={`shelf-picker__button${shelf.id === selectedShelfId ? ' shelf-picker__button--selected' : ''}`}
          onClick={() => onSelect(shelf)}
        >
          {shelf.title}
        </button>
      ))}
    </div>
  );
}
