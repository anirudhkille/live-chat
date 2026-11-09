import { OAuth2Client } from "google-auth-library";

import { env } from "../../config/env.config.js";
import { AppError } from "../../utils/AppError.js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export const getGoogleAuthURL = (redirect) => {
  const safeRedirect =
    typeof redirect === "string" && redirect ? redirect : env.CLIENT_URL;
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state: encodeURIComponent(safeRedirect),
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};

export const getGoogleTokens = async (code) => {
  const params = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token exchange failed: ${error}`);
  }

  return response.json();
};

export const getGoogleUser = async (accessToken) => {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Google user");
  }

  return response.json();
};

export const verifyGoogleIdToken = async (idToken) => {
  let ticket;

  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
  } catch {
    throw new AppError(401, "Invalid Google token");
  }

  const payload = ticket.getPayload();

  if (!payload?.email || !payload.email_verified) {
    throw new AppError(401, "Google account email is not verified");
  }

  return {
    email: payload.email,
    name: payload.name,
    avatar: payload.picture,
  };
};
