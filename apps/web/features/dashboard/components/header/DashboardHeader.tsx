import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { PageHeading } from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/hooks/useAuth";
export function DashboardHeader() {
  const { user } = useAuth();
  return (
    <PageHeading
      eyebrow="RESUMEN GENERAL"
      title={user?.role === "ADMIN" ? "Dashboard" : "Mi jornada de trabajo"}
      description={
        "Hola, " +
        user?.name.split(" ")[0] +
        ". Esto es lo que está pasando en tu taller."
      }
      action={
        <div className="heading-actions">
          <span className="date-chip">
            <CalendarDays size={16} />
            {new Date().toLocaleDateString("es-CL", {
              day: "numeric",
              month: "long",
            })}
          </span>
          <Link className="button primary" href="/ordenes/nueva">
            <Plus size={18} />
            Nueva orden
          </Link>
        </div>
      }
    />
  );
}
