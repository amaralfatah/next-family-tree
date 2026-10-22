"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
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
  hiddenCount: number;
  collapsible: boolean;
  collapsed: boolean;
  direction: "down" | "up";
  onToggle: (personId: string) => void;
  /** On the highlighted kinship path between me and the selected person. */
  onPath: boolean;
  isSelected: boolean;
}

export type PersonFlowNode = Node<PersonNodeData, "person">;

const hidden = "!pointer-events-none !size-px !min-h-0 !min-w-0 !border-0 !bg-transparent";

function initialsOf(name: string) {
  return name
    .replace(/^(H|Hj|Dr|Ir|Drs|Prof)\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export const PersonNode = memo(function PersonNode({ data }: NodeProps<PersonFlowNode>) {
  const { person, photo, focus, isMe, hiddenCount, collapsible, collapsed, direction, onToggle, onPath, isSelected: selected } = data;
  const accent = person.gender === "female" ? "bg-soga" : person.gender === "male" ? "bg-nila" : "bg-muted-foreground/40";
  return (
    <div
      style={{ width: PERSON_W, height: PERSON_H }}
      className={cn(
        "group relative flex cursor-pointer items-center gap-2.5 overflow-visible rounded-xl border bg-card py-2 pr-2.5 pl-3 text-left shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-[border-color,box-shadow,transform,background-color] duration-150 ease-out hover:border-foreground/25 hover:shadow-md active:scale-[0.98]",
        !person.isLiving && "bg-paper-2",
        focus && "border-soga/70 ring-2 ring-soga/25",
        onPath && "border-soga bg-[color-mix(in_oklch,var(--soga)_12%,var(--card))] ring-2 ring-soga/30",
        selected && "border-foreground/60 shadow-lg",
      )}
    >
      <Handle type="target" position={Position.Top} className={hidden} isConnectable={false} />
      <span className={cn("absolute inset-y-2 left-0 w-[3px] rounded-r-full", accent)} aria-hidden />
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          initialsOf(person.fullName)
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] leading-tight font-semibold">{person.fullName}</span>
        {person.nickname ? <span className="block truncate text-[12.5px] leading-tight text-muted-foreground">“{person.nickname}”</span> : null}
        <span className="mt-0.5 block truncate text-[12.5px] leading-tight text-muted-foreground">{subtitle(person) || " "}</span>
      </span>
      {isMe ? (
        <span className="absolute -top-2.5 right-2 rounded-full bg-soga px-2 py-px text-[10px] font-semibold text-primary-foreground dark:text-background">Saya</span>
      ) : null}
      {collapsible ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(person.id);
          }}
          aria-label={collapsed ? `Buka cabang ${person.fullName}` : `Lipat cabang ${person.fullName}`}
          className={cn(
            "nodrag absolute left-1/2 z-10 flex h-5 -translate-x-1/2 items-center gap-0.5 rounded-full border bg-background px-1.5 text-[10px] font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground",
            direction === "down" ? "-bottom-2.5" : "-top-2.5",
          )}
        >
          {collapsed ? (
            <>
              {direction === "down" ? <ChevronDownIcon className="size-3" /> : <ChevronUpIcon className="size-3" />}+{hiddenCount}
            </>
          ) : direction === "down" ? (
            <ChevronUpIcon className="size-3" />
          ) : (
            <ChevronDownIcon className="size-3" />
          )}
        </button>
      ) : null}
      <Handle type="source" position={Position.Bottom} className={hidden} isConnectable={false} />
    </div>
  );
});

export type UnionFlowNode = Node<{ status: string; onPath?: boolean }, "union">;

export const UnionNode = memo(function UnionNode({ data }: NodeProps<UnionFlowNode>) {
  return (
    <div style={{ width: UNION_SIZE, height: UNION_SIZE }} className="grid place-items-center" title={data.status === "divorced" ? "Bercerai" : undefined}>
      <Handle type="target" position={Position.Top} className={hidden} isConnectable={false} />
      <span
        className={cn(
          "size-2.5 rounded-full transition-transform",
          data.status === "divorced" ? "border-2 border-nila/70 bg-background" : "bg-nila",
          data.onPath && "scale-125 border-soga bg-soga",
        )}
      />
      <Handle type="source" position={Position.Bottom} className={hidden} isConnectable={false} />
    </div>
  );
});

export type UnknownFlowNode = Node<Record<string, never>, "unknown">;

export const UnknownNode = memo(function UnknownNode() {
  return (
    <div
      style={{ width: UNKNOWN_W, height: UNKNOWN_H }}
      className="grid place-items-center rounded-xl border border-dashed bg-transparent text-[11.5px] text-muted-foreground"
    >
      <Handle type="target" position={Position.Top} className={hidden} isConnectable={false} />
      Tidak diketahui
      <Handle type="source" position={Position.Bottom} className={hidden} isConnectable={false} />
    </div>
  );
});

export const nodeTypes = { person: PersonNode, union: UnionNode, unknown: UnknownNode };
