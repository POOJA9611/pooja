import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Modal from '../../components/Modal';

export default function ProjectTeams({ onNavigate, onOpenFacultyModal, viewParams = {} }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(viewParams?.initialTab || 'my-team'); // 'my-team' | 'join-teams'
  const [teamData, setTeamData] = useState(null);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(!!viewParams?.openCreate);

  useEffect(() => {
    if (viewParams?.initialTab) {
      setActiveTab(viewParams.initialTab);
    }
    if (viewParams?.openCreate) {
      setShowCreateModal(true);
    }
  }, [viewParams]);
  const [showJoinModal, setShowJoinModal] = useState(null); // team to join
  const [showDetailsModal, setShowDetailsModal] = useState(null); // team to inspect
  const [joinMessage, setJoinMessage] = useState('');
  const [submittingJoin, setSubmittingJoin] = useState(false);

  // Search & Filters for Join Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');

  // Create Team Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    project_title: '',
    description: '',
    domain: 'Cloud Computing & Distributed Systems',
    technologies: '',
    required_skills: '',
    max_members: 4,
    objectives: '',
    target_date: ''
  });
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Load My Team & Requests
  const loadMyTeam = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await api.getMyTeam();
      setTeamData(data);
    } catch (err) {
      console.error('Failed to load my team:', err);
      setErrorMsg(err.message || 'Failed to load team data.');
    } finally {
      setLoading(false);
    }
  };

  // Load Available Teams to Join
  const loadAvailableTeams = async () => {
    try {
      setAvailableLoading(true);
      const data = await api.getAvailableTeamsToJoin();
      setAvailableTeams(data.teams || []);
    } catch (err) {
      console.error('Failed to load available teams:', err);
    } finally {
      setAvailableLoading(false);
    }
  };

  useEffect(() => {
    loadMyTeam();
  }, []);

  useEffect(() => {
    if (activeTab === 'join-teams') {
      loadAvailableTeams();
    }
  }, [activeTab]);

  // Handle Create Team Proposal Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setCreatingTeam(true);

    try {
      await api.createTeamProposal(createForm);
      setSuccessMsg('Project team proposal submitted to HOD successfully! Status: Pending HOD Approval.');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        project_title: '',
        description: '',
        domain: 'Cloud Computing & Distributed Systems',
        technologies: '',
        required_skills: '',
        max_members: 4,
        objectives: '',
        target_date: ''
      });
      await loadMyTeam();
      setActiveTab('my-team');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit team proposal.');
    } finally {
      setCreatingTeam(false);
    }
  };

  // Handle Request to Join Team
  const handleSendJoinRequest = async () => {
    if (!showJoinModal) return;
    setSubmittingJoin(true);
    setErrorMsg('');

    try {
      await api.requestToJoinTeam(showJoinModal.id, joinMessage);
      setSuccessMsg(`Join request submitted to team "${showJoinModal.name}". The team leader will review your request.`);
      setShowJoinModal(null);
      setJoinMessage('');
      await loadAvailableTeams();
      await loadMyTeam();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit join request.');
    } finally {
      setSubmittingJoin(false);
    }
  };

  // Handle Leader Join Request Decision
  const handleDecideJoinRequest = async (requestId, action) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.decideJoinRequest(requestId, action);
      setSuccessMsg(`Join request successfully ${action === 'accept' ? 'accepted' : 'rejected'}.`);
      await loadMyTeam();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to process join request.');
    }
  };

  // Handle Toggle Recruiting
  const handleToggleRecruiting = async (teamId) => {
    try {
      const res = await api.toggleTeamRecruiting(teamId);
      setSuccessMsg(res.message);
      await loadMyTeam();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to toggle recruiting status.');
    }
  };

  const myTeam = teamData?.team;
  const incomingRequests = teamData?.incomingRequests || [];
  const outgoingRequests = teamData?.outgoingRequests || [];
  const isLeader = myTeam?.leader_id === user?.id || myTeam?.my_role === 'leader';

  // Status helper
  const getStatusBadge = (status, facId) => {
    if (status === 'pending_approval') {
      return (
        <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-clock"></i> Pending HOD Approval
        </span>
      );
    }
    if (status === 'modification_requested') {
      return (
        <span style={{ backgroundColor: '#FFEDD5', color: '#EA580C', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-pen-to-square"></i> Modifications Requested
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-circle-xmark"></i> Proposal Rejected
        </span>
      );
    }
    if (status === 'approved') {
      if (facId) {
        return (
          <span style={{ backgroundColor: '#DCFCE7', color: '#16A34A', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-circle-check"></i> Mentor Assigned & Active
          </span>
        );
      }
      return (
        <span style={{ backgroundColor: '#E0E7FF', color: '#4338CA', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-user-clock"></i> Approved • Awaiting Mentor Assignment
        </span>
      );
    }
    return <span className="badge badge-neutral">{status}</span>;
  };

  // Filter available teams
  const filteredAvailableTeams = availableTeams.filter((t) => {
    const matchesDomain = domainFilter === 'all' || (t.domain && t.domain.toLowerCase() === domainFilter.toLowerCase());
    const matchesSearch = !searchQuery.trim() ||
      (t.name && t.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.project_title && t.project_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.technologies && t.technologies.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.required_skills && t.required_skills.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDomain && matchesSearch;
  });

  if (loading) {
    return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Banner */}
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
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 10px 25px -5px rgba(67, 56, 202, 0.4)'
        }}
      >
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85 }}>
            Capstone Collaboration Hub
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', marginBottom: '8px' }}>
            Project Teams & Mentorship
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.9, maxWidth: '620px', margin: 0 }}>
            Propose departmental capstone teams, request HOD review, discover high-compatibility teams through algorithmic matching, and collaborate with your assigned faculty mentor.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              backgroundColor: '#fff',
              color: '#4338CA',
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fa-solid fa-plus-circle"></i> Create a Team
          </button>

          <button
            onClick={() => setActiveTab('join-teams')}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fa-solid fa-user-plus"></i> Join a Team
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div style={{ padding: '12px 18px', backgroundColor: '#DCFCE7', color: '#16A34A', borderRadius: '12px', fontSize: '13px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><i className="fa-solid fa-circle-check mr-2"></i> {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', color: '#16A34A', cursor: 'pointer' }}><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '12px 18px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '12px', fontSize: '13px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><i className="fa-solid fa-triangle-exclamation mr-2"></i> {errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-light)', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('my-team')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            color: activeTab === 'my-team' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'my-team' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fa-solid fa-users-viewfinder"></i> My Team Workspace
          {myTeam && <span className="badge badge-indigo text-xs" style={{ padding: '1px 6px' }}>Active</span>}
        </button>

        <button
          onClick={() => setActiveTab('join-teams')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            color: activeTab === 'join-teams' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'join-teams' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fa-solid fa-magnifying-glass-chart"></i> Join a Team (Recommendations)
          <span className="badge badge-success text-xs" style={{ padding: '1px 6px' }}>AI Match</span>
        </button>
      </div>

      {/* ========================================================
          TAB 1: MY TEAM & STATUS
      ======================================================== */}
      {activeTab === 'my-team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {myTeam ? (
            <>
              {/* Team Overview Card */}
              <div className="card" style={{ padding: '28px', borderRadius: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {myTeam.name}
                      </h3>
                      {getStatusBadge(myTeam.status, myTeam.faculty_id)}
                      {myTeam.is_accepting_members ? (
                        <span className="badge badge-success text-xs">Open for Members</span>
                      ) : (
                        <span className="badge badge-neutral text-xs">Recruiting Closed</span>
                      )}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
                      {myTeam.project_title || 'Untitled Project'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Domain: <strong style={{ color: 'var(--text-primary)' }}>{myTeam.domain || 'General Computer Science'}</strong> • Max Team Size: <strong>{myTeam.max_members || 4} Members</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    {myTeam.chat_group_id && (
                      <button
                        onClick={() => onNavigate('student-chat')}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <i className="fa-solid fa-comments"></i> Open Team Chat
                      </button>
                    )}

                    {isLeader && (
                      <button
                        onClick={() => handleToggleRecruiting(myTeam.id)}
                        className="btn btn-outline"
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                        title="Toggle whether other students can request to join your team"
                      >
                        <i className={`fa-solid ${myTeam.is_accepting_members ? 'fa-lock' : 'fa-lock-open'} mr-1`}></i>
                        {myTeam.is_accepting_members ? 'Close Recruitment' : 'Open Recruitment'}
                      </button>
                    )}
                  </div>
                </div>

                {/* HOD Remarks Banner (if any) */}
                {myTeam.hod_remarks && (
                  <div style={{ padding: '14px 18px', backgroundColor: '#F8FAFC', borderLeft: '4px solid var(--color-primary)', borderRadius: '8px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '4px' }}>
                      <i className="fa-solid fa-clipboard-user mr-1"></i> HOD Feedback & Remarks
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      {myTeam.hod_remarks}
                    </div>
                  </div>
                )}

                {/* Project Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Problem Statement & Scope
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      {myTeam.description || 'No description provided.'}
                    </p>
                  </div>

                  <div style={{ padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Objectives & Target Outcome
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      {myTeam.objectives || 'Complete capstone implementation and departmental evaluation.'}
                    </p>
                    {myTeam.target_date && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <i className="fa-regular fa-calendar-check mr-1"></i> Target Completion: <strong>{myTeam.target_date}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technologies & Required Skills */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '8px' }}>
                      Technologies:
                    </span>
                    {(myTeam.technologies ? myTeam.technologies.split(',') : []).map((t, i) => (
                      <span key={i} className="badge badge-indigo text-xs mr-2 mb-1">
                        {t.trim()}
                      </span>
                    ))}
                  </div>

                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '8px' }}>
                      Required Skills:
                    </span>
                    {(myTeam.required_skills ? myTeam.required_skills.split(',') : []).map((s, i) => (
                      <span key={i} className="badge badge-neutral text-xs mr-2 mb-1">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Members Section */}
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      Team Members ({myTeam.members ? myTeam.members.length : 1} / {myTeam.max_members || 4})
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {(myTeam.max_members || 4) - (myTeam.members ? myTeam.members.length : 1)} positions available
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                    {myTeam.members?.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          padding: '14px 16px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          backgroundColor: '#fff'
                        }}
                      >
                        <img
                          src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={m.name}
                          className="avatar avatar-md"
                        />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {m.name}
                            </strong>
                            {m.team_role === 'leader' && (
                              <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#D97706', textTransform: 'uppercase' }}>
                                Leader
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {m.reg_no || 'Student'} • {m.strength || 'Developer'}
                          </div>
                          {m.languages && (
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                              {m.languages}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assigned Mentor Section */}
                <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '24px', paddingTop: '20px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '14px', color: 'var(--text-primary)' }}>
                    Assigned Faculty Mentor
                  </h4>

                  {myTeam.faculty_id ? (
                    <div
                      style={{
                        padding: '16px 20px',
                        backgroundColor: '#EEF2FF',
                        borderRadius: '14px',
                        border: '1px solid #C7D2FE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <img
                          src={myTeam.faculty_avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
                          alt={myTeam.faculty_name}
                          className="avatar avatar-lg"
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                              {myTeam.faculty_name}
                            </strong>
                            <span className="badge badge-indigo text-xs">Faculty Mentor</span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {myTeam.faculty_designation || 'Faculty Member'} • {myTeam.faculty_department || 'Computer Science'}
                          </div>
                          {myTeam.faculty_subjects && (
                            <div style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: '3px' }}>
                              Expertise: {myTeam.faculty_subjects}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => onOpenFacultyModal(myTeam.faculty_id)}
                          className="btn btn-outline"
                          style={{ padding: '8px 14px', fontSize: '12px', backgroundColor: '#fff' }}
                        >
                          <i className="fa-solid fa-id-card mr-1"></i> View Profile
                        </button>
                        <button
                          onClick={() => onNavigate('student-chat')}
                          className="btn btn-primary"
                          style={{ padding: '8px 14px', fontSize: '12px' }}
                        >
                          <i className="fa-solid fa-comments mr-1"></i> Message Mentor
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '16px 20px', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <i className="fa-solid fa-hourglass-half text-indigo text-lg"></i>
                      <span>
                        {myTeam.status === 'approved'
                          ? 'Project proposal approved by HOD! The HOD is currently allocating an optimal faculty mentor based on project requirements.'
                          : 'A faculty mentor will be assigned by HOD once your project proposal is approved.'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Leader: Incoming Join Requests Section */}
              {isLeader && (
                <div className="card" style={{ padding: '24px', borderRadius: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                        <i className="fa-solid fa-inbox text-indigo mr-2"></i> Join Requests Received
                      </h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Students requesting to join "{myTeam.name}"
                      </span>
                    </div>
                    <span className="badge badge-indigo text-xs">
                      {incomingRequests.filter((r) => r.status === 'pending').length} Pending
                    </span>
                  </div>

                  {incomingRequests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No join requests received yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {incomingRequests.map((req) => (
                        <div
                          key={req.id}
                          style={{
                            padding: '16px 18px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                            backgroundColor: req.status === 'pending' ? '#FAF5FF' : '#fff'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img
                              src={req.student_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                              alt={req.student_name}
                              className="avatar avatar-md"
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                                  {req.student_name}
                                </strong>
                                <span className="badge badge-indigo text-xs">{req.strength || 'student'}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  CGPA: {req.cgpa || 'N/A'} • {req.reg_no}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Skills: <strong>{req.languages || 'Not specified'}</strong>
                              </div>
                              {req.message && (
                                <p style={{ fontSize: '12px', color: 'var(--text-primary)', margin: '4px 0 0 0', fontStyle: 'italic' }}>
                                  "{req.message}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {req.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleDecideJoinRequest(req.id, 'accept')}
                                  style={{
                                    backgroundColor: '#16A34A',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <i className="fa-solid fa-check mr-1"></i> Accept
                                </button>
                                <button
                                  onClick={() => handleDecideJoinRequest(req.id, 'reject')}
                                  style={{
                                    backgroundColor: '#DC2626',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <i className="fa-solid fa-xmark mr-1"></i> Reject
                                </button>
                              </>
                            ) : (
                              <span className={`badge ${req.status === 'accepted' ? 'badge-success' : 'badge-danger'} text-xs`}>
                                {req.status.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Empty State: Student Not in Any Team */
            <div className="card text-center" style={{ padding: '48px 32px', borderRadius: '20px' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#EEF2FF', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto', fontSize: '32px' }}>
                <i className="fa-solid fa-people-group"></i>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                You Have Not Joined a Capstone Team Yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 24px auto', fontSize: '14px', lineHeight: 1.5 }}>
                Capstone engineering projects are completed in collaborative teams of 2 to 6 students. You can create your own team proposal or request to join an existing approved team.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i className="fa-solid fa-plus-circle"></i> Create a Team Proposal
                </button>
                <button
                  onClick={() => setActiveTab('join-teams')}
                  className="btn btn-outline"
                  style={{ padding: '10px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i className="fa-solid fa-magnifying-glass mr-1"></i> Browse Recommended Teams
                </button>
              </div>

              {/* My Pending Outgoing Requests (if any) */}
              {outgoingRequests.length > 0 && (
                <div style={{ marginTop: '36px', borderTop: '1px solid var(--border-light)', paddingTop: '24px', textAlign: 'left' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>
                    <i className="fa-solid fa-paper-plane text-indigo mr-2"></i> Your Sent Join Requests
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {outgoingRequests.map((req) => (
                      <div
                        key={req.id}
                        style={{
                          padding: '12px 16px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#FAF5FF'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                            Team: {req.team_name}
                          </strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {req.project_title} • Leader: {req.leader_name}
                          </div>
                        </div>
                        <span className={`badge ${req.status === 'pending' ? 'badge-warning' : req.status === 'accepted' ? 'badge-success' : 'badge-danger'} text-xs`}>
                          {req.status === 'pending' ? 'Pending Leader Decision' : req.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2: JOIN AN EXISTING TEAM (RECOMMENDATIONS)
      ======================================================== */}
      {activeTab === 'join-teams' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Recommendation Info Banner */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#EEF2FF',
              borderRadius: '14px',
              border: '1px solid #C7D2FE',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}
          >
            <div style={{ fontSize: '28px', color: 'var(--color-primary)' }}>
              <i className="fa-solid fa-microchip"></i>
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>
                Algorithmic Team Compatibility Recommendations
              </strong>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                Each team's <strong>Match Percentage</strong> is calculated from your verified profile skills (40%), technology stack overlap (25%), domain interests (15%), availability (10%), and complementary skill balance (10%).
              </p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="card" style={{ padding: '16px 20px', borderRadius: '14px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by team name, project title, or technologies..."
                className="form-input"
                style={{ paddingLeft: '36px' }}
              />
            </div>

            <div style={{ width: '220px' }}>
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="form-select"
              >
                <option value="all">All Domains / Categories</option>
                <option value="Cloud Computing">Cloud Computing</option>
                <option value="AI & Machine Learning">AI & Machine Learning</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="Web Development">Web Development</option>
                <option value="Mobile Applications">Mobile Applications</option>
                <option value="Internet of Things (IoT)">Internet of Things (IoT)</option>
              </select>
            </div>
          </div>

          {/* Teams Grid */}
          {availableLoading ? (
            <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>
          ) : filteredAvailableTeams.length === 0 ? (
            <div className="card text-center p-12">
              <i className="fa-solid fa-folder-open text-4xl text-muted mb-3 block"></i>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                No Available Teams Found
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                There are currently no open teams matching your search or filters. You can create your own team proposal!
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
                style={{ marginTop: '12px' }}
              >
                <i className="fa-solid fa-plus-circle mr-1"></i> Create a Team Proposal
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
              {filteredAvailableTeams.map((team) => {
                const isHighMatch = team.match_percentage >= 80;
                const isMedMatch = team.match_percentage >= 60;
                const matchColor = isHighMatch ? '#16A34A' : isMedMatch ? 'var(--color-primary)' : 'var(--text-muted)';
                const matchBg = isHighMatch ? '#DCFCE7' : isMedMatch ? '#EEF2FF' : '#F1F5F9';

                return (
                  <div
                    key={team.id}
                    className="card"
                    style={{
                      padding: '22px',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      border: isHighMatch ? '2px solid #C7D2FE' : '1px solid var(--border-color)'
                    }}
                  >
                    <div>
                      {/* Top Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <span className="badge badge-indigo text-xs" style={{ marginBottom: '6px' }}>
                            {team.domain || 'Computer Science'}
                          </span>
                          <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                            {team.name}
                          </h4>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>
                            {team.project_title || 'Capstone Project'}
                          </div>
                        </div>

                        {/* Match Percentage Pill */}
                        <div
                          style={{
                            padding: '6px 12px',
                            borderRadius: '12px',
                            backgroundColor: matchBg,
                            color: matchColor,
                            fontWeight: 800,
                            fontSize: '13px',
                            textAlign: 'center',
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                          }}
                          title="Calculated recommendation percentage"
                        >
                          <span style={{ fontSize: '16px', lineHeight: 1 }}>{team.match_percentage}%</span>
                          <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Match</span>
                        </div>
                      </div>

                      {/* Genuine Match Explanation Box */}
                      {team.match_explanation && (
                        <div
                          style={{
                            padding: '10px 12px',
                            backgroundColor: '#FAF5FF',
                            borderRadius: '8px',
                            fontSize: '11px',
                            color: 'var(--text-primary)',
                            marginBottom: '12px',
                            borderLeft: `3px solid ${matchColor}`,
                            lineHeight: 1.4
                          }}
                        >
                          <i className="fa-solid fa-sparkles text-indigo mr-1"></i> {team.match_explanation}
                        </div>
                      )}

                      {/* Description Preview */}
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {team.description || 'No detailed problem statement provided.'}
                      </p>

                      {/* Technologies */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                          TECH STACK:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(team.technologies ? team.technologies.split(',') : []).slice(0, 4).map((tech, i) => (
                            <span key={i} className="badge badge-neutral text-xs">
                              {tech.trim()}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Team Stats */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: '10px', marginBottom: '16px' }}>
                        <span>
                          <i className="fa-solid fa-users text-indigo mr-1"></i>
                          <strong>{team.member_count}</strong> / {team.max_members} members
                        </span>
                        <span>
                          <i className="fa-solid fa-chalkboard-user mr-1"></i>
                          {team.faculty_name ? `Mentor: ${team.faculty_name}` : 'Awaiting Mentor'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setShowDetailsModal(team)}
                        className="btn btn-outline"
                        style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
                      >
                        <i className="fa-solid fa-circle-info mr-1"></i> Full Details
                      </button>

                      {myTeam ? (
                        <button
                          disabled
                          className="btn"
                          style={{ flex: 1, padding: '8px 12px', fontSize: '12px', opacity: 0.6, cursor: 'not-allowed' }}
                          title="You already belong to an active team"
                        >
                          Already In Team
                        </button>
                      ) : team.has_pending_request ? (
                        <button
                          disabled
                          className="btn"
                          style={{ flex: 1, padding: '8px 12px', fontSize: '12px', backgroundColor: '#FEF3C7', color: '#D97706', border: 'none', cursor: 'not-allowed' }}
                        >
                          <i className="fa-solid fa-clock mr-1"></i> Requested
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowJoinModal(team)}
                          className="btn btn-primary"
                          style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
                        >
                          <i className="fa-solid fa-user-plus mr-1"></i> Request to Join
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          CREATE TEAM PROPOSAL MODAL
      ======================================================== */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Propose a New Project Team"
        maxWidth="740px"
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Submit your capstone project proposal. Once submitted, it will be sent to the HOD's executive console for review and mentor allocation.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Team Name *</label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. CloudScale, NeuralCore, CyberShield"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Project Domain / Category *</label>
              <select
                required
                value={createForm.domain}
                onChange={(e) => setCreateForm({ ...createForm, domain: e.target.value })}
                className="form-select"
              >
                <option value="Cloud Computing & Distributed Systems">Cloud Computing & Distributed Systems</option>
                <option value="AI & Machine Learning">AI & Machine Learning</option>
                <option value="Cybersecurity & Cryptography">Cybersecurity & Cryptography</option>
                <option value="Web & Full-Stack Development">Web & Full-Stack Development</option>
                <option value="Mobile Applications">Mobile Applications</option>
                <option value="Internet of Things (IoT)">Internet of Things (IoT)</option>
                <option value="Blockchain & Decentralized Tech">Blockchain & Decentralized Tech</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Project Title *</label>
            <input
              type="text"
              required
              value={createForm.project_title}
              onChange={(e) => setCreateForm({ ...createForm, project_title: e.target.value })}
              placeholder="e.g. Multi-Tenant Distributed Telemetry and Microservices Platform"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Project Description & Problem Statement *</label>
            <textarea
              required
              rows={3}
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Describe the real-world problem, proposed engineering architecture, and technical scope..."
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Technologies & Languages (comma-separated) *</label>
              <input
                type="text"
                required
                value={createForm.technologies}
                onChange={(e) => setCreateForm({ ...createForm, technologies: e.target.value })}
                placeholder="e.g. React, Node.js, Python, PostgreSQL, Docker"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Required Skills for Teammates *</label>
              <input
                type="text"
                required
                value={createForm.required_skills}
                onChange={(e) => setCreateForm({ ...createForm, required_skills: e.target.value })}
                placeholder="e.g. Frontend, Backend, DevOps, UI/UX"
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Maximum Team Size (2 - 6)</label>
              <input
                type="number"
                min="2"
                max="6"
                value={createForm.max_members}
                onChange={(e) => setCreateForm({ ...createForm, max_members: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Completion Date</label>
              <input
                type="date"
                value={createForm.target_date}
                onChange={(e) => setCreateForm({ ...createForm, target_date: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Project Objectives & Expected Outcome</label>
            <textarea
              rows={2}
              value={createForm.objectives}
              onChange={(e) => setCreateForm({ ...createForm, objectives: e.target.value })}
              placeholder="e.g. Publish research paper, deploy working production prototype on Kubernetes..."
              className="form-textarea"
            />
          </div>

          <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <i className="fa-solid fa-user-shield text-indigo mr-1"></i> You ({user.name} - {user.email}) will automatically be designated as the <strong>Team Leader</strong>.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingTeam}
              className="btn btn-primary"
            >
              {creatingTeam ? <><i className="fa-solid fa-spinner fa-spin mr-1"></i> Submitting...</> : 'Submit Proposal to HOD'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          REQUEST TO JOIN TEAM MODAL
      ======================================================== */}
      {showJoinModal && (
        <Modal
          isOpen={!!showJoinModal}
          onClose={() => setShowJoinModal(null)}
          title={`Join Team "${showJoinModal.name}"`}
          maxWidth="500px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '12px', backgroundColor: '#EEF2FF', borderRadius: '10px', fontSize: '13px' }}>
              <strong>Project:</strong> {showJoinModal.project_title}
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Leader: {showJoinModal.leader_name} • Domain: {showJoinModal.domain}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Short Note to Team Leader (Optional)</label>
              <textarea
                rows={3}
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                placeholder="Mention your background, skills, and what component you would like to work on..."
                className="form-textarea"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowJoinModal(null)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleSendJoinRequest}
                disabled={submittingJoin}
                className="btn btn-primary"
              >
                {submittingJoin ? <><i className="fa-solid fa-spinner fa-spin mr-1"></i> Sending...</> : 'Send Join Request'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================
          FULL PROJECT DETAILS INSPECT MODAL
      ======================================================== */}
      {showDetailsModal && (
        <Modal
          isOpen={!!showDetailsModal}
          onClose={() => setShowDetailsModal(null)}
          title={`Project Details: ${showDetailsModal.name}`}
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span className="badge badge-indigo text-xs mb-1">{showDetailsModal.domain}</span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0', color: 'var(--text-primary)' }}>
                {showDetailsModal.project_title || showDetailsModal.name}
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Team Leader: <strong>{showDetailsModal.leader_name}</strong> • Mentor: <strong>{showDetailsModal.faculty_name || 'Awaiting HOD Allocation'}</strong>
              </div>
            </div>

            <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Description & Problem Statement
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {showDetailsModal.description || 'No detailed description provided.'}
              </p>
            </div>

            {showDetailsModal.objectives && (
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Objectives & Expected Deliverables
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {showDetailsModal.objectives}
                </p>
              </div>
            )}

            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Technologies & Languages:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(showDetailsModal.technologies ? showDetailsModal.technologies.split(',') : []).map((t, i) => (
                  <span key={i} className="badge badge-indigo text-xs">{t.trim()}</span>
                ))}
              </div>
            </div>

            {showDetailsModal.members && showDetailsModal.members.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Current Team Members ({showDetailsModal.members.length} / {showDetailsModal.max_members || 4}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {showDetailsModal.members.map((m) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <img src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="" className="avatar avatar-xs" />
                      <span style={{ fontWeight: 600 }}>{m.name}</span>
                      <span className="badge badge-neutral text-xs">{m.strength || 'member'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                onClick={() => setShowDetailsModal(null)}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
