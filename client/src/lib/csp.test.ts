import { afterEach, describe, expect, it } from "vitest";

import { buildContentSecurityPolicy } from "./csp";

const ORIGINAL_ENV = {
  api: process.env.NEXT_PUBLIC_API_URL,
  socket: process.env.NEXT_PUBLIC_SOCKET_URL,
};

afterEach(() => {
  process.env.NEXT_PUBLIC_API_URL = ORIGINAL_ENV.api;
  process.env.NEXT_PUBLIC_SOCKET_URL = ORIGINAL_ENV.socket;
});

function directive(policy: string, name: string): string {
  return (
    policy
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name} `)) ?? ""
  );
}

describe("buildContentSecurityPolicy", () => {
  it("uses a nonce and strict-dynamic without unsafe-inline scripts", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/api";
    process.env.NEXT_PUBLIC_SOCKET_URL = "https://api.example.com";

    const policy = buildContentSecurityPolicy("test-nonce", false);
    const script = directive(policy, "script-src");

    expect(script).toContain("'nonce-test-nonce'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(directive(policy, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(policy, "object-src")).toBe("object-src 'none'");
  });

  it("allows the API, websocket, and R2 origins", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/api";
    process.env.NEXT_PUBLIC_SOCKET_URL = "https://api.example.com";

    const connect = directive(
      buildContentSecurityPolicy("nonce", false),
      "connect-src"
    );

    expect(connect).toContain("https://api.example.com");
    expect(connect).toContain("wss://api.example.com");
    expect(connect).toContain("https://*.r2.dev");
  });

  it("allows local HMR only in development", () => {
    const dev = buildContentSecurityPolicy("nonce", true);
    const prod = buildContentSecurityPolicy("nonce", false);

    expect(directive(dev, "connect-src")).toContain("ws://localhost:*");
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(prod, "connect-src")).not.toContain("ws://localhost:*");
    expect(directive(prod, "script-src")).not.toContain("'unsafe-eval'");
    expect(prod).toContain("upgrade-insecure-requests");
  });
});
