import { Cancellation } from "@/features/shared/types/domain";
import { cancellationReasons } from "@/utils/cancellation";
export function CancellationDetails({
  cancellation,
}: {
  cancellation?: Cancellation;
}) {
  if (!cancellation) return null;
  return (
    <div role="note">
      <strong>Motivo: {cancellationReasons[cancellation.reason]}</strong>
      <small>
        {new Date(cancellation.date).toLocaleString("es-CL", {
          timeZone: "America/Santiago",
        })}
      </small>
      {cancellation.notes && <p>{cancellation.notes}</p>}
    </div>
  );
}
