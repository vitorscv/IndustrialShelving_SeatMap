import { useEffect, useRef, useState } from 'react';
import { useProducts } from '../../hooks/useProducts';
import './ProductAutocomplete.css';

interface ProductAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoFocus?: boolean;
}

const MAX_SUGGESTIONS = 8;

// CRITICAL: this is a suggestion layer only, never a constraint — the
// underlying element is a plain <input>, so any value the user types is
// valid and gets submitted as-is, whether or not it matches a suggestion.
// Selecting a suggestion is just a shortcut that fills the same free-text
// field; it never locks the value to the registered catalog.
export function ProductAutocomplete({ value, onChange, required, autoFocus }: ProductAutocompleteProps) {
  const { products } = useProducts();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = value.trim().toLowerCase();
  const suggestions =
    query === ''
      ? []
      : products.filter((p) => p.name.toLowerCase().includes(query)).slice(0, MAX_SUGGESTIONS);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectSuggestion(name: string) {
    // Uppercased even though the catalog itself is now stored uppercase
    // (see ProductsService) — belt-and-suspenders in case an older,
    // not-yet-converted catalog entry is picked.
    onChange(name.toUpperCase());
    setOpen(false);
  }

  return (
    <div className="product-autocomplete" ref={containerRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        required={required}
        autoFocus={autoFocus}
        autoComplete="off"
      />

      {open && suggestions.length > 0 && (
        <ul className="product-autocomplete__list">
          {suggestions.map((product) => (
            <li key={product.id}>
              {/* onMouseDown (not onClick) + preventDefault so the input
                  never blurs before the selection registers. */}
              <button
                type="button"
                className="product-autocomplete__option"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectSuggestion(product.name);
                }}
              >
                {product.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
