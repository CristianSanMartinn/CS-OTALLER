import { useState } from "react";
import { Maintenance } from "@/features/shared/types/domain";
import { Field, SelectField } from "@/components/ui/primitives";
import type { OilProduct } from "../../types/oil.types";
import { OilProductPicker } from "./OilProductPicker";

export function OilChangeForm({
  value,
  onChange,
  products,
  records,
  loading,
  error,
}: {
  value: Maintenance;
  onChange: (patch: Partial<Maintenance>) => void;
  products: OilProduct[];
  records: Maintenance[];
  loading: boolean;
  error: string;
}) {
  const [manual, setManual] = useState(false);
  return (
    <>
      <OilProductPicker
        value={value}
        products={products}
        records={records}
        loading={loading}
        error={error}
        onChange={(patch) => {
          onChange(patch);
          setManual(false);
        }}
      />
      <div className="field full">
        <button
          type="button"
          className="text-link"
          aria-expanded={manual}
          onClick={() => setManual(!manual)}
        >
          {manual
            ? "Cerrar edición manual"
            : value.oilProductName
              ? "Editar producto manualmente"
              : "Ingresar un aceite que no aparece en el catálogo"}
        </button>
      </div>
      {manual && (
        <>
          <Field
            label="Marca del aceite"
            required
            maxLength={100}
            value={value.brand}
            onChange={(e) => onChange({ brand: e.target.value })}
          />
          <Field
            label="Nombre del producto"
            required
            maxLength={150}
            value={value.oilProductName ?? ""}
            onChange={(e) => onChange({ oilProductName: e.target.value })}
          />
          <SelectField
            label="Tipo de aceite"
            required
            value={value.oilType}
            onChange={(e) => onChange({ oilType: e.target.value })}
          >
            <option value="">Seleccionar tipo</option>
            {[
              "Sintético",
              "Tecnología sintética",
              "Semisintético",
              "Mineral",
            ].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </SelectField>
          <Field
            label="Viscosidad SAE"
            placeholder="5W-30"
            required
            maxLength={50}
            value={value.viscosity}
            onChange={(e) => onChange({ viscosity: e.target.value })}
          />
        </>
      )}
      <Field
        label="Cantidad utilizada (L)"
        type="number"
        min={0.1}
        max={100}
        step={0.1}
        required
        value={value.quantity || ""}
        onChange={(e) => onChange({ quantity: Number(e.target.value) })}
      />
      <Field
        label="Filtro de aceite / referencia"
        required
        maxLength={150}
        value={value.filter}
        onChange={(e) => onChange({ filter: e.target.value })}
      />
      <Field
        label="Marca del filtro"
        required
        maxLength={100}
        value={value.filterBrand}
        onChange={(e) => onChange({ filterBrand: e.target.value })}
      />
    </>
  );
}
