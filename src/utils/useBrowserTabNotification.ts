import { useEffect } from 'react';

/**
 * useBrowserTabNotification Hook
 * Dynamically updates the browser tab title and favicon with a bright red notification dot
 * whenever unread shop messages or high-priority notifications are present.
 */
export function useBrowserTabNotification(unreadCount: number) {
  useEffect(() => {
    const baseTitle = 'The HUB - Everything Moving. Everyone Connected';

    // 1. Update the document title on the browser tab
    if (unreadCount > 0) {
      document.title = `🔴 (${unreadCount}) New Message - ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }

    // 2. Dynamically update the browser tab favicon icon with a crisp red dot indicator
    try {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.type = 'image/svg+xml';
        link.rel = 'shortcut icon';
        document.head.appendChild(link);
      }

      if (unreadCount > 0) {
        // SVG with navy background, blue wrench, and a bright red notification badge dot in the top-right corner
        const svgWithRedDot = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0f172a"/>
  <!-- Wrench tool icon -->
  <path d="M42 14c-4.4 0-8.2 2.6-9.9 6.4l-14.7 14.7c-2 2-2 5.1 0 7.1l1.4 1.4c2 2 5.1 2 7.1 0l14.7-14.7c3.8-1.7 6.4-5.5 6.4-9.9 0-1.2-.2-2.4-.6-3.4l-4.5 4.5-4.2-4.2 4.5-4.5c-1-.4-2.2-.6-3.4-.6z" fill="#38bdf8"/>
  <!-- Bright Red Notification Dot with white outline -->
  <circle cx="50" cy="14" r="11" fill="#ef4444" stroke="#ffffff" stroke-width="3"/>
</svg>`;
        link.href = `data:image/svg+xml,${encodeURIComponent(svgWithRedDot)}`;
      } else {
        // Standard clean favicon
        const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0f172a"/>
  <path d="M42 14c-4.4 0-8.2 2.6-9.9 6.4l-14.7 14.7c-2 2-2 5.1 0 7.1l1.4 1.4c2 2 5.1 2 7.1 0l14.7-14.7c3.8-1.7 6.4-5.5 6.4-9.9 0-1.2-.2-2.4-.6-3.4l-4.5 4.5-4.2-4.2 4.5-4.5c-1-.4-2.2-.6-3.4-.6z" fill="#38bdf8"/>
</svg>`;
        link.href = `data:image/svg+xml,${encodeURIComponent(defaultSvg)}`;
      }
    } catch {
      // Graceful fallback if DOM is not ready
    }
  }, [unreadCount]);
}
