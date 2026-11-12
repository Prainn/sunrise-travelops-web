import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(repository, "node_modules/vue-tsc/bin/vue-tsc.js");
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== "--project")) {
  throw new Error("Usage: node scripts/type-check.mjs [--project tsconfig.json]");
}
const project = resolve(args[1] ?? join(repository, "tsconfig.json"));
const directory = dirname(project);
const shown = spawnSync(process.execPath, [cli, "--showConfig", "--project", project], {
  encoding: "utf8",
  maxBuffer: 5 * 1024 * 1024,
});
if (shown.error) throw shown.error;
if (shown.status !== 0) {
  process.stderr.write(shown.stderr || shown.stdout);
  process.exit(shown.status ?? 1);
}
const config = JSON.parse(shown.stdout);
// This project has one authoritative root config. References need a build-mode design.
if (config.references?.length) throw new Error("Project references are not supported by this checker");
const files = config.files.map((file) => resolve(directory, file));
if (!files.length) throw new Error("Type checking must not succeed with no source files");
const declarations = files.filter((file) => /\.d\.[cm]?ts$/.test(file));
const groups = { application: [], viewTests: [], sharedTests: [], tooling: [] };
for (const file of files) {
  if (declarations.includes(file)) continue;
  const path = relative(directory, file).replaceAll("\\", "/");
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(path)) {
    (path.startsWith("src/views/") ? groups.viewTests : groups.sharedTests).push(file);
  }
  else if (path.startsWith("src/")) groups.application.push(file);
  else groups.tooling.push(file);
}

// Separate processes release the previous TypeScript graph before loading the next.
// Every root from --showConfig is retained; imports and strict options still resolve normally.
// View tests and shared tests build separate graphs; large tool configs run one at a time.
const checks = [
  ["application", groups.application],
  ["view-tests", groups.viewTests],
  ["shared-tests", groups.sharedTests],
  ...groups.tooling.map((file, index) => [`tooling-${index + 1}`, [file]]),
];
const temporary = mkdtempSync(join(directory, ".type-check-"));
let status = 0;
try {
  for (const [name, roots] of checks) {
    if (!roots.length) continue;
    const path = join(temporary, `${name}.json`);
    writeFileSync(path, JSON.stringify({
      extends: project,
      files: [...declarations, ...roots],
      include: [],
      exclude: [],
    }));
    process.stdout.write(`Type check ${name}: ${roots.length} roots + ${declarations.length} declarations\n`);
    const checked = spawnSync(process.execPath, [cli, "--noEmit", "--project", path], {
      stdio: "inherit",
    });
    if (checked.error) throw checked.error;
    if (checked.status !== 0) {
      status = checked.status ?? 1;
      break;
    }
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
process.exitCode = status;
