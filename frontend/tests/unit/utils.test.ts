import { describe, it, expect } from "vitest";
import {
  cn,
  formatFileSize,
  formatPercent,
  getConfidenceBadgeClass,
  getStatusBadgeClass,
} from "@/lib/utils";

describe("Frontend Utilities", () => {
  it("merges tailwind class names properly", () => {
    expect(cn("bg-red-500", "p-4", { "text-white": true })).toContain("bg-red-500");
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("formats file sizes cleanly", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(1048576 * 3.5)).toBe("3.5 MB");
  });

  it("formats percentages correctly", () => {
    expect(formatPercent(74.2)).toBe("74%");
    expect(formatPercent(99.8)).toBe("100%");
  });

  it("returns appropriate badge classes for confidence levels", () => {
    expect(getConfidenceBadgeClass("high")).toContain("emerald");
    expect(getConfidenceBadgeClass("medium")).toContain("amber");
    expect(getConfidenceBadgeClass("low")).toContain("rose");
  });

  it("returns appropriate badge classes for statuses", () => {
    expect(getStatusBadgeClass("completed")).toContain("emerald");
    expect(getStatusBadgeClass("analyzing")).toContain("sky");
    expect(getStatusBadgeClass("failed")).toContain("rose");
  });
});
