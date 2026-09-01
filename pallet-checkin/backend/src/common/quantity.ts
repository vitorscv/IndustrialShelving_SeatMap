// Quantidade is free text, not a plain number: one or more positive
// integers separated by "/" (e.g. "2500/3000" — two orders combined on one
// pallet). This is the single source of truth for that shape, shared by
// CreateMovementDto's validation and every report that sums quantity.
//
// Each segment must start with a non-zero digit (no "0" or leading zeros),
// optionally surrounded by spaces around the "/" separator.
export const QUANTITY_PATTERN = /^[1-9]\d*(\s*\/\s*[1-9]\d*)*$/;

// Sums every "/"-separated part — "2500/3000" -> 5500, "5000" -> 5000.
// Only ever called on values that already matched QUANTITY_PATTERN (DTO
// validation happens before anything reaches storage), so no NaN/format
// guarding is needed here.
export function parseQuantity(value: string): number {
  return value
    .split('/')
    .map((part) => parseInt(part.trim(), 10))
    .reduce((sum, part) => sum + part, 0);
}
