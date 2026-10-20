import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { safeURL, sortedProjects, validateCV } from "../cv.js";
import { DriveBackup } from "../drive.js";

const sample = JSON.parse(await readFile(new URL("../cv.json", import.meta.url), "utf8"));

test("published CV conforms to the import and backup schema", () => {
  assert.deepEqual(validateCV(sample), sample);
});

test("invalid imports cannot replace a CV", () => {
  for (const invalid of [null, [], {}, { ...sample, name: " " }, { ...sample, skills: "JS" }, { ...sample, experience: [null] }, { ...sample, summary: 42 }]) {
    assert.throws(() => validateCV(invalid));
  }
  assert.throws(() => validateCV({ ...sample, skills: Array(101).fill("skill") }));
  assert.throws(() => validateCV({ ...sample, summary: "x".repeat(20001) }));
});

test("validation copies known fields and fills optional entry fields", () => {
  const result = validateCV({ ...sample, unexpected: "ignored", personalProjects: [{ name: "Demo" }] });
  assert.equal(result.unexpected, undefined);
  assert.deepEqual(result.personalProjects[0], { name: "Demo", description: "", url: "", technologies: "", date: "" });
  result.skills.push("JavaScript");
  assert.deepEqual(sample.skills, []);
});

test("local drafts can preserve a temporarily empty name without allowing incomplete exports", () => {
  const incomplete = { ...sample, name: "", summary: "An edit worth keeping" };
  assert.deepEqual(validateCV(incomplete, { allowEmptyName: true }), incomplete);
  assert.throws(() => validateCV(incomplete), /name is required/);
  assert.throws(() => validateCV({ ...incomplete, skills: null }, { allowEmptyName: true }));
});

test("only absolute HTTP(S) project and profile links are clickable", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,hi", "/relative", "//example.com", "invalid", "file:///tmp/file"]) {
    assert.equal(safeURL(value), null);
  }
  assert.equal(safeURL("https://example.com/project"), "https://example.com/project");
  assert.equal(safeURL("http://localhost:8080"), "http://localhost:8080/");
});

test("latest projects appear first without changing the saved order", () => {
  const projects = [{ date: "" }, { date: "2024-09" }, { date: "2026-01" }];
  assert.deepEqual(sortedProjects(projects).map((project) => project.date), ["2026-01", "2024-09", ""]);
  assert.equal(projects[0].date, "");
});

test("Drive requires a live token and forgets it on disconnect", async () => {
  const drive = new DriveBackup(() => assert.fail("Must not fetch without authorization"));
  await assert.rejects(drive.save(sample), /Connect Google Drive/);
  drive.connect("test-token", 3600);
  assert.equal(drive.connected, true);
  drive.disconnect();
  assert.equal(drive.token, null);
  drive.connect("test-token", 0);
  assert.equal(drive.connected, false);
});

test("each Drive save creates a separate private app-data revision", async () => {
  const calls = [];
  const drive = new DriveBackup(async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ id: "revision" }) };
  });
  drive.connect("test-token", 3600);
  await drive.save(sample);
  await drive.save({ ...sample, headline: "Updated" });
  assert.equal(calls.length, 2);
  for (const { url, options } of calls) {
    assert.ok(url.startsWith("https://www.googleapis.com/upload/drive/v3/files?"));
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer " + "test-token");
    assert.match(options.headers["Content-Type"], /^multipart\/related; boundary=curriculum_/);
    assert.ok(options.body.includes('"parents":["appDataFolder"]'));
  }
  assert.ok(calls[1].options.body.includes('"headline":"Updated"'));
});

test("the default Drive transport preserves the browser fetch receiver", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async function () {
    assert.equal(this, globalThis);
    return { ok: true, json: async () => ({ id: "revision" }) };
  };
  try {
    const drive = new DriveBackup();
    drive.connect("test-token", 3600);
    assert.deepEqual(await drive.save(sample), { id: "revision" });
  } finally {
    globalThis.fetch = original;
  }
});

test("Drive restore requests the newest revision then downloads its JSON", async () => {
  const urls = [];
  const drive = new DriveBackup(async (url) => {
    urls.push(url);
    return { ok: true, json: async () => urls.length === 1 ? { files: [{ id: "latest" }] } : sample };
  });
  drive.connect("test-token", 3600);
  assert.deepEqual(await drive.latest(), sample);
  const query = new URL(urls[0]).searchParams;
  assert.equal(query.get("spaces"), "appDataFolder");
  assert.equal(query.get("orderBy"), "createdTime desc");
  assert.equal(query.get("pageSize"), "1");
  assert.equal(urls[1], "https://www.googleapis.com/drive/v3/files/latest?alt=media");
});

test("Drive reports missing backups and failed requests without discarding CV data", async () => {
  const empty = new DriveBackup(async () => ({ ok: true, json: async () => ({ files: [] }) }));
  empty.connect("test-token", 3600);
  await assert.rejects(empty.latest(), /No CV backup/);
  for (const status of [401, 403, 500]) {
    const drive = new DriveBackup(async () => ({ ok: false, status }));
    drive.connect("test-token", 3600);
    await assert.rejects(drive.save(sample), new RegExp(String(status)));
    if (status === 401) assert.equal(drive.token, null);
  }
  assert.equal(sample.name, "Frankeo");
});
