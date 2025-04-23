// src/components/Header.js
import React, { useState } from 'react';

function Header({ user, onLogout }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  return (
    <div className="header">
      <h1>System Management</h1>
      <div className="header-right">
        <i
          className="fas fa-bell notification-icon"
          onClick={() => setNotificationsOpen(!notificationsOpen)}
        ></i>
        {notificationsOpen && (
          <div className="notification-dropdown">
            {notifications.length === 0 ? (
              <div className="notification-empty">No notifications</div>
            ) : (
              <>
                {notifications.map((n, i) => (
                  <div key={i} className="notification-item">{n}</div>
                ))}
                <button
                  className="notification-clear"
                  onClick={() => setNotifications([])}
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        )}
        <div className="status-dot"></div>
        <span className="user-name">{user.email.split('@')[0]}</span>
        <i
          className="fas fa-sign-out-alt logout-icon"
          onClick={onLogout}
          title="Logout"
        ></i>
      </div>
    </div>
  );
}

export default Header;