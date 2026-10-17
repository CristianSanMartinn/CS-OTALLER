"use client";
import { useId, useState } from "react";
import { Search } from "lucide-react";
import type { Maintenance } from "@/features/shared/types/domain";
import type { OilProduct } from "../types/oil.types";
import { oilSelection, oilSuggestions } from "../services/oilSuggestions";

export function OilProductPicker({
  products,
  records,
  value,
  onChange,
  loading,
  error,
}: {
  products: OilProduct[];
  records: Maintenance[];
  value: Maintenance;
  onChange: (patch: Partial<Maintenance>) => void;
  loading: boolean;
  error: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const options = oilSuggestions(products, query, records);
  function choose(index: number) {
    const product = options[index];
    if (!product) return;
    onChange(oilSelection(product));
    setQuery("");
    setOpen(false);
    setActive(-1);
  }
  return (
    <div
      className="oil-product-picker field full"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id}>Buscar aceite por marca, producto o viscosidad</label>
      <div className="intervention-input-wrap">
        <Search size={17} />
        <input
          id={id}
          role="combobox"
          autoComplete="off"
          value={query}
          aria-expanded={open}
          aria-controls={id + "-options"}
          aria-autocomplete="list"
          aria-activedescendant={
            open && active >= 0 ? id + "-option-" + active : undefined
          }
          placeholder="Ej.: Liqui Moly, Molygen, Mobil, 5W-30…"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActive((index) =>
                event.key === "ArrowDown"
                  ? Math.min(index + 1, options.length - 1)
                  : Math.max(0, index - 1),
              );
            }
            if (event.key === "Enter" && open) {
              event.preventDefault();
              choose(active >= 0 ? active : 0);
            }
          }}
        />
      </div>
      {open && (
        <div
          id={id + "-options"}
          role="listbox"
          aria-label="Productos de aceite"
          className="oil-product-options"
        >
          {options.map((product, index) => (
            <button
              type="button"
              role="option"
              aria-selected={index === active}
              id={id + "-option-" + index}
              key={product.id}
              className={index === active ? "is-selected" : ""}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <strong>
                {product.brand} · {product.product}
              </strong>
              <span>
                {product.viscosity} · {product.oilType}
                {product.uses ? " · Usado en tu taller" : ""}
              </span>
            </button>
          ))}
          {!options.length && (
            <p>
              {loading
                ? "Cargando catálogo…"
                : "No encontramos ese producto. Puedes ingresarlo manualmente abajo."}
            </p>
          )}
        </div>
      )}
      {value.oilProductName && (
        <div className="oil-selected-product" aria-live="polite">
          <strong>
            {value.brand} · {value.oilProductName}
          </strong>
          <span>
            {value.viscosity} · {value.oilType}
          </span>
        </div>
      )}
      <small>
        Catálogo inicial ampliable. Confirma las especificaciones requeridas
        para este vehículo.
      </small>
      {error && (
        <small role="status">
          El catálogo no está disponible. Puedes registrar el aceite
          manualmente.
        </small>
      )}
    </div>
  );
}
