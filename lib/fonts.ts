import { Inter, Source_Serif_4 } from "next/font/google";

// Body and UI: the system face first (SF Pro on Apple devices), with Inter, the Sararia family's face,
// everywhere else. Inter SemiBold is also the wordmark lockup (sararia-logo/FAMILY.md).
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], axes: ["opsz"] });

// Titles and names: an editorial serif (DESIGN.md). Source Serif 4 has an optical-size axis, so the
// same family draws tighter at display sizes and sturdier at card sizes.
const serif = Source_Serif_4({ variable: "--font-serif", subsets: ["latin"], axes: ["opsz"] });

export const fontVariables = `${inter.variable} ${serif.variable}`;
