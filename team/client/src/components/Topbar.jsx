import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

export default function Topbar({ activeView, setActiveView, toggleMobileNav }) {
  const { user, switchDemoAccount, logout } = useAuth();
  const { latestNotification, clearLatestNotification } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Fetch notifications to keep unread count updated
  const fetchNotifs = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications in topbar:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifs();
    }
  }, [user, activeView]);

  // Update when real-time notification arrives
  useEffect(() => {
    if (latestNotification) {
      fetchNotifs();
    }
  }, [latestNotification]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const getPageTitle = () => {
    const titles = {
      dashboard: `${user?.role === 'hod' ? 'HOD Executive' : user?.role === 'faculty' ? 'Faculty Mentor' : 'Student'} Dashboard`,
      assignments: 'Faculty Mentorship & Student Workload Assignments',
      'change-requests': 'Faculty Change Requests Inbox',
      directory: 'Department Student & Faculty Directory',
      'post-notification': 'Broadcast Department Notification',
      'my-students': 'Assigned Students & Project Monitoring',
      'faculty-teams': 'Manage Teams & Capstone Formations',
      'faculty-chat': 'Team Group Chat & Mentorship Channels',
      'faculty-profile': 'Faculty Academic Profile & Skills',
      'student-profile': 'Student Portfolio & Academic Projects',
      'project-teams': 'Capstone Project Teams & Collaboration',
      'student-chat': 'My Team & Faculty Mentor Chat',
      'hod-team-requests': 'Project Team Proposals & Mentor Assignment',
      'faculty-directory': 'Browse Department Faculty Mentors',
      'change-request': 'Request Faculty Mentor Change',
      notifications: 'Department Announcements & Deadlines'
    };
    return titles[activeView] || 'Academic Portal';
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="btn-hamburger"
          onClick={toggleMobileNav}
          title="Toggle Navigation"
          style={{ cursor: 'pointer' }}
        >
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="topbar-title-block">
          <h2 className="topbar-title">{getPageTitle()}</h2>
          <div className="topbar-breadcrumb">
            <i className="fa-solid fa-house text-xs"></i> <span>/</span> <span>{user?.role}</span> <span>/</span> <span>{activeView}</span>
          </div>
        </div>
      </div>

      <div className="topbar-right">
        {/* Quick Demo Role Switcher */}
        <div className="role-switcher-wrap" title="Switch instantly between HOD, Faculty, and Student demo accounts">
          <i className="fa-solid fa-user-gear text-indigo text-xs"></i>
          <label htmlFor="role-select">Demo Persona:</label>
          <select
            id="role-select"
            className="role-select-native"
            value={user?.role || 'student'}
            onChange={(e) => switchDemoAccount(e.target.value)}
          >
            <option value="hod">HOD (Dr. Vance)</option>
            <option value="faculty">Faculty (Dr. Jenkins)</option>
            <option value="student">Student (Alex Chen)</option>
          </select>
        </div>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="topbar-action-btn"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            title="Notifications"
          >
            <i className="fa-regular fa-bell"></i>
            {unreadCount > 0 && <span className="notif-badge-dot">{unreadCount}</span>}
          </button>

          {showNotifMenu && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <div>
                  <h4 className="font-bold text-sm">Notifications</h4>
                  <span className="text-xs text-muted">{unreadCount} unread alert(s)</span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-indigo font-semibold hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="notif-dropdown-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted">No notifications yet.</div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                      onClick={() => {
                        api.markNotificationRead(n.id);
                        setUnreadCount((c) => Math.max(0, c - 1));
                        setShowNotifMenu(false);
                        setActiveView('notifications');
                      }}
                      style={{ cursor: 'pointer', padding: '10px 14px', borderBottom: '1px solid var(--border-light)' }}
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-primary">{n.title}</strong>
                        <span className="badge badge-indigo text-xs">{n.audience}</span>
                      </div>
                      <p className="text-xs text-secondary mt-1 line-clamp-2">{n.body}</p>
                      {n.deadline && (
                        <div className="text-xs text-warning font-semibold mt-1">
                          <i className="fa-regular fa-clock mr-1"></i>
                          Due: {new Date(n.deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 text-center border-t border-light bg-subtle">
                <button
                  className="text-xs text-indigo font-bold hover:underline"
                  onClick={() => {
                    setShowNotifMenu(false);
                    setActiveView('notifications');
                  }}
                >
                  View All Notifications <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div style={{ position: 'relative' }}>
          <div
            className="topbar-user-profile"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{ cursor: 'pointer' }}
          >
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={user?.name}
              className="avatar avatar-sm current-user-avatar"
            />
            <div className="line-tight text-left" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="text-xs font-bold block current-user-name">{user?.name}</span>
              <span className="text-xs text-muted block current-user-role" style={{ textTransform: 'capitalize' }}>
                {user?.role}
              </span>
            </div>
            <i className="fa-solid fa-chevron-down text-xs text-muted ml-1"></i>
          </div>

          {showProfileMenu && (
            <div
              className="dropdown-menu"
              style={{
                position: 'absolute',
                right: 0,
                top: '115%',
                width: '200px',
                background: '#fff',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-card)',
                border: '1px solid var(--border-color)',
                padding: '8px 0',
                zIndex: 999
              }}
            >
              <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{user?.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{user?.email}</div>
              </div>

              <button
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 16px',
                  fontSize: '13px',
                  color: 'var(--color-danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
