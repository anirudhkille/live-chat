# Live Chat

A full-stack chat application.

| Part       | Stack                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| `client/`  | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4       |
| `server/`  | Express + Prisma (PostgreSQL) + Redis + Socket.IO + Cloudflare R2       |

## Getting started

Prerequisites: Node 20+, a PostgreSQL database, Redis, and a Cloudflare R2
bucket (for avatar uploads).

### 1. Server

```bash
cd server
npm install
cp .env.example .env    # fill in the values (see table below)
npx prisma db push      # sync the schema to your database
npx prisma generate     # generate the Prisma client
npm run dev             # http://localhost:8080
```

### 2. Client

```bash
cd client
npm install
cp .env.example .env.local   # point NEXT_PUBLIC_API_URL at your server
npm run dev                  # http://localhost:3000
```

Make sure `http://localhost:3000` is in `ALLOWED_ORIGNS` and
`CLIENT_URL=http://localhost:3000` in `server/.env`, otherwise CORS and the
Google sign-in redirect will not work.

## Environment variables

### Server (`server/.env`)

| Variable                 | Purpose                                        |
| ------------------------ | ---------------------------------------------- |
| `PORT`                   | API port (default `8080`)                      |
| `DATABASE_URL`           | PostgreSQL connection string                   |
| `ALLOWED_ORIGNS`         | Comma-separated CORS origins (e.g. the client) |
| `REDIS_HOST`, `REDIS_PORT` | Redis for OTP cache                            |
| `JWT_ACCESS_SECRET`      | Signs access tokens                            |
| `JWT_REFRESH_SECRET`     | Signs refresh tokens                           |
| `GOOGLE_CLIENT_ID`       | Google OAuth client id                         |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth client secret                     |
| `GOOGLE_CALLBACK_URL`    | Google OAuth redirect URL                      |
| `CLIENT_URL`             | Frontend origin for OAuth redirects            |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_EMAIL`, `SMTP_PASSWORD` | Email delivery for OTPs   |
| `R2_ACCOUNT_ID`          | Cloudflare R2 account id                       |
| `R2_ACCESS_KEY_ID`       | R2 API token (edit)                            |
| `R2_SECRET_ACCESS_KEY`   | R2 API secret                                  |
| `R2_BUCKET`              | R2 bucket used for avatars                     |
| `R2_PUBLIC_URL`          | Public base URL of the bucket (e.g. `https://pub-<id>.r2.dev`) |

### Client (`client/.env.local`)

| Variable              | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_API_URL` | REST base URL, e.g. `http://localhost:8080/api` |
| `NEXT_PUBLIC_WS_URL`  | Socket.IO URL (falls back to API host)     |

## API overview

Responses use the envelope `{ success, message, data }`. All routes except the
public auth ones require a `Bearer` access token.

### Auth (`/api/auth`)

| Method | Path                 | Description                                  |
| ------ | -------------------- | -------------------------------------------- |
| POST   | `/send-login-otp`    | Sends an OTP to the email                    |
| POST   | `/verify-login-otp`  | Verifies OTP → `{ user, accessToken }` + httpOnly `refreshToken` cookie |
| GET    | `/refresh`           | Rotates the refresh cookie → new `accessToken` |
| POST   | `/logout`            | Clears the refresh cookie                    |
| PATCH  | `/profile`           | Updates the current user's name              |
| GET    | `/google`            | Redirects to Google OAuth                    |
| GET    | `/google/callback`   | OAuth callback → redirects to client with `accessToken` + `user` |

### Users (`/api/user`)

| Method | Path            | Description                                  |
| ------ | --------------- | -------------------------------------------- |
| GET    | `/search`       | Search users by name/email (`search`, `page`, `limit`) |
| POST   | `/me/avatar-url`| Returns a presigned R2 upload URL + `key` (`{ contentType }`) |
| POST   | `/me/avatar`    | Confirms upload, updates avatar (`{ key }`)  |

### Conversations (`/api/conversation`)

| Method | Path  | Description                        |
| ------ | ----- | ---------------------------------- |
| POST   | `/`   | Create a conversation (`{ userId }`) |
| GET    | `/`   | List the user's conversations      |
| GET    | `/:id`| Get one conversation               |

### Messages (`/api/message`)

| Method | Path        | Description                          |
| ------ | ----------- | ------------------------------------ |
| GET    | `/:conversationId` | Messages for a conversation    |
| POST   | `/:conversationId` | Send a message (`{ content }`) |

## Client structure

```
client/src/
├── app/                    # App Router pages ((auth) group, protected (app) group)
├── components/
│   ├── ui/                 # Primitives: button, input, card, avatar, spinner, …
│   └── theme-toggle.tsx
├── layout/                 # Sidebar, BottomNav, ProtectedRoute (auth gate)
├── features/
│   ├── auth/               # schemas/, api/, hooks/, components/ for login/OTP flow
│   ├── conversations/      # api/, hooks/, components/ (list, thread, input, typing, bubble)
│   ├── users/              # api/, hooks/ (search, avatar upload)
│   ├── notifications/      # api/, hooks/
│   └── settings/           # api/, hooks/, components/ (profile update, avatar crop dialog)
├── hooks/                  # use-auth, use-logout, use-media-query
├── lib/                    # env, api (axios + refresh queue), socket, crop-image, utils
├── store/                  # zustand: auth (persisted), chat (drafts, typing, active chat)
└── types/                  # shared API types + normalizers
```

**Feature pattern:** each feature owns its API functions (`features/<x>/api/`),
React Query hooks (`features/<x>/hooks/`) and components
(`features/<x>/components/`), so swapping mock data for real endpoints or vice
versa stays contained.

### Client auth flow

1. `POST /auth/send-login-otp` — email OTP
2. `POST /auth/verify-login-otp` — returns `{ user, accessToken }`; the server
   sets an httpOnly `refreshToken` cookie (`withCredentials: true`)
3. Access token lives in a persisted Zustand store and is attached as a
   `Bearer` header by the axios request interceptor (`lib/api.ts`)
4. On 401/403 the response interceptor queues requests, calls `GET /auth/refresh`,
   stores the rotated access token, and replays them
5. Google: `GET /auth/google` → callback → `/auth/callback?accessToken=…&user=…`

### Avatar upload flow

1. Profile page opens a crop dialog (`react-easy-crop`); applying produces a
   square JPEG blob via `getCroppedAvatarBlob`
2. `POST /user/me/avatar-url` → presigned R2 `uploadUrl` + `key`
3. The blob is `PUT` straight to `uploadUrl` (plain `fetch`, no auth headers)
4. `POST /user/me/avatar` confirms the `key` → user's `avatar` is persisted and
   returned

## Server structure

```
server/src/
├── app.js                 # Express app wiring (cors, cookie-parser, routes)
├── server.js              # HTTP + Socket.IO bootstrap
├── generated/prisma/      # Generated Prisma client (run `npx prisma generate`)
├── config/                # env validation, prisma, redis, r2, mail, logger
├── middleware/            # auth (JWT), validate (zod), error handler
├── modules/
│   ├── auth/              # OTP + Google login, tokens, profile
│   ├── user/              # search, avatar presigned-URL flow
│   ├── conversation/      # conversations (groups/DMs by participants)
│   ├── message/           # messages
│   └── storage/           # R2 presigned URL helpers
├── templates/             # OTP email template
└── utils/                 # jwt, otp, email, response envelope, errors
```

## Scripts

### Server (`server/`)

- `npm run dev` — nodemon + `server.js`
- `npm run build` — runs `prisma generate`
- `npm run lint` / `npm run format` — ESLint / Prettier

### Client (`client/`)

- `npm run dev` — development server
- `npm run build` — production build (type-checks)
- `npm run lint` — ESLint