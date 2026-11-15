import type { Metadata, Viewport } from "next";
import { geistSans, newsreader } from "./fonts";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${newsreader.variable}`}>
      <body>
        <ArgusProvider>
          <AppShell>{children}</AppShell>
        </ArgusProvider>
      </body>
    </html>
  );
}
