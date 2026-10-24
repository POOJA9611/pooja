import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';

export default function FacultyTeams({ onNavigateToChat }) {
  const [teams, setTeams] = useState([]);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Team Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState('');

  // Add Member Modal State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [activeTeamForAdd, setActiveTeamForAdd] = useState(null);
  const [studentToAddId, setStudentToAddId] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamRes, stdRes] = await Promise.all([
        api.getTeams(),
        api.getMyStudents()
      ]);
      setTeams(teamRes.teams || []);
      setAssignedStudents(stdRes.students || []);
    } catch (err) {
      console.error('Failed to load teams data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleSelectStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setModalError('Team name is required.');
      return;
    }
    if (selectedStudentIds.length === 0) {
      setModalError('Select at least one assigned student for this team.');
      return;
    }

    setCreating(true);
    setModalError('');
    try {
      await api.createTeam(teamName.trim(), selectedStudentIds);
      setShowCreateModal(false);
      setTeamName('');
      setSelectedStudentIds([]);
      await loadData();
    } catch (err) {
      setModalError(err.message || 'Failed to create team.');
    } finally {
      setCreating(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!activeTeamForAdd || !studentToAddId) return;

    try {
      await api.addTeamMember(activeTeamForAdd.id, studentToAddId);
      setShowAddMemberModal(false);
      setActiveTeamForAdd(null);
      setStudentToAddId('');
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to add member.');
    }
  };

  const handleRemoveMember = async (teamId, studentId, studentName) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from this team?`)) return;

    try {
      await api.removeTeamMember(teamId, studentId);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to remove member.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card">
        <div className="card-title-row">
          <div>
            <h3 className="card-main-title">
              <i className="fa-solid fa-people-group text-indigo mr-2"></i> Capstone Teams & Formations
            </h3>
            <p className="card-subtitle">
              Assemble multiple project teams from your assigned students. Creating a team automatically spins up a dedicated real-time group chat.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <i className="fa-solid fa-plus mr-2"></i> Form New Team
          </button>
        </div>

        {teams.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-users-slash text-4xl mb-3 block"></i>
            <div>No teams formed yet. Click <strong>"Form New Team"</strong> to create a team from your assigned students.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
            {teams.map((t) => (
              <div
                key={t.id}
                className="card"
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '20px',
                  backgroundColor: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px'
                        }}
                      >
                        <i className="fa-solid fa-people-roof"></i>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                          {t.name}
                        </h4>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Created {new Date(t.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className="badge badge-indigo">{t.members ? t.members.length : 0} Members</span>
                  </div>

                  {/* Team Members List */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        Student Members
                      </span>
                      <button
                        onClick={() => {
                          setActiveTeamForAdd(t);
                          setStudentToAddId('');
                          setShowAddMemberModal(true);
                        }}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <i className="fa-solid fa-user-plus mr-1"></i> Add Member
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {t.members && t.members.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'var(--bg-subtle)',
                            padding: '8px 12px',
                            borderRadius: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src={m.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt="" className="avatar avatar-sm" />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700 }}>{m.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{m.strength} • CGPA {m.cgpa}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(t.id, m.id, m.name)}
                            title="Remove from team"
                            style={{
                              color: 'var(--color-danger)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                          >
                            <i className="fa-solid fa-user-minus"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Projects in this team */}
                  {t.projects && t.projects.length > 0 && (
                    <div style={{ marginBottom: '14px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                        Team Projects
                      </span>
                      {t.projects.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            border: '1px solid var(--border-light)',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            fontSize: '12px',
                            backgroundColor: '#F8FAFC'
                          }}
                        >
                          <strong>{p.title}</strong>
                          <span className={`badge ${p.status === 'completed' ? 'badge-emerald' : 'badge-warning'} ml-2`}>
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Team Footer Action: Jump to auto-created Group Chat */}
                <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      if (onNavigateToChat) onNavigateToChat(t.chat_group_id);
                    }}
                  >
                    <i className="fa-solid fa-comments mr-2"></i> Open Team Chat Workspace
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Team Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Form New Capstone Team">
        <form onSubmit={handleCreateTeam}>
          {modalError && (
            <div style={{ padding: '10px 14px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
              {modalError}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Team Name *
            </label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Distributed Consensus Pod, Team AI Health"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
              Select Members from Your Assigned Students *
            </label>

            {assignedStudents.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                You have no assigned students yet. Request the HOD to allocate students first.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {assignedStudents.map((s) => (
                  <label
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      backgroundColor: selectedStudentIds.includes(s.id) ? '#EEF2FF' : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(s.id)}
                      onChange={() => handleToggleSelectStudent(s.id)}
                    />
                    <img src={s.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt="" className="avatar avatar-sm" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{s.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {s.reg_no} • {s.strength} • Tech: {s.languages}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-subtle" onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || assignedStudents.length === 0}
              className="btn btn-primary"
            >
              {creating ? 'Creating...' : 'Form Team & Auto-Create Chat'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} title={`Add Member to ${activeTeamForAdd?.name}`}>
        <form onSubmit={handleAddMember}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
              Select Student from Your Assigned Mentees:
            </label>
            <select
              value={studentToAddId}
              onChange={(e) => setStudentToAddId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
              required
            >
              <option value="">-- Choose student --</option>
              {assignedStudents
                .filter((s) => !activeTeamForAdd?.members?.some((m) => m.id === s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.reg_no} • {s.strength} • {s.languages})
                  </option>
                ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-subtle" onClick={() => setShowAddMemberModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add to Team
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
