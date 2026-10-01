import { Maintenance } from "@/features/shared/types/domain";
import { Field, SelectField } from "@/components/ui/primitives";
export function OilChangeForm({
  value,
  onChange,
}: {
  value: Maintenance;
  onChange: (patch: Partial<Maintenance>) => void;
}) {
  return (
    <>
      <SelectField
        label="Tipo de aceite"
        value={value.oilType}
        onChange={(e) => onChange({ oilType: e.target.value })}
      >
        <option>Sintético</option>
        <option>Semisintético</option>
        <option>Mineral</option>
      </SelectField>
      <Field
        label="Viscosidad"
        placeholder="5W-30"
        required
        value={value.viscosity}
        onChange={(e) => onChange({ viscosity: e.target.value })}
      />
      <Field
        label="Marca del aceite"
        required
        value={value.brand}
        onChange={(e) => onChange({ brand: e.target.value })}
      />
      <Field
        label="Cantidad utilizada (L)"
        type="number"
        min={0.1}
        step={0.1}
        required
        value={value.quantity}
        onChange={(e) => onChange({ quantity: Number(e.target.value) })}
      />
      <Field
        label="Filtro de aceite / referencia"
        required
        value={value.filter}
        onChange={(e) => onChange({ filter: e.target.value })}
      />
      <Field
        label="Marca del filtro"
        required
        value={value.filterBrand}
        onChange={(e) => onChange({ filterBrand: e.target.value })}
      />
    </>
  );
}
