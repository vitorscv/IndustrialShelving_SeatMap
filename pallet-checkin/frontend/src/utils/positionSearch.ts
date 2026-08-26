import type { Position } from '../types/position';

// Matches the search bar's "Buscar posição, produto ou lote..." against a
// position's identity (shelf + level + number), pallet code, product, or
// order number — case-insensitive substring match.
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
    position.palletCode,
    position.product,
    position.orderNumber,
  ];

  return candidates.some((candidate) => candidate?.toLowerCase().includes(trimmed));
}
