import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clamp, average, round, chunk, formatCurrency, formatDate } from "./utils";

describe("clamp", () => {
  it("clamps below minimum", () => assert.equal(clamp(-5, 0, 100), 0));
  it("clamps above maximum", () => assert.equal(clamp(150, 0, 100), 100));
  it("passes through values in range", () => assert.equal(clamp(50, 0, 100), 50));
});

describe("average", () => {
  it("returns 0 for empty array", () => assert.equal(average([]), 0));
  it("computes correct average", () => assert.equal(average([10, 20, 30]), 20));
  it("handles single value", () => assert.equal(average([42]), 42));
});

describe("round", () => {
  it("rounds to 0 digits by default", () => assert.equal(round(3.7), 4));
  it("rounds to specified digits", () => assert.equal(round(3.456, 2), 3.46));
});

describe("chunk", () => {
  it("splits array into chunks", () => {
    const result = chunk([1, 2, 3, 4, 5], 2);
    assert.deepEqual(result, [[1, 2], [3, 4], [5]]);
  });
  it("returns empty for empty input", () => {
    assert.deepEqual(chunk([], 3), []);
  });
});

describe("formatCurrency", () => {
  it("formats USD", () => assert.equal(formatCurrency(42), "$42"));
  it("formats larger amounts", () => assert.equal(formatCurrency(1234), "$1,234"));
});

describe("formatDate", () => {
  it("returns Never for undefined", () => assert.equal(formatDate(undefined), "Never"));
  it("returns Never for null", () => assert.equal(formatDate(null), "Never"));
  it("formats a date string", () => {
    const result = formatDate("2026-01-15T12:00:00Z");
    assert.ok(result.includes("Jan") && result.includes("2026"));
  });
});
