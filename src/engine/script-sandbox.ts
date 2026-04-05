// src/engine/script-sandbox.ts
/**
 * Sandboxed JavaScript execution for pricing scripts (Layer 3).
 * Uses quickjs-emscripten to run admin-written JS in a WASM-based QuickJS VM.
 *
 * No filesystem, network, or DOM access. Only Math and basic JS builtins.
 *
 * Isomorphic -- runs on server (for price calculation API) and can run in
 * tests. Never runs admin scripts directly in Node.js.
 */

import { newQuickJSWASMModule, RELEASE_SYNC } from "quickjs-emscripten";
import type { QuickJSWASMModule } from "quickjs-emscripten";

export interface ScriptInput {
  scriptBody: string;
  opts: Record<string, number | string>;
  params: Record<string, number | string>;
  /** Max execution time in ms. Defaults to 2000. */
  timeoutMs?: number;
}

export interface ScriptResult {
  success: boolean;
  price?: number;
  error?: string;
  executionMs?: number;
}

/**
 * Execute a pricing script in a sandboxed QuickJS VM.
 *
 * The script MUST define a `calculate(opts, params)` function that returns a number.
 * `opts` contains flattened option values. `params` contains pricing parameters.
 */
export async function executeScript(input: ScriptInput): Promise<ScriptResult> {
  const { scriptBody, opts, params, timeoutMs = 2000 } = input;
  const startTime = Date.now();

  let QuickJS: QuickJSWASMModule;
  try {
    QuickJS = await newQuickJSWASMModule(RELEASE_SYNC);
  } catch (err) {
    return {
      success: false,
      error: `Failed to initialize QuickJS: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const vm = QuickJS.newContext();

  // Set up an interrupt handler for timeout enforcement
  let interrupted = false;
  const deadline = Date.now() + timeoutMs;
  vm.runtime.setInterruptHandler(() => {
    if (Date.now() > deadline) {
      interrupted = true;
      return true; // interrupt execution
    }
    return false;
  });

  try {
    // Inject opts and params as JSON strings, parse inside the VM
    const optsJson = JSON.stringify(opts);
    const paramsJson = JSON.stringify(params);

    // The wrapper:
    // 1. Evaluates the user script (which defines `calculate`)
    // 2. Checks that `calculate` exists and is a function
    // 3. Calls it with parsed opts and params
    // 4. Validates the return is a number
    // 5. Returns a JSON result envelope
    const wrapper = `
(function() {
  ${scriptBody}

  if (typeof calculate !== "function") {
    return JSON.stringify({ error: "Script must define a calculate function" });
  }

  var optsArg = JSON.parse('${optsJson.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}');
  var paramsArg = JSON.parse('${paramsJson.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}');

  try {
    var result = calculate(optsArg, paramsArg);
    if (typeof result !== "number" || isNaN(result)) {
      return JSON.stringify({ error: "calculate() must return a number, got: " + typeof result });
    }
    return JSON.stringify({ price: result });
  } catch (e) {
    return JSON.stringify({ error: e.message || String(e) });
  }
})()
`;

    const evalResult = vm.evalCode(wrapper);

    if (interrupted) {
      if (evalResult.error) {
        evalResult.error.dispose();
      } else {
        evalResult.value.dispose();
      }
      return {
        success: false,
        error: "Script execution timed out",
        executionMs: Date.now() - startTime,
      };
    }

    if (evalResult.error) {
      const errorStr = vm.dump(evalResult.error);
      evalResult.error.dispose();
      return {
        success: false,
        error: typeof errorStr === "string" ? errorStr : JSON.stringify(errorStr),
        executionMs: Date.now() - startTime,
      };
    }

    const resultStr = vm.dump(evalResult.value) as string;
    evalResult.value.dispose();

    let parsed: { price?: number; error?: string };
    try {
      parsed = JSON.parse(resultStr);
    } catch {
      return {
        success: false,
        error: `Unexpected script output: ${resultStr}`,
        executionMs: Date.now() - startTime,
      };
    }

    if (parsed.error) {
      return {
        success: false,
        error: parsed.error,
        executionMs: Date.now() - startTime,
      };
    }

    return {
      success: true,
      price: parsed.price,
      executionMs: Date.now() - startTime,
    };
  } catch (err) {
    if (interrupted) {
      return {
        success: false,
        error: "Script execution timed out",
        executionMs: Date.now() - startTime,
      };
    }
    return {
      success: false,
      error: `Sandbox error: ${err instanceof Error ? err.message : String(err)}`,
      executionMs: Date.now() - startTime,
    };
  } finally {
    vm.dispose();
  }
}
