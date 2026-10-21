import { describe, it, expect } from "vitest";
import { formatBlockName, formatUnitNumber, formatFullFlatLabel } from "./flatFormatter";

describe("flatFormatter", () => {
  it("formats block name cleanly without duplicate Block prefix", () => {
    expect(formatBlockName("Block - A")).toBe("Block - A");
    expect(formatBlockName("Block A")).toBe("Block A");
    expect(formatBlockName("Wing B")).toBe("Wing B");
    expect(formatBlockName("Tower 1")).toBe("Tower 1");
    expect(formatBlockName("A")).toBe("Block A");
    expect(formatBlockName("")).toBe("");
    expect(formatBlockName(null)).toBe("");
  });

  it("extracts pure unit number without duplicate block prefix", () => {
    expect(formatUnitNumber("Block - A-305", "Block - A")).toBe("305");
    expect(formatUnitNumber("Block A - 305", "Block A")).toBe("305");
    expect(formatUnitNumber("A-305", "Block - A")).toBe("305");
    expect(formatUnitNumber("Flat 305", "Block - A")).toBe("305");
    expect(formatUnitNumber("Unit: 305", "Block - A")).toBe("305");
    expect(formatUnitNumber("305", "Block - A")).toBe("305");
    expect(formatUnitNumber("502", "Tower 1")).toBe("502");
  });

  it("produces clean, non-repetitive full flat label", () => {
    // The exact case reported by user:
    const label = formatFullFlatLabel({
      block_name: "Block - A",
      floor_number: 3,
      flat_number: "Block - A-305",
    });
    expect(label).toBe("Block - A, Floor 3, Flat 305");
  });

  it("handles missing floor or block gracefully", () => {
    expect(
      formatFullFlatLabel({
        block_name: "Block B",
        floor_number: null,
        flat_number: "Block B-201",
      })
    ).toBe("Block B, Flat 201");

    expect(
      formatFullFlatLabel({
        block_name: "",
        floor_number: 5,
        flat_number: "502",
      })
    ).toBe("Floor 5, Flat 502");
  });
});
