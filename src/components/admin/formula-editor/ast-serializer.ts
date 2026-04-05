import type {
  FormulaNode,
  FormulaDefinition,
  FormulaVariable,
  ConditionExpr,
  ConditionalMultiplier,
} from "@/engine/formula-types";
import type { EditorNode, EditorConnection, EditorGraph } from "./types";

export class SerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SerializationError";
  }
}

/**
 * Serialize the visual editor graph into a FormulaDefinition AST.
 *
 * Traversal: starting from the "output-root" node, walk backwards through
 * connections to build the formula tree. Each input port on a node corresponds
 * to a child in the AST.
 */
export function serializeGraph(
  graph: EditorGraph,
  meta: {
    id: string;
    name: string;
    description: string;
    variables: FormulaVariable[];
  }
): FormulaDefinition {
  const nodeMap = new Map<string, EditorNode>(
    graph.nodes.map((n) => [n.id, n])
  );

  // Build a lookup: (toNodeId, toPortId) -> fromNodeId
  const inputMap = new Map<string, string>();
  for (const conn of graph.connections) {
    inputMap.set(`${conn.toNodeId}:${conn.toPortId}`, conn.fromNodeId);
  }

  function resolveInput(nodeId: string, portId: string): EditorNode {
    const sourceNodeId = inputMap.get(`${nodeId}:${portId}`);
    if (!sourceNodeId) {
      const node = nodeMap.get(nodeId);
      const label = node?.data.kind ?? nodeId;
      throw new SerializationError(
        `Missing connection: "${label}" node's "${portId}" input is not connected.`
      );
    }
    const sourceNode = nodeMap.get(sourceNodeId);
    if (!sourceNode) {
      throw new SerializationError(`Node "${sourceNodeId}" not found in graph.`);
    }
    return sourceNode;
  }

  function nodeToFormula(node: EditorNode): FormulaNode {
    switch (node.data.kind) {
      case "variable":
        return { type: "variable", name: node.data.variableName };

      case "literal":
        return { type: "literal", value: node.data.value };

      case "binaryOp": {
        const leftNode = resolveInput(node.id, "left");
        const rightNode = resolveInput(node.id, "right");
        return {
          type: "binaryOp",
          op: node.data.op,
          left: nodeToFormula(leftNode),
          right: nodeToFormula(rightNode),
        };
      }

      case "unaryFn": {
        const argNode = resolveInput(node.id, "arg");
        return {
          type: "unaryFn",
          fn: node.data.fn,
          arg: nodeToFormula(argNode),
        };
      }

      case "conditional": {
        const condLeftNode = resolveInput(node.id, "condLeft");
        const condRightNode = resolveInput(node.id, "condRight");
        const thenNode = resolveInput(node.id, "then");
        const elseNode = resolveInput(node.id, "else");
        const condition: ConditionExpr = {
          type: "compare",
          left: nodeToFormula(condLeftNode),
          op: node.data.compareOp,
          right: nodeToFormula(condRightNode),
        };
        return {
          type: "conditional",
          condition,
          then: nodeToFormula(thenNode),
          else: nodeToFormula(elseNode),
        };
      }

      case "multiplierChain": {
        const baseNode = resolveInput(node.id, "base");
        const multipliers: ConditionalMultiplier[] = node.data.multipliers.map(
          (m) => ({
            name: m.name,
            reason: m.reason,
            factor: m.factor,
            condition: {
              type: "compare" as const,
              // Multiplier conditions compare a variable against literal 1
              // The variable name is stored in m.name
              left: { type: "variable" as const, name: m.name },
              op: m.compareOp,
              right: { type: "literal" as const, value: 1 },
            },
          })
        );
        return {
          type: "multiplierChain",
          base: nodeToFormula(baseNode),
          multipliers,
        };
      }

      case "output":
        throw new SerializationError("Output node should not appear as a formula source.");

      default:
        throw new SerializationError(`Unknown node kind: ${(node.data as { kind: string }).kind}`);
    }
  }

  // Find the output root
  const outputNode = graph.nodes.find((n) => n.data.kind === "output");
  if (!outputNode) {
    throw new SerializationError("No output node found in the graph.");
  }

  // Resolve the main formula input
  const formulaSourceId = inputMap.get(`${outputNode.id}:formula`);
  if (!formulaSourceId) {
    throw new SerializationError(
      'The output node\'s "Formula" input is not connected. Connect a node to it.'
    );
  }
  const formulaSourceNode = nodeMap.get(formulaSourceId);
  if (!formulaSourceNode) {
    throw new SerializationError("Formula source node not found.");
  }

  const formula = nodeToFormula(formulaSourceNode);

  // Resolve optional minOrderPrice input
  let minOrderPrice: FormulaNode | null = null;
  const minOrderSourceId = inputMap.get(`${outputNode.id}:minOrder`);
  if (minOrderSourceId) {
    const minOrderSourceNode = nodeMap.get(minOrderSourceId);
    if (minOrderSourceNode) {
      minOrderPrice = nodeToFormula(minOrderSourceNode);
    }
  }

  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    variables: meta.variables,
    formula,
    addOns: [], // Add-ons can be added in a future iteration
    minOrderPrice,
  };
}
