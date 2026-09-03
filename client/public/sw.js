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

  const title = data.title || "New message";
  const options = {
    body: data.body || "",
    data: { url: data.url || "/chats" },
  };

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const focused = windowClients.some((client) => client.focused);
      if (focused) return;
      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification?.data?.url || "/chats",
    self.location.origin
  ).href;

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client && client.url?.startsWith(self.location.origin)) {
          await client.focus();
          await client.navigate(targetUrl);
          return;
        }
      }

      await clients.openWindow(targetUrl);
    })()
  );
});