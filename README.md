# Live Chat

A full-stack real-time chat application with OTP and Google authentication, direct and group conversations, typing indicators, read receipts, message reactions and replies, attachments, web push notifications, and avatar/photo uploads via Cloudflare R2.

## Tech Stack

| Part      | Stack                                                              |
| --------- | ------------------------------------------------------------------- |
| `client/` | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · React Query · Zustand |
| `server/` | Express · Prisma (PostgreSQL) · Redis · Socket.IO · Cloudflare R2   |

## Features

- 📧 Email OTP login and Google OAuth (passwordless)
- 💬 Real-time messaging via Socket.IO
- 👥 Direct and group conversations
- ✍️ Typing indicators and read receipts
- 😀 Message reactions and inline replies
- 🖼️ Photo & file sharing (Cloudflare R2, presigned URLs)
- 🔔 Web push notifications via VAPID
- 🟢 Online / presence status
- 🔐 JWT access + refresh token auth with automatic rotation

## Prerequisites

- Node.js 20+
- A PostgreSQL database
- A Redis instance
- A Cloudflare R2 bucket (for avatars, conversation photos, and message attachments)
- An SMTP provider (for sending OTP emails)
- A VAPID key pair (for web push — generate via `npx web-push generate-vapid-keys`)

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/anirudhkille/live-chat.git
cd live-chat
```

### 2. Server setup

```bash
cd server
npm install
# create server/.env with the variables in the table below
node_modules/.bin/prisma db push   # sync the schema to your database
node_modules/.bin/prisma generate  # generate the Prisma client
npm run dev                        # http://localhost:8080
```

### 3. Client setup

```bash
cd client
npm install
# create client/.env.local with NEXT_PUBLIC_API_URL pointing at your server
npm run dev                  # http://localhost:3000
```

> **Note:** Make sure `http://localhost:3000` is included in `ALLOWED_ORIGNS` and that `CLIENT_URL=http://localhost:3000` is set in `server/.env` — otherwise CORS and the Google sign-in redirect will fail.

## Environment Variables

### Server (`server/.env`)

| Variable                                                | Purpose                                             |
| -------------------------------------------------------- | ---------------------------------------------------- |
| `PORT`                                                   | API port (default `8080`)                           |
| `DATABASE_URL`                                           | PostgreSQL connection string                        |
| `ALLOWED_ORIGNS`                                        | Comma-separated CORS origins (e.g. the client URL)   |
| `REDIS_URL`                                             | Redis connection string, used for OTP caching        |
| `JWT_ACCESS_SECRET`                                       | Signs access tokens                                  |
| `JWT_REFRESH_SECRET`                                      | Signs refresh tokens                                 |
| `GOOGLE_CLIENT_ID`                                        | Google OAuth client ID                               |
| `GOOGLE_CLIENT_SECRET`                                    | Google OAuth client secret                           |
| `GOOGLE_CALLBACK_URL`                                     | Google OAuth redirect URL                            |
| `CLIENT_URL`                                              | Frontend origin, used for OAuth redirects            |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_EMAIL`, `SMTP_PASSWORD`   | SMTP credentials for sending OTP emails               |
| `R2_ACCOUNT_ID`                                            | Cloudflare R2 account ID                             |
| `R2_ACCESS_KEY_ID`                                         | R2 API access key                                    |
| `R2_SECRET_ACCESS_KEY`                                     | R2 API secret key                                    |
| `R2_BUCKET`                                                | R2 bucket used for avatars, conversation photos, and message attachments |
| `R2_PUBLIC_URL`                                            | Public base URL of the bucket (e.g. `https://pub-<id>.r2.dev` or a custom domain) |
| `VAPID_SUBJECT`                                            | Email/URL for the web-push VAPID key                   |
| `VAPID_PUBLIC_KEY`                                         | VAPID public key (base64url) for web push              |
| `VAPID_PRIVATE_KEY`                                        | VAPID private key (base64url) for web push             |

### Client (`client/.env.local`)

| Variable              | Purpose                                          |
| ---------------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`    | REST base URL, e.g. `http://localhost:8080/api`     |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO URL, e.g. `http://localhost:8080`       |

## API Overview

All responses use the envelope `{ success, message, data }`. Every route except the public auth endpoints requires a `Bearer` access token.

### Auth — `/api/auth`

| Method | Path                | Description                                                                 |
| ------ | -------------------- | ----------------------------------------------------------------------------- |
| POST   | `/send-login-otp`    | Sends an OTP to the given email                                              |
| POST   | `/verify-login-otp`  | Verifies the OTP → returns `{ user, accessToken }` and sets an httpOnly `refreshToken` cookie |
| GET    | `/refresh`           | Rotates the refresh cookie → returns a new `accessToken`                     |
| POST   | `/logout`            | Clears the refresh cookie                                                    |
| PATCH  | `/profile`           | Updates the current user's name                                              |
| GET    | `/google`            | Redirects to Google OAuth                                                    |
| GET    | `/google/callback`   | OAuth callback → redirects to the client with `accessToken` and `user`       |

### Users — `/api/user`

| Method | Path              | Description                                                          |
| ------ | ------------------ | ------------------------------------------------------------------------ |
| GET    | `/search`          | Search users by name/email — query params `search`, `page`, `limit`      |
| POST   | `/me/avatar-url`   | Returns a presigned R2 upload URL and `key` — body `{ contentType }`     |
| POST   | `/me/avatar`       | Confirms the upload and updates the avatar — body `{ key }`              |

### Conversations — `/api/conversation`

| Method | Path                     | Description                                    |
| ------ | ------------------------ | ------------------------------------------------- |
| POST   | `/`                      | Create/get a direct conversation — body `{ userId }` |
| GET    | `/`                      | List the current user's conversations           |
| POST   | `/group`                 | Create a group — body `{ name, participantIds }` |
| GET    | `/:id`                   | Get a single conversation                         |
| GET    | `/:id/participants`      | List a group's participants                       |
| POST   | `/:id/participants`      | Add participants to a group                       |

### Messages — `/api/message`

| Method | Path                       | Description                                    |
| ------ | -------------------------- | ------------------------------------------------- |
| GET    | `/:conversationId`         | List messages for a conversation                 |
| POST   | `/:conversationId`         | Send a message — body `{ content, attachmentIds, replyToId }` |
| PATCH  | `/:messageId`              | Edit a message                                   |
| DELETE | `/:messageId`              | Delete a message                                 |
| POST   | `/read/:conversationId`    | Mark messages as read                            |
| POST   | `/:messageId/reactions`    | Toggle an emoji reaction — body `{ emoji }`      |

### Attachments — `/api/attachment`

| Method | Path           | Description                                                        |
| ------ | -------------- | -------------------------------------------------------------------- |
| POST   | `/upload-url`  | Returns a presigned R2 upload URL — body `{ contentType, fileName, fileSize }` |
| POST   | `/`            | Confirms an upload and creates the attachment — body `{ key, … }`    |

### Push — `/api/push`

| Method | Path           | Description                                                |
| ------ | -------------- | ------------------------------------------------------------ |
| GET    | `/vapid-key`   | Returns the VAPID public key                                |
| POST   | `/subscribe`   | Saves a push subscription — body `{ endpoint, keys }`        |
| POST   | `/unsubscribe` | Removes a push subscription — body `{ endpoint }`            |

## Client Structure

```
client/src/
├── app/                    # App Router pages ((auth) group, protected (app) group)
├── components/
│   ├── ui/                 # Primitives: button, input, card, avatar, spinner, …
│   └── theme-toggle.tsx
├── layout/                 # Sidebar, BottomNav, ProtectedRoute (auth gate)
├── features/
│   ├── auth/                # schemas/, api/, hooks/, components/ for login/OTP flow
│   ├── conversations/       # api/, hooks/, components/ (list, thread, input, typing, bubble)
│   ├── attachments/         # api/, hooks/ (message photo/file upload)
│   ├── push-notifications/  # api/, hooks/ (web-push subscribe/unsubscribe)
│   ├── users/               # api/, hooks/ (search, avatar upload)
│   └── settings/            # api/, hooks/, components/ (profile update, avatar crop dialog)
├── hooks/                   # use-auth, use-logout, use-media-query
├── lib/                      # env, api (axios + refresh queue), socket, crop-image, utils
├── store/                    # zustand: auth (persisted), chat (drafts, typing, active chat)
└── types/                    # shared API types + normalizers
```

**Feature pattern:** each feature owns its API functions (`features/<x>/api/`), React Query hooks (`features/<x>/hooks/`), and components (`features/<x>/components/`), keeping the boundary between mock data and real endpoints contained to one place.

### Client auth flow

1. `POST /auth/send-login-otp` — sends an email OTP
2. `POST /auth/verify-login-otp` — returns `{ user, accessToken }`; the server sets an httpOnly `refreshToken` cookie (requests use `withCredentials: true`)
3. The access token lives in a persisted Zustand store and is attached as a `Bearer` header by the axios request interceptor (`lib/api.ts`)
4. On a `401`/`403`, the response interceptor queues in-flight requests, calls `GET /auth/refresh`, stores the rotated access token, and replays the queued requests
5. **Google sign-in:** `GET /auth/google` → Google OAuth → callback → redirects to `/auth/callback?accessToken=…&user=…`

### Avatar upload flow

1. The profile page opens a crop dialog (`react-easy-crop`); applying the crop produces a square JPEG blob via `getCroppedAvatarBlob`
2. `POST /user/me/avatar-url` returns a presigned R2 `uploadUrl` and `key`
3. The blob is `PUT` directly to `uploadUrl` (plain `fetch`, no auth headers needed — R2 validates via the presigned signature)
4. `POST /user/me/avatar` confirms the `key`, and the updated `avatar` URL is persisted and returned

## Server Structure

```
server/src/
├── app.js                  # Express app wiring (cors, cookie-parser, routes)
├── server.js                # HTTP + Socket.IO bootstrap
├── generated/prisma/        # Generated Prisma client (run `node_modules/.bin/prisma generate`)
├── config/                   # env validation, prisma, redis, r2, mail, logger
├── middleware/                # auth (JWT), validate (zod), error handler
├── modules/
│   ├── auth/                 # OTP + Google login, tokens, profile
│   ├── user/                  # search, avatar presigned-URL flow
│   ├── conversation/          # conversations (groups/DMs by participants)
│   ├── message/               # messages, reactions, read receipts
│   ├── attachment/            # message photo/file uploads
│   ├── push/                  # web-push subscriptions + VAPID
│   └── storage/               # R2 presigned URL helpers
├── templates/                 # OTP email template
└── utils/                      # jwt, otp, email, response envelope, errors
```

## Scripts

### Server (`server/`)

| Command          | Description                       |
| ------------------ | ------------------------------------ |
| `npm run dev`     | Start with nodemon (`server.js`)   |
| `npm run build`   | Run `prisma generate`               |
| `npm run lint`     | Run ESLint                          |
| `npm run format`   | Run Prettier                        |

### Client (`client/`)

| Command          | Description                              |
| ------------------ | ------------------------------------------- |
| `npm run dev`     | Start the development server               |
| `npm run build`   | Production build (includes type-checking)  |
| `npm run lint`     | Run ESLint                                 |

## License

ISC © [Anirudh Kille](https://github.com/anirudhkille)