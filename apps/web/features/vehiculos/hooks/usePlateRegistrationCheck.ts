import { useEffect, useRef, useState } from "react";
import {
  checkPlateRegistration,
  PlateRegistrationStatus,
} from "../services/plateRegistrationCheck";

export function usePlateRegistrationCheck(
  plate: string,
  context: string,
  enabled: boolean,
) {
  const key = JSON.stringify([plate, context, enabled]);
  const currentKey = useRef(key);
  currentKey.current = key;
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const [state, setState] = useState<{
    key: string;
    busy: boolean;
    result?: PlateRegistrationStatus;
    error?: string;
  }>({ key, busy: false });
  useEffect(() => {
    setState({ key, busy: false });
    return () => {
      sequence.current++;
      controller.current?.abort();
    };
  }, [key]);
  const visible =
    enabled && state.key === key
      ? state
      : { busy: false, result: undefined, error: undefined };
  async function check() {
    if (!enabled) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const attempt = ++sequence.current;
    const knownMatch =
      visible.result !== "NO_MATCH" ? visible.result : undefined;
    setState({ key, busy: true, result: knownMatch });
    try {
      const result = await checkPlateRegistration(plate, abort.signal);
      if (
        attempt === sequence.current &&
        currentKey.current === key &&
        !abort.signal.aborted
      )
        setState({ key, busy: false, result });
    } catch {
      if (
        attempt === sequence.current &&
        currentKey.current === key &&
        !abort.signal.aborted
      )
        setState({
          key,
          busy: false,
          result: knownMatch,
          error:
            "No se pudo comprobar el registro. Revisa la patente y tu acceso, e inténtalo nuevamente. Este resultado no confirma disponibilidad.",
        });
    }
  }
  return {
    busy: visible.busy,
    result: visible.result,
    error: visible.error,
    check,
    blocked: !!visible.result && visible.result !== "NO_MATCH",
  };
}
