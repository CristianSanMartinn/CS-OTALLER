import type { Metadata } from "next";
import { StoreProvider } from "@/features/shared/components/store/StoreProvider";
import { AppShell } from "@/components/AppShell";
import { PresenceProvider } from "@/features/trabajadores/components/presence/PresenceProvider";
import { ThemeProvider } from "@/features/preferencias/components/theme/ThemeProvider";
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
        <StoreProvider live={Boolean(process.env.API_URL)}>
          <ThemeProvider>
            <PresenceProvider>
              <AppShell>{children}</AppShell>
            </PresenceProvider>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
