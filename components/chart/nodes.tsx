"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { PERSON_H, PERSON_W, UNION_SIZE, UNKNOWN_H, UNKNOWN_W } from "@/lib/graph/layout";
import { subtitle } from "@/lib/person";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface PersonNodeData extends Record<string, unknown> {
  person: Person;
  photo: string | null;
  focus: boolean;
  isMe: boolean;
  /** On the highlighted kinship path between me and the selected person. */
  onPath: boolean;
  isSelected: boolean;
  /** The card of someone being added, drawn before they are saved. */
  draft: boolean;
}

export type PersonFlowNode = Node<PersonNodeData, "person">;

const hidden = "!pointer-events-none !size-px !min-h-0 !min-w-0 !border-0 !bg-transparent";

export function initialsOf(name: string) {
  return name
    .replace(/^(H|Hj|Dr|Ir|Drs|Prof)\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export const PersonNode = memo(function PersonNode({ data }: NodeProps<PersonFlowNode>) {
  const { person, photo, focus, isMe, onPath, isSelected: selected, draft } = data;
  // Pedigree convention instead of a colour code: circle for women, square for men.
  const avatarShape = person.gender === "male" ? "rounded-[5px]" : person.gender === "female" ? "rounded-full" : "rounded-lg";
  return (
    <div
      style={{ width: PERSON_W, height: PERSON_H }}
      className={cn(
        "group relative flex cursor-pointer items-center gap-2.5 overflow-visible rounded-xl border bg-card py-2 pr-2.5 pl-2.5 text-left transition-[border-color,transform,background-color] duration-150 ease-out active:duration-0 hover:border-foreground/35 active:scale-[0.98]",
        !person.isLiving && "bg-paper-2",
        focus && "border-soga/70 ring-2 ring-soga/25",
        onPath && "border-soga bg-[color-mix(in_oklch,var(--soga)_12%,var(--card))] ring-2 ring-soga/30",
        selected && "border-foreground/70 shadow-md",
        draft && "draft-in cursor-default border-2 border-dashed border-soga bg-accent hover:border-soga active:scale-100",
      )}
    >
      <Handle type="target" position={Position.Top} className={hidden} isConnectable={false} />
      <span className={cn("grid size-10 shrink-0 place-items-center overflow-hidden monogram text-xs font-semibold", avatarShape)}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" width={40} height={40} className="size-full object-cover" loading="lazy" />
        ) : (
          initialsOf(person.fullName)
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] leading-tight font-semibold">{person.fullName}</span>
        {person.nickname ? <span className="block truncate text-[12.5px] leading-tight text-muted-foreground">“{person.nickname}”</span> : null}
        <span className="mt-0.5 block truncate text-[12.5px] leading-tight text-muted-foreground">{subtitle(person) || " "}</span>
      </span>
      {draft ? (
        <span className="absolute -top-2.5 right-2 rounded-full bg-soga px-2 py-px text-xs font-semibold text-white">Belum disimpan</span>
      ) : isMe ? (
        <span className="absolute -top-2.5 right-2 rounded-full bg-primary px-2 py-px text-xs font-semibold text-primary-foreground">Saya</span>
      ) : null}
      <Handle type="source" position={Position.Bottom} className={hidden} isConnectable={false} />
    </div>
  );
});

export interface UnionNodeData extends Record<string, unknown> {
  unionId: string;
  status: string;
  onPath?: boolean;
  /** Has children to fold (descendant charts only): the dot then works as the fold/unfold switch. */
  collapsible: boolean;
  collapsed: boolean;
  /** Who the marriage belongs to, for the dot's label: "Fajar & Dewi". */
  owner: string;
  onToggle: (unionId: string) => void;
}

export type UnionFlowNode = Node<UnionNodeData, "union">;

export const UnionNode = memo(function UnionNode({ data }: NodeProps<UnionFlowNode>) {
  const dot = cn(
    "rounded-full transition-[scale,background-color,box-shadow] duration-150",
    data.status === "divorced" ? "border-2 border-nila/70 bg-background" : "bg-nila",
    // Folded: a bigger dot with a halo, so the family hiding behind it stands out.
    data.collapsed ? "size-3.5 bg-foreground/75 ring-4 ring-foreground/15" : "size-2.5",
    data.onPath && "scale-125 border-soga bg-soga",
  );
  return (
    <div style={{ width: UNION_SIZE, height: UNION_SIZE }} className="grid place-items-center" title={data.status === "divorced" ? "Bercerai" : undefined}>
      <Handle type="target" position={Position.Top} className={hidden} isConnectable={false} />
      {data.collapsible ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data.onToggle(data.unionId);
          }}
          aria-expanded={!data.collapsed}
          aria-label={`${data.collapsed ? "Tampilkan" : "Sembunyikan"} anak-anak ${data.owner}`}
          title={data.collapsed ? "Tampilkan anak-anak" : "Sembunyikan anak-anak"}
          className="nodrag nopan pointer-events-auto group/dot relative grid size-full cursor-pointer place-items-center rounded-full outline-none after:absolute after:-inset-[15px] after:content-[''] focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className={cn(dot, "group-hover/dot:scale-150 group-active/dot:scale-110 group-active/dot:duration-0")} />
        </button>
      ) : (
        <span className={dot} />
      )}
      <Handle type="source" position={Position.Bottom} className={hidden} isConnectable={false} />
    </div>
  );
});

export type UnknownFlowNode = Node<Record<string, never>, "unknown">;

export const UnknownNode = memo(function UnknownNode() {
  return (
    <div
      style={{ width: UNKNOWN_W, height: UNKNOWN_H }}
      className="grid place-items-center rounded-xl border border-dashed bg-transparent text-xs text-muted-foreground"
    >
      <Handle type="target" position={Position.Top} className={hidden} isConnectable={false} />
      Tidak diketahui
      <Handle type="source" position={Position.Bottom} className={hidden} isConnectable={false} />
    </div>
  );
});

export const nodeTypes = { person: PersonNode, union: UnionNode, unknown: UnknownNode };
