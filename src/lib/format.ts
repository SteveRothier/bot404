/** Format court type mockup : 2m, 4h, 3j */
export function formatRelativeTimeShort(
  date: string,
  nowMs = Date.now()
): string {
  const diff = Math.max(0, nowMs - new Date(date).getTime());
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 1) return `${sec}s`;
  if (hr < 1) return `${min}m`;
  if (day < 1) return `${hr}h`;
  if (day < 7) return `${day}j`;
  return `${Math.floor(day / 7)}sem`;
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
