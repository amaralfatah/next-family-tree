import { Inter } from "next/font/google";

// The system face first (SF Pro on Apple devices, per the HIG), with Inter, the Sararia family's face,
// everywhere else. Inter SemiBold is also the wordmark lockup (sararia-logo/FAMILY.md).
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], axes: ["opsz"] });

export const fontVariables = inter.variable;
