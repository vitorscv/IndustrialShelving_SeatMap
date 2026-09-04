// Accent-insensitive compare key — decomposes accented characters into
// base letter + combining mark (NFD), then strips the combining marks, so
// "vitoria" (typed with no accent) matches "Vitória". Used only for
// matching/dedup; the value actually stored keeps whatever accents the
// source text had (callers uppercase separately — this app's existing
// .toUpperCase() convention never strips accents either).
//
// Shared by CidadeAutocomplete and VendedorAutocomplete — both filter a
// small/medium catalog by a typed fragment the same accent-insensitive way.
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}
