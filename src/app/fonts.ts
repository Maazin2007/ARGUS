import { Geist, Newsreader } from "next/font/google";

// The two typefaces from the mockup. Exported so canvas and SVG code can read
// the real font name (`geistSans.style.fontFamily`), because canvas cannot use CSS variables.
export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["300", "400"],
});
