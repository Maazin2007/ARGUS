import type { Metadata, Viewport } from "next";
import { dataMono, uiSans } from "./fonts";
import { ArgusProvider } from "@/components/ArgusProvider";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARGUS",
  description: "Health monitoring for astronauts on space missions",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// The page starts light (data-theme="light"). ThemeButton.tsx changes the attribute to "dark".
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" className={`${uiSans.variable} ${dataMono.variable}`}>
      <body>
        <ArgusProvider>
          <AppShell>{children}</AppShell>
        </ArgusProvider>
      </body>
    </html>
  );
}
