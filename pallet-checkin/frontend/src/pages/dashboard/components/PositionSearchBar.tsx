import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { Position, Shelf } from '../../../types/position';
import { matchesPositionSearch } from '../../../utils/positionSearch';
import { formatShelfLabel, padNumber } from '../../../utils/format';
import './PositionSearchBar.css';

interface PositionSearchBarProps {
  shelves: Shelf[];
  onSelectPosition: (position: Position, shelfId: string) => void;
}

interface SearchMatch {
  position: Position;
  shelfId: string;
  shelfTitle: string;
}

const MAX_SUGGESTIONS = 8;
const DEBOUNCE_MS = 180;

const STATUS_LABELS: Record<Position['status'], string> = {
  FREE: 'LIVRE',
  OCCUPIED: 'OCUPADA',
  BLOCKED: 'BLOQUEADA',
};

function buildMatches(shelves: Shelf[], query: string): SearchMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return shelves
    .flatMap((shelf) =>
      shelf.positions
        .filter((position) => matchesPositionSearch(position, shelf.title, trimmed))
        .map((position) => ({ position, shelfId: shelf.id, shelfTitle: shelf.title })),
    )
    .sort((a, b) => {
      if (a.shelfTitle !== b.shelfTitle) return a.shelfTitle.localeCompare(b.shelfTitle);
      if (a.position.level !== b.position.level) {
        return b.position.level.localeCompare(a.position.level);
      }
      return a.position.number - b.position.number;
    });
}

function suggestionDetail(position: Position): string {
  if (position.status === 'FREE') return 'Posição livre';
  if (position.status === 'BLOCKED') return 'Posição bloqueada';
  const parts = [];
  if (position.product) parts.push(`Produto ${position.product}`);
  if (position.orderNumber) parts.push(`Pedido/Cliente ${position.orderNumber}`);
  return parts.length > 0 ? parts.join(' · ') : 'Sem detalhes';
}

// Combines the search input and its results dropdown into one self-contained
// unit: the app-wide Ctrl/Cmd+K shortcut, the debounce, the client-side
// filtering (over the shelves already loaded elsewhere — no new endpoint),
// and keyboard navigation all live here so OverviewPage only has to react to
// a final "this position was picked" callback.
export function PositionSearchBar({ shelves, onSelectPosition }: PositionSearchBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(inputValue), DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [inputValue]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Matches the shortcut hint shown inside the input.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const allMatches = buildMatches(shelves, debouncedQuery);
  const visibleMatches = allMatches.slice(0, MAX_SUGGESTIONS);
  const remainingCount = allMatches.length - visibleMatches.length;
  const trimmedQuery = debouncedQuery.trim();
  const showDropdown = open && trimmedQuery !== '';

  function selectMatch(match: SearchMatch) {
    onSelectPosition(match.position, match.shelfId);
    setInputValue('');
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || visibleMatches.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => Math.min(current + 1, visibleMatches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const match = visibleMatches[highlightedIndex];
      if (match) selectMatch(match);
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className="position-search-bar" ref={containerRef}>
      <Search size={16} className="position-search-bar__icon" aria-hidden="true" />
      <input
        ref={inputRef}
        type="text"
        className="position-search-bar__input"
        placeholder="Buscar posição, produto ou pedido..."
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (inputValue.trim() !== '') setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="position-search-bar-listbox"
        aria-autocomplete="list"
        autoComplete="off"
      />
      <kbd className="position-search-bar__kbd">Ctrl K</kbd>

      {showDropdown && (
        <ul className="position-search-bar__dropdown" id="position-search-bar-listbox" role="listbox">
          {visibleMatches.length === 0 && (
            <li className="position-search-bar__empty">Nenhum resultado encontrado</li>
          )}
          {visibleMatches.map((match, index) => (
            <li key={match.position.id} role="option" aria-selected={index === highlightedIndex}>
              {/* onMouseDown (not onClick) + preventDefault so the input
                  never blurs (closing the dropdown) before the click
                  registers. */}
              <button
                type="button"
                className={`position-search-bar__suggestion${
                  index === highlightedIndex ? ' position-search-bar__suggestion--highlighted' : ''
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectMatch(match);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span className="position-search-bar__suggestion-primary">
                  {formatShelfLabel(match.shelfTitle)} · Nível {match.position.level} ·{' '}
                  {padNumber(match.position.number)}
                  <span
                    className={`position-search-bar__status position-search-bar__status--${match.position.status.toLowerCase()}`}
                  >
                    {STATUS_LABELS[match.position.status]}
                  </span>
                </span>
                <span className="position-search-bar__suggestion-secondary">
                  {suggestionDetail(match.position)}
                </span>
              </button>
            </li>
          ))}
          {remainingCount > 0 && (
            <li className="position-search-bar__more">+{remainingCount} mais resultados</li>
          )}
        </ul>
      )}
    </div>
  );
}
