import { Inter, Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";

// Instrument Serif gives the family-archive feel to headings; Plus Jakarta Sans was drawn for
// Jakarta's city identity and reads well for Indonesian text.
const display = Instrument_Serif({ variable: "--font-display", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const body = Plus_Jakarta_Sans({ variable: "--font-body", subsets: ["latin"] });
// Inter SemiBold is the Sararia family's lockup face (sararia-logo/FAMILY.md), used only in the wordmark.
const brand = Inter({ variable: "--font-brand-face", subsets: ["latin"], weight: "600" });

export const fontVariables = `${display.variable} ${body.variable} ${brand.variable}`;
