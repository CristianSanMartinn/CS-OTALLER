"use client";
import type { ReactNode } from "react";
import { ApplicationLoading } from "@/components/ApplicationLoading/ApplicationLoading";
export function PortalEntrance({
  token,
  ready,
  logo,
  children,
}: {
  token: string;
  ready: boolean;
  logo?: string;
  children: ReactNode;
}) {
  return (
    <ApplicationLoading
      contextLabel="HISTORIAL DIGITAL"
      rememberKey={"portal:" + token}
      message="Preparando tu historial de mantenimiento"
      ready={ready}
      logo={logo}
    >
      {children}
    </ApplicationLoading>
  );
}
