export function AppointmentFilters({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      aria-label="Estado de cita"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Todos los estados</option>
      {["Programada", "Confirmada", "En taller", "Finalizada", "Cancelada"].map(
        (x) => (
          <option key={x}>{x}</option>
        ),
      )}
    </select>
  );
}
