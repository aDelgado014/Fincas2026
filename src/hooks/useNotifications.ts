import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  createdAt: string;
  read: boolean;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/notifications/stream');

      eventSource.onmessage = (event) => {
        try {
          const notification: Notification = JSON.parse(event.data);
          setNotifications((prev) => [notification, ...prev].slice(0, 50));
        } catch {
          // Silently ignore parse errors
        }
      };

      eventSource.onerror = () => {
        // Silently close on error — SSE will not retry
        eventSource?.close();
      };
    } catch {
      // Silently ignore if SSE is not available
    }

    return () => {
      eventSource?.close();
    };
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return { notifications, unreadCount, markAllRead };
}
