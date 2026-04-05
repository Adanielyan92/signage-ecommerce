// src/components/admin/script-editor.tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
