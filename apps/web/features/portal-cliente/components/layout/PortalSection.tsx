import portalStyles from "../../Portal.module.css";
import type { ReactNode } from "react";
export function PortalSection({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={portalStyles.portalSection + " " + className}>
      <div className={portalStyles.portalSectionHeading}>
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
