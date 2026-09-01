// Quantidade is free text, not a plain number: one or more positive
// integers separated by "/" (e.g. "2500/3000" — two orders combined on one
// pallet). Mirrors the backend's src/common/quantity.ts — kept in sync by
// hand since frontend and backend don't share a package.
export const QUANTITY_PATTERN = /^[1-9]\d*(\s*\/\s*[1-9]\d*)*$/;

// Characters a user could still be in the middle of typing toward a valid
// value (e.g. "2500/" before the next digit) — used to allow free typing
// without rejecting every intermediate keystroke, while still blocking
// letters or other stray characters immediately.
const QUANTITY_TYPING_CHARS = /^[\d\s/]*$/;

export function isQuantityBeingTyped(value: string): boolean {
  return QUANTITY_TYPING_CHARS.test(value);
}

export function isQuantityValid(value: string): boolean {
  return QUANTITY_PATTERN.test(value.trim());
}
