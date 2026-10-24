import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';

export default function ProjectTeamRequests() {
  const [proposals, setProposals] = useState([]);
  const [metrics, setMetrics] = useState({
    pendingCount: 0,
    awaitingMentorCount: 0,
    mentorAssignedCount: 0,
    rejectedCount: 0,
    totalCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Review & Decision State
  const [reviewTeam, setReviewTeam] = useState(null);
  const [decisionAction, setDecisionAction] = useState('approve'); // 'approve' | 'reject' | 'request_modifications'
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [deciding, setDeciding] = useState(false);

  // Mentor Recommendation State
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);
  const [assigningMentor, setAssigningMentor] = useState(false);
  const [mentorNote, setMentorNote] = useState('');

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await api.getHodTeamProposals({
        status: statusFilter,
        domain: domainFilter,
        search: searchQuery
      });
      setProposals(data.proposals || []);
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to load proposals:', err);
      setErrorMsg(err.message || 'Failed to load team proposals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [statusFilter, domainFilter]);

  // Load mentor recommendations when opening an approved proposal or mentor review
  const loadMentorRecommendations = async (teamId) => {
    try {
      setLoadingRecs(true);
      const data = await api.getHodMentorRecommendations(teamId);
      setRecommendations(data.recommendations || []);
      if (data.recommendations && data.recommendations.length > 0) {
        // Default to the top recommended faculty member
        setSelectedFacultyId(data.recommendations[0].id);
      }
    } catch (err) {
      console.error('Failed to load mentor recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleOpenReview = (team) => {
    setReviewTeam(team);
    setDecisionRemarks('');
    setSelectedFacultyId(team.faculty_id || null);
    if (team.status === 'approved' || team.status === 'pending_approval') {
      loadMentorRecommendations(team.id);
    }
  };

  // Submit Proposal Approval/Rejection
  const handleProposalDecision = async (action) => {
    if (!reviewTeam) return;
    setDeciding(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.decideHodProposal(reviewTeam.id, action, decisionRemarks);
      setSuccessMsg(`Team proposal "${reviewTeam.name}" has been successfully ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged for modifications'}.`);
      setReviewTeam(null);
      await fetchProposals();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to process proposal decision.');
    } finally {
      setDeciding(false);
    }
  };

  // Submit Mentor Assignment
  const handleAssignMentor = async () => {
    if (!reviewTeam || !selectedFacultyId) return;
    setAssigningMentor(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.assignHodMentor(reviewTeam.id, selectedFacultyId, mentorNote);
      setSuccessMsg(res.message);
      setReviewTeam(null);
      await fetchProposals();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to assign faculty mentor.');
    } finally {
      setAssigningMentor(false);
    }
  };

  const getStatusBadge = (status, facultyId) => {
    if (status === 'pending_approval') {
      return (
        <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
          <i className="fa-solid fa-clock mr-1"></i> Pending Approval
        </span>
      );
    }
    if (status === 'modification_requested') {
      return (
        <span style={{ backgroundColor: '#FFEDD5', color: '#EA580C', padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
          <i className="fa-solid fa-pen-to-square mr-1"></i> Changes Requested
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
          <i className="fa-solid fa-circle-xmark mr-1"></i> Rejected
        </span>
      );
    }
    if (status === 'approved') {
      if (facultyId) {
        return (
          <span style={{ backgroundColor: '#DCFCE7', color: '#16A34A', padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
            <i className="fa-solid fa-circle-check mr-1"></i> Mentor Assigned
          </span>
        );
      }
      return (
        <span style={{ backgroundColor: '#E0E7FF', color: '#4338CA', padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
          <i className="fa-solid fa-user-clock mr-1"></i> Awaiting Mentor
        </span>
      );
    }
    return <span className="badge badge-neutral text-xs">{status}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #4338CA 0%, #6366F1 100%)',
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
            Department Executive Console
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', marginBottom: '8px' }}>
            Project Team Proposals & Mentor Assignment
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.9, maxWidth: '620px', margin: 0 }}>
            Review student project proposals, evaluate domain alignment and technical scope, approve capstone teams, and allocate faculty mentors using calculated compatibility metrics.
          </p>
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

      {/* Top Stat Cards */}
      <div className="stats-grid-four">
        <StatCard
          icon="fa-solid fa-clock"
          iconBg="#FEF3C7"
          iconColor="#D97706"
          label="Pending Proposals"
          value={metrics.pendingCount}
          subtext="Awaiting HOD approval"
        />
        <StatCard
          icon="fa-solid fa-user-clock"
          iconBg="#EEF2FF"
          iconColor="#4338CA"
          label="Awaiting Mentor"
          value={metrics.awaitingMentorCount}
          subtext="Approved projects needing mentor"
        />
        <StatCard
          icon="fa-solid fa-user-check"
          iconBg="#DCFCE7"
          iconColor="#16A34A"
          label="Mentor Assigned"
          value={metrics.mentorAssignedCount}
          subtext="Active guided teams"
        />
        <StatCard
          icon="fa-solid fa-folder-tree"
          iconBg="#F1F5F9"
          iconColor="#475569"
          label="Total Proposals"
          value={metrics.totalCount}
          subtext="All submitted capstone teams"
        />
      </div>

      {/* Filters and Search Bar */}
      <div className="card" style={{ padding: '18px 24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', overflowX: 'auto' }}>
          {[
            { id: 'all', label: 'All Proposals', count: metrics.totalCount },
            { id: 'pending_approval', label: 'Pending Approval', count: metrics.pendingCount },
            { id: 'awaiting_mentor', label: 'Awaiting Mentor', count: metrics.awaitingMentorCount },
            { id: 'mentor_assigned', label: 'Mentor Assigned', count: metrics.mentorAssignedCount },
            { id: 'rejected', label: 'Rejected / Changes', count: metrics.rejectedCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: statusFilter === tab.id ? 'var(--color-primary)' : 'var(--bg-subtle)',
                color: statusFilter === tab.id ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  backgroundColor: statusFilter === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--border-color)',
                  color: statusFilter === tab.id ? '#fff' : 'var(--text-primary)'
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Domain Filter */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchProposals()}
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
              <option value="Cloud Computing & Distributed Systems">Cloud Computing & Distributed Systems</option>
              <option value="AI & Machine Learning">AI & Machine Learning</option>
              <option value="Cybersecurity & Cryptography">Cybersecurity & Cryptography</option>
              <option value="Web & Full-Stack Development">Web & Full-Stack Development</option>
              <option value="Mobile Applications">Mobile Applications</option>
              <option value="Internet of Things (IoT)">Internet of Things (IoT)</option>
              <option value="Blockchain & Decentralized Tech">Blockchain & Decentralized Tech</option>
            </select>
          </div>

          <button
            onClick={fetchProposals}
            className="btn btn-primary"
            style={{ padding: '9px 18px', fontSize: '13px' }}
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Proposals List Table / Cards */}
      <div className="card" style={{ padding: '0', borderRadius: '18px', overflow: 'hidden' }}>
        {loading ? (
          <div className="p-12 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>
        ) : proposals.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <i className="fa-solid fa-inbox text-4xl mb-3 block"></i>
            No project team proposals match the selected filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF5FF', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '14px 20px' }}>Team & Project</th>
                  <th style={{ padding: '14px 20px' }}>Domain & Technologies</th>
                  <th style={{ padding: '14px 20px' }}>Leader & Members</th>
                  <th style={{ padding: '14px 20px' }}>Assigned Faculty Mentor</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((team) => (
                  <tr key={team.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    {/* Team & Project */}
                    <td style={{ padding: '14px 20px' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>
                        {team.name}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>
                        {team.project_title || 'Untitled Proposal'}
                      </span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Created: {new Date(team.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Domain & Technologies */}
                    <td style={{ padding: '14px 20px' }}>
                      <span className="badge badge-indigo text-xs" style={{ marginBottom: '4px', display: 'inline-block' }}>
                        {team.domain || 'General CS'}
                      </span>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {team.technologies || 'None listed'}
                      </div>
                    </td>

                    {/* Leader & Members */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={team.leader_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt=""
                          className="avatar avatar-xs"
                        />
                        <div>
                          <strong style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'block' }}>
                            {team.leader_name || 'Leader'}
                          </strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {team.member_count} / {team.max_members || 4} members
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Assigned Faculty */}
                    <td style={{ padding: '14px 20px' }}>
                      {team.faculty_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={team.faculty_avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
                            alt=""
                            className="avatar avatar-xs"
                          />
                          <div>
                            <strong style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'block' }}>
                              {team.faculty_name}
                            </strong>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {team.faculty_designation || 'Faculty'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Not Allocated
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 20px' }}>
                      {getStatusBadge(team.status, team.faculty_id)}
                    </td>

                    {/* Action Button */}
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenReview(team)}
                        className={`btn ${team.status === 'pending_approval' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                      >
                        {team.status === 'pending_approval' ? (
                          <><i className="fa-solid fa-clipboard-check mr-1"></i> Review Proposal</>
                        ) : !team.faculty_id ? (
                          <><i className="fa-solid fa-user-plus mr-1"></i> Assign Mentor</>
                        ) : (
                          <><i className="fa-solid fa-circle-info mr-1"></i> View & Reassign</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================
          REVIEW PROPOSAL & MENTOR ASSIGNMENT MODAL
      ======================================================== */}
      {reviewTeam && (
        <Modal
          isOpen={!!reviewTeam}
          onClose={() => setReviewTeam(null)}
          title={`Review Team Proposal: ${reviewTeam.name}`}
          maxWidth="840px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Block */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="badge badge-indigo text-xs mb-1">{reviewTeam.domain}</span>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '2px 0', color: 'var(--text-primary)' }}>
                  {reviewTeam.project_title || reviewTeam.name}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Team Leader: <strong>{reviewTeam.leader_name}</strong> ({reviewTeam.leader_email}) • Target Date: <strong>{reviewTeam.target_date || 'N/A'}</strong>
                </div>
              </div>
              {getStatusBadge(reviewTeam.status, reviewTeam.faculty_id)}
            </div>

            {/* Scope & Objectives */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Problem Statement & Scope
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {reviewTeam.description || 'No description provided.'}
                </p>
              </div>

              <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Objectives & Deliverables
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {reviewTeam.objectives || 'Standard capstone project deliverables.'}
                </p>
              </div>
            </div>

            {/* Tech Stack & Required Skills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '8px' }}>
                  Technologies:
                </span>
                {(reviewTeam.technologies ? reviewTeam.technologies.split(',') : []).map((t, i) => (
                  <span key={i} className="badge badge-indigo text-xs mr-1 mb-1">{t.trim()}</span>
                ))}
              </div>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '8px' }}>
                  Required Skills:
                </span>
                {(reviewTeam.required_skills ? reviewTeam.required_skills.split(',') : []).map((s, i) => (
                  <span key={i} className="badge badge-neutral text-xs mr-1 mb-1">{s.trim()}</span>
                ))}
              </div>
            </div>

            {/* Team Roster */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Proposed Team Members ({reviewTeam.members?.length || 1} / {reviewTeam.max_members || 4}):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                {reviewTeam.members?.map((m) => (
                  <div key={m.id} style={{ padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#fff' }}>
                    <img src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="" className="avatar avatar-xs" />
                    <div>
                      <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{m.name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {m.reg_no} • {m.strength || 'student'} (CGPA: {m.cgpa || 'N/A'})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 1: PROPOSAL DECISION (if pending or modification) */}
            {reviewTeam.status === 'pending_approval' && (
              <div style={{ borderTop: '2px solid var(--border-light)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>
                  <i className="fa-solid fa-gavel text-indigo mr-1"></i> Proposal Decision
                </h4>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">HOD Feedback / Remarks (Optional for approval, required for rejection/changes)</label>
                  <textarea
                    rows={2}
                    value={decisionRemarks}
                    onChange={(e) => setDecisionRemarks(e.target.value)}
                    placeholder="Provide constructive feedback, modifications to project scope, or approval notes..."
                    className="form-textarea"
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleProposalDecision('approve')}
                    disabled={deciding}
                    style={{
                      backgroundColor: '#16A34A',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 18px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fa-solid fa-check mr-1"></i> Approve Proposal
                  </button>

                  <button
                    onClick={() => handleProposalDecision('request_modifications')}
                    disabled={deciding || !decisionRemarks.trim()}
                    style={{
                      backgroundColor: '#D97706',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 18px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: !decisionRemarks.trim() ? 'not-allowed' : 'pointer',
                      opacity: !decisionRemarks.trim() ? 0.6 : 1
                    }}
                  >
                    <i className="fa-solid fa-pen-to-square mr-1"></i> Request Modifications
                  </button>

                  <button
                    onClick={() => handleProposalDecision('reject')}
                    disabled={deciding || !decisionRemarks.trim()}
                    style={{
                      backgroundColor: '#DC2626',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 18px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: !decisionRemarks.trim() ? 'not-allowed' : 'pointer',
                      opacity: !decisionRemarks.trim() ? 0.6 : 1
                    }}
                  >
                    <i className="fa-solid fa-xmark mr-1"></i> Reject Proposal
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 2: MENTOR RECOMMENDATION & ALLOCATION ENGINE (if approved) */}
            {reviewTeam.status === 'approved' && (
              <div style={{ borderTop: '2px solid var(--border-light)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      <i className="fa-solid fa-wand-magic-sparkles text-indigo mr-1"></i> Faculty Mentor Recommendation & Allocation
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Ranked dynamically by domain expertise (45%), tech stack match (30%), and current mentoring workload (25%).
                    </span>
                  </div>
                </div>

                {loadingRecs ? (
                  <div className="p-6 text-center"><i className="fa-solid fa-spinner fa-spin text-xl text-indigo"></i> Generating recommendations...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                    {recommendations.map((fac) => {
                      const isSelected = selectedFacultyId === fac.id;
                      const isHigh = fac.compatibility_score >= 80;

                      return (
                        <div
                          key={fac.id}
                          onClick={() => setSelectedFacultyId(fac.id)}
                          style={{
                            padding: '12px 16px',
                            border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                            backgroundColor: isSelected ? '#FAF5FF' : '#fff',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                              type="radio"
                              name="facultySelection"
                              checked={isSelected}
                              onChange={() => setSelectedFacultyId(fac.id)}
                              style={{ cursor: 'pointer' }}
                            />
                            <img
                              src={fac.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
                              alt=""
                              className="avatar avatar-sm"
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                                  {fac.name}
                                </strong>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {fac.designation}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {fac.compatibility_explanation}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Subjects: <strong>{fac.subjects}</strong>
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div
                              style={{
                                padding: '4px 10px',
                                borderRadius: '8px',
                                backgroundColor: isHigh ? '#DCFCE7' : '#EEF2FF',
                                color: isHigh ? '#16A34A' : 'var(--color-primary)',
                                fontWeight: 800,
                                fontSize: '12px',
                                display: 'inline-block'
                              }}
                            >
                              {fac.compatibility_score}% Match
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Workload: {fac.active_teams_count} teams
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label className="form-label">Assignment Note / Department Guidelines (Optional)</label>
                  <input
                    type="text"
                    value={mentorNote}
                    onChange={(e) => setMentorNote(e.target.value)}
                    placeholder="e.g. Approved for Spring 2026 Capstone Guidance; weekly milestone reviews required."
                    className="form-input"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button
                    onClick={() => setReviewTeam(null)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignMentor}
                    disabled={!selectedFacultyId || assigningMentor}
                    className="btn btn-primary"
                  >
                    {assigningMentor ? (
                      <><i className="fa-solid fa-spinner fa-spin mr-1"></i> Assigning Mentor...</>
                    ) : (
                      <><i className="fa-solid fa-check-double mr-1"></i> Confirm Faculty Mentor Assignment</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {reviewTeam.status === 'rejected' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setReviewTeam(null)} className="btn btn-outline">Close</button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
