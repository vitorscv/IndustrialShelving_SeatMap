// Accent-insensitive compare key — decomposes accented characters into
// base letter + combining mark (NFD), then strips the combining marks, so
// "junior" (typed with no accent) matches a catalog entry like "Júnior".
// Same algorithm as the frontend's utils/normalizeForSearch.ts (there's no
// shared package between the two apps, so this is a deliberate port, not
// a duplication of logic that's meant to diverge).
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}
