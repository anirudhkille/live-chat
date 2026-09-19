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
    options.actions = [
      { action: "accept", title: "Accept" },
      { action: "decline", title: "Decline" },
    ];
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

  if (data.callId && event.action === "accept") {
    targetUrl.searchParams.set("accept-call", data.callId);
  } else if (data.callId && event.action === "decline") {
    targetUrl.searchParams.set("decline-call", data.callId);
  }

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
