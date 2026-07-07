import { useRef } from "react";
import type { CampusScene } from "./CampusScene";

type Props = { sceneRef: React.MutableRefObject<CampusScene | null> };

type Dir = "up" | "down" | "left" | "right";

const DIR_VEC: Record<Dir, { x: -1 | 0 | 1; y: -1 | 0 | 1 }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function TouchControls({ sceneRef }: Props) {
  const active = useRef<Set<Dir>>(new Set());

  const apply = () => {
    let x: -1 | 0 | 1 = 0;
    let y: -1 | 0 | 1 = 0;
    if (active.current.has("left")) x = -1;
    if (active.current.has("right")) x = 1;
    if (active.current.has("up")) y = -1;
    if (active.current.has("down")) y = 1;
    sceneRef.current?.setTouch(x, y);
  };

  const bind = (dir: Dir) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      active.current.add(dir);
      apply();
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      active.current.delete(dir);
      apply();
    },
    onPointerCancel: () => {
      active.current.delete(dir);
      apply();
    },
    onPointerLeave: () => {
      if (active.current.has(dir)) {
        active.current.delete(dir);
        apply();
      }
    },
    "aria-label": `Move ${dir}`,
  });

  const btn =
    "flex h-14 w-14 items-center justify-center rounded-lg border-2 border-slate-900 bg-[#fff8dc]/90 font-mono text-xl font-black text-slate-900 shadow-[3px_3px_0_0_rgba(15,23,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_rgba(15,23,42,1)] touch-none select-none";

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-4 md:hidden"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1"
        style={{ touchAction: "none" }}
      >
        <div />
        <button className={btn} {...bind("up")}>▲</button>
        <div />
        <button className={btn} {...bind("left")}>◀</button>
        <div />
        <button className={btn} {...bind("right")}>▶</button>
        <div />
        <button className={btn} {...bind("down")}>▼</button>
        <div />
      </div>
      <div className="w-16" />
    </div>
  );
}
