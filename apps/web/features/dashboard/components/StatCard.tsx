import { LucideIcon } from "lucide-react";
export function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: number;
  note: string;
  icon: LucideIcon;
  tone?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <div className={"stat-icon " + tone}>
          <Icon size={20} />
        </div>
      </div>
      <strong className="stat-value">{String(value).padStart(2, "0")}</strong>
      <small>{note}</small>
    </div>
  );
}
