import { photoUrl } from "@/lib/person";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PersonAvatar({ treeId, person, size = "md" }: { treeId: string; person: Person; size?: "sm" | "md" | "lg" }) {
  const url = photoUrl(treeId, person);
  const initials = person.fullName
    .replace(/^(H|Hj|Dr|Ir|Drs|Prof)\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-muted font-semibold text-muted-foreground",
        size === "sm" && "size-9 text-xs",
        size === "md" && "size-12 text-sm",
        size === "lg" && "size-24 text-2xl sm:size-28",
        !person.isLiving && "grayscale-[35%]",
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        initials
      )}
    </span>
  );
}
