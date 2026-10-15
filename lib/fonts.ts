import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";

// Instrument Serif ties Wargi to the Caang Labs family; Plus Jakarta Sans was drawn for
// Jakarta's city identity and reads well for Indonesian text.
const display = Instrument_Serif({ variable: "--font-display", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const body = Plus_Jakarta_Sans({ variable: "--font-body", subsets: ["latin"] });

export const fontVariables = `${display.variable} ${body.variable}`;
