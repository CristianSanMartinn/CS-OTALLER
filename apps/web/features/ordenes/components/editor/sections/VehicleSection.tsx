import { Vehicle } from "@/features/shared/types/domain";
import { SelectField } from "@/components/ui/primitives";
export function VehicleSection({
  vehicles,
  value,
  onChange,
  disabled,
  onCreate,
}: {
  vehicles: Vehicle[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  onCreate?: () => void;
}) {
  return (
    <SelectField
      label="Vehículo / patente"
      required
      value={value}
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value === "__new__") onCreate?.();
        else onChange(e.target.value);
      }}
    >
      <option value="">Seleccionar vehículo</option>
      {onCreate && !disabled && (
        <option value="__new__">+ Registrar nuevo vehículo</option>
      )}
      {vehicles.map((v) => (
        <option key={v.id} value={v.id}>
          {v.plate} · {v.brand} {v.model}
        </option>
      ))}
    </SelectField>
  );
}
