import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditArtifactDirectory } from "./audit-public-artifact.mjs";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "kiddosprout-final-artifact-"));
  const outputRoot = join(root, "output");
  await mkdir(join(outputRoot, "games", "chess-academy"), { recursive: true });
  await writeFile(join(outputRoot, "games", "index.html"), '<a href="chess-academy/">Chess Academy</a>');
  await writeFile(join(outputRoot, "games", "chess-academy", "index.html"), "reviewed chess");
  await writeFile(join(outputRoot, "app.js"), "console.log('safe');");
  return { root, outputRoot, expectedFiles: ["app.js", "games/index.html", "games/chess-academy/index.html"] };
}

test("final artifact audit accepts the exact reviewed inventory", async () => {
  const data = await fixture();
  try {
    const result = await auditArtifactDirectory({
      outputRoot: data.outputRoot,
      expectedFiles: data.expectedFiles,
      repositoryRoot: data.root
    });
    assert.equal(result.fileCount, 3);
  } finally {
    await rm(data.root, { recursive: true, force: true });
  }
});

test("final artifact audit rejects unreviewed files and secret-shaped content", async () => {
  const data = await fixture();
  try {
    await writeFile(join(data.outputRoot, "unexpected.txt"), "draft");
    await assert.rejects(
      auditArtifactDirectory({ outputRoot: data.outputRoot, expectedFiles: data.expectedFiles, repositoryRoot: data.root }),
      /unreviewed file: unexpected\.txt/
    );
    await rm(join(data.outputRoot, "unexpected.txt"));
    await writeFile(join(data.outputRoot, "app.js"), "const RESEND_API_KEY = 'must-not-publish';");
    await assert.rejects(
      auditArtifactDirectory({ outputRoot: data.outputRoot, expectedFiles: data.expectedFiles, repositoryRoot: data.root }),
      /Secret-shaped content/
    );
    await writeFile(join(data.outputRoot, "app.js"), "console.log('safe');");
    await writeFile(join(data.outputRoot, "schema.sql"), "select 1;");
    await assert.rejects(
      auditArtifactDirectory({
        outputRoot: data.outputRoot,
        expectedFiles: [...data.expectedFiles, "schema.sql"],
        repositoryRoot: data.root
      }),
      /forbidden source, backend, key, or archive file/
    );
  } finally {
    await rm(data.root, { recursive: true, force: true });
  }
});

test("final artifact audit compares text with local environment values without printing them", async () => {
  const data = await fixture();
  try {
    await writeFile(join(data.root, ".env.production"), "KIDDOSPROUT_ACCOUNT_ORIGIN=https://private.example.test\n");
    await writeFile(join(data.outputRoot, "app.js"), "const endpoint = 'https://private.example.test';");
    await assert.rejects(
      auditArtifactDirectory({ outputRoot: data.outputRoot, expectedFiles: data.expectedFiles, repositoryRoot: data.root }),
      /KIDDOSPROUT_ACCOUNT_ORIGIN leaked/
    );
  } finally {
    await rm(data.root, { recursive: true, force: true });
  }
});
