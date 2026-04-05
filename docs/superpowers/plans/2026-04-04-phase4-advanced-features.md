# Phase 4: Advanced Pricing, AI & 3D Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sandboxed script pricing, stock 3D parts library, materials system, photo overlay, font management, DXF export, and nested SVG optimization.

**Architecture:** Seven independent features that extend the existing platform. The sandboxed script engine adds Layer 3 pricing via `quickjs-emscripten` (WASM QuickJS), allowing admin-written JS functions to run in a memory-safe sandbox with no filesystem/network access. Stock parts and materials are new Prisma models with tenant scoping and a system-level "platform" tenant for shared resources. Photo overlay is a client-side HTML Canvas compositor. Font management adds a `TenantFont` model so each tenant can curate their font catalog. DXF export converts existing SVG path data to DXF entities. Nested SVG uses `bin-pack` (already installed) to pack letter outlines onto sheet stock.

**Tech Stack:** Next.js 16, quickjs-emscripten, React Three Fiber, HTML Canvas, bin-pack, Prisma, Tailwind

---

## Task 1: Prisma Schema — New Models for StockPart, MaterialPreset, TenantFont

Add three new Prisma models and update the `PricingFormula` model to properly support `SCRIPT` type with `scriptBody`.

### Files

- `prisma/schema.prisma` (edit)

### Steps

- [ ] **1.1** Add the `StockPart` model to `prisma/schema.prisma`, after the `ProductTemplate` model:

```prisma
// ─── Stock 3D Parts Library ─────────────────────

model StockPart {
  id            String   @id @default(cuid())
  tenantId      String?  // null = platform-level (available to all tenants)
  name          String
  slug          String
  category      StockPartCategory
  description   String?
  previewImageUrl String?
  glbUrl        String?
  metadata      Json?    // dimensions, poly count, configurable regions, etc.
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, slug])
}

enum StockPartCategory {
  MOUNTING
  POSTS
  CABINETS
  LIGHTING
  ACCESSORIES
  BACKGROUNDS
}
```

- [ ] **1.2** Add the `MaterialPreset` model:

```prisma
// ─── Material Presets ───────────────────────────

model MaterialPreset {
  id            String   @id @default(cuid())
  tenantId      String?  // null = platform-level
  name          String
  slug          String
  description   String?
  materialType  String   // "MeshPhysicalMaterial", "MeshStandardMaterial", "MeshBasicMaterial"
  properties    Json     // { metalness, roughness, color, transmission, emissive, normalMapUrl, ... }
  previewImageUrl String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, slug])
}
```

- [ ] **1.3** Add the `TenantFont` model:

```prisma
// ─── Font Management ────────────────────────────

model TenantFont {
  id            String   @id @default(cuid())
  tenantId      String?  // null = platform-level (shared across all tenants)
  name          String   // Display name: "Bebas Neue"
  slug          String   // URL-safe: "bebas-neue"
  fileName      String   // File in storage: "BebasNeue-Regular.ttf"
  fileUrl       String?  // Full URL or storage key
  source        FontSource @default(CUSTOM)
  isCurved      Boolean  @default(false) // affects fabrication multiplier
  cssFamily     String?  // CSS font-family for UI preview
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, slug])
}

enum FontSource {
  PLATFORM   // Shipped with platform (the 15 in font-map.ts)
  GOOGLE     // Downloaded from Google Fonts
  CUSTOM     // Uploaded TTF by tenant
}
```

- [ ] **1.4** Add the reverse relations to the `Tenant` model. Find the existing `productTemplates` line and add after it:

```prisma
  stockParts       StockPart[]
  materialPresets  MaterialPreset[]
  tenantFonts      TenantFont[]
```

- [ ] **1.5** Run `npx prisma generate` to regenerate the Prisma client. Do NOT run `migrate dev` (DB is not connected).

### Commit

```
feat(schema): add StockPart, MaterialPreset, TenantFont Prisma models

New models for Phase 4 features: stock 3D parts library (tenant-scoped
with platform-level fallback), material presets with Three.js properties,
and per-tenant font management.
```

---

## Task 2: Sandboxed Script Pricing Engine (TDD)

Build the sandboxed JavaScript execution engine using `quickjs-emscripten`. Scripts receive `opts` (option values) and `params` (pricing params) and return a price number. The sandbox has no filesystem, network, or DOM access.

### Files

- `src/engine/__tests__/script-sandbox.test.ts` (new)
- `src/engine/script-sandbox.ts` (new)

### Steps

- [ ] **2.1** Install `quickjs-emscripten`:

```bash
npm install quickjs-emscripten
```

- [ ] **2.2** Create test file `src/engine/__tests__/script-sandbox.test.ts`:

```typescript
// src/engine/__tests__/script-sandbox.test.ts
import {
  executeScript,
  type ScriptInput,
  type ScriptResult,
} from "../script-sandbox";

const simpleScript = `
function calculate(opts, params) {
  return opts.letterCount * Math.max(opts.height, params.minHeight) * params.pricePerInch;
}
`;

const defaultInput: ScriptInput = {
  scriptBody: simpleScript,
  opts: { letterCount: 5, height: 12 },
  params: { minHeight: 12, pricePerInch: 16 },
};

describe("executeScript", () => {
  it("executes a simple pricing function and returns a number", async () => {
    const result = await executeScript(defaultInput);
    expect(result.success).toBe(true);
    expect(result.price).toBe(5 * 12 * 16); // 960
    expect(result.error).toBeUndefined();
  });

  it("applies Math.max correctly for min height", async () => {
    const result = await executeScript({
      ...defaultInput,
      opts: { letterCount: 5, height: 8 },
      params: { minHeight: 12, pricePerInch: 16 },
    });
    // height(8) < minHeight(12), so uses 12
    expect(result.price).toBe(5 * 12 * 16); // 960
  });

  it("supports conditionals (if/else)", async () => {
    const script = `
function calculate(opts, params) {
  if (opts.height > params.threshold) {
    return opts.letterCount * opts.height * params.largePPI;
  }
  return opts.letterCount * opts.height * params.basePPI;
}
`;
    const result = await executeScript({
      scriptBody: script,
      opts: { letterCount: 5, height: 40 },
      params: { threshold: 36, basePPI: 16, largePPI: 18 },
    });
    expect(result.price).toBe(5 * 40 * 18); // 3600
  });

  it("supports multiplier chains", async () => {
    const script = `
function calculate(opts, params) {
  let base = opts.letterCount * opts.height * params.pricePerInch;
  let multiplier = 1;
  if (opts.isNonLit) multiplier *= 0.75;
  if (opts.isRGB) multiplier *= 1.1;
  return base * multiplier;
}
`;
    const result = await executeScript({
      scriptBody: script,
      opts: { letterCount: 5, height: 12, isNonLit: 1, isRGB: 0 },
      params: { pricePerInch: 16 },
    });
    expect(result.price).toBeCloseTo(5 * 12 * 16 * 0.75); // 720
  });

  it("returns error for scripts that throw", async () => {
    const result = await executeScript({
      scriptBody: `function calculate() { throw new Error("boom"); }`,
      opts: {},
      params: {},
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("boom");
    expect(result.price).toBeUndefined();
  });

  it("returns error for scripts that don't return a number", async () => {
    const result = await executeScript({
      scriptBody: `function calculate() { return "not a number"; }`,
      opts: {},
      params: {},
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("must return a number");
  });

  it("returns error for scripts without a calculate function", async () => {
    const result = await executeScript({
      scriptBody: `var x = 42;`,
      opts: {},
      params: {},
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("must define a calculate function");
  });

  it("times out on infinite loops", async () => {
    const result = await executeScript({
      scriptBody: `function calculate() { while(true) {} return 0; }`,
      opts: {},
      params: {},
      timeoutMs: 500,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("timed out");
  }, 10000);

  it("cannot access global objects (no fetch, no require, no process)", async () => {
    const result = await executeScript({
      scriptBody: `function calculate() { return typeof fetch === "undefined" ? 1 : 0; }`,
      opts: {},
      params: {},
    });
    expect(result.success).toBe(true);
    expect(result.price).toBe(1); // fetch is undefined in sandbox
  });

  it("has access to Math built-in", async () => {
    const script = `
function calculate(opts) {
  return Math.round(Math.sqrt(opts.value) * 100) / 100;
}
`;
    const result = await executeScript({
      scriptBody: script,
      opts: { value: 144 },
      params: {},
    });
    expect(result.price).toBe(12);
  });
});
```

- [ ] **2.3** Create `src/engine/script-sandbox.ts`:

```typescript
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

import { getQuickJS, type QuickJSHandle, type QuickJSContext } from "quickjs-emscripten";

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

  let QuickJS;
  try {
    QuickJS = await getQuickJS();
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
```

- [ ] **2.4** Run the tests:

```bash
npx jest src/engine/__tests__/script-sandbox.test.ts
```

All 10 tests should pass. If the timeout test is flaky, increase its Jest timeout to 15s.

### Commit

```
feat(pricing): add sandboxed script engine via quickjs-emscripten (Layer 3)

Executes admin-written pricing JS in a WASM QuickJS sandbox with no
filesystem/network access, timeout enforcement, and validated return types.
10 tests covering basic pricing, conditionals, multipliers, errors, and
timeout protection.
```

---

## Task 3: Integrate Script Engine into Pricing API Route

Wire the script sandbox into the existing `POST /api/v1/pricing/calculate` route so that formulas with `type: "SCRIPT"` use the sandbox.

### Files

- `src/app/api/v1/pricing/calculate/route.ts` (edit)

### Steps

- [ ] **3.1** Add the script execution branch. In `src/app/api/v1/pricing/calculate/route.ts`, add an import at the top:

```typescript
import { executeScript } from "@/engine/script-sandbox";
```

- [ ] **3.2** After the existing `formulaDef` resolution block (the `if/else if/else` chain ending around line 47), add a new branch before the `else` that returns "no pricing formula configured". The full resolution block becomes:

Replace the formula resolution block (lines ~37-47) with:

```typescript
    // Resolve the formula definition
    let formulaDef: FormulaDefinition | null = null;
    let scriptResult: { price: number } | null = null;

    if (product.pricingFormula?.type === "SCRIPT" && product.pricingFormula.scriptBody) {
      // Layer 3: Sandboxed script execution
      const text = (optionValues.text as string) ?? "";
      const letterCount = text.replace(/\s+/g, "").length;
      const widthInches = dimensions?.widthInches ?? optionValues.widthInches ?? 0;
      const heightInches =
        dimensions?.heightInches ?? optionValues.height ?? optionValues.heightInches ?? 0;
      const sqft = widthInches && heightInches ? (widthInches * heightInches) / 144 : 0;

      const pricingParams = (product.pricingParams as Record<string, number>) ?? {};
      const opts: Record<string, number | string> = {
        ...flattenOptionValues(optionValues),
        widthInches,
        heightInches,
        sqft,
        letterCount,
        charCount: letterCount,
      };

      const result = await executeScript({
        scriptBody: product.pricingFormula.scriptBody,
        opts,
        params: pricingParams,
        timeoutMs: 3000,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: `Script pricing error: ${result.error}` },
          { status: 400 },
        );
      }

      scriptResult = { price: result.price! };
    } else if (product.pricingFormula?.type === "PRESET" && product.pricingFormula.presetId) {
      formulaDef = getPresetFormula(product.pricingFormula.presetId);
    } else if (product.pricingFormula?.formulaAst) {
      formulaDef = product.pricingFormula.formulaAst as unknown as FormulaDefinition;
    } else {
      return NextResponse.json(
        { error: "Product has no pricing formula configured" },
        { status: 400 },
      );
    }

    // Return script result directly (it bypasses AST evaluation)
    if (scriptResult) {
      return NextResponse.json({
        breakdown: {
          basePrice: scriptResult.price,
          appliedMultipliers: [],
          priceAfterMultipliers: scriptResult.price,
          lineItems: [],
          subtotal: scriptResult.price,
          total: scriptResult.price,
          minOrderApplied: false,
        },
      });
    }
```

- [ ] **3.3** The rest of the function (building vars, calling `evaluateFormulaDefinition`) remains unchanged and handles `formulaDef` for PRESET and VISUAL types.

### Commit

```
feat(api): wire sandboxed script engine into pricing calculate route

SCRIPT-type formulas now execute via quickjs-emscripten sandbox instead
of the AST evaluator. Returns the same PriceBreakdown shape for client
compatibility.
```

---

## Task 4: Admin Script Editor UI

Build the admin UI for writing, testing, and saving pricing scripts. Uses a monospace `<textarea>` with syntax-aware styling (no heavy editor dependency).

### Files

- `src/components/admin/script-editor.tsx` (new)
- `src/app/admin/formulas/[formulaId]/edit/page.tsx` (edit)

### Steps

- [ ] **4.1** Create `src/components/admin/script-editor.tsx`:

```tsx
// src/components/admin/script-editor.tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Play, Save, AlertCircle, CheckCircle2 } from "lucide-react";

interface ScriptEditorProps {
  formulaId: string;
  initialScript: string;
  onSave: (scriptBody: string) => Promise<void>;
}

interface TestCase {
  opts: string;
  params: string;
}

interface TestResult {
  success: boolean;
  price?: number;
  error?: string;
  executionMs?: number;
}

const DEFAULT_SCRIPT = `// Pricing script receives opts (option values) and params (pricing parameters).
// Must define a calculate(opts, params) function that returns a number (price in USD).
//
// Available in opts: letterCount, height, widthInches, heightInches, sqft, charCount,
//   plus all product option values as numbers.
// Available in params: your product's pricingParams (basePricePerInch, minOrderPrice, etc.)
// Available built-ins: Math, JSON, parseInt, parseFloat, isNaN, isFinite

function calculate(opts, params) {
  var letterCount = opts.letterCount || 0;
  var height = Math.max(opts.height || 0, params.minHeight || 12);
  var pricePerInch = opts.height > (params.threshold || 36)
    ? (params.largePPI || 18)
    : (params.basePPI || 16);

  var base = letterCount * height * pricePerInch;

  // Apply multipliers
  var multiplier = 1;
  if (opts.isNonLit) multiplier *= 0.75;
  if (opts.isRGB) multiplier *= 1.1;

  var total = base * multiplier;
  return Math.max(total, params.minOrderPrice || 0);
}
`;

const DEFAULT_TEST_OPTS = JSON.stringify(
  { letterCount: 5, height: 12, isNonLit: 0, isRGB: 0 },
  null,
  2
);

const DEFAULT_TEST_PARAMS = JSON.stringify(
  { basePPI: 16, largePPI: 18, threshold: 36, minHeight: 12, minOrderPrice: 1360 },
  null,
  2
);

export function ScriptEditor({ formulaId, initialScript, onSave }: ScriptEditorProps) {
  const [script, setScript] = useState(initialScript || DEFAULT_SCRIPT);
  const [testCase, setTestCase] = useState<TestCase>({
    opts: DEFAULT_TEST_OPTS,
    params: DEFAULT_TEST_PARAMS,
  });
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const runTest = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      let parsedOpts: Record<string, number | string>;
      let parsedParams: Record<string, number | string>;

      try {
        parsedOpts = JSON.parse(testCase.opts);
      } catch {
        setTestResult({ success: false, error: "Invalid JSON in test opts" });
        return;
      }
      try {
        parsedParams = JSON.parse(testCase.params);
      } catch {
        setTestResult({ success: false, error: "Invalid JSON in test params" });
        return;
      }

      const res = await fetch("/api/v1/pricing/script-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptBody: script,
          opts: parsedOpts,
          params: parsedParams,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({
        success: false,
        error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsTesting(false);
    }
  }, [script, testCase]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(script);
    } finally {
      setIsSaving(false);
    }
  }, [script, onSave]);

  return (
    <div className="space-y-6">
      {/* Script Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pricing Script</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={runTest}
                disabled={isTesting}
              >
                <Play className="mr-1.5 h-4 w-4" />
                {isTesting ? "Running..." : "Test"}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="mr-1.5 h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className="w-full h-80 font-mono text-sm bg-zinc-950 text-zinc-100 p-4 rounded-lg border border-zinc-800 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            spellCheck={false}
            placeholder="function calculate(opts, params) { ... }"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Define a <code className="bg-muted px-1 rounded">calculate(opts, params)</code> function
            that returns a number (price in USD). Runs in a sandboxed environment with no network or filesystem access.
          </p>
        </CardContent>
      </Card>

      {/* Test Runner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Test Options (opts)</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={testCase.opts}
              onChange={(e) => setTestCase((prev) => ({ ...prev, opts: e.target.value }))}
              className="w-full h-40 font-mono text-xs bg-muted p-3 rounded-lg border resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              spellCheck={false}
              placeholder='{ "letterCount": 5, "height": 12 }'
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Test Parameters (params)</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={testCase.params}
              onChange={(e) => setTestCase((prev) => ({ ...prev, params: e.target.value }))}
              className="w-full h-40 font-mono text-xs bg-muted p-3 rounded-lg border resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              spellCheck={false}
              placeholder='{ "pricePerInch": 16, "minOrderPrice": 1360 }'
            />
          </CardContent>
        </Card>
      </div>

      {/* Test Result */}
      {testResult && (
        <Card className={testResult.success ? "border-green-500/50" : "border-red-500/50"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {testResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              )}
              <div className="space-y-1">
                {testResult.success ? (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">
                      ${testResult.price?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    {testResult.executionMs !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        {testResult.executionMs}ms
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-red-500 font-mono">{testResult.error}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **4.2** Create the test endpoint `src/app/api/v1/pricing/script-test/route.ts`:

```typescript
// src/app/api/v1/pricing/script-test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { executeScript } from "@/engine/script-sandbox";

/**
 * POST: Test a pricing script without saving it.
 * Admin-only endpoint.
 */
export async function POST(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { scriptBody, opts, params } = await request.json();

    if (!scriptBody || typeof scriptBody !== "string") {
      return NextResponse.json(
        { success: false, error: "scriptBody is required" },
        { status: 400 },
      );
    }

    const result = await executeScript({
      scriptBody,
      opts: opts ?? {},
      params: params ?? {},
      timeoutMs: 3000,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Script test error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **4.3** Update the formula edit page to conditionally render `ScriptEditor` when the formula type is `SCRIPT`. Edit `src/app/admin/formulas/[formulaId]/edit/page.tsx` to pass the `scriptBody` and type to the editor:

Replace the `initialFormula` object construction with:

```typescript
  const initialFormula = {
    id: formula.id,
    name: formula.name,
    description: formula.description,
    type: formula.type,
    formulaAst: formula.formulaAst as FormulaDefinition | null,
    scriptBody: formula.scriptBody,
  };
```

Then update the return to conditionally render the script editor:

```tsx
  if (formula.type === "SCRIPT") {
    const { ScriptEditor } = await import("@/components/admin/script-editor");
    return (
      <div className="container max-w-4xl py-8">
        <h1 className="text-2xl font-bold mb-6">{formula.name}</h1>
        <ScriptEditor
          formulaId={formulaId}
          initialScript={formula.scriptBody ?? ""}
          onSave={async (scriptBody: string) => {
            "use server";
            const { prisma } = await import("@/lib/prisma");
            await prisma.pricingFormula.update({
              where: { id: formulaId },
              data: { scriptBody },
            });
          }}
        />
      </div>
    );
  }

  return <FormulaEditor formulaId={formulaId} initialFormula={initialFormula} />;
```

Note: The dynamic import of `ScriptEditor` is used because it is a `"use client"` component imported conditionally in a server component page. The `onSave` uses a server action to persist the script.

### Commit

```
feat(admin): add script editor UI with live test runner

Monospace textarea editor for pricing scripts with JSON test input fields
and a "Test" button that executes scripts via the sandbox API. Admin-only
script-test endpoint runs scripts without saving.
```

---

## Task 5: Stock Parts Library — API + Admin UI

Build the stock parts catalog with API routes and an admin browsing interface.

### Files

- `src/app/api/v1/stock-parts/route.ts` (new)
- `src/app/api/v1/stock-parts/[partId]/route.ts` (new)
- `src/app/admin/stock-parts/page.tsx` (new)
- `src/components/admin/stock-parts-grid.tsx` (new)
- `src/types/stock-part.ts` (new)

### Steps

- [ ] **5.1** Create the shared type `src/types/stock-part.ts`:

```typescript
// src/types/stock-part.ts

export type StockPartCategory =
  | "MOUNTING"
  | "POSTS"
  | "CABINETS"
  | "LIGHTING"
  | "ACCESSORIES"
  | "BACKGROUNDS";

export interface StockPartData {
  id: string;
  tenantId: string | null;
  name: string;
  slug: string;
  category: StockPartCategory;
  description: string | null;
  previewImageUrl: string | null;
  glbUrl: string | null;
  metadata: StockPartMetadata | null;
  isActive: boolean;
}

export interface StockPartMetadata {
  widthInches?: number;
  heightInches?: number;
  depthInches?: number;
  polyCount?: number;
  configurableRegions?: ConfigurableRegion[];
  tags?: string[];
}

export interface ConfigurableRegion {
  meshName: string;
  role: "face" | "side" | "back" | "mount" | "frame" | "panel";
  configurableProps: ("material" | "color" | "visibility" | "texture")[];
}

export const STOCK_PART_CATEGORIES: {
  value: StockPartCategory;
  label: string;
  description: string;
}[] = [
  { value: "MOUNTING", label: "Mounting", description: "Raceways, standoffs, stud mounts" },
  { value: "POSTS", label: "Posts", description: "Single/double poles, monument bases, pylon frames" },
  { value: "CABINETS", label: "Cabinets", description: "Single/double face boxes, shaped shells" },
  { value: "LIGHTING", label: "Lighting", description: "LED modules, neon tubes, bulb arrays" },
  { value: "ACCESSORIES", label: "Accessories", description: "Chains, brackets, transformers" },
  { value: "BACKGROUNDS", label: "Backgrounds", description: "Flat panels, shaped backers, preview walls" },
];
```

- [ ] **5.2** Create the API route `src/app/api/v1/stock-parts/route.ts`:

```typescript
// src/app/api/v1/stock-parts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET: List stock parts available to the tenant (own + platform-level).
 * POST: Create a new stock part (admin only, creates tenant-scoped part).
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;

    const parts = await prisma.stockPart.findMany({
      where: {
        OR: [
          { tenantId: tenant.id },
          { tenantId: null }, // platform-level parts
        ],
        ...(category ? { category: category as never } : {}),
        isActive: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ parts });
  } catch (error) {
    console.error("Error listing stock parts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, category, description, previewImageUrl, glbUrl, metadata } = body;

    if (!name || !slug || !category) {
      return NextResponse.json(
        { error: "name, slug, and category are required" },
        { status: 400 },
      );
    }

    const part = await prisma.stockPart.create({
      data: {
        tenantId: admin.tenantId,
        name,
        slug,
        category,
        description: description ?? null,
        previewImageUrl: previewImageUrl ?? null,
        glbUrl: glbUrl ?? null,
        metadata: metadata ?? null,
      },
    });

    return NextResponse.json({ part }, { status: 201 });
  } catch (error) {
    console.error("Error creating stock part:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **5.3** Create the individual part route `src/app/api/v1/stock-parts/[partId]/route.ts`:

```typescript
// src/app/api/v1/stock-parts/[partId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partId } = await params;
    const body = await request.json();

    // Only allow editing own tenant's parts (not platform-level)
    const existing = await prisma.stockPart.findFirst({
      where: { id: partId, tenantId: admin.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    const { name, description, previewImageUrl, glbUrl, metadata, isActive } = body;

    const updated = await prisma.stockPart.update({
      where: { id: partId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(previewImageUrl !== undefined ? { previewImageUrl } : {}),
        ...(glbUrl !== undefined ? { glbUrl } : {}),
        ...(metadata !== undefined ? { metadata } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json({ part: updated });
  } catch (error) {
    console.error("Error updating stock part:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partId } = await params;

    const existing = await prisma.stockPart.findFirst({
      where: { id: partId, tenantId: admin.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    await prisma.stockPart.delete({ where: { id: partId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stock part:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **5.4** Create the admin page `src/app/admin/stock-parts/page.tsx`:

```tsx
// src/app/admin/stock-parts/page.tsx
import { requireAdmin } from "@/lib/admin-auth";
import { StockPartsGrid } from "@/components/admin/stock-parts-grid";

export const metadata = {
  title: "Stock Parts Library — Admin | GatSoft Signs",
};

export default async function StockPartsPage() {
  await requireAdmin();

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Stock 3D Parts Library</h1>
          <p className="text-muted-foreground mt-1">
            Browse and manage reusable 3D parts for sign assemblies.
          </p>
        </div>
      </div>
      <StockPartsGrid />
    </div>
  );
}
```

- [ ] **5.5** Create the client component `src/components/admin/stock-parts-grid.tsx`:

```tsx
// src/components/admin/stock-parts-grid.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Box, Search } from "lucide-react";
import { STOCK_PART_CATEGORIES, type StockPartData, type StockPartCategory } from "@/types/stock-part";

export function StockPartsGrid() {
  const [parts, setParts] = useState<StockPartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        activeCategory === "all"
          ? "/api/v1/stock-parts"
          : `/api/v1/stock-parts?category=${activeCategory}`;
      const res = await fetch(url);
      const data = await res.json();
      setParts(data.parts ?? []);
    } catch {
      console.error("Failed to fetch stock parts");
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  const filtered = parts.filter(
    (p) =>
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async (formData: FormData) => {
    const body = {
      name: formData.get("name") as string,
      slug: (formData.get("name") as string).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      category: formData.get("category") as string,
      description: formData.get("description") as string || null,
      glbUrl: formData.get("glbUrl") as string || null,
    };

    const res = await fetch("/api/v1/stock-parts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowCreateDialog(false);
      fetchParts();
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Part
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Stock Part</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="Wall Standoff Set" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {STOCK_PART_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="Stainless steel standoff mounting kit" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="glbUrl">GLB URL (optional)</Label>
                <Input id="glbUrl" name="glbUrl" placeholder="/models/standoff-set.glb" />
              </div>
              <Button type="submit" className="w-full">Create Part</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {STOCK_PART_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Parts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-40 bg-muted rounded-t-lg" />
              <CardContent className="pt-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Box className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? "No parts match your search." : "No stock parts yet. Add your first part to get started."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((part) => (
            <Card key={part.id} className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer">
              <div className="h-40 bg-muted flex items-center justify-center">
                {part.previewImageUrl ? (
                  <img
                    src={part.previewImageUrl}
                    alt={part.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Box className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <CardContent className="pt-4">
                <h3 className="font-medium text-sm">{part.name}</h3>
                {part.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {part.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs">
                    {STOCK_PART_CATEGORIES.find((c) => c.value === part.category)?.label ?? part.category}
                  </Badge>
                  {!part.tenantId && (
                    <Badge variant="outline" className="text-xs">Platform</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Commit

```
feat(stock-parts): add stock 3D parts library with API routes and admin UI

CRUD API for stock parts scoped to tenant (with platform-level fallback).
Admin page with category tabs, search, and create dialog. Types define
the 6 stock part categories from the design spec.
```

---

## Task 6: Materials System — API + Admin UI

Create the material presets system with Three.js material property definitions, API routes, and admin management UI.

### Files

- `src/types/material-preset.ts` (new)
- `src/app/api/v1/materials/route.ts` (new)
- `src/app/api/v1/materials/[materialId]/route.ts` (new)
- `src/app/admin/materials/page.tsx` (new)
- `src/components/admin/materials-manager.tsx` (new)

### Steps

- [ ] **6.1** Create the type definition `src/types/material-preset.ts`:

```typescript
// src/types/material-preset.ts

export type ThreeMaterialType =
  | "MeshPhysicalMaterial"
  | "MeshStandardMaterial"
  | "MeshBasicMaterial";

export interface MaterialProperties {
  color?: string;             // hex color "#RRGGBB"
  metalness?: number;         // 0-1
  roughness?: number;         // 0-1
  transmission?: number;      // 0-1 (for MeshPhysicalMaterial, translucent acrylic)
  thickness?: number;         // for transmission
  emissive?: string;          // hex emissive color
  emissiveIntensity?: number; // 0+
  opacity?: number;           // 0-1
  transparent?: boolean;
  normalMapUrl?: string;      // URL to normal map texture
  mapUrl?: string;            // URL to diffuse/albedo texture
  roughnessMapUrl?: string;   // URL to roughness texture
  envMapIntensity?: number;   // 0+
  clearcoat?: number;         // 0-1 (MeshPhysicalMaterial)
  clearcoatRoughness?: number; // 0-1
  side?: "front" | "back" | "double"; // THREE.FrontSide, BackSide, DoubleSide
}

export interface MaterialPresetData {
  id: string;
  tenantId: string | null;
  name: string;
  slug: string;
  description: string | null;
  materialType: ThreeMaterialType;
  properties: MaterialProperties;
  previewImageUrl: string | null;
  isActive: boolean;
}

/** Platform-shipped material preset definitions (seed data) */
export const PLATFORM_MATERIAL_PRESETS: Omit<MaterialPresetData, "id" | "isActive">[] = [
  {
    tenantId: null,
    name: "Brushed Aluminum",
    slug: "brushed-aluminum",
    description: "Metallic brushed aluminum finish for channel letter returns",
    materialType: "MeshPhysicalMaterial",
    properties: {
      color: "#D4D4D8",
      metalness: 0.85,
      roughness: 0.3,
    },
    previewImageUrl: null,
  },
  {
    tenantId: null,
    name: "Painted Metal",
    slug: "painted-metal",
    description: "Configurable painted metal surface",
    materialType: "MeshStandardMaterial",
    properties: {
      color: "#FFFFFF",
      metalness: 0.5,
      roughness: 0.4,
    },
    previewImageUrl: null,
  },
  {
    tenantId: null,
    name: "Translucent Acrylic",
    slug: "translucent-acrylic",
    description: "Translucent acrylic face for front-lit channel letters",
    materialType: "MeshPhysicalMaterial",
    properties: {
      color: "#FFFFFF",
      transmission: 0.8,
      thickness: 0.15,
      roughness: 0.1,
      metalness: 0,
    },
    previewImageUrl: null,
  },
  {
    tenantId: null,
    name: "Opaque Acrylic",
    slug: "opaque-acrylic",
    description: "Solid opaque acrylic with smooth finish",
    materialType: "MeshStandardMaterial",
    properties: {
      color: "#FFFFFF",
      roughness: 0.1,
      metalness: 0,
    },
    previewImageUrl: null,
  },
  {
    tenantId: null,
    name: "Neon Tube",
    slug: "neon-tube",
    description: "Self-illuminating neon tube with bloom-compatible emissive",
    materialType: "MeshBasicMaterial",
    properties: {
      color: "#FF4444",
      emissive: "#FF4444",
      emissiveIntensity: 2.0,
    },
    previewImageUrl: null,
  },
  {
    tenantId: null,
    name: "Vinyl Print",
    slug: "vinyl-print",
    description: "Printable vinyl surface that accepts texture maps",
    materialType: "MeshStandardMaterial",
    properties: {
      color: "#FFFFFF",
      roughness: 0.3,
      metalness: 0,
    },
    previewImageUrl: null,
  },
  {
    tenantId: null,
    name: "Wood",
    slug: "wood",
    description: "Natural wood grain finish",
    materialType: "MeshStandardMaterial",
    properties: {
      color: "#8B6914",
      roughness: 0.7,
      metalness: 0,
    },
    previewImageUrl: null,
  },
  {
    tenantId: null,
    name: "Concrete/Stone",
    slug: "concrete-stone",
    description: "Rough stone or concrete surface",
    materialType: "MeshStandardMaterial",
    properties: {
      color: "#9E9E9E",
      roughness: 0.9,
      metalness: 0,
    },
    previewImageUrl: null,
  },
];
```

- [ ] **6.2** Create the API route `src/app/api/v1/materials/route.ts`:

```typescript
// src/app/api/v1/materials/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const presets = await prisma.materialPreset.findMany({
      where: {
        OR: [
          { tenantId: tenant.id },
          { tenantId: null },
        ],
        isActive: true,
      },
      orderBy: [{ name: "asc" }],
    });

    return NextResponse.json({ presets });
  } catch (error) {
    console.error("Error listing material presets:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, description, materialType, properties, previewImageUrl } = body;

    if (!name || !slug || !materialType || !properties) {
      return NextResponse.json(
        { error: "name, slug, materialType, and properties are required" },
        { status: 400 },
      );
    }

    const preset = await prisma.materialPreset.create({
      data: {
        tenantId: admin.tenantId,
        name,
        slug,
        description: description ?? null,
        materialType,
        properties,
        previewImageUrl: previewImageUrl ?? null,
      },
    });

    return NextResponse.json({ preset }, { status: 201 });
  } catch (error) {
    console.error("Error creating material preset:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **6.3** Create `src/app/api/v1/materials/[materialId]/route.ts`:

```typescript
// src/app/api/v1/materials/[materialId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { materialId } = await params;
    const body = await request.json();

    const existing = await prisma.materialPreset.findFirst({
      where: { id: materialId, tenantId: admin.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Material preset not found" }, { status: 404 });
    }

    const { name, description, materialType, properties, previewImageUrl, isActive } = body;

    const updated = await prisma.materialPreset.update({
      where: { id: materialId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(materialType !== undefined ? { materialType } : {}),
        ...(properties !== undefined ? { properties } : {}),
        ...(previewImageUrl !== undefined ? { previewImageUrl } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json({ preset: updated });
  } catch (error) {
    console.error("Error updating material preset:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { materialId } = await params;

    const existing = await prisma.materialPreset.findFirst({
      where: { id: materialId, tenantId: admin.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Material preset not found" }, { status: 404 });
    }

    await prisma.materialPreset.delete({ where: { id: materialId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting material preset:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **6.4** Create the admin page `src/app/admin/materials/page.tsx`:

```tsx
// src/app/admin/materials/page.tsx
import { requireAdmin } from "@/lib/admin-auth";
import { MaterialsManager } from "@/components/admin/materials-manager";

export const metadata = {
  title: "Material Presets — Admin | GatSoft Signs",
};

export default async function MaterialsPage() {
  await requireAdmin();

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Material Presets</h1>
        <p className="text-muted-foreground mt-1">
          Define Three.js material properties for 3D sign rendering. Platform presets are available to all tenants.
        </p>
      </div>
      <MaterialsManager />
    </div>
  );
}
```

- [ ] **6.5** Create the client component `src/components/admin/materials-manager.tsx`:

```tsx
// src/components/admin/materials-manager.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Palette, Pencil } from "lucide-react";
import type { MaterialPresetData, ThreeMaterialType, MaterialProperties } from "@/types/material-preset";

export function MaterialsManager() {
  const [presets, setPresets] = useState<MaterialPresetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<MaterialPresetData | null>(null);

  const fetchPresets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/materials");
      const data = await res.json();
      setPresets(data.presets ?? []);
    } catch {
      console.error("Failed to fetch material presets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              New Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Material Preset</DialogTitle>
            </DialogHeader>
            <MaterialForm
              onSubmit={async (data) => {
                const res = await fetch("/api/v1/materials", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
                if (res.ok) {
                  setShowCreateDialog(false);
                  fetchPresets();
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-16 bg-muted rounded mb-3" />
                <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <Card key={preset.id} className="overflow-hidden">
              <div
                className="h-20 border-b"
                style={{
                  background: preset.properties.color ?? "#888",
                  opacity: preset.properties.opacity ?? 1,
                }}
              />
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">{preset.name}</h3>
                  {preset.tenantId === null ? (
                    <Badge variant="outline" className="text-xs">Platform</Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingPreset(preset)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {preset.description && (
                  <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge variant="secondary" className="text-xs">{preset.materialType.replace("Mesh", "").replace("Material", "")}</Badge>
                  {preset.properties.metalness !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      Metal: {preset.properties.metalness}
                    </Badge>
                  )}
                  {preset.properties.roughness !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      Rough: {preset.properties.roughness}
                    </Badge>
                  )}
                  {preset.properties.transmission !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      Trans: {preset.properties.transmission}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingPreset} onOpenChange={(open) => !open && setEditingPreset(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editingPreset?.name}</DialogTitle>
          </DialogHeader>
          {editingPreset && (
            <MaterialForm
              initial={editingPreset}
              onSubmit={async (data) => {
                const res = await fetch(`/api/v1/materials/${editingPreset.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
                if (res.ok) {
                  setEditingPreset(null);
                  fetchPresets();
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MaterialFormProps {
  initial?: MaterialPresetData;
  onSubmit: (data: {
    name: string;
    slug: string;
    description: string | null;
    materialType: ThreeMaterialType;
    properties: MaterialProperties;
  }) => Promise<void>;
}

function MaterialForm({ initial, onSubmit }: MaterialFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [materialType, setMaterialType] = useState<ThreeMaterialType>(
    initial?.materialType ?? "MeshStandardMaterial"
  );
  const [props, setProps] = useState<MaterialProperties>(initial?.properties ?? {
    color: "#FFFFFF",
    metalness: 0.5,
    roughness: 0.5,
  });
  const [submitting, setSubmitting] = useState(false);

  const updateProp = <K extends keyof MaterialProperties>(key: K, value: MaterialProperties[K]) => {
    setProps((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        description: description || null,
        materialType,
        properties: props,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="mat-name">Name</Label>
        <Input id="mat-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Brushed Aluminum" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mat-desc">Description</Label>
        <Input id="mat-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Material description" />
      </div>

      <div className="space-y-2">
        <Label>Material Type</Label>
        <Select value={materialType} onValueChange={(v) => setMaterialType(v as ThreeMaterialType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MeshStandardMaterial">Standard (PBR)</SelectItem>
            <SelectItem value="MeshPhysicalMaterial">Physical (advanced PBR)</SelectItem>
            <SelectItem value="MeshBasicMaterial">Basic (unlit/emissive)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mat-color">Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            id="mat-color"
            value={props.color ?? "#FFFFFF"}
            onChange={(e) => updateProp("color", e.target.value)}
            className="h-10 w-12 rounded border cursor-pointer"
          />
          <Input value={props.color ?? "#FFFFFF"} onChange={(e) => updateProp("color", e.target.value)} className="font-mono" />
        </div>
      </div>

      {materialType !== "MeshBasicMaterial" && (
        <>
          <div className="space-y-2">
            <Label>Metalness: {props.metalness ?? 0}</Label>
            <Slider
              value={[props.metalness ?? 0]}
              onValueChange={([v]) => updateProp("metalness", v)}
              min={0} max={1} step={0.05}
            />
          </div>
          <div className="space-y-2">
            <Label>Roughness: {props.roughness ?? 0.5}</Label>
            <Slider
              value={[props.roughness ?? 0.5]}
              onValueChange={([v]) => updateProp("roughness", v)}
              min={0} max={1} step={0.05}
            />
          </div>
        </>
      )}

      {materialType === "MeshPhysicalMaterial" && (
        <div className="space-y-2">
          <Label>Transmission: {props.transmission ?? 0}</Label>
          <Slider
            value={[props.transmission ?? 0]}
            onValueChange={([v]) => updateProp("transmission", v)}
            min={0} max={1} step={0.05}
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={submitting || !name}>
        {submitting ? "Saving..." : initial ? "Update Material" : "Create Material"}
      </Button>
    </form>
  );
}
```

### Commit

```
feat(materials): add material presets system with API routes and admin UI

Defines 8 platform-level Three.js material presets (brushed aluminum, painted
metal, translucent acrylic, etc). CRUD API with tenant scoping. Admin UI with
color picker, metalness/roughness/transmission sliders, and material type selection.
```

---

## Task 7: Photo Overlay ("Sign on Your Building")

Build the client-side photo overlay feature where customers upload a building photo and position their configured sign on it using HTML Canvas compositing.

### Files

- `src/components/configurator/photo-overlay.tsx` (new)
- `src/lib/photo-compositor.ts` (new)

### Steps

- [ ] **7.1** Create the canvas compositing utility `src/lib/photo-compositor.ts`:

```typescript
// src/lib/photo-compositor.ts
/**
 * Composite a sign rendering onto a customer's building photo.
 * Pure Canvas 2D API -- no DOM dependencies beyond the canvas element.
 */

export interface CompositeOptions {
  /** The customer's building photo (loaded Image element) */
  backgroundImage: HTMLImageElement;
  /** The sign render from the 3D scene (loaded Image element or canvas snapshot) */
  signImage: HTMLImageElement | HTMLCanvasElement;
  /** X position of sign center on the background, as fraction 0-1 */
  signX: number;
  /** Y position of sign center on the background, as fraction 0-1 */
  signY: number;
  /** Scale of the sign relative to background width. 0.3 = 30% of photo width */
  signScale: number;
  /** Output canvas width in pixels */
  outputWidth: number;
  /** Output canvas height in pixels */
  outputHeight: number;
}

export interface CompositeResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  blob: Blob;
}

/**
 * Composite the sign onto the building photo and return the result.
 */
export async function compositeSignOnPhoto(
  options: CompositeOptions
): Promise<CompositeResult> {
  const { backgroundImage, signImage, signX, signY, signScale, outputWidth, outputHeight } =
    options;

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d")!;

  // Draw background photo, scaled to fill canvas
  ctx.drawImage(backgroundImage, 0, 0, outputWidth, outputHeight);

  // Calculate sign dimensions
  const signWidth = outputWidth * signScale;
  const signSourceWidth =
    signImage instanceof HTMLCanvasElement ? signImage.width : signImage.naturalWidth;
  const signSourceHeight =
    signImage instanceof HTMLCanvasElement ? signImage.height : signImage.naturalHeight;
  const signAspect = signSourceWidth / signSourceHeight;
  const signHeight = signWidth / signAspect;

  // Position sign (signX/signY are center point as fractions)
  const drawX = signX * outputWidth - signWidth / 2;
  const drawY = signY * outputHeight - signHeight / 2;

  // Add subtle drop shadow for realism
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 8;

  // Draw sign
  ctx.drawImage(signImage, drawX, drawY, signWidth, signHeight);

  // Reset shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Get blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
      "image/png"
    );
  });

  return {
    canvas,
    dataUrl: canvas.toDataURL("image/png"),
    blob,
  };
}

/**
 * Load an image from a File (user upload) into an HTMLImageElement.
 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/**
 * Capture the current 3D scene as an HTMLImageElement.
 * Pass the Three.js renderer's DOM element (canvas).
 */
export function captureSceneAsImage(threeCanvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const dataUrl = threeCanvas.toDataURL("image/png");
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to capture scene"));
    img.src = dataUrl;
  });
}
```

- [ ] **7.2** Create the photo overlay UI component `src/components/configurator/photo-overlay.tsx`:

```tsx
// src/components/configurator/photo-overlay.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Upload, Download, X, Move, ZoomIn } from "lucide-react";
import {
  compositeSignOnPhoto,
  loadImageFromFile,
  captureSceneAsImage,
} from "@/lib/photo-compositor";

interface PhotoOverlayProps {
  /** The Three.js renderer canvas element */
  threeCanvas: HTMLCanvasElement | null;
}

export function PhotoOverlay({ threeCanvas }: PhotoOverlayProps) {
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [signX, setSignX] = useState(0.5);
  const [signY, setSignY] = useState(0.4);
  const [signScale, setSignScale] = useState(0.35);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const img = await loadImageFromFile(file);
      setBackgroundImage(img);
      setBackgroundFile(file);
      setCompositeUrl(null);
    } catch {
      console.error("Failed to load image");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  // Re-generate composite when position/scale changes
  const generateComposite = useCallback(async () => {
    if (!backgroundImage || !threeCanvas) return;

    setIsProcessing(true);
    try {
      const signImage = await captureSceneAsImage(threeCanvas);

      const result = await compositeSignOnPhoto({
        backgroundImage,
        signImage,
        signX,
        signY,
        signScale,
        outputWidth: backgroundImage.naturalWidth,
        outputHeight: backgroundImage.naturalHeight,
      });

      setCompositeUrl(result.dataUrl);
    } catch (err) {
      console.error("Compositing failed:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [backgroundImage, threeCanvas, signX, signY, signScale]);

  useEffect(() => {
    if (backgroundImage && threeCanvas) {
      generateComposite();
    }
  }, [generateComposite, backgroundImage, threeCanvas]);

  const handlePreviewClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setSignX(Math.max(0, Math.min(1, x)));
      setSignY(Math.max(0, Math.min(1, y)));
    },
    []
  );

  const handleDownload = useCallback(() => {
    if (!compositeUrl) return;
    const a = document.createElement("a");
    a.href = compositeUrl;
    a.download = "sign-preview.png";
    a.click();
  }, [compositeUrl]);

  const handleClear = useCallback(() => {
    setBackgroundImage(null);
    setBackgroundFile(null);
    setCompositeUrl(null);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Photo Preview</span>
          {backgroundImage && (
            <Button variant="ghost" size="icon" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!backgroundImage ? (
          /* Upload zone */
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Upload a photo of your building</p>
            <p className="text-xs text-muted-foreground mt-1">
              Drag and drop or click to browse. JPG, PNG, or WebP.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </div>
        ) : (
          /* Composite preview + controls */
          <>
            <div
              ref={previewRef}
              className="relative rounded-lg overflow-hidden cursor-crosshair border"
              onClick={handlePreviewClick}
            >
              {compositeUrl ? (
                <img
                  src={compositeUrl}
                  alt="Sign on building preview"
                  className="w-full h-auto"
                />
              ) : (
                <img
                  src={URL.createObjectURL(backgroundFile!)}
                  alt="Building photo"
                  className="w-full h-auto"
                />
              )}
              {isProcessing && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Generating preview...</p>
                </div>
              )}
              {/* Position indicator */}
              <div
                className="absolute w-3 h-3 bg-primary rounded-full border-2 border-white shadow-md pointer-events-none"
                style={{
                  left: `${signX * 100}%`,
                  top: `${signY * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Move className="h-3.5 w-3.5" />
              Click on the photo to position the sign
            </div>

            {/* Scale control */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Sign Size: {Math.round(signScale * 100)}%</Label>
              </div>
              <Slider
                value={[signScale]}
                onValueChange={([v]) => setSignScale(v)}
                min={0.05}
                max={0.8}
                step={0.01}
              />
            </div>

            {/* Download button */}
            <Button onClick={handleDownload} disabled={!compositeUrl} className="w-full">
              <Download className="mr-1.5 h-4 w-4" />
              Download Preview
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

### Commit

```
feat(configurator): add photo overlay for sign-on-building preview

Customer uploads a building photo, clicks to position the sign, adjusts
scale, and downloads the composite PNG. Uses HTML Canvas compositing with
drop shadow for realism. No server dependency -- fully client-side.
```

---

## Task 8: Font Management — API, Admin UI, and Font Map Integration

Build the font management system so tenants can manage their available fonts (platform defaults + custom TTF uploads).

### Files

- `src/app/api/v1/fonts/route.ts` (new)
- `src/app/api/v1/fonts/[fontId]/route.ts` (new)
- `src/app/api/v1/fonts/upload/route.ts` (new)
- `src/app/admin/fonts/page.tsx` (new)
- `src/components/admin/font-manager.tsx` (new)
- `src/engine/font-map.ts` (edit — make it read from DB when available)

### Steps

- [ ] **8.1** Create the fonts list + create API route `src/app/api/v1/fonts/route.ts`:

```typescript
// src/app/api/v1/fonts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const fonts = await prisma.tenantFont.findMany({
      where: {
        OR: [
          { tenantId: tenant.id },
          { tenantId: null }, // platform-level fonts
        ],
        isActive: true,
      },
      orderBy: [{ source: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ fonts });
  } catch (error) {
    console.error("Error listing fonts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, fileName, fileUrl, source, isCurved, cssFamily } = body;

    if (!name || !slug || !fileName) {
      return NextResponse.json(
        { error: "name, slug, and fileName are required" },
        { status: 400 },
      );
    }

    const font = await prisma.tenantFont.create({
      data: {
        tenantId: admin.tenantId,
        name,
        slug,
        fileName,
        fileUrl: fileUrl ?? null,
        source: source ?? "CUSTOM",
        isCurved: isCurved ?? false,
        cssFamily: cssFamily ?? null,
      },
    });

    return NextResponse.json({ font }, { status: 201 });
  } catch (error) {
    console.error("Error creating font:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **8.2** Create `src/app/api/v1/fonts/[fontId]/route.ts`:

```typescript
// src/app/api/v1/fonts/[fontId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fontId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fontId } = await params;
    const body = await request.json();

    const existing = await prisma.tenantFont.findFirst({
      where: { id: fontId, tenantId: admin.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Font not found" }, { status: 404 });
    }

    const { name, isCurved, cssFamily, isActive } = body;

    const updated = await prisma.tenantFont.update({
      where: { id: fontId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(isCurved !== undefined ? { isCurved } : {}),
        ...(cssFamily !== undefined ? { cssFamily } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json({ font: updated });
  } catch (error) {
    console.error("Error updating font:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fontId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fontId } = await params;

    const existing = await prisma.tenantFont.findFirst({
      where: { id: fontId, tenantId: admin.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Font not found" }, { status: 404 });
    }

    await prisma.tenantFont.delete({ where: { id: fontId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting font:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **8.3** Create the TTF upload route `src/app/api/v1/fonts/upload/route.ts`:

```typescript
// src/app/api/v1/fonts/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * POST: Upload a TTF font file.
 * Saves to public/fonts/ (dev) or blob storage (prod).
 * Returns the filename and URL.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".ttf") && !file.name.endsWith(".otf")) {
      return NextResponse.json(
        { error: "Only .ttf and .otf files are accepted" },
        { status: 400 },
      );
    }

    // Sanitize filename
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-");

    // Save to public/fonts/ (local dev storage)
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    await mkdir(fontsDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(fontsDir, safeName);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      fileName: safeName,
      fileUrl: `/fonts/${safeName}`,
    });
  } catch (error) {
    console.error("Error uploading font:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **8.4** Create the admin page `src/app/admin/fonts/page.tsx`:

```tsx
// src/app/admin/fonts/page.tsx
import { requireAdmin } from "@/lib/admin-auth";
import { FontManager } from "@/components/admin/font-manager";

export const metadata = {
  title: "Font Management — Admin | GatSoft Signs",
};

export default async function FontsPage() {
  await requireAdmin();

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Font Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage available fonts for sign text. Platform fonts are shared; upload custom TTF files for your shop.
        </p>
      </div>
      <FontManager />
    </div>
  );
}
```

- [ ] **8.5** Create the client component `src/components/admin/font-manager.tsx`:

```tsx
// src/components/admin/font-manager.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Plus, Type, Trash2 } from "lucide-react";

interface FontData {
  id: string;
  tenantId: string | null;
  name: string;
  slug: string;
  fileName: string;
  fileUrl: string | null;
  source: "PLATFORM" | "GOOGLE" | "CUSTOM";
  isCurved: boolean;
  cssFamily: string | null;
  isActive: boolean;
}

export function FontManager() {
  const [fonts, setFonts] = useState<FontData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFonts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/fonts");
      const data = await res.json();
      setFonts(data.fonts ?? []);
    } catch {
      console.error("Failed to fetch fonts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFonts();
  }, [fetchFonts]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileEl = form.querySelector<HTMLInputElement>('input[type="file"]');
    const nameEl = form.querySelector<HTMLInputElement>('input[name="fontName"]');
    const curvedEl = form.querySelector<HTMLInputElement>('input[name="isCurved"]');

    const file = fileEl?.files?.[0];
    const fontName = nameEl?.value;

    if (!file || !fontName) return;

    setUploading(true);
    try {
      // 1. Upload the file
      const uploadData = new FormData();
      uploadData.set("file", file);
      const uploadRes = await fetch("/api/v1/fonts/upload", {
        method: "POST",
        body: uploadData,
      });
      const { fileName, fileUrl } = await uploadRes.json();

      if (!uploadRes.ok) return;

      // 2. Create the font record
      const slug = fontName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      await fetch("/api/v1/fonts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fontName,
          slug,
          fileName,
          fileUrl,
          source: "CUSTOM",
          isCurved: curvedEl?.checked ?? false,
          cssFamily: `'Sign-${slug}', sans-serif`,
        }),
      });

      setShowUploadDialog(false);
      fetchFonts();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fontId: string) => {
    if (!confirm("Remove this font from your catalog?")) return;
    await fetch(`/api/v1/fonts/${fontId}`, { method: "DELETE" });
    fetchFonts();
  };

  const sourceLabel = (source: string) => {
    switch (source) {
      case "PLATFORM": return "Platform";
      case "GOOGLE": return "Google";
      case "CUSTOM": return "Custom";
      default: return source;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-1.5 h-4 w-4" />
              Upload Font
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Custom Font</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fontName">Font Name</Label>
                <Input id="fontName" name="fontName" required placeholder="My Custom Font" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fontFile">TTF or OTF File</Label>
                <Input id="fontFile" type="file" accept=".ttf,.otf" required />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="isCurved" name="isCurved" />
                <Label htmlFor="isCurved" className="text-sm">
                  Curved/decorative font (applies 1.2x fabrication multiplier)
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload & Add Font"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-4 flex items-center gap-4">
                <div className="h-10 w-10 bg-muted rounded" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {fonts.map((font) => (
            <Card key={font.id}>
              <CardContent className="py-4 flex items-center gap-4">
                <div className="h-10 w-10 bg-muted rounded flex items-center justify-center shrink-0">
                  <Type className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{font.name}</span>
                    <Badge variant="outline" className="text-xs">{sourceLabel(font.source)}</Badge>
                    {font.isCurved && (
                      <Badge variant="secondary" className="text-xs">Curved (1.2x)</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {font.fileName}
                  </p>
                </div>
                {/* Only allow deleting tenant-owned fonts, not platform fonts */}
                {font.tenantId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(font.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **8.6** Update the admin sidebar to include links to the new pages. In `src/components/admin/sidebar.tsx`, add navigation items for "Stock Parts", "Materials", and "Fonts". These should appear after the existing "Templates" link. Add imports for `Box`, `Palette`, and `Type` from `lucide-react`, and add these entries to the navigation items array:

```typescript
{ href: "/admin/stock-parts", label: "Stock Parts", icon: Box },
{ href: "/admin/materials", label: "Materials", icon: Palette },
{ href: "/admin/fonts", label: "Fonts", icon: Type },
```

### Commit

```
feat(fonts): add font management with TTF upload, API routes, and admin UI

Tenants can browse platform fonts, upload custom TTF/OTF files, and flag
curved fonts for the 1.2x fabrication multiplier. Upload saves to
public/fonts/ in dev. Admin sidebar updated with Stock Parts, Materials,
and Fonts links.
```

---

## Task 9: DXF Export Engine (TDD)

Convert SVG cut paths to DXF format for CNC/CAD software. DXF (Drawing Exchange Format) uses a simple text-based format. We parse the SVG path `d` attributes and write DXF ENTITIES (LINE, ARC, SPLINE).

### Files

- `src/engine/__tests__/dxf-generator.test.ts` (new)
- `src/engine/dxf-generator.ts` (new)
- `src/lib/production-files.ts` (edit — add DXF to the generation pipeline)

### Steps

- [ ] **9.1** Create the test file `src/engine/__tests__/dxf-generator.test.ts`:

```typescript
// src/engine/__tests__/dxf-generator.test.ts
import { generateDxfFromSvgPaths, parseSvgPathToSegments, type DxfOptions } from "../dxf-generator";

describe("parseSvgPathToSegments", () => {
  it("parses M and L commands into line segments", () => {
    const segments = parseSvgPathToSegments("M 0 0 L 10 0 L 10 10 L 0 10 Z");
    // M0,0 -> L10,0 -> L10,10 -> L0,10 -> Z (close to 0,0)
    // Produces 4 line segments
    expect(segments.length).toBe(4);
    expect(segments[0]).toEqual({ type: "line", x1: 0, y1: 0, x2: 10, y2: 0 });
    expect(segments[1]).toEqual({ type: "line", x1: 10, y1: 0, x2: 10, y2: 10 });
    expect(segments[2]).toEqual({ type: "line", x1: 10, y1: 10, x2: 0, y2: 10 });
    expect(segments[3]).toEqual({ type: "line", x1: 0, y1: 10, x2: 0, y2: 0 }); // close
  });

  it("parses Q (quadratic bezier) commands", () => {
    const segments = parseSvgPathToSegments("M 0 0 Q 5 10 10 0");
    expect(segments.length).toBe(1);
    expect(segments[0].type).toBe("quadratic");
  });

  it("parses C (cubic bezier) commands", () => {
    const segments = parseSvgPathToSegments("M 0 0 C 2 8 8 8 10 0");
    expect(segments.length).toBe(1);
    expect(segments[0].type).toBe("cubic");
  });

  it("returns empty array for empty path", () => {
    expect(parseSvgPathToSegments("")).toEqual([]);
  });
});

describe("generateDxfFromSvgPaths", () => {
  it("generates valid DXF with header and entities", () => {
    const dxf = generateDxfFromSvgPaths(
      [{ id: "letter-0", d: "M 0 0 L 10 0 L 10 12 L 0 12 Z" }],
      { unitInches: true }
    );
    expect(dxf).toContain("SECTION");
    expect(dxf).toContain("HEADER");
    expect(dxf).toContain("ENTITIES");
    expect(dxf).toContain("LINE");
    expect(dxf).toContain("EOF");
  });

  it("produces LINE entities for each line segment", () => {
    const dxf = generateDxfFromSvgPaths(
      [{ id: "letter-0", d: "M 0 0 L 5 0 L 5 5 Z" }],
      { unitInches: true }
    );
    // 3 line segments: 0,0->5,0  5,0->5,5  5,5->0,0
    const lineMatches = dxf.match(/^LINE$/gm);
    expect(lineMatches).not.toBeNull();
    expect(lineMatches!.length).toBe(3);
  });

  it("converts cubic beziers to SPLINE entities", () => {
    const dxf = generateDxfFromSvgPaths(
      [{ id: "letter-0", d: "M 0 0 C 2 8 8 8 10 0" }],
      { unitInches: true }
    );
    expect(dxf).toContain("SPLINE");
  });

  it("handles multiple paths (multiple letters)", () => {
    const dxf = generateDxfFromSvgPaths(
      [
        { id: "letter-0", d: "M 0 0 L 5 0 L 5 10 Z" },
        { id: "letter-1", d: "M 10 0 L 15 0 L 15 10 Z" },
      ],
      { unitInches: true }
    );
    const lineMatches = dxf.match(/^LINE$/gm);
    expect(lineMatches!.length).toBe(6); // 3 per letter
  });

  it("includes layer per letter when layerPerLetter is true", () => {
    const dxf = generateDxfFromSvgPaths(
      [
        { id: "letter-0", d: "M 0 0 L 5 0 Z" },
        { id: "letter-1", d: "M 10 0 L 15 0 Z" },
      ],
      { unitInches: true, layerPerLetter: true }
    );
    expect(dxf).toContain("letter-0");
    expect(dxf).toContain("letter-1");
  });

  it("returns empty DXF for no paths", () => {
    const dxf = generateDxfFromSvgPaths([], { unitInches: true });
    expect(dxf).toContain("SECTION");
    expect(dxf).toContain("EOF");
    expect(dxf).not.toContain("LINE");
  });
});
```

- [ ] **9.2** Create `src/engine/dxf-generator.ts`:

```typescript
// src/engine/dxf-generator.ts
/**
 * DXF (Drawing Exchange Format) generator.
 * Converts SVG path data (from svg-generator.ts) into DXF entities
 * that CNC machines and CAD software (AutoCAD, etc.) can read.
 *
 * Supports: LINE, SPLINE (for bezier curves).
 * DXF format: ASCII R12/R14 compatible.
 *
 * Isomorphic -- no DOM dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SvgPathInput {
  id: string;
  d: string;
}

export interface DxfOptions {
  /** If true, coordinates are in inches. Default true. */
  unitInches?: boolean;
  /** If true, each letter gets its own DXF layer. Default false. */
  layerPerLetter?: boolean;
}

export type PathSegment =
  | LineSegment
  | QuadraticSegment
  | CubicSegment;

export interface LineSegment {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface QuadraticSegment {
  type: "quadratic";
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  x2: number;
  y2: number;
}

export interface CubicSegment {
  type: "cubic";
  x1: number;
  y1: number;
  cx1: number;
  cy1: number;
  cx2: number;
  cy2: number;
  x2: number;
  y2: number;
}

// ---------------------------------------------------------------------------
// SVG path parser (minimal -- handles M, L, Q, C, Z with absolute coords)
// ---------------------------------------------------------------------------

export function parseSvgPathToSegments(d: string): PathSegment[] {
  if (!d || !d.trim()) return [];

  const segments: PathSegment[] = [];
  const tokens = tokenizeSvgPath(d);

  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;
  let i = 0;

  while (i < tokens.length) {
    const cmd = tokens[i];

    switch (cmd) {
      case "M": {
        curX = parseFloat(tokens[++i]);
        curY = parseFloat(tokens[++i]);
        startX = curX;
        startY = curY;
        i++;
        break;
      }
      case "L": {
        const x = parseFloat(tokens[++i]);
        const y = parseFloat(tokens[++i]);
        segments.push({ type: "line", x1: curX, y1: curY, x2: x, y2: y });
        curX = x;
        curY = y;
        i++;
        break;
      }
      case "Q": {
        const cx = parseFloat(tokens[++i]);
        const cy = parseFloat(tokens[++i]);
        const x = parseFloat(tokens[++i]);
        const y = parseFloat(tokens[++i]);
        segments.push({ type: "quadratic", x1: curX, y1: curY, cx, cy, x2: x, y2: y });
        curX = x;
        curY = y;
        i++;
        break;
      }
      case "C": {
        const cx1 = parseFloat(tokens[++i]);
        const cy1 = parseFloat(tokens[++i]);
        const cx2 = parseFloat(tokens[++i]);
        const cy2 = parseFloat(tokens[++i]);
        const x = parseFloat(tokens[++i]);
        const y = parseFloat(tokens[++i]);
        segments.push({
          type: "cubic",
          x1: curX,
          y1: curY,
          cx1,
          cy1,
          cx2,
          cy2,
          x2: x,
          y2: y,
        });
        curX = x;
        curY = y;
        i++;
        break;
      }
      case "Z":
      case "z": {
        if (curX !== startX || curY !== startY) {
          segments.push({ type: "line", x1: curX, y1: curY, x2: startX, y2: startY });
        }
        curX = startX;
        curY = startY;
        i++;
        break;
      }
      default:
        i++;
        break;
    }
  }

  return segments;
}

function tokenizeSvgPath(d: string): string[] {
  // Split on whitespace and commas, keeping command letters separate
  return d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
}

// ---------------------------------------------------------------------------
// DXF generation
// ---------------------------------------------------------------------------

export function generateDxfFromSvgPaths(
  paths: SvgPathInput[],
  options: DxfOptions = {}
): string {
  const { layerPerLetter = false } = options;
  const lines: string[] = [];

  // HEADER section
  lines.push("0", "SECTION");
  lines.push("2", "HEADER");
  // Set units to inches (INSUNITS = 1 for inches)
  lines.push("9", "$INSUNITS");
  lines.push("70", "1");
  lines.push("0", "ENDSEC");

  // TABLES section (layers)
  if (layerPerLetter && paths.length > 0) {
    lines.push("0", "SECTION");
    lines.push("2", "TABLES");
    lines.push("0", "TABLE");
    lines.push("2", "LAYER");
    for (const p of paths) {
      lines.push("0", "LAYER");
      lines.push("2", p.id);
      lines.push("70", "0");
      lines.push("62", "7"); // white color
      lines.push("6", "CONTINUOUS");
    }
    lines.push("0", "ENDTAB");
    lines.push("0", "ENDSEC");
  }

  // ENTITIES section
  lines.push("0", "SECTION");
  lines.push("2", "ENTITIES");

  for (const path of paths) {
    const layer = layerPerLetter ? path.id : "0";
    const segments = parseSvgPathToSegments(path.d);

    for (const seg of segments) {
      switch (seg.type) {
        case "line":
          lines.push(...dxfLine(seg, layer));
          break;
        case "quadratic":
          // Convert quadratic to cubic for SPLINE compatibility
          lines.push(...dxfSplineCubic(quadraticToCubic(seg), layer));
          break;
        case "cubic":
          lines.push(...dxfSplineCubic(seg, layer));
          break;
      }
    }
  }

  lines.push("0", "ENDSEC");

  // EOF
  lines.push("0", "EOF");

  return lines.join("\n");
}

function dxfLine(seg: LineSegment, layer: string): string[] {
  return [
    "0", "LINE",
    "8", layer,
    "10", String(seg.x1),
    "20", String(seg.y1),
    "30", "0",
    "11", String(seg.x2),
    "21", String(seg.y2),
    "31", "0",
  ];
}

function dxfSplineCubic(seg: CubicSegment, layer: string): string[] {
  // DXF SPLINE entity for a single cubic bezier segment
  // Degree 3, 4 control points, knot vector [0,0,0,0,1,1,1,1]
  return [
    "0", "SPLINE",
    "8", layer,
    "70", "8",   // flag: planar
    "71", "3",   // degree
    "72", "8",   // number of knots
    "73", "4",   // number of control points
    // Knot values
    "40", "0",
    "40", "0",
    "40", "0",
    "40", "0",
    "40", "1",
    "40", "1",
    "40", "1",
    "40", "1",
    // Control points
    "10", String(seg.x1),
    "20", String(seg.y1),
    "30", "0",
    "10", String(seg.cx1),
    "20", String(seg.cy1),
    "30", "0",
    "10", String(seg.cx2),
    "20", String(seg.cy2),
    "30", "0",
    "10", String(seg.x2),
    "20", String(seg.y2),
    "30", "0",
  ];
}

/** Convert a quadratic bezier to a cubic bezier (exact conversion). */
function quadraticToCubic(seg: QuadraticSegment): CubicSegment {
  // Q(t) with control point P1 = cubic with:
  // CP1 = P0 + 2/3 * (P1 - P0)
  // CP2 = P2 + 2/3 * (P1 - P2)
  return {
    type: "cubic",
    x1: seg.x1,
    y1: seg.y1,
    cx1: seg.x1 + (2 / 3) * (seg.cx - seg.x1),
    cy1: seg.y1 + (2 / 3) * (seg.cy - seg.y1),
    cx2: seg.x2 + (2 / 3) * (seg.cx - seg.x2),
    cy2: seg.y2 + (2 / 3) * (seg.cy - seg.y2),
    x2: seg.x2,
    y2: seg.y2,
  };
}
```

- [ ] **9.3** Run the tests:

```bash
npx jest src/engine/__tests__/dxf-generator.test.ts
```

All 10 tests should pass.

- [ ] **9.4** Wire DXF into the production file pipeline. Read `src/lib/production-files.ts` to find the `generateProductionFiles` function. Add a DXF generation step alongside SVG. After the SVG generation call, add:

```typescript
import { generateDxfFromSvgPaths, parseSvgPathToSegments } from "@/engine/dxf-generator";

// Inside the production file generation, after SVG is generated:
// Extract paths from the SVG for DXF conversion
const svgPathRegex = /<path[^>]*id="([^"]*)"[^>]*d="([^"]*)"[^>]*\/>/g;
const dxfPaths: { id: string; d: string }[] = [];
let match;
while ((match = svgPathRegex.exec(svgContent)) !== null) {
  dxfPaths.push({ id: match[1], d: match[2] });
}

const dxfContent = generateDxfFromSvgPaths(dxfPaths, {
  unitInches: true,
  layerPerLetter: true,
});

// Save DXF file alongside SVG (using the same storage pattern)
```

The exact integration depends on how `generateProductionFiles` stores files. Follow the existing pattern (it stores SVG/BOM/PDF via a `FileStorage` interface).

### Commit

```
feat(export): add DXF generator for CNC/CAD export with TDD

Converts SVG path data to DXF format (LINE + SPLINE entities). Supports
per-letter DXF layers, quadratic-to-cubic bezier conversion, and R12-
compatible ASCII DXF. 10 tests. Wired into production file pipeline.
```

---

## Task 10: Nested SVG Optimization (TDD)

Implement a bin-packing nesting algorithm that packs letter outlines onto rectangular sheet stock to minimize material waste. Uses the `bin-pack` package (already installed).

### Files

- `src/engine/__tests__/svg-nesting.test.ts` (new)
- `src/engine/svg-nesting.ts` (new)

### Steps

- [ ] **10.1** Create the test file `src/engine/__tests__/svg-nesting.test.ts`:

```typescript
// src/engine/__tests__/svg-nesting.test.ts
import {
  nestLettersOnSheet,
  type NestingInput,
  type NestingResult,
} from "../svg-nesting";

const defaultInput: NestingInput = {
  letters: [
    { id: "letter-0", char: "H", widthInches: 7.0, heightInches: 12, svgPathData: "M 0 0 L 7 0 L 7 12 L 0 12 Z" },
    { id: "letter-1", char: "E", widthInches: 6.0, heightInches: 12, svgPathData: "M 0 0 L 6 0 L 6 12 L 0 12 Z" },
    { id: "letter-2", char: "L", widthInches: 5.5, heightInches: 12, svgPathData: "M 0 0 L 5.5 0 L 5.5 12 L 0 12 Z" },
    { id: "letter-3", char: "L", widthInches: 5.5, heightInches: 12, svgPathData: "M 0 0 L 5.5 0 L 5.5 12 L 0 12 Z" },
    { id: "letter-4", char: "O", widthInches: 7.5, heightInches: 12, svgPathData: "M 0 0 L 7.5 0 L 7.5 12 L 0 12 Z" },
  ],
  sheetWidthInches: 48,
  sheetHeightInches: 96,
  spacingInches: 0.25,
};

describe("nestLettersOnSheet", () => {
  it("returns placement positions for all letters", () => {
    const result = nestLettersOnSheet(defaultInput);
    expect(result.placements.length).toBe(5);
    for (const p of result.placements) {
      expect(typeof p.x).toBe("number");
      expect(typeof p.y).toBe("number");
      expect(typeof p.letterId).toBe("string");
    }
  });

  it("all letters fit within the sheet bounds", () => {
    const result = nestLettersOnSheet(defaultInput);
    for (const p of result.placements) {
      const letter = defaultInput.letters.find((l) => l.id === p.letterId)!;
      expect(p.x + letter.widthInches).toBeLessThanOrEqual(defaultInput.sheetWidthInches);
      expect(p.y + letter.heightInches).toBeLessThanOrEqual(defaultInput.sheetHeightInches);
    }
  });

  it("no two letters overlap (bounding box check)", () => {
    const result = nestLettersOnSheet(defaultInput);
    for (let i = 0; i < result.placements.length; i++) {
      for (let j = i + 1; j < result.placements.length; j++) {
        const a = result.placements[i];
        const b = result.placements[j];
        const aLetter = defaultInput.letters.find((l) => l.id === a.letterId)!;
        const bLetter = defaultInput.letters.find((l) => l.id === b.letterId)!;

        const overlapX =
          a.x < b.x + bLetter.widthInches + defaultInput.spacingInches &&
          a.x + aLetter.widthInches + defaultInput.spacingInches > b.x;
        const overlapY =
          a.y < b.y + bLetter.heightInches + defaultInput.spacingInches &&
          a.y + aLetter.heightInches + defaultInput.spacingInches > b.y;

        // They cannot overlap on BOTH axes simultaneously
        expect(overlapX && overlapY).toBe(false);
      }
    }
  });

  it("calculates material utilization percentage", () => {
    const result = nestLettersOnSheet(defaultInput);
    expect(typeof result.utilization).toBe("number");
    expect(result.utilization).toBeGreaterThan(0);
    expect(result.utilization).toBeLessThanOrEqual(100);
  });

  it("generates an SVG with nested layout", () => {
    const result = nestLettersOnSheet(defaultInput);
    expect(result.nestedSvg).toContain("<svg");
    expect(result.nestedSvg).toContain("</svg>");
    // Should contain the sheet outline
    expect(result.nestedSvg).toContain("<rect");
    // Should contain all 5 letters
    for (const letter of defaultInput.letters) {
      expect(result.nestedSvg).toContain(letter.id);
    }
  });

  it("returns sheetsNeeded count", () => {
    const result = nestLettersOnSheet(defaultInput);
    expect(result.sheetsNeeded).toBe(1);
  });

  it("handles large jobs requiring multiple sheets", () => {
    // 20 large letters on a small sheet
    const bigInput: NestingInput = {
      letters: Array.from({ length: 20 }, (_, i) => ({
        id: `letter-${i}`,
        char: "W",
        widthInches: 15,
        heightInches: 24,
        svgPathData: "M 0 0 L 15 0 L 15 24 L 0 24 Z",
      })),
      sheetWidthInches: 48,
      sheetHeightInches: 48,
      spacingInches: 0.25,
    };
    const result = nestLettersOnSheet(bigInput);
    expect(result.placements.length).toBe(20);
    expect(result.sheetsNeeded).toBeGreaterThanOrEqual(2);
  });

  it("handles empty letters array", () => {
    const result = nestLettersOnSheet({
      ...defaultInput,
      letters: [],
    });
    expect(result.placements).toEqual([]);
    expect(result.sheetsNeeded).toBe(0);
    expect(result.utilization).toBe(0);
  });
});
```

- [ ] **10.2** Create `src/engine/svg-nesting.ts`:

```typescript
// src/engine/svg-nesting.ts
/**
 * Nesting algorithm: pack letter outlines onto rectangular sheet stock
 * to minimize material waste.
 *
 * Uses bin-pack (already installed) for the rectangle packing.
 * Each letter is treated as its bounding box rectangle.
 *
 * Isomorphic -- no DOM dependencies.
 */

import pack from "bin-pack";

export interface LetterBounds {
  id: string;
  char: string;
  widthInches: number;
  heightInches: number;
  svgPathData: string;
}

export interface NestingInput {
  letters: LetterBounds[];
  sheetWidthInches: number;
  sheetHeightInches: number;
  /** Space between letters on the sheet. Default 0.25 inches. */
  spacingInches: number;
}

export interface LetterPlacement {
  letterId: string;
  char: string;
  x: number;
  y: number;
  sheetIndex: number;
}

export interface NestingResult {
  placements: LetterPlacement[];
  sheetsNeeded: number;
  /** Material utilization as percentage (0-100) */
  utilization: number;
  /** SVG showing the nested layout for all sheets */
  nestedSvg: string;
}

export function nestLettersOnSheet(input: NestingInput): NestingResult {
  const { letters, sheetWidthInches, sheetHeightInches, spacingInches } = input;

  if (letters.length === 0) {
    return {
      placements: [],
      sheetsNeeded: 0,
      utilization: 0,
      nestedSvg: buildNestedSvg([], [], sheetWidthInches, sheetHeightInches),
    };
  }

  // Add spacing to each letter's dimensions for the packer
  const items = letters.map((letter) => ({
    id: letter.id,
    char: letter.char,
    width: letter.widthInches + spacingInches,
    height: letter.heightInches + spacingInches,
    originalWidth: letter.widthInches,
    originalHeight: letter.heightInches,
    svgPathData: letter.svgPathData,
  }));

  // Pack letters sheet by sheet
  const allPlacements: LetterPlacement[] = [];
  let remaining = [...items];
  let sheetIndex = 0;

  while (remaining.length > 0) {
    // bin-pack sorts and places items into a single bin
    // We need to filter out items that don't fit on this sheet
    const packInput = remaining.map((item) => ({
      width: item.width,
      height: item.height,
      // Attach data for later lookup
      item,
    }));

    // bin-pack returns { width, height, items: [{...input, x, y}] }
    const result = pack(packInput as never) as { width: number; height: number; items: { x: number; y: number; item: typeof items[number] }[] };

    const placed: typeof items = [];
    const notPlaced: typeof items = [];

    for (const packed of result.items) {
      const item = packed.item;
      // Check if placement fits within sheet bounds
      if (
        packed.x + item.originalWidth <= sheetWidthInches &&
        packed.y + item.originalHeight <= sheetHeightInches
      ) {
        allPlacements.push({
          letterId: item.id,
          char: item.char,
          x: packed.x,
          y: packed.y,
          sheetIndex,
        });
        placed.push(item);
      } else {
        notPlaced.push(item);
      }
    }

    // If nothing was placed, force-place one item (it might be too big)
    if (placed.length === 0 && remaining.length > 0) {
      const forced = remaining[0];
      allPlacements.push({
        letterId: forced.id,
        char: forced.char,
        x: 0,
        y: 0,
        sheetIndex,
      });
      remaining = remaining.slice(1);
    } else {
      remaining = notPlaced;
    }

    sheetIndex++;
  }

  const sheetsNeeded = sheetIndex;

  // Calculate utilization
  const totalLetterArea = letters.reduce(
    (sum, l) => sum + l.widthInches * l.heightInches,
    0
  );
  const totalSheetArea = sheetsNeeded * sheetWidthInches * sheetHeightInches;
  const utilization = totalSheetArea > 0
    ? Math.round((totalLetterArea / totalSheetArea) * 10000) / 100
    : 0;

  // Build the SVG
  const letterMap = new Map(letters.map((l) => [l.id, l]));
  const nestedSvg = buildNestedSvg(
    allPlacements,
    letters,
    sheetWidthInches,
    sheetHeightInches
  );

  return {
    placements: allPlacements,
    sheetsNeeded,
    utilization,
    nestedSvg,
  };
}

function buildNestedSvg(
  placements: LetterPlacement[],
  letters: LetterBounds[],
  sheetWidth: number,
  sheetHeight: number
): string {
  const letterMap = new Map(letters.map((l) => [l.id, l]));
  const sheetIndices = new Set(placements.map((p) => p.sheetIndex));
  const sheetCount = sheetIndices.size || 1;

  // Arrange sheets vertically in the SVG
  const padding = 1; // inch between sheets
  const totalHeight = sheetCount * sheetHeight + (sheetCount - 1) * padding;

  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `  width="${sheetWidth}in"`,
    `  height="${totalHeight}in"`,
    `  viewBox="0 0 ${sheetWidth} ${totalHeight}"`,
    `  data-sheets="${sheetCount}"`,
    `  data-utilization="${placements.length > 0 ? Math.round((letters.reduce((s, l) => s + l.widthInches * l.heightInches, 0) / (sheetCount * sheetWidth * sheetHeight)) * 10000) / 100 : 0}%">`,
  ];

  for (let s = 0; s < sheetCount; s++) {
    const yOffset = s * (sheetHeight + padding);
    const sheetPlacements = placements.filter((p) => p.sheetIndex === s);

    // Sheet outline
    lines.push(
      `  <rect x="0" y="${yOffset}" width="${sheetWidth}" height="${sheetHeight}" fill="none" stroke="#CCCCCC" stroke-width="0.02" />`
    );

    // Letters on this sheet
    for (const p of sheetPlacements) {
      const letter = letterMap.get(p.letterId);
      if (!letter) continue;

      lines.push(
        `  <g id="${p.letterId}" transform="translate(${p.x}, ${yOffset + p.y})">`
      );
      lines.push(
        `    <path d="${letter.svgPathData}" fill="none" stroke="#000000" stroke-width="0.01" />`
      );
      lines.push(`  </g>`);
    }
  }

  lines.push(`</svg>`);
  return lines.join("\n");
}
```

- [ ] **10.3** Run the tests:

```bash
npx jest src/engine/__tests__/svg-nesting.test.ts
```

All 8 tests should pass.

- [ ] **10.4** Wire nesting into the production file pipeline. In `src/lib/production-files.ts`, after generating the SVG cut file, add nesting:

```typescript
import { nestLettersOnSheet, type LetterBounds } from "@/engine/svg-nesting";

// After SVG generation, extract letter bounds and run nesting:
// (Use the same SVG path regex from Task 9 step 9.4)
const letterBounds: LetterBounds[] = svgPaths.map((p, i) => ({
  id: p.id,
  char: config.text.replace(/\s+/g, "")[i] ?? "?",
  widthInches: letterWidths[i] ?? 8,
  heightInches: config.height,
  svgPathData: p.d,
}));

const nestingResult = nestLettersOnSheet({
  letters: letterBounds,
  sheetWidthInches: 48,  // standard 4ft sheet
  sheetHeightInches: 96, // standard 8ft sheet
  spacingInches: 0.25,
});

// Store nestingResult.nestedSvg as a production file with fileType "nested_svg"
```

### Commit

```
feat(nesting): add bin-packing SVG nesting for sheet stock optimization

Packs letter bounding boxes onto rectangular sheets using bin-pack,
calculates material utilization, and generates a nested layout SVG.
Supports multi-sheet jobs. 8 tests. Wired into production file pipeline.
```

---

## Task 11: Seed Platform Data

Create a seed script that populates the platform-level stock parts, material presets, and fonts in the database. This runs once per environment.

### Files

- `prisma/seed.ts` (new)
- `package.json` (edit — add prisma seed config)

### Steps

- [ ] **11.1** Create `prisma/seed.ts`:

```typescript
// prisma/seed.ts
/**
 * Seed the database with platform-level data:
 * - Stock parts catalog (6 categories)
 * - Material presets (8 platform presets)
 * - Font catalog (15 platform fonts from font-map.ts)
 * - Default tenant (gatsoft)
 */

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({} as never);

async function main() {
  console.log("Seeding platform data...");

  // 1. Default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "gatsoft" },
    update: {},
    create: {
      slug: "gatsoft",
      name: "GatSoft Signs",
      plan: "ENTERPRISE",
    },
  });
  console.log(`  Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Stock Parts (platform-level, tenantId = null)
  const stockParts = [
    { slug: "raceway-linear", name: "Linear Raceway", category: "MOUNTING" as const, description: "Standard linear raceway for channel letter mounting" },
    { slug: "raceway-box", name: "Box Raceway", category: "MOUNTING" as const, description: "Box raceway for clustered letter mounting" },
    { slug: "wall-standoffs", name: "Wall Standoff Set", category: "MOUNTING" as const, description: "Stainless steel standoff mounting hardware" },
    { slug: "stud-mounts", name: "Stud Mount Kit", category: "MOUNTING" as const, description: "Threaded stud mounting hardware" },
    { slug: "single-pole", name: "Single Pole", category: "POSTS" as const, description: "Single pole for pylon or post signs" },
    { slug: "double-pole", name: "Double Pole", category: "POSTS" as const, description: "Double pole for larger pylon signs" },
    { slug: "monument-base", name: "Monument Base", category: "POSTS" as const, description: "Ground-level monument sign base" },
    { slug: "pylon-frame", name: "Pylon Frame", category: "POSTS" as const, description: "Tall pylon sign frame structure" },
    { slug: "single-face-box", name: "Single-Face Cabinet", category: "CABINETS" as const, description: "Single-face rectangular cabinet shell" },
    { slug: "double-face-box", name: "Double-Face Cabinet", category: "CABINETS" as const, description: "Double-face rectangular cabinet shell" },
    { slug: "shaped-cabinet", name: "Shaped Cabinet", category: "CABINETS" as const, description: "Custom-shaped cabinet shell" },
    { slug: "led-module-strip", name: "LED Module Strip", category: "LIGHTING" as const, description: "LED module strip for internal illumination" },
    { slug: "neon-tube-path", name: "Neon Tube Path", category: "LIGHTING" as const, description: "LED neon tube following custom path" },
    { slug: "bulb-array", name: "Bulb Array", category: "LIGHTING" as const, description: "Marquee-style bulb array" },
    { slug: "hanging-chains", name: "Hanging Chains", category: "ACCESSORIES" as const, description: "Decorative hanging chains for blade signs" },
    { slug: "brackets", name: "Mounting Brackets", category: "ACCESSORIES" as const, description: "Wall-mount brackets for blade signs" },
    { slug: "transformer", name: "Transformer/Power Supply", category: "ACCESSORIES" as const, description: "LED power supply unit" },
    { slug: "flat-panel", name: "Flat Background Panel", category: "BACKGROUNDS" as const, description: "Flat panel background for sign mounting" },
    { slug: "shaped-backer", name: "Shaped Backer", category: "BACKGROUNDS" as const, description: "Custom-shaped background backer" },
    { slug: "brick-wall-preview", name: "Brick Wall (Preview)", category: "BACKGROUNDS" as const, description: "Brick wall texture for preview rendering" },
  ];

  for (const part of stockParts) {
    await prisma.stockPart.upsert({
      where: { tenantId_slug: { tenantId: null as unknown as string, slug: part.slug } },
      update: { name: part.name, description: part.description },
      create: { tenantId: null, ...part },
    });
  }
  console.log(`  Stock parts: ${stockParts.length} seeded`);

  // 3. Material Presets (platform-level)
  const materials = [
    { slug: "brushed-aluminum", name: "Brushed Aluminum", materialType: "MeshPhysicalMaterial", properties: { color: "#D4D4D8", metalness: 0.85, roughness: 0.3 } },
    { slug: "painted-metal", name: "Painted Metal", materialType: "MeshStandardMaterial", properties: { color: "#FFFFFF", metalness: 0.5, roughness: 0.4 } },
    { slug: "translucent-acrylic", name: "Translucent Acrylic", materialType: "MeshPhysicalMaterial", properties: { color: "#FFFFFF", transmission: 0.8, thickness: 0.15, roughness: 0.1, metalness: 0 } },
    { slug: "opaque-acrylic", name: "Opaque Acrylic", materialType: "MeshStandardMaterial", properties: { color: "#FFFFFF", roughness: 0.1, metalness: 0 } },
    { slug: "neon-tube", name: "Neon Tube", materialType: "MeshBasicMaterial", properties: { color: "#FF4444", emissive: "#FF4444", emissiveIntensity: 2.0 } },
    { slug: "vinyl-print", name: "Vinyl Print", materialType: "MeshStandardMaterial", properties: { color: "#FFFFFF", roughness: 0.3, metalness: 0 } },
    { slug: "wood", name: "Wood", materialType: "MeshStandardMaterial", properties: { color: "#8B6914", roughness: 0.7, metalness: 0 } },
    { slug: "concrete-stone", name: "Concrete/Stone", materialType: "MeshStandardMaterial", properties: { color: "#9E9E9E", roughness: 0.9, metalness: 0 } },
  ];

  for (const mat of materials) {
    await prisma.materialPreset.upsert({
      where: { tenantId_slug: { tenantId: null as unknown as string, slug: mat.slug } },
      update: { name: mat.name, properties: mat.properties },
      create: { tenantId: null, ...mat },
    });
  }
  console.log(`  Material presets: ${materials.length} seeded`);

  // 4. Fonts (platform-level)
  const fonts = [
    { slug: "standard", name: "Standard", fileName: "Roboto-Regular.ttf", isCurved: false, cssFamily: "'Sign-Roboto', sans-serif" },
    { slug: "curved", name: "Curved", fileName: "Lobster-Regular.ttf", isCurved: true, cssFamily: "'Sign-Lobster', cursive" },
    { slug: "bebas-neue", name: "Bebas Neue", fileName: "BebasNeue-Regular.ttf", isCurved: false, cssFamily: "'Sign-BebasNeue', sans-serif" },
    { slug: "montserrat", name: "Montserrat", fileName: "Montserrat-Regular.ttf", isCurved: false, cssFamily: "'Sign-Montserrat', sans-serif" },
    { slug: "oswald", name: "Oswald", fileName: "Oswald-Regular.ttf", isCurved: false, cssFamily: "'Sign-Oswald', sans-serif" },
    { slug: "playfair-display", name: "Playfair Display", fileName: "PlayfairDisplay-Regular.ttf", isCurved: false, cssFamily: "'Sign-PlayfairDisplay', serif" },
    { slug: "raleway", name: "Raleway", fileName: "Raleway-Regular.ttf", isCurved: false, cssFamily: "'Sign-Raleway', sans-serif" },
    { slug: "poppins", name: "Poppins", fileName: "Poppins-Regular.ttf", isCurved: false, cssFamily: "'Sign-Poppins', sans-serif" },
    { slug: "anton", name: "Anton", fileName: "Anton-Regular.ttf", isCurved: false, cssFamily: "'Sign-Anton', sans-serif" },
    { slug: "permanent-marker", name: "Permanent Marker", fileName: "PermanentMarker-Regular.ttf", isCurved: true, cssFamily: "'Sign-PermanentMarker', cursive" },
    { slug: "righteous", name: "Righteous", fileName: "Righteous-Regular.ttf", isCurved: true, cssFamily: "'Sign-Righteous', cursive" },
    { slug: "abril-fatface", name: "Abril Fatface", fileName: "AbrilFatface-Regular.ttf", isCurved: true, cssFamily: "'Sign-AbrilFatface', serif" },
    { slug: "passion-one", name: "Passion One", fileName: "PassionOne-Regular.ttf", isCurved: true, cssFamily: "'Sign-PassionOne', sans-serif" },
    { slug: "russo-one", name: "Russo One", fileName: "RussoOne-Regular.ttf", isCurved: false, cssFamily: "'Sign-RussoOne', sans-serif" },
    { slug: "black-ops-one", name: "Black Ops One", fileName: "BlackOpsOne-Regular.ttf", isCurved: false, cssFamily: "'Sign-BlackOpsOne', sans-serif" },
  ];

  for (const font of fonts) {
    await prisma.tenantFont.upsert({
      where: { tenantId_slug: { tenantId: null as unknown as string, slug: font.slug } },
      update: { name: font.name, fileName: font.fileName, isCurved: font.isCurved },
      create: {
        tenantId: null,
        source: "PLATFORM",
        fileUrl: `/fonts/${font.fileName}`,
        ...font,
      },
    });
  }
  console.log(`  Fonts: ${fonts.length} seeded`);

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **11.2** Add the prisma seed configuration to `package.json`. Add this block at the top level of package.json (after `"devDependencies"`):

```json
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"commonjs\"} prisma/seed.ts"
  }
```

Note: The `tenantId: null` upserts for platform-level records will need adjustment for Prisma's null handling in the compound unique constraint. If `@@unique([tenantId, slug])` does not support null in the unique lookup, the seed script should use `findFirst` + conditional `create/update` instead of `upsert`. The implementer should test and adjust accordingly.

### Commit

```
feat(seed): add platform data seed for stock parts, materials, and fonts

Seeds 20 stock parts across 6 categories, 8 material presets matching
the design spec, and 15 platform fonts from the existing font-map.
Creates the default gatsoft tenant. Run with npx prisma db seed.
```

---

## Task 12: Integration Wiring and Admin Sidebar Update

Final integration: ensure all new admin pages are accessible from the sidebar, the pricing API handles all three formula types cleanly, and run the full test suite.

### Files

- `src/components/admin/sidebar.tsx` (edit)
- `src/app/admin/formulas/[formulaId]/edit/page.tsx` (verify)
- Run all tests

### Steps

- [ ] **12.1** Verify the admin sidebar (from Task 8 step 8.6) includes all new navigation items. The final sidebar nav should include:

```
Dashboard    (/)
Products     (/admin/products)
Formulas     (/admin/formulas)
Templates    (/admin/templates)
Orders       (/admin/orders)
Stock Parts  (/admin/stock-parts)     ← NEW
Materials    (/admin/materials)        ← NEW
Fonts        (/admin/fonts)            ← NEW
Settings     (/admin/settings)
```

- [ ] **12.2** Verify the pricing calculate route handles all three formula types (PRESET, VISUAL, SCRIPT) by reading the final state of `src/app/api/v1/pricing/calculate/route.ts`.

- [ ] **12.3** Run the full test suite to ensure nothing is broken:

```bash
npx jest --verbose
```

All existing tests (channel-letter, shape, cabinet, logo, dimensional, print, sign-post, lightbox, blade, neon, banner, formula-presets, schema-pricing, schema-pricing-compat, bom-generator, svg-generator) plus the new tests (script-sandbox, dxf-generator, svg-nesting) should pass.

- [ ] **12.4** Run `npx prisma generate` to confirm the schema with new models generates without errors.

- [ ] **12.5** Run `npm run build` to confirm the Next.js build completes successfully with all new pages and API routes.

### Commit

```
chore: verify Phase 4 integration — all tests pass, build succeeds

Final integration check for sandboxed script pricing, stock parts,
materials, photo overlay, font management, DXF export, and nested SVG.
```
