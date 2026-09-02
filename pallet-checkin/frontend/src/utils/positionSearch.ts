import type { Position } from '../types/position';
import { padNumber } from './format';

// Matches the search bar's "Buscar posição, produto ou pedido..." against
// every field a user might reasonably search a position by: its identity
// (shelf + level + number, in both the raw "C4" and zero-padded "C04"
// forms — the grid always DISPLAYS the padded form via PositionCell's own
// padNumber(), so typing what's on screen has to match too), quantity,
// product, order/customer, and vendedor/cidade — case-insensitive
// substring match. This is the single source of truth for "what counts as
// a match", shared by the suggestions dropdown, the grid's dim effect, and
// the list's dim effect — never define matching separately in any of those.
export function matchesPositionSearch(
  position: Position,
  shelfTitle: string,
  query: string,
): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const paddedNumber = padNumber(position.number);

  const candidates = [
    `${position.level}${position.number}`,
    `${position.level}${paddedNumber}`,
    String(position.number),
    paddedNumber,
    shelfTitle,
    position.quantity !== null ? String(position.quantity) : null,
    position.product,
    position.orderNumber,
    position.salesInfo,
  ];

  return candidates.some((candidate) => candidate?.toLowerCase().includes(trimmed));
}
