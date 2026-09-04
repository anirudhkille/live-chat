# Live Chat — Next.js frontend

Live chat frontend built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4,
TanStack React Query, Zustand, and Socket.IO client. Backend lives in `../server`
(Express + Prisma). See the root `README.md` for the full-stack setup.

## Getting started

```bash
npm install
# create client/.env.local with the variables below
npm run dev                  # http://localhost:3000
```

## Environment variables

| Variable              | Purpose                                         |
| --------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | REST base URL, e.g. `http://localhost:8080/api` |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO URL, e.g. `http://localhost:8080`   |

> Add `http://localhost:3000` to `ALLOWED_ORIGNS` and set
> `CLIENT_URL=http://localhost:3000` in `server/.env`, otherwise CORS and the
> Google callback redirect will not point at this app.

## Routes

| Route                     | Description                           |
| ------------------------- | ------------------------------------- |
| `/`                       | Landing page                          |
| `/login`                  | Email OTP sign-in (+ Google)          |
| `/verify-email?email=`    | OTP verification                      |
| `/complete-profile`       | Name setup after first login          |
| `/auth/callback`          | Google OAuth callback handler         |
| `/chats`                  | Protected shell: sidebar + chat pane  |
| `/chats/new`              | Search users and start a conversation |
| `/chats/[conversationId]` | Message thread                        |
| `/search`                 | People search                         |
| `/settings`               | Account, theme toggle, logout         |
| `/settings/profile`       | Edit name + avatar (crop & upload)    |
| `/settings/notifications` | Notifications, web push toggle        |

## Structure

```
src/
├── app/                 # App Router pages ((auth) group, protected (app) group)
├── components/
│   ├── ui/              # Primitives: button, input, card, avatar, spinner, …
│   └── theme-toggle.tsx
├── layout/              # Sidebar, BottomNav, ProtectedRoute (auth gate)
├── features/
│   ├── auth/            # schemas/, api/, hooks/, components/ for the auth flow
│   ├── conversations/   # api/, hooks/, components/ (list, thread, input, typing, bubble)
│   ├── users/           # api/, hooks/ (search, avatar upload)
│   ├── notifications/   # api/, hooks/
│   └── settings/        # api/, hooks/, components/ (profile update, avatar crop)
├── hooks/               # use-auth, use-logout, use-media-query
├── lib/                 # env, api (axios + refresh queue), socket, crop-image, utils
├── store/               # zustand: auth (persisted), chat (drafts, typing, active)
└── types/               # shared API types + normalizers
```

**Feature pattern:** each feature owns its API functions
(`features/<x>/api/`), React Query hooks (`features/<x>/hooks/`) and components
(`features/<x>/components/`), keeping data-fetching self-contained.

## Auth flow (matches `server/src/modules/auth`)

1. `POST /auth/send-login-otp` — email OTP
2. `POST /auth/verify-login-otp` — returns `{ user, accessToken }`; the server
   also sets an httpOnly `refreshToken` cookie (`withCredentials: true`)
3. Access token is kept in a persisted Zustand store and attached as a
   `Bearer` header by the axios request interceptor (`src/lib/api.ts`)
4. On 401/403 the response interceptor queues requests, calls
   `GET /auth/refresh`, stores the rotated access token, and replays them
5. Google: `GET /auth/google` → callback redirects to `/auth/callback`
   with `accessToken` + `user` query params

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm start` — production build & serve
- `npm run lint` — ESLint
