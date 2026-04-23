export function generatePeriodKeys(monthsAhead = 0): string[] {
  const keys: string[] = [];
  let y = 2025, m = 9;
  const now = new Date();
  let endM = now.getMonth() + 1 + monthsAhead;
  let endY = now.getFullYear();
  while (endM > 12) { endM -= 12; endY++; }
  while (y < endY || (y === endY && m <= endM)) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    if (++m > 12) { m = 1; y++; }
  }
  return keys;
}

export const ALL_PERIOD_KEYS = generatePeriodKeys();

// Includes next month so managers can pre-load targets before the month starts
export const ALL_PERIOD_KEYS_AHEAD = generatePeriodKeys(1);

export function defaultPeriodKey(): string {
  const now = new Date();
  let y = now.getFullYear(), m = now.getMonth();
  if (m === 0) { m = 12; y--; }
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function currentPeriodKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function defaultPrevKey(): string {
  const now = new Date();
  let y = now.getFullYear(), m = now.getMonth() - 1;
  if (m <= 0) { m += 12; y--; }
  return `${y}-${String(m).padStart(2, "0")}`;
}
