import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildOAuthRedirectUrl,
  buildSessionPayload,
  createOAuthCode,
  createOAuthState,
  getBearerToken,
  getRedirectTarget,
  getRefreshToken,
  isMobileClient,
  isVerifiedGoogleUser,
  MOBILE_REDIRECT_URI,
  normalizeGoogleEmail,
  parseAllowedRedirect,
} from "./auth.helpers.js";

const CLIENT_URL = "https://live-chat.example.com";

describe("parseAllowedRedirect", () => {
  it("accepts the exact web origin", () => {
    assert.equal(
      parseAllowedRedirect(CLIENT_URL, CLIENT_URL),
      "https://live-chat.example.com",
    );
    assert.equal(
      parseAllowedRedirect(`${CLIENT_URL}/`, CLIENT_URL),
      "https://live-chat.example.com",
    );
  });

  it("collapses web redirects to their origin", () => {
    assert.equal(
      parseAllowedRedirect(
        `${CLIENT_URL}/evil/path?next=//attacker.test`,
        CLIENT_URL,
      ),
      "https://live-chat.example.com",
    );
  });

  it("rejects subdomains, suffix tricks and protocol changes", () => {
    assert.equal(
      parseAllowedRedirect("https://evil.live-chat.example.com", CLIENT_URL),
      null,
    );
    assert.equal(
      parseAllowedRedirect(
        "https://live-chat.example.com.evil.test",
        CLIENT_URL,
      ),
      null,
    );
    assert.equal(
      parseAllowedRedirect("http://live-chat.example.com", CLIENT_URL),
      null,
    );
    assert.equal(
      parseAllowedRedirect(
        "https://live-chat.example.com@evil.test",
        CLIENT_URL,
      ),
      null,
    );
  });

  it("rejects non-string and malformed values", () => {
    assert.equal(parseAllowedRedirect(undefined, CLIENT_URL), null);
    assert.equal(parseAllowedRedirect("", CLIENT_URL), null);
    assert.equal(parseAllowedRedirect("/relative", CLIENT_URL), null);
    assert.equal(parseAllowedRedirect("not a url", CLIENT_URL), null);
  });

  it("accepts only the exact mobile callback", () => {
    assert.equal(
      parseAllowedRedirect(MOBILE_REDIRECT_URI, CLIENT_URL),
      MOBILE_REDIRECT_URI,
    );
    assert.equal(
      parseAllowedRedirect(`${MOBILE_REDIRECT_URI}/extra`, CLIENT_URL),
      null,
    );
    assert.equal(
      parseAllowedRedirect(`${MOBILE_REDIRECT_URI}?next=evil`, CLIENT_URL),
      null,
    );
    assert.equal(parseAllowedRedirect("livechat://evil", CLIENT_URL), null);
  });

  it("falls back to the web origin for missing redirects", () => {
    assert.equal(
      getRedirectTarget(undefined, CLIENT_URL),
      "https://live-chat.example.com",
    );
    assert.equal(
      getRedirectTarget("https://evil.test", CLIENT_URL),
      "https://live-chat.example.com",
    );
  });
});

describe("buildOAuthRedirectUrl", () => {
  it("sends web clients to the callback with a one-time code", () => {
    assert.equal(
      buildOAuthRedirectUrl("https://live-chat.example.com", "abc123"),
      "https://live-chat.example.com/auth/callback?code=abc123",
    );
  });

  it("sends native clients to the registered deep link with a code", () => {
    assert.equal(
      buildOAuthRedirectUrl(MOBILE_REDIRECT_URI, "a+b/c="),
      "livechat://auth/callback?code=a%2Bb%2Fc%3D",
    );
  });
});

describe("getBearerToken", () => {
  it("parses a bearer header case-insensitively", () => {
    assert.equal(getBearerToken("Bearer abc"), "abc");
    assert.equal(getBearerToken("bearer   abc"), "abc");
  });

  it("rejects malformed or missing headers", () => {
    assert.equal(getBearerToken(undefined), null);
    assert.equal(getBearerToken("Basic abc"), null);
    assert.equal(getBearerToken("Bearer"), null);
    assert.equal(getBearerToken("Bearer a b"), null);
  });
});

describe("getRefreshToken", () => {
  it("prefers the body token", () => {
    assert.equal(
      getRefreshToken({
        body: { refreshToken: "body-token" },
        headers: { authorization: "Bearer header-token" },
        cookies: { refreshToken: "cookie-token" },
      }),
      "body-token",
    );
  });

  it("prefers the cookie over an access token in the header", () => {
    assert.equal(
      getRefreshToken({
        headers: { authorization: "Bearer access-token" },
        cookies: { refreshToken: "cookie-token" },
      }),
      "cookie-token",
    );
  });

  it("falls back to the bearer token", () => {
    assert.equal(
      getRefreshToken({ headers: { authorization: "Bearer refresh-token" } }),
      "refresh-token",
    );
  });

  it("returns null when no token is present", () => {
    assert.equal(getRefreshToken({}), null);
  });
});

describe("isMobileClient", () => {
  it("recognises the X-Client header", () => {
    assert.equal(isMobileClient({ headers: { "x-client": "mobile" } }), true);
    assert.equal(isMobileClient({ headers: { "x-client": "MOBILE" } }), true);
  });

  it("recognises the body client field", () => {
    assert.equal(isMobileClient({ body: { client: "mobile" } }), true);
  });

  it("defaults to web", () => {
    assert.equal(isMobileClient({}), false);
    assert.equal(isMobileClient({ headers: { "x-client": "web" } }), false);
  });
});

describe("buildSessionPayload", () => {
  const session = {
    user: { id: "user-1", email: "user@example.com" },
    accessToken: "access-token",
    refreshToken: "refresh-token",
  };

  it("includes the refresh token for native clients", () => {
    assert.deepEqual(buildSessionPayload(session, true), {
      user: session.user,
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
  });

  it("omits the refresh token for web clients", () => {
    assert.deepEqual(buildSessionPayload(session, false), {
      user: session.user,
      accessToken: "access-token",
    });
    assert.equal(
      Object.hasOwn(buildSessionPayload(session, false), "refreshToken"),
      false,
    );
  });
});

describe("OAuth random values", () => {
  it("creates distinct URL-safe state values", () => {
    const first = createOAuthState();
    const second = createOAuthState();

    assert.match(first, /^[a-f0-9]{64}$/);
    assert.notEqual(first, second);
  });

  it("creates distinct URL-safe authorization codes", () => {
    const first = createOAuthCode();
    const second = createOAuthCode();

    assert.match(first, /^[A-Za-z0-9_-]+$/);
    assert.notEqual(first, second);
  });
});

describe("Google account validation", () => {
  it("requires verified_email to be strictly true", () => {
    assert.equal(
      isVerifiedGoogleUser({ email: "user@example.com", verified_email: true }),
      true,
    );
    assert.equal(
      isVerifiedGoogleUser({
        email: "user@example.com",
        verified_email: false,
      }),
      false,
    );
    assert.equal(
      isVerifiedGoogleUser({
        email: "user@example.com",
        verified_email: "true",
      }),
      false,
    );
    assert.equal(
      isVerifiedGoogleUser({ email: "", verified_email: true }),
      false,
    );
  });

  it("normalizes emails to lowercase", () => {
    assert.equal(
      normalizeGoogleEmail("  User@Example.COM "),
      "user@example.com",
    );
    assert.equal(normalizeGoogleEmail(undefined), "");
  });
});
