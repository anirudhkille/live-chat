import { randomBytes } from "node:crypto";

export const MOBILE_REDIRECT_URI = "livechat://auth/callback";

export const OAUTH_STATE_TTL_SECONDS = 10 * 60;
export const OAUTH_CODE_TTL_SECONDS = 60;

const isNonEmptyString = (value) =>
  typeof value === "string" && value.length > 0;

export const getWebOrigin = (clientUrl) => {
  if (!isNonEmptyString(clientUrl)) return null;

  try {
    return new URL(clientUrl).origin;
  } catch {
    return null;
  }
};

/**
 * Returns the exact redirect target that may be used after OAuth, or null.
 *
 * Web redirects are reduced to their origin so paths, query strings and
 * fragments cannot be used to smuggle a different destination. The mobile
 * redirect must match the registered deep link exactly.
 */
export const parseAllowedRedirect = (redirect, clientUrl) => {
  if (!isNonEmptyString(redirect)) return null;

  if (redirect === MOBILE_REDIRECT_URI) {
    return MOBILE_REDIRECT_URI;
  }

  const clientOrigin = getWebOrigin(clientUrl);
  if (!clientOrigin) return null;

  let parsed;
  try {
    parsed = new URL(redirect);
  } catch {
    return null;
  }

  if (parsed.origin !== clientOrigin) return null;

  return parsed.origin;
};

export const getRedirectTarget = (redirect, clientUrl) =>
  parseAllowedRedirect(redirect, clientUrl) ?? getWebOrigin(clientUrl);

export const buildOAuthRedirectUrl = (redirect, code) => {
  if (redirect === MOBILE_REDIRECT_URI) {
    return `${MOBILE_REDIRECT_URI}?code=${encodeURIComponent(code)}`;
  }

  return `${redirect}/auth/callback?code=${encodeURIComponent(code)}`;
};

export const createOAuthState = () => randomBytes(32).toString("hex");

export const createOAuthCode = () => randomBytes(32).toString("base64url");

export const getBearerToken = (authorization) => {
  if (typeof authorization !== "string") return null;

  const [scheme, token, ...rest] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || rest.length > 0) {
    return null;
  }

  return token;
};

/**
 * Refresh tokens may arrive in the request body (native), the httpOnly cookie
 * (web) or an Authorization bearer header. Body and cookie take precedence over
 * the header so a normal access token attached by an HTTP interceptor cannot
 * shadow the real refresh token.
 */
export const getRefreshToken = ({ body, headers, cookies } = {}) => {
  const bodyToken = body?.refreshToken;
  if (isNonEmptyString(bodyToken)) return bodyToken;

  const cookieToken = cookies?.refreshToken;
  if (isNonEmptyString(cookieToken)) return cookieToken;

  return getBearerToken(headers?.authorization);
};

export const isMobileClient = ({ body, headers } = {}) => {
  const clientHeader = headers?.["x-client"];
  if (
    typeof clientHeader === "string" &&
    clientHeader.toLowerCase() === "mobile"
  ) {
    return true;
  }

  return body?.client === "mobile";
};

/**
 * Session responses only include the refresh token for native clients. Web
 * clients receive it as an httpOnly cookie instead.
 */
export const buildSessionPayload = (session, mobile) => {
  const payload = {
    user: session.user,
    accessToken: session.accessToken,
  };

  if (mobile) {
    payload.refreshToken = session.refreshToken;
  }

  return payload;
};

export const normalizeGoogleEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

export const isVerifiedGoogleUser = (googleUser) =>
  Boolean(googleUser) &&
  isNonEmptyString(normalizeGoogleEmail(googleUser.email)) &&
  googleUser.verified_email === true;
