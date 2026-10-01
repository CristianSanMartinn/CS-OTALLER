import { Customer } from "@/features/shared/types/domain";
import { SelectField } from "@/components/ui/primitives";
export function CustomerSection({
  customers,
  value,
  onChange,
  disabled,
  onCreate,
}: {
  customers: Customer[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  onCreate?: () => void;
}) {
  return (
    <SelectField
      label="Cliente"
      required
      value={value}
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value === "__new__") onCreate?.();
        else onChange(e.target.value);
      }}
    >
      <option value="">Seleccionar cliente</option>
      {onCreate && !disabled && (
        <option value="__new__">+ Registrar nuevo cliente</option>
      )}
      {customers.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name} · {c.rut}
        </option>
      ))}
    </SelectField>
  );
}
