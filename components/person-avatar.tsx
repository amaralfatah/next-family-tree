import { photoUrl } from "@/lib/person";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

// Rendered size of each variant (size-9, size-12, size-28), so the image reserves its box before it loads.
const PX = { sm: 36, md: 48, lg: 112 } as const;

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
        "grid shrink-0 place-items-center overflow-hidden monogram rounded-full font-semibold",
        size === "sm" && "size-9 text-xs",
        size === "md" && "size-12 text-sm",
        size === "lg" && "size-24 text-2xl sm:size-28",
        !person.isLiving && "grayscale-[35%]",
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" width={PX[size]} height={PX[size]} className="size-full object-cover" loading="lazy" />
      ) : (
        initials
      )}
    </span>
  );
}
