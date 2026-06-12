"use client";

import type { ReactNode } from "react";

/** Numbered chapter tag — an in-game HUD chip that frames the whitepaper as a guided tour. */
export function ChapterTag({ no, children }: { no: string; children: ReactNode }) {
  return (
    <span className="hud-chip hud-label inline-flex items-center gap-2 border-cyan-400/40 px-3 py-1.5 text-cyan-300">
      <span className="text-white/50">CH.{no}</span>
      <span aria-hidden className="text-cyan-400/70">◆</span>
      {children}
    </span>
  );
}
