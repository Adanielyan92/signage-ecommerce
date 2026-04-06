// widget/build.mjs
import * as esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: ["src/index.tsx"],
  bundle: true,
  minify: !isWatch,
  sourcemap: isWatch ? "inline" : false,
  format: "iife",
  globalName: "GatSoftConfigurator",
  target: ["es2020", "chrome90", "firefox90", "safari15"],
  outfile: "dist/configurator-widget.js",
  loader: {
    ".tsx": "tsx",
    ".ts": "ts",
  },
  define: {
    "process.env.NODE_ENV": isWatch ? '"development"' : '"production"',
  },
  jsx: "automatic",
  external: [],
  metafile: true,
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  const result = await esbuild.build(buildOptions);
  const outKey = Object.keys(result.metafile?.outputs ?? {})[0];
  const size = outKey ? (result.metafile.outputs[outKey].bytes / 1024) : 0;
  console.log(`Built: dist/configurator-widget.js`);
  if (size > 0) console.log(`Size: ${size.toFixed(1)} KB`);
}
