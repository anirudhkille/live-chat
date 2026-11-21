import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  googleExchangeSchema,
  googleMobileLoginSchema,
  logoutSchema,
  refreshTokenSchema,
  updateProfileSchema,
  verifyLoginOtpSchema,
} from "./auth.schema.js";

describe("native client marker preservation", () => {
  it("keeps the client field for OTP verification", () => {
    const result = verifyLoginOtpSchema.safeParse({
      email: "user@example.com",
      otp: "123456",
      client: "mobile",
    });

    assert.equal(result.success, true);
    assert.equal(result.data.client, "mobile");
  });

  it("keeps the client field for Google mobile login", () => {
    const result = googleMobileLoginSchema.safeParse({
      idToken: "token",
      client: "mobile",
    });

    assert.equal(result.success, true);
    assert.equal(result.data.client, "mobile");
  });
});

describe("updateProfileSchema", () => {
  it("trims a valid name", () => {
    const result = updateProfileSchema.safeParse({ name: "  Ada Lovelace  " });

    assert.equal(result.success, true);
    assert.equal(result.data.name, "Ada Lovelace");
  });

  it("rejects non-string names instead of reaching Prisma", () => {
    for (const name of [123, null, undefined, {}, []]) {
      const result = updateProfileSchema.safeParse({ name });
      assert.equal(result.success, false);
    }
  });

  it("rejects empty and over-long names", () => {
    assert.equal(updateProfileSchema.safeParse({ name: "   " }).success, false);
    assert.equal(
      updateProfileSchema.safeParse({ name: "a".repeat(101) }).success,
      false,
    );
    assert.equal(
      updateProfileSchema.safeParse({ name: "a".repeat(100) }).success,
      true,
    );
  });
});

describe("refreshTokenSchema", () => {
  it("allows cookie-only refreshes", () => {
    assert.equal(refreshTokenSchema.safeParse({}).success, true);
    assert.equal(refreshTokenSchema.safeParse(undefined).success, true);
  });

  it("accepts and trims a body refresh token", () => {
    const result = refreshTokenSchema.safeParse({
      refreshToken: " token ",
      client: "mobile",
    });

    assert.equal(result.success, true);
    assert.equal(result.data.refreshToken, "token");
  });

  it("rejects blank or over-long refresh tokens", () => {
    assert.equal(
      refreshTokenSchema.safeParse({ refreshToken: "   " }).success,
      false,
    );
    assert.equal(
      refreshTokenSchema.safeParse({ refreshToken: "a".repeat(4097) }).success,
      false,
    );
  });
});

describe("logoutSchema", () => {
  it("allows cookie-only and body-token logouts", () => {
    assert.equal(logoutSchema.safeParse({}).success, true);
    assert.equal(logoutSchema.safeParse(undefined).success, true);
    assert.equal(
      logoutSchema.safeParse({ refreshToken: "token" }).success,
      true,
    );
  });
});

describe("googleExchangeSchema", () => {
  it("requires a non-empty authorization code", () => {
    assert.equal(googleExchangeSchema.safeParse({}).success, false);
    assert.equal(googleExchangeSchema.safeParse({ code: " " }).success, false);
    assert.equal(
      googleExchangeSchema.safeParse({ code: "abc", client: "mobile" }).success,
      true,
    );
  });
});
