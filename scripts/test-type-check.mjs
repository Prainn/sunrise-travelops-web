import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("accepts hosted evidence only for the exact guarded dev deployment", () => {
  const sha = "a".repeat(40);
  const env = {
    ...process.env,
    SUNRISE_HOSTED_DEV_TYPECHECK_SHA: sha,
    GITHUB_SHA: sha,
    GITHUB_ACTIONS: "true",
    GITHUB_REPOSITORY: "Prainn/sunrise-travelops-web",
    GITHUB_REF: "refs/heads/dev",
    DEPLOY_ENV: "dev",
    OPERATION: "deploy",
    SUNRISE_LOCK_HELD: "1",
  };
  const run = (change = {}, args = []) => spawnSync(process.execPath, [join(repository, "scripts/type-check.mjs"), ...args], {
    encoding: "utf8",
    env: { ...env, ...change },
  });
  assert.match(run().stdout, /Type check verified on GitHub/);
  for (const change of [
    { GITHUB_SHA: "b".repeat(40) },
    { GITHUB_ACTIONS: "" },
    { GITHUB_REPOSITORY: "Prainn/another-repo" },
    { GITHUB_REF: "refs/heads/main", DEPLOY_ENV: "prod" },
    { OPERATION: "rollback" },
    { SUNRISE_LOCK_HELD: "" },
  ]) {
    const invalid = run(change);
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /must match the guarded dev deployment/);
  }
  assert.notEqual(run({}, ["--project", "tsconfig.json"]).status, 0);
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
