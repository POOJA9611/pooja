import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';

export default function StudentDashboard({ onNavigate, onOpenFacultyModal }) {
  const [profileData, setProfileData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [myTeamData, setMyTeamData] = useState(null);
  const [suggestedTeams, setSuggestedTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Join Modal State
  const [selectedTeamToJoin, setSelectedTeamToJoin] = useState(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [joinSuccessToast, setJoinSuccessToast] = useState('');
  const [joinError, setJoinError] = useState('');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [profRes, notifRes, teamRes, suggestedRes] = await Promise.all([
        api.getStudentProfile(),
        api.getNotifications(),
        api.getMyTeam().catch(() => null),
        api.getAvailableTeamsToJoin().catch(() => ({ teams: [] }))
      ]);

      setProfileData(profRes);
      setNotifications(notifRes.notifications || []);
      setMyTeamData(teamRes);
      setSuggestedTeams(suggestedRes?.teams || []);
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleOpenJoinModal = (team) => {
    setSelectedTeamToJoin(team);
    setJoinMessage(`Hi! I would love to contribute to "${team.project_title || team.name}". My skills align well with your project objectives.`);
    setJoinError('');
  };

  const handleCloseJoinModal = () => {
    if (submittingJoin) return;
    setSelectedTeamToJoin(null);
    setJoinMessage('');
    setJoinError('');
  };

  const handleSubmitJoinRequest = async (e) => {
    e.preventDefault();
    if (!selectedTeamToJoin) return;

    setSubmittingJoin(true);
    setJoinError('');

    try {
      await api.requestToJoinTeam(selectedTeamToJoin.id, joinMessage.trim());
      setJoinSuccessToast(`Join request successfully submitted to team "${selectedTeamToJoin.name}"!`);
      setSelectedTeamToJoin(null);
      setTimeout(() => setJoinSuccessToast(''), 5000);

      // Refresh team and suggestion lists
      const [teamRes, suggestedRes] = await Promise.all([
        api.getMyTeam().catch(() => null),
        api.getAvailableTeamsToJoin().catch(() => ({ teams: [] }))
      ]);
      setMyTeamData(teamRes);
      setSuggestedTeams(suggestedRes?.teams || []);
    } catch (err) {
      console.error('Failed to submit join request:', err);
      setJoinError(err.message || 'Failed to submit join request.');
    } finally {
      setSubmittingJoin(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i>
      </div>
    );
  }

  const p = profileData?.profile;
  const projects = profileData?.projects || [];
  const activeTeam = myTeamData?.team;
  const outgoingRequests = myTeamData?.outgoingRequests || [];
  const topSuggestions = suggestedTeams.slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Alert */}
      {joinSuccessToast && (
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: '#15803D',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-circle-check text-emerald"></i>
            <span>{joinSuccessToast}</span>
          </div>
          <button
            onClick={() => setJoinSuccessToast('')}
            style={{ background: 'transparent', border: 'none', color: '#15803D', cursor: 'pointer' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Student Hero Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #4338CA 0%, #3B82F6 100%)',
          color: '#fff',
          padding: '28px 32px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 10px 25px -5px rgba(67, 56, 202, 0.4)'
        }}
      >
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85 }}>
            Student Capstone Workspace
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', marginBottom: '8px' }}>
            Welcome back, {p?.name}!
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.9, maxWidth: '600px', margin: 0 }}>
            {p?.reg_no} • {p?.department} • Sem {p?.semester}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => onNavigate('student-chat')}
            style={{
              backgroundColor: '#fff',
              color: '#4338CA',
              padding: '10px 18px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <i className="fa-solid fa-comments mr-2"></i> Team & Mentor Chat
          </button>
          <button
            onClick={() => onNavigate('student-profile')}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              padding: '10px 18px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              cursor: 'pointer'
            }}
          >
            <i className="fa-solid fa-plus mr-2"></i> Add Project
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid-four">
        <StatCard
          title="Assigned Mentor"
          value={p?.faculty_name ? 'Assigned' : 'Pending'}
          icon="fa-solid fa-chalkboard-user"
          colorClass={p?.faculty_name ? "bg-indigo-light" : "bg-amber-light"}
          subtext={p?.faculty_name || "Awaiting HOD allocation"}
        />
        <StatCard
          title="Cumulative CGPA"
          value={p?.cgpa || '0.0'}
          icon="fa-solid fa-award"
          colorClass="bg-violet-light"
          subtext={`Academic semester ${p?.semester}`}
        />
        <StatCard
          title="Core Strength"
          value={p?.strength || 'Fullstack'}
          icon="fa-solid fa-layer-group"
          colorClass="bg-emerald-light"
          subtext="Technical focus"
        />
        <StatCard
          title="Projects Logged"
          value={projects.length}
          icon="fa-solid fa-folder-open"
          colorClass="bg-blue-light"
          subtext={`${projects.filter((x) => x.status === 'ongoing').length} ongoing`}
        />
      </div>

      {/* PROJECT TEAM MANAGEMENT & SUGGESTIONS SECTION */}
      <div className="card" style={{ border: '1px solid #E0E7FF' }}>
        <div className="card-title-row">
          <div>
            <h3 className="card-main-title">
              <i className="fa-solid fa-people-group text-indigo mr-2"></i> Project Team & Peer Collaboration
            </h3>
            <p className="card-subtitle">Form, discover, and collaborate on department capstone proposals</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-subtle btn-sm"
              onClick={() => onNavigate('project-teams', { initialTab: 'join-teams' })}
            >
              <i className="fa-solid fa-user-plus mr-1"></i> Join a Team
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate('project-teams', { initialTab: 'my-team', openCreate: true })}
            >
              <i className="fa-solid fa-plus mr-1"></i> Create a Team
            </button>
          </div>
        </div>

        {/* My Project Team Card */}
        {activeTeam ? (
          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              padding: '18px 20px',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Team: {activeTeam.name}
                  </h4>
                  <span
                    className={`badge ${
                      activeTeam.status === 'approved'
                        ? 'badge-emerald'
                        : activeTeam.status === 'pending_approval'
                        ? 'badge-amber'
                        : 'badge-rose'
                    }`}
                  >
                    {activeTeam.status === 'approved'
                      ? 'Approved Capstone Team'
                      : activeTeam.status === 'pending_approval'
                      ? 'Pending HOD Approval'
                      : 'Modification Requested'}
                  </span>
                  <span className="badge badge-indigo text-xs">
                    Role: {activeTeam.my_role === 'leader' ? 'Team Leader' : 'Team Member'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginTop: '4px' }}>
                  {activeTeam.project_title || 'Capstone Project Proposal'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onNavigate('project-teams')}
                >
                  <i className="fa-solid fa-sliders mr-1"></i> View Team
                </button>
                <button
                  className="btn btn-subtle btn-sm"
                  onClick={() => onNavigate('student-chat')}
                >
                  <i className="fa-solid fa-comments mr-1"></i> Team Chat
                </button>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
              {activeTeam.description || 'No detailed problem statement entered.'}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>
                  <strong>Domain:</strong> {activeTeam.domain || 'Cloud Systems'}
                </span>
                <span>•</span>
                <span>
                  <strong>Roster:</strong> {activeTeam.members?.length || 1} / {activeTeam.max_members || 4} Members
                </span>
                <span>•</span>
                <span>
                  <strong>Mentor:</strong> {activeTeam.faculty_name || 'Pending HOD Assignment'}
                </span>
              </div>
            </div>
          </div>
        ) : outgoingRequests.length > 0 ? (
          <div
            style={{
              backgroundColor: '#EFF6FF',
              borderRadius: '14px',
              border: '1px solid #BFDBFE',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-indigo">Join Request Pending</span>
                <strong style={{ fontSize: '14px', color: '#1E40AF' }}>
                  Applied to join "{outgoingRequests[0].team_name}"
                </strong>
              </div>
              <div style={{ fontSize: '12px', color: '#3B82F6', marginTop: '3px' }}>
                Project: {outgoingRequests[0].project_title} • Waiting for team leader to review.
              </div>
            </div>
            <button
              className="btn btn-subtle btn-sm"
              onClick={() => onNavigate('project-teams')}
              style={{ backgroundColor: '#fff', borderColor: '#BFDBFE' }}
            >
              Check Status
            </button>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '14px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}
          >
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 2px 0', color: 'var(--text-primary)' }}>
                You are not in a project team yet
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Explore approved teams below ranked by your technical stack match, or propose your own capstone project.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-subtle btn-sm"
                onClick={() => onNavigate('project-teams', { initialTab: 'join-teams' })}
              >
                Browse All Teams
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onNavigate('project-teams', { initialTab: 'my-team', openCreate: true })}
              >
                Propose Team
              </button>
            </div>
          </div>
        )}

        {/* Suggested Teams for You Subsection */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Suggested Teams for You
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Personalized recommendations calculated from your technical skills, programming languages, and domain focus
              </span>
            </div>
            <button
              className="btn btn-subtle btn-sm"
              onClick={() => onNavigate('project-teams', { initialTab: 'join-teams' })}
            >
              View All ({suggestedTeams.length}) <i className="fa-solid fa-arrow-right text-xs"></i>
            </button>
          </div>

          {topSuggestions.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', backgroundColor: '#F8FAFC', borderRadius: '12px' }}>
              <i className="fa-solid fa-users text-2xl text-muted block mb-2"></i>
              No active teams currently recruiting members. Click <strong>"Create a Team"</strong> to start a proposal.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {topSuggestions.map((team) => {
                const matchScore = team.match_percentage || 0;
                const matchBadgeClass =
                  matchScore >= 80 ? 'badge-emerald' : matchScore >= 60 ? 'badge-indigo' : 'badge-amber';

                return (
                  <div
                    key={team.id}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '14px',
                      padding: '16px',
                      backgroundColor: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                    }}
                  >
                    <div>
                      {/* Top Header Row with Match Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span className="badge badge-indigo text-xs">
                          {team.domain || 'Cloud Systems'}
                        </span>
                        <span className={`badge ${matchBadgeClass}`} style={{ fontWeight: 800 }}>
                          <i className="fa-solid fa-bolt mr-1"></i> {matchScore}% Match
                        </span>
                      </div>

                      {/* Team Name & Title */}
                      <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 2px 0', color: 'var(--text-primary)' }}>
                        {team.name}
                      </h4>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '8px' }}>
                        {team.project_title}
                      </div>

                      {/* Match Explanation */}
                      {team.match_explanation && (
                        <div
                          style={{
                            fontSize: '11px',
                            backgroundColor: '#F8FAFC',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            color: 'var(--text-secondary)',
                            marginBottom: '10px',
                            borderLeft: '3px solid var(--color-primary)'
                          }}
                        >
                          {team.match_explanation}
                        </div>
                      )}

                      {/* Description snippet */}
                      <p
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.4,
                          margin: '0 0 10px 0',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {team.description}
                      </p>

                      {/* Tech stack tags */}
                      {team.technologies && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                          {team.technologies.split(',').slice(0, 3).map((t, idx) => (
                            <span
                              key={idx}
                              style={{
                                backgroundColor: '#EEF2FF',
                                color: '#4338CA',
                                fontSize: '10px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 600
                              }}
                            >
                              {t.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Row */}
                    <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img
                            src={team.leader_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                            alt=""
                            className="avatar avatar-xs"
                          />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Leader: <strong>{team.leader_name}</strong>
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {team.member_count || 1} / {team.max_members || 4} spots
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '8px' }}>
                        <button
                          className="btn btn-subtle btn-sm"
                          onClick={() => onNavigate('project-teams', { initialTab: 'join-teams' })}
                        >
                          View Team
                        </button>
                        {team.has_pending_request ? (
                          <button className="btn btn-sm" disabled style={{ opacity: 0.7 }}>
                            Requested
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenJoinModal(team)}
                          >
                            <i className="fa-solid fa-user-plus mr-1"></i> Request to Join
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Two-Column Row (Preserved: Mentor Guidance + Upcoming Deadlines) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Mentor Card */}
        <div className="card">
          <div className="card-title-row">
            <h3 className="card-main-title">
              <i className="fa-solid fa-graduation-cap text-indigo mr-2"></i> Faculty Guidance Mentor
            </h3>
            {p?.faculty_name && (
              <span className="badge badge-emerald">Active Guidance</span>
            )}
          </div>

          {p?.faculty_name ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '16px',
                  borderRadius: '14px'
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
                  alt=""
                  className="avatar avatar-lg"
                />
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 2px 0', color: 'var(--text-primary)' }}>
                    {p.faculty_name}
                  </h4>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {p.faculty_designation || 'Faculty Mentor'} • {p.faculty_department || p.department}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-primary)' }}>
                    <i className="fa-regular fa-envelope mr-1"></i> {p.faculty_email}
                  </div>
                </div>

                {onOpenFacultyModal && p.faculty_id && (
                  <button
                    className="btn btn-sm btn-subtle"
                    onClick={() => onOpenFacultyModal(p.faculty_id)}
                    title="View Faculty Profile"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  </button>
                )}
              </div>

              {p.faculty_subjects && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <strong>Specialization Areas:</strong> {p.faculty_subjects}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Need to switch project focus area?
                </span>
                <button
                  className="btn btn-sm btn-subtle"
                  onClick={() => onNavigate('change-request')}
                  style={{ color: 'var(--color-primary)', fontWeight: 700 }}
                >
                  <i className="fa-solid fa-arrow-right-arrow-left mr-1"></i> Request Faculty Change
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-user-clock text-3xl mb-2 block"></i>
              You are currently unassigned. The Head of Department will allocate a faculty mentor based on your strengths and languages.
            </div>
          )}
        </div>

        {/* Recent Deadlines & Notices */}
        <div className="card">
          <div className="card-title-row">
            <h3 className="card-main-title">
              <i className="fa-regular fa-bell text-indigo mr-2"></i> Upcoming Deadlines
            </h3>
            <button className="btn btn-sm btn-subtle" onClick={() => onNavigate('notifications')}>
              All Notices
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No active deadlines.
              </div>
            ) : (
              notifications.slice(0, 3).map((n) => (
                <div
                  key={n.id}
                  style={{
                    border: '1px solid var(--border-light)',
                    borderRadius: '10px',
                    padding: '12px',
                    backgroundColor: n.is_read ? '#fff' : '#EEF2FF'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{n.title}</strong>
                    {!n.is_read && <span className="badge badge-indigo text-xs">New</span>}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                    {n.body}
                  </p>
                  {n.deadline && (
                    <div style={{ fontSize: '11px', color: 'var(--color-amber)', fontWeight: 700 }}>
                      <i className="fa-regular fa-clock mr-1"></i> Due: {new Date(n.deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* QUICK JOIN REQUEST MODAL */}
      <Modal isOpen={!!selectedTeamToJoin} onClose={handleCloseJoinModal} title={`Request to Join: ${selectedTeamToJoin?.name}`}>
        {joinError && (
          <div style={{ padding: '10px 14px', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', fontWeight: 600 }}>
            <i className="fa-solid fa-triangle-exclamation mr-1"></i> {joinError}
          </div>
        )}

        <form onSubmit={handleSubmitJoinRequest}>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {selectedTeamToJoin?.project_title}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              <strong>Domain:</strong> {selectedTeamToJoin?.domain} • <strong>Leader:</strong> {selectedTeamToJoin?.leader_name}
            </div>
            {selectedTeamToJoin?.match_explanation && (
              <div style={{ fontSize: '12px', backgroundColor: '#EEF2FF', color: '#4338CA', padding: '8px 12px', borderRadius: '8px', marginTop: '8px', fontWeight: 600 }}>
                <i className="fa-solid fa-bolt mr-1"></i> {selectedTeamToJoin.match_percentage}% Match: {selectedTeamToJoin.match_explanation}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Message to Team Leader (Optional)
            </label>
            <textarea
              rows={4}
              value={joinMessage}
              onChange={(e) => setJoinMessage(e.target.value)}
              placeholder="Introduce yourself, your availability, and why you are interested in this project..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-subtle" onClick={handleCloseJoinModal} disabled={submittingJoin}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submittingJoin}>
              {submittingJoin ? (
                <span><i className="fa-solid fa-spinner fa-spin mr-1"></i> Submitting...</span>
              ) : (
                <span><i className="fa-solid fa-paper-plane mr-1"></i> Send Join Request</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
