import { neonAuth } from "@/lib/auth/neon";

// Same-origin proxy to Neon Auth, used by the browser client in lib/auth/client.ts.
const handle = (request: Request, ctx: { params: Promise<{ path: string[] }> }) => {
  const auth = neonAuth();
  if (!auth) return new Response("Not found", { status: 404 });
  const handlers = auth.handler();
  const method = request.method as keyof typeof handlers;
  return handlers[method](request, ctx);
};

export { handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as PATCH };
