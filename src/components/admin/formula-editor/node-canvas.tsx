"use client";

import { useCallback, useEffect } from "react";
import { useFormulaEditorStore } from "./use-formula-editor-store";
import { FormulaNodeComponent } from "./formula-node";
import { ConnectionLines } from "./connection-lines";
import type { EditorNodeData, Position } from "./types";

interface NodeCanvasProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export function NodeCanvas({ canvasRef }: NodeCanvasProps) {
  const nodes = useFormulaEditorStore((s) => s.nodes);
  const dragState = useFormulaEditorStore((s) => s.dragState);
  const canvasOffset = useFormulaEditorStore((s) => s.canvasOffset);
  const moveNode = useFormulaEditorStore((s) => s.moveNode);
  const endDrag = useFormulaEditorStore((s) => s.endDrag);
  const selectNode = useFormulaEditorStore((s) => s.selectNode);
  const cancelConnection = useFormulaEditorStore((s) => s.cancelConnection);
  const addNode = useFormulaEditorStore((s) => s.addNode);

  // Handle mouse move for dragging nodes
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - canvasOffset.x - dragState.offsetX;
      const y = e.clientY - rect.top - canvasOffset.y - dragState.offsetY;
      moveNode(dragState.nodeId, { x, y });
    },
    [dragState, canvasOffset, moveNode, canvasRef]
  );

  const handleMouseUp = useCallback(() => {
    if (dragState) {
      endDrag();
    }
  }, [dragState, endDrag]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Handle canvas click to deselect / cancel pending connection
  const handleCanvasClick = useCallback(() => {
    selectNode(null);
    cancelConnection();
  }, [selectNode, cancelConnection]);

  // Handle drop from palette
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const json = e.dataTransfer.getData("application/formula-node");
      if (!json || !canvasRef.current) return;

      const data = JSON.parse(json) as EditorNodeData;
      const rect = canvasRef.current.getBoundingClientRect();
      const position: Position = {
        x: e.clientX - rect.left - canvasOffset.x - 96, // center the 192px-wide node
        y: e.clientY - rect.top - canvasOffset.y - 20,
      };

      addNode(data, position);
    },
    [addNode, canvasOffset, canvasRef]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <div
      ref={canvasRef}
      className="relative h-full w-full overflow-hidden bg-[#fafafa]"
      onClick={handleCanvasClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{
        backgroundImage:
          "radial-gradient(circle, #d4d4d8 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`,
      }}
    >
      {/* SVG connections layer */}
      <ConnectionLines canvasRef={canvasRef} />

      {/* Nodes layer */}
      <div
        style={{
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
        }}
      >
        {nodes.map((node) => (
          <FormulaNodeComponent key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}
