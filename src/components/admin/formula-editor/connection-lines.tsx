"use client";

import { useEffect, useState } from "react";
import { useFormulaEditorStore } from "./use-formula-editor-store";

interface PortPosition {
  x: number;
  y: number;
}

/** Singleton registry: portKey -> DOM element */
const portRegistry = new Map<string, HTMLDivElement>();

export function registerPort(nodeId: string, portId: string, el: HTMLDivElement | null) {
  const key = `${nodeId}:${portId}`;
  if (el) {
    portRegistry.set(key, el);
  } else {
    portRegistry.delete(key);
  }
}

function getPortCenter(nodeId: string, portId: string, canvasEl: HTMLElement | null): PortPosition | null {
  const key = `${nodeId}:${portId}`;
  const el = portRegistry.get(key);
  if (!el || !canvasEl) return null;

  const portRect = el.getBoundingClientRect();
  const canvasRect = canvasEl.getBoundingClientRect();
  return {
    x: portRect.left + portRect.width / 2 - canvasRect.left,
    y: portRect.top + portRect.height / 2 - canvasRect.top,
  };
}

function bezierPath(from: PortPosition, to: PortPosition): string {
  const dx = Math.abs(to.x - from.x) * 0.5;
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

interface ConnectionLinesProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export function ConnectionLines({ canvasRef }: ConnectionLinesProps) {
  const connections = useFormulaEditorStore((s) => s.connections);
  const nodes = useFormulaEditorStore((s) => s.nodes);
  const pendingConnection = useFormulaEditorStore((s) => s.pendingConnection);
  const [mousePos, setMousePos] = useState<PortPosition | null>(null);
  const [, forceRender] = useState(0);

  // Force re-render when nodes move so lines update
  useEffect(() => {
    forceRender((n) => n + 1);
  }, [nodes]);

  // Track mouse for pending connection line
  useEffect(() => {
    if (!pendingConnection) {
      setMousePos(null);
      return;
    }

    function onMouseMove(e: MouseEvent) {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [pendingConnection, canvasRef]);

  const canvasEl = canvasRef.current;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      {/* Existing connections */}
      {connections.map((conn) => {
        const from = getPortCenter(conn.fromNodeId, conn.fromPortId, canvasEl);
        const to = getPortCenter(conn.toNodeId, conn.toPortId, canvasEl);
        if (!from || !to) return null;
        return (
          <path
            key={conn.id}
            d={bezierPath(from, to)}
            fill="none"
            stroke="#6366f1"
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}

      {/* Pending connection (dragging from port to mouse) */}
      {pendingConnection && mousePos && (() => {
        const from = getPortCenter(
          pendingConnection.fromNodeId,
          pendingConnection.fromPortId,
          canvasEl,
        );
        if (!from) return null;
        return (
          <path
            d={bezierPath(from, mousePos)}
            fill="none"
            stroke="#6366f1"
            strokeWidth={2}
            strokeDasharray="6 3"
            strokeLinecap="round"
            opacity={0.5}
          />
        );
      })()}
    </svg>
  );
}
