import { useEffect, useMemo, useRef, useState } from 'react';
import { useCidadeSuggestions } from '../../hooks/useCidadeSuggestions';
import { useCities } from '../../hooks/useCities';
import { normalizeForSearch } from '../../utils/normalizeForSearch';
import './CidadeAutocomplete.css';

interface CidadeAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

interface Suggestion {
  label: string; // what's shown in the dropdown (IBGE entries display as "Cidade - UF")
  value: string; // what actually gets filled into the field on selection
}

const MAX_SUGGESTIONS = 10;

// Reformats an IBGE-displayed "Cidade - UF" entry into the stored
// "CIDADE-UF" shape (no spaces around the hyphen) — e.g. "Itatim - BA"
// becomes "ITATIM-BA" once uppercased by selectSuggestion below. Matches
// most historical salesInfo records' "CITY-UF" format.
function cityValueFromIbgeLabel(label: string): string {
  const separatorIndex = label.lastIndexOf(' - ');
  if (separatorIndex === -1) return label;
  return `${label.slice(0, separatorIndex)}-${label.slice(separatorIndex + 3)}`;
}

// Strips a trailing "-UF" (two uppercase letters) from an already-stored
// cidade value, e.g. "ITATIM-BA" -> "ITATIM" — used only to dedup a
// previously-used cidade against the IBGE list's city name (a legacy
// previously-used entry may predate the "-UF" convention and have none).
function cityNameOnly(cidade: string): string {
  return cidade.replace(/-([A-Z]{2})$/, '');
}

// Looks up a previously-used city's proper-case "Cidade - UF" entry in the
// IBGE list, matched accent-/case-insensitively by name — so a raw stored
// value like "FEIRA DE SANTANA" or "ITATIM-BA" (inconsistent formats from
// before this list existed) displays exactly like every IBGE-sourced
// suggestion. Returns null when nothing matches (e.g. old free-text like
// "Bairro Inventado Sem Match", or a genuinely non-standard entry) — the
// caller falls back to the raw text in that case.
function findIbgeLabelFor(cityName: string, allCities: string[]): string | null {
  const normalizedTarget = normalizeForSearch(cityName);
  for (const cityLabel of allCities) {
    const separatorIndex = cityLabel.lastIndexOf(' - ');
    if (separatorIndex === -1) continue;
    if (normalizeForSearch(cityLabel.slice(0, separatorIndex)) === normalizedTarget) {
      return cityLabel;
    }
  }
  return null;
}

// Same "suggestion layer only, never a constraint" contract as
// ProductAutocomplete — a plain <input> underneath, so any city the user
// types (including one missing from IBGE's data, or a district-level
// location) is valid and gets submitted as-is, uppercase, with no UF
// auto-appended (there's no matched suggestion to pull one from).
//
// Two sources are merged: cidades this warehouse has actually used before
// (GET /movements/cidades — some legacy entries have no "-UF" suffix,
// predating that convention) are shown first when they match, since
// they're the likeliest picks for a returning vendor/route; the full IBGE
// municipality list (~5570 entries, "Cidade - UF", fetched once and
// cached — see useCities) fills the rest, so suggestions work from the
// very first use, before any city has ever been typed.
export function CidadeAutocomplete({ value, onChange, required }: CidadeAutocompleteProps) {
  const previouslyUsed = useCidadeSuggestions();
  const allCities = useCities();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = value.trim();

  const suggestions = useMemo<Suggestion[]>(() => {
    const normalizedQuery = normalizeForSearch(query);
    if (normalizedQuery === '') return [];

    const result: Suggestion[] = [];
    // Dedups previouslyUsed entries against EACH OTHER by city name only
    // (ignoring UF) — previously-used values don't reliably carry one.
    const previouslyUsedNameKeys = new Set<string>();
    // Dedups the final suggestion list by the FULL "city+UF" value actually
    // shown — deliberately NOT name-only, otherwise same-named cities in
    // different states (Trindade-GO, Trindade-PE, Trindade do Sul-RS, ...)
    // would collapse into a single suggestion, silently hiding the rest.
    const shownCityValueKeys = new Set<string>();

    for (const cidade of previouslyUsed) {
      if (result.length >= MAX_SUGGESTIONS) break;
      if (!normalizeForSearch(cidade).includes(normalizedQuery)) continue;
      const rawCityName = cityNameOnly(cidade);
      const nameKey = normalizeForSearch(rawCityName);
      if (previouslyUsedNameKeys.has(nameKey)) continue;
      previouslyUsedNameKeys.add(nameKey);

      // Display in the same "Cidade - UF" formatting as every IBGE-sourced
      // suggestion whenever a match is found — only the raw stored value
      // (uppercase, inconsistent formats predating this list) falls back
      // to being shown as-is.
      const ibgeLabel = findIbgeLabelFor(rawCityName, allCities);
      const suggestion = ibgeLabel
        ? { label: ibgeLabel, value: cityValueFromIbgeLabel(ibgeLabel) }
        : { label: cidade, value: cidade };
      result.push(suggestion);
      shownCityValueKeys.add(normalizeForSearch(suggestion.value));
    }

    for (const cityLabel of allCities) {
      if (result.length >= MAX_SUGGESTIONS) break;
      if (!normalizeForSearch(cityLabel).includes(normalizedQuery)) continue;
      const cityValue = cityValueFromIbgeLabel(cityLabel);
      const valueKey = normalizeForSearch(cityValue);
      if (shownCityValueKeys.has(valueKey)) continue; // this exact city+UF already shown via previouslyUsed above
      shownCityValueKeys.add(valueKey);
      result.push({ label: cityLabel, value: cityValue });
    }

    return result;
  }, [query, previouslyUsed, allCities]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectSuggestion(suggestion: Suggestion) {
    onChange(suggestion.value.toUpperCase());
    setOpen(false);
  }

  return (
    <div className="cidade-autocomplete" ref={containerRef}>
      <input
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
        <ul className="cidade-autocomplete__list">
          {suggestions.map((suggestion) => (
            <li key={suggestion.label}>
              {/* onMouseDown (not onClick) + preventDefault so the input
                  never blurs before the selection registers. */}
              <button
                type="button"
                className="cidade-autocomplete__option"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectSuggestion(suggestion);
                }}
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
