import { Customer, Vehicle, Maintenance } from "@/features/shared/types/domain";
import { clientAccessPath } from "@/features/portal-cliente/services/clientAccessService";
import {
  defaultReminderPreferences,
  validateReminderPreferences,
} from "./reminderPreferences";
import { dateLabel, km } from "@/utils/format";
export type ReminderChannel = "email" | "whatsapp";
export function buildReminderPreview(
  customer: Customer,
  vehicle: Vehicle,
  maintenance: Maintenance,
  channel: ReminderChannel,
  origin: string,
) {
  if (
    vehicle.customerId !== customer.id ||
    vehicle.workshopId !== customer.workshopId ||
    maintenance.vehicleId !== vehicle.id ||
    maintenance.workshopId !== customer.workshopId
  )
    throw new Error(
      "El mantenimiento no corresponde a este cliente y vehículo.",
    );
  const preferences =
    customer.reminderPreferences ?? defaultReminderPreferences;
  const error = validateReminderPreferences(preferences, customer);
  const channelEnabled =
    channel === "email"
      ? preferences.emailEnabled
      : preferences.whatsappEnabled;
  const eligible = preferences.consent && channelEnabled && !error;
  const base = new URL(origin);
  if (!["http:", "https:"].includes(base.protocol))
    throw new Error("La dirección de la demo no es válida.");
  const url = base.origin + clientAccessPath(customer);
  const date = new Date(maintenance.nextDate + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() - preferences.daysBefore);
  const scheduledDate = Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().slice(0, 10);
  return {
    eligible,
    blockReason:
      error ??
      (!preferences.consent
        ? "Falta autorización del cliente."
        : !channelEnabled
          ? "Este canal está desactivado."
          : ""),
    destination: channel === "email" ? customer.email : customer.phone,
    subject: "Próxima mantención · " + vehicle.plate,
    scheduledDate,
    url,
    text:
      "Hola, " +
      customer.name +
      ". Tu " +
      vehicle.brand +
      " " +
      vehicle.model +
      " (" +
      vehicle.plate +
      ") tiene su próximo servicio de " +
      maintenance.type.toLowerCase() +
      " recomendado para el " +
      dateLabel(maintenance.nextDate) +
      " o a los " +
      km(maintenance.nextMileage) +
      ", lo que ocurra primero. Consulta el historial y selecciona tu vehículo: " +
      url +
      ". Coordina tu visita con el taller.",
  };
}
