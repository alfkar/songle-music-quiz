import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const REQUIREMENT_PATTERN = /REQ-[A-Z]+-\d+/g;
const requirementPath = new URL("./signaling-requirements.md", import.meta.url);
const repoRoot = new URL("../", import.meta.url);
const taggedFiles = [
  "signaling-worker/src/index.js",
  "src/lib/signalingClient.js",
  "src/lib/sessionProtocol.js",
  "src/lib/roomSnapshots.js",
  "src/components/QuizRoom.js",
  "src/pages/party-quiz.js",
];

function uniqueMatches(text) {
  return [...new Set(text.match(REQUIREMENT_PATTERN) || [])].sort();
}

test("REQ traceability: every code tag is defined in the requirements map", () => {
  const docIds = new Set(uniqueMatches(readFileSync(requirementPath, "utf8")));
  const codeIds = uniqueMatches(
    taggedFiles
      .map((file) => readFileSync(new URL(file, repoRoot), "utf8"))
      .join("\n")
  );

  const missingFromDocs = codeIds.filter((id) => !docIds.has(id));
  assert.deepEqual(missingFromDocs, []);
});

test("REQ traceability: every requirement has code references or is explicitly planned", () => {
  const markdown = readFileSync(requirementPath, "utf8");
  const rows = markdown
    .split("\n")
    .filter((line) => line.startsWith("| REQ-"));

  assert.ok(rows.length > 0);

  rows.forEach((row) => {
    const [, id, , , references] = row.split("|").map((part) => part.trim());
    assert.ok(id.match(REQUIREMENT_PATTERN), `Invalid requirement row: ${row}`);
    assert.ok(
      references === "Planned" || references.includes("`"),
      `${id} needs code references or Planned`
    );
  });
});

test("REQ traceability: requirements use concrete statuses, not Partial", () => {
  const markdown = readFileSync(requirementPath, "utf8");
  const rows = markdown
    .split("\n")
    .filter((line) => line.startsWith("| REQ-"));
  const allowedStatuses = new Set(["Works", "Missing", "Untested"]);

  rows.forEach((row) => {
    const [, id, , status] = row.split("|").map((part) => part.trim());
    assert.ok(
      allowedStatuses.has(status),
      `${id} must use Works, Missing, or Untested instead of ${status}`
    );
  });
});
