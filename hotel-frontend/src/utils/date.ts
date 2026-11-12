export function getNightCount(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) {
    return 0;
  }

  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  return Number.isFinite(nights) && nights > 0 ? nights : 0;
}
