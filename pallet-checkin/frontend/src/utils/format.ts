// "Estante 1" -> "ESTANTE 01" — uppercase, trailing shelf number zero-padded
// to 2 digits so shelf titles line up visually regardless of digit count.
export function formatShelfLabel(title: string): string {
  const match = title.match(/^(.*?)(\d+)$/);
  if (!match) return title.toUpperCase();
  const [, prefix, number] = match;
  return `${prefix.trim().toUpperCase()} ${number.padStart(2, '0')}`;
}

export function padNumber(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}
