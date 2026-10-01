export const money = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
export const km = (value: number) =>
  new Intl.NumberFormat("es-CL").format(value) + " km";
export const dateLabel = (value: string) =>
  value
    ? new Date(value + "T12:00:00").toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Sin fecha";
export const today = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};
export const uid = () => crypto.randomUUID();
