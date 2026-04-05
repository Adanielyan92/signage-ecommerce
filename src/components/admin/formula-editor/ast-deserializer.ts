import type {
  FormulaNode,
  FormulaDefinition,
} from "@/engine/formula-types";
import type {
  EditorNode,
  EditorConnection,
  EditorGraph,
  CompareOp,
  MultiplierEntry,
} from "./types";

let counter = 0;
function nextId(): string {
  counter += 1;
  return `node-deser-${counter}`;
}

function nextConnId(): string {
  counter += 1;
  return `conn-deser-${counter}`;
}

interface BuildResult {
  nodeId: string;
  nodes: EditorNode[];
  connections: EditorConnection[];
}

/**
 * Recursively convert a FormulaNode AST into editor nodes + connections.
 * Returns the root nodeId for this subtree and all generated nodes/connections.
 * Positions are laid out left-to-right; x decreases for deeper nodes.
 */
function formulaToNodes(
  ast: FormulaNode,
  baseX: number,
  baseY: number,
  yStep: number,
): BuildResult {
  const allNodes: EditorNode[] = [];
  const allConnections: EditorConnection[] = [];

  function walk(node: FormulaNode, x: number, y: number): string {
    const id = nextId();

    switch (node.type) {
      case "variable": {
        allNodes.push({
          id,
          position: { x, y },
          data: { kind: "variable", variableName: node.name },
        });
        return id;
      }

      case "literal": {
        allNodes.push({
          id,
          position: { x, y },
          data: { kind: "literal", value: node.value },
        });
        return id;
      }

      case "binaryOp": {
        allNodes.push({
          id,
          position: { x, y },
          data: { kind: "binaryOp", op: node.op },
        });
        const leftId = walk(node.left, x - 220, y - yStep / 2);
        const rightId = walk(node.right, x - 220, y + yStep / 2);
        allConnections.push(
          { id: nextConnId(), fromNodeId: leftId, fromPortId: "out", toNodeId: id, toPortId: "left" },
          { id: nextConnId(), fromNodeId: rightId, fromPortId: "out", toNodeId: id, toPortId: "right" },
        );
        return id;
      }

      case "unaryFn": {
        allNodes.push({
          id,
          position: { x, y },
          data: { kind: "unaryFn", fn: node.fn },
        });
        const argId = walk(node.arg, x - 220, y);
        allConnections.push(
          { id: nextConnId(), fromNodeId: argId, fromPortId: "out", toNodeId: id, toPortId: "arg" },
        );
        return id;
      }

      case "conditional": {
        const cond = node.condition;
        let compareOp: CompareOp = ">";
        // Only support simple compare conditions for deserialization
        if (cond.type === "compare") {
          compareOp = cond.op;
        }

        allNodes.push({
          id,
          position: { x, y },
          data: { kind: "conditional", compareOp },
        });

        if (cond.type === "compare") {
          const condLeftId = walk(cond.left, x - 220, y - yStep);
          const condRightId = walk(cond.right, x - 220, y - yStep / 3);
          allConnections.push(
            { id: nextConnId(), fromNodeId: condLeftId, fromPortId: "out", toNodeId: id, toPortId: "condLeft" },
            { id: nextConnId(), fromNodeId: condRightId, fromPortId: "out", toNodeId: id, toPortId: "condRight" },
          );
        }

        const thenId = walk(node.then, x - 220, y + yStep / 3);
        const elseId = walk(node.else, x - 220, y + yStep);
        allConnections.push(
          { id: nextConnId(), fromNodeId: thenId, fromPortId: "out", toNodeId: id, toPortId: "then" },
          { id: nextConnId(), fromNodeId: elseId, fromPortId: "out", toNodeId: id, toPortId: "else" },
        );
        return id;
      }

      case "multiplierChain": {
        const multipliers: MultiplierEntry[] = node.multipliers.map((m, i) => ({
          id: `mult-${i}-${Date.now()}`,
          name: m.name,
          reason: m.reason,
          factor: m.factor,
          compareOp: m.condition.type === "compare" ? m.condition.op : (">" as CompareOp),
        }));

        allNodes.push({
          id,
          position: { x, y },
          data: { kind: "multiplierChain", multipliers },
        });

        const baseId = walk(node.base, x - 220, y);
        allConnections.push(
          { id: nextConnId(), fromNodeId: baseId, fromPortId: "out", toNodeId: id, toPortId: "base" },
        );
        return id;
      }

      default:
        // Fallback: treat as literal 0
        allNodes.push({
          id,
          position: { x, y },
          data: { kind: "literal", value: 0 },
        });
        return id;
    }
  }

  const rootId = walk(ast, baseX, baseY);
  return { nodeId: rootId, nodes: allNodes, connections: allConnections };
}

/**
 * Convert a full FormulaDefinition into an EditorGraph.
 */
export function deserializeFormula(def: FormulaDefinition): EditorGraph {
  counter = 0;

  const outputNode: EditorNode = {
    id: "output-root",
    position: { x: 700, y: 250 },
    data: { kind: "output" },
  };

  const allNodes: EditorNode[] = [outputNode];
  const allConnections: EditorConnection[] = [];

  // Deserialize the main formula tree
  const formulaResult = formulaToNodes(def.formula, 450, 200, 120);
  allNodes.push(...formulaResult.nodes);
  allConnections.push(...formulaResult.connections);
  allConnections.push({
    id: nextConnId(),
    fromNodeId: formulaResult.nodeId,
    fromPortId: "out",
    toNodeId: "output-root",
    toPortId: "formula",
  });

  // Deserialize minOrderPrice if present
  if (def.minOrderPrice) {
    const minResult = formulaToNodes(def.minOrderPrice, 450, 450, 80);
    allNodes.push(...minResult.nodes);
    allConnections.push(...minResult.connections);
    allConnections.push({
      id: nextConnId(),
      fromNodeId: minResult.nodeId,
      fromPortId: "out",
      toNodeId: "output-root",
      toPortId: "minOrder",
    });
  }

  return { nodes: allNodes, connections: allConnections };
}
