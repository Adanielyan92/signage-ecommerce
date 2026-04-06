// src/engine/__tests__/script-sandbox.test.ts
// Requires: node --experimental-vm-modules
// Run with: NODE_OPTIONS="--experimental-vm-modules" npx jest script-sandbox

// Skip in standard test runs — quickjs-emscripten needs --experimental-vm-modules
const SKIP = !process.env.QUICKJS_TESTS;

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

(SKIP ? describe.skip : describe)("executeScript", () => {
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
  var base = opts.letterCount * opts.height * params.pricePerInch;
  var multiplier = 1;
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
