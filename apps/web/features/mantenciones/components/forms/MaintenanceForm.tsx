import styles from "./MaintenanceForm.module.css";
import { workshopWorkHistory } from "@/features/shared/services/workHistory";
import { maintenanceOrderContext } from "../../services/maintenanceContext";
import { useOilCatalog } from "../../hooks/useOilCatalog";
import { validateOilSelection } from "../../services/oilSuggestions";
import { FormEvent, useState } from "react";
import { maintenanceCategories, maintenanceTypeCode } from "@/features/shared/services/maintenanceRules";
import {  Maintenance, MaintenanceTypeCode, WorkOrder } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/store/StoreProvider";
import { Field, SelectField, TextField } from "@/components/ui/primitives";
import { OilChangeForm } from "../oil/OilChangeForm";
import { InterventionEditor } from "@/components/InterventionEditor/InterventionEditor";
import { isEngineOil } from "@/features/shared/services/interventions";
import { today, uid } from "@/utils/format";


function hasExplicitOrderCategory(order: WorkOrder | undefined) {
  return (
    order?.services.length === 1 &&
    order.services[0].maintenanceTypeCode != null
  );
}

export function MaintenanceForm({
  orderId = "",
  onSave,
  onCancel,
}: {
  orderId?: string;
  onSave: (m: Maintenance) => void;
  onCancel: () => void;
}) {
  const { data, user, saveMaintenance } = useStore();
  const order = data.orders.find((o) => o.id === orderId);
  const [value, setValue] = useState<Maintenance>({
    id: uid(),
    workshopId: user!.workshopId,
    vehicleId: order?.vehicleId ?? "",
    orderId: order?.id ?? "",
    mechanicId: user!.id,
    type: "",
    maintenanceTypeCode: "OTHER",
    interventionType: "MAINTENANCE",
    interventionReason: "SCHEDULED",
    workDetails: [],
    mileage: order?.mileage ?? 0,
    oilProductName: "",
    oilType: "",
    viscosity: "",
    brand: "",
    quantity: 0,
    filter: "",
    filterBrand: "",
    date: today(),
    nextMileage: 0,
    nextDate: "",
    notes: "",
    ...maintenanceOrderContext(order),
  });
  const [automaticCategory, setAutomaticCategory] = useState(
    () => !hasExplicitOrderCategory(order),
  );
  const linkedOrder = data.orders.find((saved) => saved.id === value.orderId);
  const catalog = useOilCatalog();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (patch: Partial<Maintenance>) =>
    setValue((m) => ({ ...m, ...patch }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = data.vehicles.find((v) => v.id === value.vehicleId);
    if (!v || value.mileage < v.mileage) {
      setError(
        "El kilometraje no puede ser menor al último registrado del vehículo.",
      );
      return;
    }
    if (
      (value.nextMileage > 0 && value.nextMileage <= value.mileage) ||
      (value.nextDate !== "" && value.nextDate <= value.date) ||
      (isEngineOil(value.type, value.maintenanceTypeCode) &&
        (!value.nextMileage || !value.nextDate))
    ) {
      setError(
        "La próxima mantención debe ser posterior en fecha y kilometraje.",
      );
      return;
    }
    if (isEngineOil(value.type, value.maintenanceTypeCode)) {
      const oilError = validateOilSelection(value, catalog.products);
      if (oilError) {
        setError(oilError);
        return;
      }
    }
    setBusy(true);
    setError("");
    try {
      const saved = await saveMaintenance(value);
      onSave(saved);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      {isEngineOil(value.type, value.maintenanceTypeCode) && (
        <div className={styles.oilFormBanner}>
          <strong>Cambio de aceite · ficha de mantenimiento</strong>
          <p>
            Registra el kilometraje de hoy y el próximo cambio. El cliente verá
            estos datos destacados en su ficha digital.
          </p>
        </div>
      )}
      {linkedOrder && (
        <div className={styles.maintenanceReceptionContext}>
          <strong>{linkedOrder.number} · Motivo de ingreso</strong>
          <p>{linkedOrder.reason || "Sin motivo registrado"}</p>
          <small>Información recuperada de la recepción.</small>
        </div>
      )}
      <div className="form-grid">
        <SelectField
          label="Vehículo"
          required
          value={value.vehicleId}
          disabled={!!order}
          onChange={(e) => {
            const vehicle = data.vehicles.find(
              (item) => item.id === e.target.value,
            );
            const currentOrders = data.orders.filter(
              (item) =>
                item.vehicleId === e.target.value &&
                !["DELIVERED", "CANCELLED"].includes(item.status),
            );
            const selected =
              currentOrders.length === 1 ? currentOrders[0] : undefined;
            const context = maintenanceOrderContext(selected);
            if (context.type !== undefined)
              setAutomaticCategory(!hasExplicitOrderCategory(selected));
            change({
              ...context,
              vehicleId: e.target.value,
              mileage: Math.max(vehicle?.mileage ?? 0, context.mileage ?? 0),
            });
          }}
        >
          <option value="">Seleccionar vehículo</option>
          {data.vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plate} · {v.brand} {v.model}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Orden vinculada"
          value={value.orderId}
          disabled={!!order}
          onChange={(e) => {
            const selected = data.orders.find(
              (saved) => saved.id === e.target.value,
            );
            const context = maintenanceOrderContext(selected);
            if (context.type !== undefined)
              setAutomaticCategory(!hasExplicitOrderCategory(selected));
            change(context);
          }}
        >
          <option value="">Sin orden vinculada</option>
          {data.orders
            .filter((o) => o.vehicleId === value.vehicleId)
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.number}
              </option>
            ))}
        </SelectField>
        <InterventionEditor
          history={workshopWorkHistory(data, user!.workshopId)}
          classificationHint={
            maintenanceCategories.find(
              (category) => category.code === value.maintenanceTypeCode,
            )?.label
          }
          extraClassification={
            <SelectField
              label="Categoría del servicio"
              value={value.maintenanceTypeCode}
              onChange={(e) => {
                setAutomaticCategory(false);
                change({
                  maintenanceTypeCode: e.target.value as MaintenanceTypeCode,
                });
              }}
            >
              {maintenanceCategories.map((category) => (
                <option key={category.code} value={category.code}>
                  {category.label}
                </option>
              ))}
            </SelectField>
          }
          onChoose={(suggestion) => {
            setAutomaticCategory(suggestion.maintenanceTypeCode == null);
            change({
              type: suggestion.name,
              interventionType: suggestion.interventionType,
              interventionReason: suggestion.interventionReason,
              workDetails: [...(suggestion.workDetails ?? [])],
              maintenanceTypeCode:
                suggestion.maintenanceTypeCode ??
                maintenanceTypeCode({ type: suggestion.name }),
            });
          }}
          maxLength={100}
          value={{
            name: value.type,
            interventionType: value.interventionType,
            interventionReason: value.interventionReason,
            workDetails: value.workDetails,
          }}
          onChange={({ name, ...patch }) =>
            change({
              ...patch,
              ...(name !== undefined
                ? {
                    type: name,
                    ...(automaticCategory
                      ? {
                          maintenanceTypeCode: maintenanceTypeCode({
                            type: name,
                          }),
                        }
                      : {}),
                  }
                : {}),
            })
          }
        />
        <Field
          label="Fecha"
          type="date"
          required
          value={value.date}
          onChange={(e) => change({ date: e.target.value })}
        />
        <Field
          label={
            isEngineOil(value.type, value.maintenanceTypeCode)
              ? "Kilometraje del cambio de aceite"
              : "Kilometraje actual"
          }
          type="number"
          min={0}
          required
          value={value.mileage}
          onChange={(e) => change({ mileage: Number(e.target.value) })}
        />
        {isEngineOil(value.type, value.maintenanceTypeCode) && (
          <OilChangeForm
            value={value}
            onChange={change}
            products={catalog.products}
            records={data.maintenance.filter(
              (record) => record.workshopId === user!.workshopId,
            )}
            loading={catalog.loading}
            error={catalog.error}
          />
        )}
        <Field
          label="Próximo servicio (km, opcional salvo aceite)"
          type="number"
          min={0}
          required={isEngineOil(value.type, value.maintenanceTypeCode)}
          value={value.nextMileage || ""}
          onChange={(e) => change({ nextMileage: Number(e.target.value) })}
        />
        <Field
          label="Próximo servicio (fecha, opcional salvo aceite)"
          type="date"
          min={value.date}
          required={isEngineOil(value.type, value.maintenanceTypeCode)}
          value={value.nextDate}
          onChange={(e) => change({ nextDate: e.target.value })}
        />
        <TextField
          label="Observaciones"
          value={value.notes}
          onChange={(e) => change({ notes: e.target.value })}
        />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? "Guardando…" : "Guardar trabajo"}
        </button>
      </div>
    </form>
  );
}
