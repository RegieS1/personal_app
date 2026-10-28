// Local notifications. Goes through the service worker when there is one (Android Chrome only allows that),
// otherwise the plain Notification API. Silently does nothing without permission.
export async function notify(title: string, body: string, tag: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag, icon: "/icon.svg" });
    else new Notification(title, { body, tag, icon: "/icon.svg" });
  } catch {
    // notifications blocked by the browser: nothing else to do
  }
}

export async function requestNotifications() {
  if (typeof Notification === "undefined") return false;
  return (await Notification.requestPermission()) === "granted";
}
