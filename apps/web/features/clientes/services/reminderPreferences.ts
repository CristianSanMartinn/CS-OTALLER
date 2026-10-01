import { Customer, ReminderPreferences } from "@/features/shared/types/domain";
export const defaultReminderPreferences: ReminderPreferences = {
  emailEnabled: false,
  whatsappEnabled: false,
  consent: false,
  daysBefore: 7,
};
export function validateReminderPreferences(
  preferences: ReminderPreferences,
  contact: Pick<Customer, "email" | "phone">,
): string | null {
  if (![7, 15, 30].includes(preferences.daysBefore))
    return "Selecciona una anticipación válida.";
  if (
    (preferences.emailEnabled || preferences.whatsappEnabled) &&
    !preferences.consent
  )
    return "Registra la autorización del cliente antes de activar recordatorios.";
  if (
    preferences.emailEnabled &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())
  )
    return "Agrega un correo válido para activar los recordatorios por correo.";
  if (
    preferences.whatsappEnabled &&
    !/^\+[1-9]\d{7,14}$/.test(contact.phone.replace(/[\s()-]/g, ""))
  )
    return "Agrega un teléfono con código de país, por ejemplo +56 9 1234 5678.";
  return null;
}
export function withConsentTimestamp(
  preferences: ReminderPreferences,
  previous?: ReminderPreferences,
): ReminderPreferences {
  return {
    ...preferences,
    consentAt: preferences.consent
      ? previous?.consent && previous.consentAt
        ? previous.consentAt
        : new Date().toISOString()
      : undefined,
  };
}
