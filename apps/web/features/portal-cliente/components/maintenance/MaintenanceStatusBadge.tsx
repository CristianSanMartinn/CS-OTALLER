import { CheckCircle2, Clock3, AlertCircle } from "lucide-react";
export function MaintenanceStatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: string;
}) {
  const Icon =
    tone === "current"
      ? CheckCircle2
      : tone === "overdue"
        ? AlertCircle
        : Clock3;
  return (
    <span className={"public-maintenance-status " + tone}>
      <Icon size={15} />
      {label}
    </span>
  );
}
