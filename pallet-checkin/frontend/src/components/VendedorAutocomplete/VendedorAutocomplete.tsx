import { useEffect, useMemo, useRef, useState } from 'react';
import { useVendors } from '../../hooks/useVendors';
import { normalizeForSearch } from '../../utils/normalizeForSearch';
import './VendedorAutocomplete.css';

interface VendedorAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const MAX_SUGGESTIONS = 8;

// Splits "MACHADO/GOM" into prefix="MACHADO/" and lastSegment="GOM" —
// suggestions always filter against just the segment currently being
// typed, not the whole string, so adding a second (or third) vendor after
// "MACHADO/" doesn't re-suggest "MACHADO" itself. A value with no "/" yet
// (the common single-vendor case) has an empty prefix and the whole thing
// as lastSegment, same as before this multi-vendor support existed.
function splitLastSegment(value: string): { prefix: string; lastSegment: string } {
  const lastSlashIndex = value.lastIndexOf('/');
  if (lastSlashIndex === -1) return { prefix: '', lastSegment: value };
  return { prefix: value.slice(0, lastSlashIndex + 1), lastSegment: value.slice(lastSlashIndex + 1) };
}

// Same "suggestion layer only, never a constraint" contract as
// CidadeAutocomplete/ProductAutocomplete — a plain <input> underneath, so
// any vendor text (including a name missing from the catalog, or several
// combined) is valid and gets submitted as-is.
//
// Unlike the old single-select <select>, this field accepts MULTIPLE
// vendor names separated by "/" (e.g. "MACHADO/GOMES E LIMA") — each
// segment is suggested independently from the Vendor catalog as it's
// typed. The backend resolves this into a canonical vendorId only for the
// simple single-exact-match case; multiple names or a non-catalog name
// fall back to being stored as free text (see movements.service.ts).
export function VendedorAutocomplete({ value, onChange, required }: VendedorAutocompleteProps) {
  const { vendors } = useVendors();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { prefix, lastSegment } = splitLastSegment(value);
  const query = lastSegment.trim();

  const suggestions = useMemo(() => {
    const normalizedQuery = normalizeForSearch(query);
    if (normalizedQuery === '') return [];
    return vendors
      .filter((vendor) => normalizeForSearch(vendor.name).includes(normalizedQuery))
      .slice(0, MAX_SUGGESTIONS);
  }, [query, vendors]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectSuggestion(vendorName: string) {
    const newValue = `${prefix}${vendorName}`.toUpperCase();
    onChange(newValue);
    setOpen(false);
    // Cursor lands at the end, ready to type "/" + the next vendor name if
    // needed — same flow as typing "MACHADO/" by hand would produce.
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (input) {
        input.focus();
        input.setSelectionRange(newValue.length, newValue.length);
      }
    });
  }

  return (
    <div className="vendedor-autocomplete" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        required={required}
        autoComplete="off"
      />

      {open && suggestions.length > 0 && (
        <ul className="vendedor-autocomplete__list">
          {suggestions.map((vendor) => (
            <li key={vendor.id}>
              {/* onMouseDown (not onClick) + preventDefault so the input
                  never blurs before the selection registers. */}
              <button
                type="button"
                className="vendedor-autocomplete__option"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectSuggestion(vendor.name);
                }}
              >
                {vendor.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
