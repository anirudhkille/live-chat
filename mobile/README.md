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

Optional TURN relay (needed on restrictive/mobile networks):
```
EXPO_PUBLIC_TURN_URL=turn:turn.example.com:3478
EXPO_PUBLIC_TURN_USERNAME=your-turn-username
EXPO_PUBLIC_TURN_CREDENTIAL=your-turn-password
```
Without TURN the app still uses public STUN servers, but calls can fail when
both peers are behind symmetric NAT or a restrictive firewall.

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

## OTA updates (EAS Update)

The app uses `expo-updates` with channel-based updates. The first build that
contains `expo-updates` must be installed once. After that, JavaScript/asset
changes can be published without reinstalling:

```
# Preview/internal testers
npm run ota:preview -- "describe the change"

# Production/Play Store build
npm run ota:production -- "describe the change"
```

Rules:
- OTA can update JS, styles, assets, and app config that does not add native code.
- Adding/upgrading a native module, changing permissions, or changing native SDKs
  requires a new native build (bump `expo.version` when native code changes so
  `runtimeVersion` stays compatible).
- `runtimeVersion` uses the `appVersion` policy, so OTA updates only reach builds
  with the same `version` in `app.json`.
- Preview and production builds are pinned to their matching update channel in
  `eas.json`; do not publish a preview update to the production channel.
