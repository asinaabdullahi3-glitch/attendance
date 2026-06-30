import { createContext, useContext, useState } from 'react';
import styles from './Notification.module.css';

const NotificationContext = createContext({
  notify: {
    success: () => {},
    error: () => {},
    info: () => {},
  },
});

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = (id) => {
    setNotifications((prevNotifications) => prevNotifications.filter((n) => n.id !== id));
  };

  const toast = (type, title, message) => {
    const id = createId();
    setNotifications((prev) => [
      ...prev,
      { id, type, title, message, leaving: false },
    ]);

    window.setTimeout(() => {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, leaving: true } : notification
        )
      );
    }, 2500);

    window.setTimeout(() => removeNotification(id), 3000);
  };

  const notify = {
    success: (title, message) => toast('success', title, message),
    error: (title, message) => toast('error', title, message),
    info: (title, message) => toast('info', title, message),
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}

      <div className={styles.notificationContainer} aria-live="polite" aria-atomic="true">
        {notifications.map(({ id, type, title, message, leaving }) => (
          <div
            key={id}
            className={`${styles.notification} ${styles[type]} ${
              leaving ? styles.leaving : ''
            }`}
          >
            <div className={styles.notificationHeader}>
              <span className={styles.notificationTitle}>{title}</span>
            </div>
            <div className={styles.notificationMessage}>{message}</div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
