export function ClientFilters({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      aria-label="Filtrar clientes"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="all">Todos los clientes</option>
      <option value="vehicles">Con vehículos registrados</option>
      <option value="empty">Sin vehículos</option>
    </select>
  );
}
