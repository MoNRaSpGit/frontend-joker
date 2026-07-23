import { useEffect, useState } from "react";
import { fetchPublishedFrontendBuildMeta, FRONTEND_BUILD_INFO } from "../config/build";

const UPDATE_CHECK_INTERVAL_MS = 2 * 60 * 1000;
const APP_CACHE_PREFIX = "joker-";

export function AppUpdateNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD) {
      setShow(false);
      return;
    }

    let mounted = true;
    const checkForUpdates = async () => {
      try {
        const published = await fetchPublishedFrontendBuildMeta();
        if (!mounted) return;
        setShow(published.releaseSha !== FRONTEND_BUILD_INFO.releaseSha);
      } catch {
        if (mounted) {
          setShow(false);
        }
      }
    };

    void checkForUpdates();
    const intervalId = window.setInterval(() => {
      void checkForUpdates();
    }, UPDATE_CHECK_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdates();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, []);

  async function handleUpdate() {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const appBasePath = new URL(import.meta.env.BASE_URL, window.location.href).pathname;
        await Promise.all(
          registrations
            .filter((registration) => registration.scope.includes(appBasePath))
            .map((registration) => registration.unregister())
        );
      }

      if ("caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith(APP_CACHE_PREFIX)).map((key) => window.caches.delete(key)));
      }
    } catch {
      // If cleanup fails, still force a reload so the app can try again.
    } finally {
      window.location.reload();
    }
  }

  if (!show) {
    return null;
  }

  return (
    <aside style={noticeStyle}>
      <strong>Hay una version nueva disponible.</strong>
      <button type="button" onClick={handleUpdate} style={buttonStyle}>
        Actualizar
      </button>
    </aside>
  );
}

const noticeStyle: React.CSSProperties = {
  position: "fixed",
  left: 16,
  bottom: 16,
  zIndex: 30,
  padding: "12px 14px",
  borderRadius: 18,
  background: "#14213d",
  color: "#fff",
  display: "flex",
  gap: 12,
  alignItems: "center",
  boxShadow: "0 16px 30px rgba(0,0,0,0.16)"
};

const buttonStyle: React.CSSProperties = {
  minHeight: 36,
  padding: "0 12px",
  borderRadius: 999,
  border: "none",
  fontWeight: 800,
  cursor: "pointer"
};
