# Live Chat — Next.js frontend

Live chat frontend built with Next.js App Router, TypeScript, Tailwind CSS v4,
TanStack React Query, Zustand, and Socket.IO client.

## Getting started

```bash
npm install
cp .env.example .env.local   # adjust URLs to point at your API
npm run dev                  # http://localhost:3000
```

## Environment variables

| Variable              | Purpose                                                            |
| --------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL` | REST base URL, e.g. `http://localhost:8080/api`                    |
| `NEXT_PUBLIC_WS_URL`  | Socket.IO URL. Empty = socket layer stays dormant (no backend yet) |

> Server-side note: add `http://localhost:3000` to `ALLOWED_ORIGNS` and set
> `CLIENT_URL=http://localhost:3000` in `server/.env`, otherwise CORS and the
> Google callback redirect will still point at the old Vite dev server.

## Auth flow (matches `server/src/modules/auth`)

1. `POST /auth/send-login-otp` — email OTP
2. `POST /auth/verify-login-otp` — returns `{ user, accessToken }`; the server
   also sets an httpOnly `refreshToken` cookie (`withCredentials: true`)
3. Access token is kept in a persisted Zustand store and attached as a
   `Bearer` header by the axios request interceptor (`src/lib/api/client.ts`)
4. On 401/403 the response interceptor queues requests, calls
   `GET /auth/refresh`, stores the rotated access token, and replays them
5. Google: `GET /auth/google` → callback redirects to `/auth/callback`
   with `accessToken` + `user` query params

## Routes

| Route                     | Description                             |
| ------------------------- | --------------------------------------- |
| `/`                       | Landing page                            |
| `/login`                  | Email OTP sign-in (+ Google)            |
| `/verify-email?email=`    | OTP verification                        |
| `/complete-profile`       | Name setup after first login            |
| `/auth/callback`          | Google OAuth callback handler           |
| `/chats`                  | Protected shell: sidebar + chat pane    |
| `/chats/new`              | New chat placeholder                    |
| `/chats/[conversationId]` | Thread placeholder (awaiting chat APIs) |
| `/search`                 | Search placeholder                      |
| `/settings`               | Account overview, theme toggle, logout  |
| `/settings/profile`       | Edit name via `PATCH /auth/profile`     |

## Structure

```
src/
├── app/                 # App Router pages ((auth) group, (app) protected group)
├── components/
│   ├── ui/              # Primitives (button, input, card, input-otp, …)
│   ├── layout/          # Sidebar, BottomNav
│   └── auth/            # ProtectedRoute guard
├── features/
│   ├── auth/            # Forms + mutation hooks for the auth flow
│   └── settings/        # Profile update hook
├── hooks/               # use-auth, use-socket, use-logout, use-media-query
├── lib/
│   ├── api/             # axios singleton + typed endpoint functions
│   ├── socket/          # Socket.IO singleton + event-name contract
│   └── utils.ts         # cn()
├── schemas/             # zod schemas (types inferred from these)
├── store/               # zustand: auth (persisted), socket status
└── types/               # shared API types/helpers
```

## Chat integration status

Auth is fully wired to the live backend. Conversation/message REST endpoints
and the websocket server don't exist on the backend yet, so the chat, new-chat,
and search screens render honest empty states. The socket singleton
(`src/lib/socket/socket.ts`), event-name contract (`events.ts`), and React
Query provider are already in place — when the backend ships:

1. Add typed functions in `src/lib/api/` for the new endpoints
2. Bind listeners in a feature hook via `useSocket()`
3. Invalidate/patch React Query caches from those listeners

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm start` — production build & serve
- `npm run lint` — ESLint
