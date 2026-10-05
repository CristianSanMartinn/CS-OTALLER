export interface PublicMaintenance {
  id: string;
  type: string;
  date: string;
  mileage: number;
  nextMileage: number | null;
  nextDate: string | null;
}
export function vehicleMaintenanceSummary(
  records: PublicMaintenance[],
  mileage: number,
  day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
) {
  const latestByType = new Map<string, PublicMaintenance>();
  const sorted = [...records].sort(
    (a, b) => b.date.localeCompare(a.date) || b.mileage - a.mileage,
  );
  for (const record of sorted)
    if (!latestByType.has(record.type.trim().toLowerCase()))
      latestByType.set(record.type.trim().toLowerCase(), record);
  const upcoming = [...latestByType.values()].filter(
    (r) => (r.nextMileage ?? 0) > 0 || r.nextDate,
  );
  const classify = (r: PublicMaintenance) => {
    const distance =
      (r.nextMileage ?? 0) > 0 ? r.nextMileage! - mileage : Infinity;
    const days = r.nextDate
      ? (Date.parse(r.nextDate + "T12:00:00Z") -
          Date.parse(day + "T12:00:00Z")) /
        86400000
      : Infinity;
    return {
      record: r,
      distance,
      days,
      rank:
        distance <= 0 || days <= 0 ? 0 : distance <= 2500 || days <= 30 ? 1 : 2,
    };
  };
  const next = upcoming
    .map(classify)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        Math.min(a.days, a.distance / 100) - Math.min(b.days, b.distance / 100),
    )[0];
  return {
    lastDate: sorted[0]?.date ?? "",
    next,
    status: !next
      ? records.length
        ? "Sin programación"
        : "Sin historial"
      : next.rank === 0
        ? "Vencida"
        : next.rank === 1
          ? "Próxima"
          : "Al día",
    tone: !next
      ? "neutral"
      : next.rank === 0
        ? "overdue"
        : next.rank === 1
          ? "soon"
          : "current",
  };
}
