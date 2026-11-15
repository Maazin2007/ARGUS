import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

// Two typefaces, named by the job they do rather than by the font, so the font can change
// in this one file. Exported so canvas code can read the real font name
// (`uiSans.style.fontFamily`), because canvas cannot use CSS variables.

// Labels, headings, buttons and body text.
export const uiSans = IBM_Plex_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Readings, clocks and reference codes: every digit is the same width, so columns line up.
export const dataMono = IBM_Plex_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  weight: ["400", "500"],
});
