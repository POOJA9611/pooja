import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeView, setActiveView, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleNav = (view) => {
    setActiveView(view);
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <aside id="main-sidebar" className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand-wrapper">
        <div className="brand-icon-shield">
          <i className="fa-solid fa-graduation-cap"></i>
        </div>
        <div className="brand-text-block">
          <h1>ProjectPortal</h1>
          <span>CS Department SaaS</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="sidebar-scroll-content">
        {user.role === 'hod' && (
          <>
            <span className="nav-group-label">HOD Governance</span>
            <nav className="sidebar-menu">
              <button
                className={`sidebar-nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleNav('dashboard')}
              >
                <i className="fa-solid fa-chart-pie"></i>
                <span>Executive Dashboard</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'assignments' ? 'active' : ''}`}
                onClick={() => handleNav('assignments')}
              >
                <i className="fa-solid fa-user-plus"></i>
                <span>Assign Students</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'change-requests' ? 'active' : ''}`}
                onClick={() => handleNav('change-requests')}
              >
                <i className="fa-solid fa-inbox"></i>
                <span>Change Requests</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'hod-team-requests' ? 'active' : ''}`}
                onClick={() => handleNav('hod-team-requests')}
              >
                <i className="fa-solid fa-clipboard-check"></i>
                <span>Project Team Requests</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'directory' ? 'active' : ''}`}
                onClick={() => handleNav('directory')}
              >
                <i className="fa-solid fa-users"></i>
                <span>Directory (View-Only)</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'post-notification' ? 'active' : ''}`}
                onClick={() => handleNav('post-notification')}
              >
                <i className="fa-solid fa-bullhorn"></i>
                <span>Broadcast Notice</span>
              </button>
            </nav>
          </>
        )}

        {user.role === 'faculty' && (
          <>
            <span className="nav-group-label">Faculty Workspace</span>
            <nav className="sidebar-menu">
              <button
                className={`sidebar-nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleNav('dashboard')}
              >
                <i className="fa-solid fa-chart-pie"></i>
                <span>Overview</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'my-students' ? 'active' : ''}`}
                onClick={() => handleNav('my-students')}
              >
                <i className="fa-solid fa-user-graduate"></i>
                <span>My Assigned Students</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'faculty-teams' ? 'active' : ''}`}
                onClick={() => handleNav('faculty-teams')}
              >
                <i className="fa-solid fa-people-group"></i>
                <span>Capstone Teams</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'faculty-chat' ? 'active' : ''}`}
                onClick={() => handleNav('faculty-chat')}
              >
                <i className="fa-solid fa-comments"></i>
                <span>Team Group Chats</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'faculty-profile' ? 'active' : ''}`}
                onClick={() => handleNav('faculty-profile')}
              >
                <i className="fa-solid fa-id-card"></i>
                <span>My Profile & Skills</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'notifications' ? 'active' : ''}`}
                onClick={() => handleNav('notifications')}
              >
                <i className="fa-regular fa-bell"></i>
                <span>Department Alerts</span>
              </button>
            </nav>
          </>
        )}

        {user.role === 'student' && (
          <>
            <span className="nav-group-label">Student Workspace</span>
            <nav className="sidebar-menu">
              <button
                className={`sidebar-nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleNav('dashboard')}
              >
                <i className="fa-solid fa-chart-pie"></i>
                <span>Dashboard</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'student-profile' ? 'active' : ''}`}
                onClick={() => handleNav('student-profile')}
              >
                <i className="fa-solid fa-user-astronaut"></i>
                <span>Profile & Projects</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'project-teams' ? 'active' : ''}`}
                onClick={() => handleNav('project-teams')}
              >
                <i className="fa-solid fa-people-group"></i>
                <span>Project Teams</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'student-chat' ? 'active' : ''}`}
                onClick={() => handleNav('student-chat')}
              >
                <i className="fa-solid fa-comments"></i>
                <span>Team & Mentor Chat</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'faculty-directory' ? 'active' : ''}`}
                onClick={() => handleNav('faculty-directory')}
              >
                <i className="fa-solid fa-chalkboard-user"></i>
                <span>Faculty Directory</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'change-request' ? 'active' : ''}`}
                onClick={() => handleNav('change-request')}
              >
                <i className="fa-solid fa-arrow-right-arrow-left"></i>
                <span>Request Faculty Change</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeView === 'notifications' ? 'active' : ''}`}
                onClick={() => handleNav('notifications')}
              >
                <i className="fa-regular fa-bell"></i>
                <span>Announcements & Deadlines</span>
              </button>
            </nav>
          </>
        )}
      </div>

      {/* User Footer */}
      <div className="sidebar-footer-user">
        <div className="footer-user-info">
          <img
            src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={user.name}
            className="avatar avatar-sm current-user-avatar"
          />
          <div className="footer-user-details">
            <div className="user-name current-user-name">{user.name}</div>
            <div className="user-role current-user-role" style={{ textTransform: 'capitalize' }}>
              {user.role === 'hod' ? 'Head of Department' : user.role}
            </div>
          </div>
        </div>
        <button
          className="btn-icon-subtle"
          onClick={logout}
          title="Sign out of portal"
          style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <i className="fa-solid fa-arrow-right-from-bracket text-muted"></i>
        </button>
      </div>
    </aside>
  );
}
