import "server-only";
import { Google } from "arctic";

export function googleClient(origin: string) {
  const base = process.env.APP_URL ?? origin;
  return new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, `${base}/api/auth/google/callback`);
}
