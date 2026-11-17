# Live Chat — Mobile (Expo)

Expo (SDK 58) React Native client mirroring the web client features.

## Stack
- Expo Router (file-based routing in `src/app/`)
- Zustand (persisted via AsyncStorage)
- TanStack Query
- Axios (with refresh-token interceptor)
- socket.io-client

## Env
Create `.env` (or `app.config` extra) with:
```
EXPO_PUBLIC_API_URL=https://live-chat-api.anirudhkille.com/api
EXPO_PUBLIC_SOCKET_URL=https://live-chat-api.anirudhkille.com
```

## Structure
```
src/
  app/            # routes only
  features/       # feature modules (auth, conversations, users, calls, push-notifications)
  lib/            # api, env
  store/          # zustand stores
  types/          # shared types
```

## Run
```
npm install
npx expo start
```