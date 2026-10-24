import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';

// Components
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import FacultyDetailModal from './components/FacultyDetailModal';
import ChatWorkspace from './components/ChatWorkspace';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';

// HOD Pages
import HodDashboard from './pages/hod/HodDashboard';
import Assignments from './pages/hod/Assignments';
import ChangeRequests from './pages/hod/ChangeRequests';
import Directory from './pages/hod/Directory';
import PostNotification from './pages/hod/PostNotification';
import ProjectTeamRequests from './pages/hod/ProjectTeamRequests';

// Faculty Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import MyStudents from './pages/faculty/MyStudents';
import FacultyTeams from './pages/faculty/FacultyTeams';
import FacultyProfile from './pages/faculty/FacultyProfile';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import ProjectTeams from './pages/student/ProjectTeams';
import FacultyDirectory from './pages/student/FacultyDirectory';
import StudentChangeRequest from './pages/student/StudentChangeRequest';

// Common
import NotificationsList from './pages/common/NotificationsList';

function MainPortal() {
  const { user, loading } = useAuth();
  const { latestNotification, clearLatestNotification } = useSocket();
  const [authView, setAuthView] = useState('login'); // 'login' or 'signup'
  const [activeView, setActiveView] = useState('dashboard');
  const [viewParams, setViewParams] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [inspectFacultyId, setInspectFacultyId] = useState(null);
  const [targetChatGroupId, setTargetChatGroupId] = useState(null);

  const handleNavigate = (view, params = {}) => {
    setViewParams(params);
    setActiveView(view);
  };

  // Reset activeView when user role switches
  useEffect(() => {
    setActiveView('dashboard');
    setViewParams({});
  }, [user?.role]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
        <i className="fa-solid fa-spinner fa-spin text-3xl text-indigo"></i>
      </div>
    );
  }

  // Unauthenticated screen
  if (!user) {
    if (authView === 'signup') {
      return <Signup onGoToLogin={() => setAuthView('login')} />;
    }
    return <Login onGoToSignup={() => setAuthView('signup')} />;
  }

  const handleOpenFacultyModal = (facId) => {
    setInspectFacultyId(facId);
  };

  const handleNavigateToChat = (groupId) => {
    setTargetChatGroupId(groupId);
    setActiveView(user.role === 'faculty' ? 'faculty-chat' : 'student-chat');
  };

  return (
    <div className="app-wrapper">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Real-time Toast Alert */}
      {latestNotification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: '#fff',
            border: '2px solid var(--color-primary)',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-modal)',
            maxWidth: '380px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            animation: 'slideIn 0.3s ease'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#EEF2FF',
              color: '#4338CA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <i className="fa-solid fa-bullhorn"></i>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
              Real-Time Notice
            </div>
            <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)', marginTop: '2px' }}>
              {latestNotification.title}
            </strong>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.3 }}>
              {latestNotification.body}
            </p>
          </div>
          <button
            onClick={clearLatestNotification}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Layout Area */}
      <div className="app-main-layout">
        <Topbar
          activeView={activeView}
          setActiveView={setActiveView}
          toggleMobileNav={() => setMobileOpen(!mobileOpen)}
        />

        {/* Content View Container */}
        <main className="content-view-container" style={{ padding: '24px 32px' }}>
          {/* HOD Views */}
          {user.role === 'hod' && (
            <>
              {activeView === 'dashboard' && <HodDashboard onNavigate={setActiveView} />}
              {activeView === 'assignments' && <Assignments />}
              {activeView === 'change-requests' && <ChangeRequests />}
              {activeView === 'hod-team-requests' && <ProjectTeamRequests />}
              {activeView === 'directory' && <Directory />}
              {activeView === 'post-notification' && <PostNotification />}
              {activeView === 'notifications' && <NotificationsList />}
            </>
          )}

          {/* Faculty Views */}
          {user.role === 'faculty' && (
            <>
              {activeView === 'dashboard' && <FacultyDashboard onNavigate={setActiveView} />}
              {activeView === 'my-students' && <MyStudents />}
              {activeView === 'faculty-teams' && (
                <FacultyTeams onNavigateToChat={handleNavigateToChat} />
              )}
              {activeView === 'faculty-chat' && (
                <ChatWorkspace
                  initialGroupId={targetChatGroupId}
                  onOpenFacultyModal={handleOpenFacultyModal}
                />
              )}
              {activeView === 'faculty-profile' && <FacultyProfile />}
              {activeView === 'notifications' && <NotificationsList />}
            </>
          )}

          {/* Student Views */}
          {user.role === 'student' && (
            <>
              {activeView === 'dashboard' && (
                <StudentDashboard
                  onNavigate={handleNavigate}
                  onOpenFacultyModal={handleOpenFacultyModal}
                />
              )}
              {activeView === 'student-profile' && (
                <StudentProfile onOpenFacultyModal={handleOpenFacultyModal} />
              )}
              {activeView === 'project-teams' && (
                <ProjectTeams
                  onNavigate={handleNavigate}
                  onOpenFacultyModal={handleOpenFacultyModal}
                  viewParams={viewParams}
                />
              )}
              {activeView === 'student-chat' && (
                <ChatWorkspace
                  initialGroupId={targetChatGroupId}
                  onOpenFacultyModal={handleOpenFacultyModal}
                />
              )}
              {activeView === 'faculty-directory' && (
                <FacultyDirectory onOpenFacultyModal={handleOpenFacultyModal} />
              )}
              {activeView === 'change-request' && (
                <StudentChangeRequest onOpenFacultyModal={handleOpenFacultyModal} />
              )}
              {activeView === 'notifications' && <NotificationsList />}
            </>
          )}
        </main>
      </div>

      {/* Global Faculty Detail Modal */}
      <FacultyDetailModal
        facultyId={inspectFacultyId}
        isOpen={!!inspectFacultyId}
        onClose={() => setInspectFacultyId(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainPortal />
      </SocketProvider>
    </AuthProvider>
  );
}
