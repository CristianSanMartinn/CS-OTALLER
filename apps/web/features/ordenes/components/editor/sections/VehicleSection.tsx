import { usePlateRegistrationCheck } from "@/features/vehiculos/hooks/usePlateRegistrationCheck";
import { PlateRegistrationCheck } from "@/features/vehiculos/components/forms/PlateRegistrationCheck";
import { useEffect, useMemo, useState } from "react";
import { Vehicle } from "@/features/shared/types/domain";
import { Field, SelectField } from "@/components/ui/primitives";
import {
  indexVehiclePlates,
  normalizePlate,
  searchVehiclePlates,
} from "@/features/vehiculos/services/vehiclePlateSearch";
import styles from "./VehicleSection.module.css";

export function VehicleSection({
  onRegistrationBlockedChange,
  userId = "",
  vehicles,
  searchVehicles,
  workshopId,
  customerId,
  value,
  onChange,
  disabled,
  onCreate,
}: {
  onRegistrationBlockedChange?: (blocked: boolean) => void;
  userId?: string;
  vehicles: Vehicle[];
  searchVehicles: Vehicle[];
  workshopId: string;
  customerId: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  onCreate?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const plateCheck = usePlateRegistrationCheck(
    query,
    JSON.stringify([userId, workshopId, customerId]),
    !!onCreate && !disabled,
  );
  useEffect(() => {
    onRegistrationBlockedChange?.(plateCheck.blocked || plateCheck.busy);
    return () => onRegistrationBlockedChange?.(false);
  }, [plateCheck.blocked, plateCheck.busy, onRegistrationBlockedChange]);
  const index = useMemo(
    () => indexVehiclePlates(searchVehicles, workshopId),
    [searchVehicles, workshopId],
  );
  const { results, total, exactCount } = useMemo(
    () => searchVehiclePlates(index, query),
    [index, query],
  );
  function select(vehicle: Vehicle) {
    if (
      vehicle.id === value ||
      disabled ||
      vehicle.customerId !== customerId ||
      !vehicles.some((v) => v.id === vehicle.id)
    )
      return;
    onChange(vehicle.id);
    setOpen(false);
  }
  return (
    <div className={styles.vehicleSection}>
      <Field
        label="Buscar por patente"
        type="search"
        placeholder={
          disabled ? "Selecciona un cliente primero" : "Ej. AB-CD-12"
        }
        autoComplete="off"
        maxLength={20}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "Escape") {
            event.preventDefault();
            setOpen(event.key === "Enter");
          }
        }}
        value={query}
        disabled={disabled}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {query && !disabled && (
        <div className={styles.searchActions}>
          <button
            type="button"
            className="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
          >
            Limpiar búsqueda
          </button>
          {open && (
            <button
              type="button"
              className="button"
              onClick={() => setOpen(false)}
            >
              Cerrar resultados
            </button>
          )}
        </div>
      )}
      {open && query && !disabled && (
        <div className={styles.results}>
          <p role="status">
            {!normalizePlate(query)
              ? "Escribe letras o números de la patente."
              : !total
                ? "No encontrado entre los vehículos disponibles"
                : exactCount > 1
                  ? "Varias fichas coinciden con esta patente. Revisa los datos y selecciona manualmente."
                  : total > 1
                    ? "Hay varias coincidencias. Selecciona el vehículo correcto."
                    : "Vehículo encontrado entre los disponibles."}
          </p>
          {!total && normalizePlate(query) && (
            <p className={styles.hint}>
              La búsqueda no incluye vehículos inactivos ni fuera de tu acceso;
              no confirma que la patente esté libre.
            </p>
          )}
          {total > 0 && (
            <ul aria-label="Resultados por patente">
              {results.map((vehicle) => (
                <li key={vehicle.id}>
                  <div>
                    <strong>{vehicle.plate}</strong>
                    <span>
                      {vehicle.brand} {vehicle.model}
                    </span>
                  </div>
                  {vehicle.customerId === customerId &&
                  vehicles.some((v) => v.id === vehicle.id) ? (
                    <button
                      type="button"
                      className="button"
                      aria-label={"Seleccionar " + vehicle.plate}
                      aria-pressed={value === vehicle.id}
                      onClick={() => select(vehicle)}
                    >
                      Seleccionar
                    </button>
                  ) : (
                    <p className={styles.ownerWarning}>
                      Asociado a otro cliente. No se cambiará su propietario.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {total > results.length && (
            <p className={styles.hint}>
              Mostrando {results.length} de {total}. Completa la patente para
              acotar la búsqueda.
            </p>
          )}
        </div>
      )}
      {onCreate && !disabled && (
        <PlateRegistrationCheck {...plateCheck} onCheck={plateCheck.check} />
      )}
      <SelectField
        label="Vehículo / patente"
        required
        value={value}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.value === value) return;
          if (event.target.value === "__new__") {
            if (!plateCheck.blocked && !plateCheck.busy) onCreate?.();
          } else onChange(event.target.value);
        }}
      >
        <option value="">Seleccionar vehículo</option>
        {onCreate && !disabled && !plateCheck.blocked && !plateCheck.busy && (
          <option value="__new__">+ Registrar nuevo vehículo</option>
        )}
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.plate} · {vehicle.brand} {vehicle.model}
          </option>
        ))}
      </SelectField>
    </div>
  );
}
