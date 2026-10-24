import { Spinner } from "@/components/ui/spinner";

/** Switching tabs or opening someone: say it is on its way instead of leaving the old page up. */
export default function Loading() {
  return (
    <div role="status" className="grid flex-1 place-items-center py-24 text-[15px] text-muted-foreground">
      <span className="flex items-center gap-2">
        <Spinner /> Memuat…
      </span>
    </div>
  );
}
