"use client";

import type { ElkNode } from "elkjs/lib/elk-api";
import { useEffect, useRef, useState } from "react";
import { positionsFromElk, type Positions } from "./layout";

/**
 * Talks to ELK's own worker build (public/elk-worker.min.js, copied from elkjs on
 * install) so big trees lay out off the main thread. The protocol is tiny: register the
 * algorithm once, then `layout` messages answered by id.
 */
let worker: Worker | null | undefined;
let seq = 0;
const pending = new Map<number, (msg: { data?: ElkNode; error?: unknown }) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker("/elk-worker.min.js");
    worker.onmessage = (e: MessageEvent<{ id: number; data?: ElkNode; error?: unknown }>) => {
      pending.get(e.data.id)?.(e.data);
      pending.delete(e.data.id);
    };
    worker.onerror = () => {
      worker = null;
      for (const resolve of pending.values()) resolve({ error: "worker error" });
      pending.clear();
    };
    worker.postMessage({ id: ++seq, cmd: "register", algorithms: ["layered"] });
  } catch {
    worker = null;
  }
  return worker;
}

function viaWorker(w: Worker, graph: ElkNode): Promise<ElkNode> {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("timeout"));
    }, 8_000);
    pending.set(id, (msg) => {
      clearTimeout(timer);
      if (msg.data) resolve(msg.data);
      else reject(new Error(String(msg.error ?? "layout failed")));
    });
    w.postMessage({ id, cmd: "layout", graph, layoutOptions: {}, options: {} });
  });
}

async function layout(graph: ElkNode): Promise<ElkNode> {
  const w = getWorker();
  if (w) {
    try {
      return await viaWorker(w, graph);
    } catch {
      // Fall through to the main thread for this layout.
    }
  }
  const { default: ELK } = await import("elkjs/lib/elk.bundled.js");
  return new ELK().layout(graph);
}

/** Positions for the current graph; keeps the previous ones while a new layout runs. */
export function useElkLayout(graph: ElkNode, key: string) {
  const [state, setState] = useState<{ key: string; positions: Positions } | null>(null);
  const latest = useRef(key);
  useEffect(() => {
    latest.current = key;
    let cancelled = false;
    layout(graph)
      .then((result) => {
        if (!cancelled && latest.current === key) setState({ key, positions: positionsFromElk(result) });
      })
      .catch((e) => console.error("Wargi layout failed", e));
    return () => {
      cancelled = true;
    };
    // `key` identifies the graph; the object itself changes identity every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { positions: state?.positions ?? null, stale: state?.key !== key };
}
