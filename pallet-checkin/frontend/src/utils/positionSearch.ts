import type { Position } from '../types/position';

// Matches the search bar's "Buscar posição, produto ou quantidade..."
// against a position's identity (shelf + level + number), quantity,
// product, or order number — case-insensitive substring match.
export function matchesPositionSearch(
  position: Position,
  shelfTitle: string,
  query: string,
): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const candidates = [
    `${position.level}${position.number}`,
    String(position.number),
    shelfTitle,
    position.quantity !== null ? String(position.quantity) : null,
    position.product,
    position.orderNumber,
  ];

  return candidates.some((candidate) => candidate?.toLowerCase().includes(trimmed));
}
