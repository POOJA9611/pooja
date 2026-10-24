import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function NotificationsList() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>;
  }

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card">
        <div className="card-title-row">
          <div>
            <h3 className="card-main-title">
              <i className="fa-regular fa-bell text-indigo mr-2"></i> Department Announcements & Deadlines
            </h3>
            <p className="card-subtitle">Official notifications delivered from the Head of Department</p>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-sm btn-subtle" onClick={handleMarkAllRead}>
              <i className="fa-solid fa-check-double mr-1"></i> Mark All as Read ({unreadCount})
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No announcements available for your account.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  border: n.is_read ? '1px solid var(--border-light)' : '1px solid var(--border-indigo)',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  backgroundColor: n.is_read ? '#fff' : '#EEF2FF',
                  boxShadow: n.is_read ? 'none' : 'var(--shadow-sm)',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!n.is_read && (
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-primary)'
                        }}
                      ></span>
                    )}
                    <span className="badge badge-indigo text-xs" style={{ textTransform: 'capitalize' }}>
                      Audience: {n.audience}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Posted by <strong>{n.posted_by_name}</strong>
                    </span>
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>

                <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                  {n.title}
                </h4>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                  {n.body}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  {n.deadline ? (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--color-amber)',
                        backgroundColor: 'var(--color-warning-light)',
                        padding: '4px 10px',
                        borderRadius: '6px'
                      }}
                    >
                      <i className="fa-regular fa-clock"></i>
                      <span>Submission Deadline: {new Date(n.deadline).toLocaleString()}</span>
                    </div>
                  ) : <div></div>}

                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fa-solid fa-check mr-1"></i> Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
