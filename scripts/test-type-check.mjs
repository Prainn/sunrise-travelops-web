import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("commits check the staged tree and leave unstaged and untracked files alone", () => {
  const root = mkdtempSync(join(tmpdir(), "sunrise-commit-check-"));
  const worktree = join(root, "worktree");
  const scratch = join(root, "hook temp");
  const env = { ...process.env, TMPDIR: scratch };
  const git = (...args) => spawnSync("git", args, { cwd: worktree, env, encoding: "utf8" });
  const successful = (...args) => {
    const result = git(...args);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return result.stdout;
  };
  try {
    mkdirSync(join(worktree, "scripts"), { recursive: true });
    mkdirSync(scratch);
    successful("init", "--quiet");
    successful("config", "core.hooksPath", ".git/hooks");
    successful("config", "user.name", "Fixture");
    successful("config", "user.email", "fixture@example.invalid");
    symlinkSync(join(repository, ".husky/pre-commit"), join(worktree, ".git/hooks/pre-commit"));
    symlinkSync(join(repository, "node_modules"), join(worktree, "node_modules"), "dir");
    copyFileSync(join(repository, "scripts/type-check.mjs"), join(worktree, "scripts/type-check.mjs"));
    writeFileSync(join(worktree, "package.json"), JSON.stringify({ scripts: { "lint:lint-staged": "node --version" } }));
    writeFileSync(join(worktree, "tsconfig.json"), JSON.stringify({
      compilerOptions: { strict: true, skipLibCheck: true, types: [], module: "esnext" },
      include: ["*.ts"],
    }));
    const source = join(worktree, "price.ts");
    const valid = "export const price: number = 1;";
    const invalid = 'export const price: number = "wrong";';
    writeFileSync(source, invalid);
    successful("add", "price.ts", "tsconfig.json", "package.json", "scripts/type-check.mjs");
    writeFileSync(source, valid);
    const rejected = git("commit", "-m", "Staged type error");
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stdout + rejected.stderr, /TS2322/);
    assert.deepEqual(readdirSync(scratch).filter((name) => name.startsWith("sunrise-web-index.")), []);

    successful("add", "price.ts");
    writeFileSync(source, invalid);
    writeFileSync(join(worktree, "untracked.ts"), invalid);
    successful("commit", "-m", "Valid staged source");
    assert.equal(successful("show", "HEAD:price.ts"), valid);
    assert.match(successful("diff", "--", "price.ts"), /wrong/);
    assert.deepEqual(readdirSync(scratch).filter((name) => name.startsWith("sunrise-web-index.")), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("checks Vue, tests and additional config roots without leaving temporary configs", () => {
  const fixture = mkdtempSync(join(repository, ".type-check-fixture-"));
  try {
    mkdirSync(join(fixture, "src"));
    mkdirSync(join(fixture, "extra"));
    writeFileSync(join(fixture, "tsconfig.json"), JSON.stringify({
      compilerOptions: { strict: true, skipLibCheck: true, target: "esnext", module: "esnext", moduleResolution: "bundler", types: [] },
      include: ["src/**/*.vue", "src/**/*.ts", "extra/**/*.ts"],
    }));
    const sources = {
      "src/App.vue": '<script setup lang="ts">const value: number = 1;</script><template>{{ value }}</template>',
      "src/example.test.ts": "export const value: number = 1;",
      "extra/tool.ts": "export const value: number = 1;",
    };
    const run = () => spawnSync(process.execPath, [join(repository, "scripts/type-check.mjs"), "--project", join(fixture, "tsconfig.json")], {
      encoding: "utf8",
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=1200" },
    });
    for (const [file, text] of Object.entries(sources)) writeFileSync(join(fixture, file), text);
    const valid = run();
    assert.equal(valid.status, 0, valid.stdout + valid.stderr);
    for (const [file, text] of Object.entries(sources)) {
      writeFileSync(join(fixture, file), text.replace("number = 1", 'number = "invalid"'));
      const invalid = run();
      assert.notEqual(invalid.status, 0, `Missed type error in ${file}`);
      assert.match(invalid.stdout + invalid.stderr, /TS2322/);
      assert.equal(readdirSync(fixture).some((name) => name.startsWith(".type-check-")), false);
      writeFileSync(join(fixture, file), text);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
