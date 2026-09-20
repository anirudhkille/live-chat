import { describe, it, expect } from "vitest";

import { formatCallDuration } from "./datetime";

describe("formatCallDuration", () => {
  it("formats seconds as mm:ss", () => {
    expect(formatCallDuration(0)).toBe("0:00");
    expect(formatCallDuration(9)).toBe("0:09");
    expect(formatCallDuration(60)).toBe("1:00");
    expect(formatCallDuration(754)).toBe("12:34");
    expect(formatCallDuration(3600)).toBe("60:00");
  });

  it("clamps negative or fractional input", () => {
    expect(formatCallDuration(-5)).toBe("0:00");
    expect(formatCallDuration(61.9)).toBe("1:01");
  });
});
