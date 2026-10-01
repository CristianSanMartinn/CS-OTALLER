import type { Metadata } from "next";
import { StoreProvider } from "@/features/shared/components/StoreProvider";
import { AppShell } from "@/components/AppShell";
import "./globals.css";
export const metadata: Metadata = {
  title: "C.S.OTALLER | Gestión de talleres",
  description: "Gestión profesional de talleres mecánicos",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
