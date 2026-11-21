self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const isCall = data.type === "call";
  const title = data.title || (isCall ? "Incoming call" : "New message");
  const options = {
    body: data.body || "",
    data: {
      url: data.url || "/chats",
      callId: data.callId || null,
      conversationId: data.conversationId || null,
      callType: data.callType || null,
    },
  };

  if (isCall) {
    options.tag = `call-${data.callId || "incoming"}`;
    options.renotify = true;
    options.requireInteraction = true;
    // No accept/decline actions: accepting a call from a notification would
    // bypass the in-app explicit tap (and there is no server-issued one-time
    // action token), so tapping simply opens the app.
  }

  event.waitUntil(
    (async () => {
      if (!isCall) {
        const windowClients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        const focused = windowClients.some((client) => client.focused);
        if (focused) return;
      }
      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification?.data || {};
  const targetUrl = new URL(data.url || "/chats", self.location.origin);

  // Never auto-accept/decline from a URL parameter; the user must tap the
  // in-app button so consent is explicit.
  const href = targetUrl.href;

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client && client.url?.startsWith(self.location.origin)) {
          await client.focus();
          await client.navigate(href);
          return;
        }
      }

      await clients.openWindow(href);
    })()
  );
});
