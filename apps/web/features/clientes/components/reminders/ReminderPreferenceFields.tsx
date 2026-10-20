import { ReminderPreferences } from "@/features/shared/types/domain";
import { SelectField } from "@/components/ui/primitives";
import { Mail, MessageCircle } from "lucide-react";
export function ReminderPreferenceFields({
  value,
  onChange,
}: {
  value: ReminderPreferences;
  onChange: (v: ReminderPreferences) => void;
}) {
  return (
    <fieldset className="reminder-preferences">
      <legend>Preferencias de recordatorios</legend>
      <p>
        El cliente recibirá un enlace a su historial, sin descargar una
        aplicación del taller. Por ahora solo preparamos la configuración.
      </p>
      <div className="channel-options">
        <label>
          <input
            type="checkbox"
            checked={value.emailEnabled}
            onChange={(e) =>
              onChange({ ...value, emailEnabled: e.target.checked })
            }
          />
          <Mail size={18} />
          <span>Correo electrónico</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={value.whatsappEnabled}
            onChange={(e) =>
              onChange({ ...value, whatsappEnabled: e.target.checked })
            }
          />
          <MessageCircle size={18} />
          <span>WhatsApp</span>
        </label>
      </div>
      <SelectField
        label="Avisar antes de la próxima fecha"
        value={value.daysBefore}
        onChange={(e) =>
          onChange({
            ...value,
            daysBefore: Number(
              e.target.value,
            ) as ReminderPreferences["daysBefore"],
          })
        }
      >
        <option value={7}>7 días antes</option>
        <option value={15}>15 días antes</option>
        <option value={30}>30 días antes</option>
      </SelectField>
      <label className="consent-check">
        <input
          type="checkbox"
          checked={value.consent}
          onChange={(e) =>
            onChange({
              ...value,
              consent: e.target.checked,
              ...(!e.target.checked
                ? { emailEnabled: false, whatsappEnabled: false }
                : {}),
            })
          }
        />
        <span>
          El cliente autorizó recibir recordatorios de mantención por los
          canales seleccionados.
        </span>
      </label>
      <small>
        Sin autorización, los canales quedan desactivados. No se envía ningún
        mensaje real desde esta demo.
      </small>
    </fieldset>
  );
}
