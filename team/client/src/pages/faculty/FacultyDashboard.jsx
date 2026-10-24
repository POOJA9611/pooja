import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatCard from '../../components/StatCard';

export default function FacultyDashboard({ onNavigate }) {
  const [students, setStudents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [stdRes, teamRes] = await Promise.all([
          api.getMyStudents(),
          api.getTeams()
        ]);
        setStudents(stdRes.students || []);
        setTeams(teamRes.teams || []);
      } catch (err) {
        console.error('Failed to load faculty dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>;
  }

  const ongoingProjectsCount = students.reduce((acc, s) => {
    return acc + (s.projects ? s.projects.filter((p) => p.status === 'ongoing').length : 0);
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #4338CA 0%, #7C3AED 100%)',
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
            Faculty Mentorship Console
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', marginBottom: '8px' }}>
            Capstone Guidance Overview
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.9, maxWidth: '600px', margin: 0 }}>
            Monitor your assigned students' progress, form multidisciplinary capstone teams, and communicate in real-time.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => onNavigate('faculty-teams')}
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
            <i className="fa-solid fa-plus mr-2"></i> Form New Team
          </button>
          <button
            onClick={() => onNavigate('faculty-chat')}
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
            <i className="fa-solid fa-comments mr-2"></i> Team Chats
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid-four">
        <StatCard
          title="Assigned Students"
          value={students.length}
          icon="fa-solid fa-user-graduate"
          colorClass="bg-indigo-light"
          subtext="Under your direct guidance"
        />
        <StatCard
          title="Capstone Teams Formed"
          value={teams.length}
          icon="fa-solid fa-people-group"
          colorClass="bg-violet-light"
          subtext="Collaborative project pods"
        />
        <StatCard
          title="Active Projects"
          value={ongoingProjectsCount}
          icon="fa-solid fa-code"
          colorClass="bg-emerald-light"
          subtext="Ongoing capstone implementations"
        />
        <StatCard
          title="Team Group Chats"
          value={teams.length}
          icon="fa-solid fa-comments"
          colorClass="bg-blue-light"
          subtext="Real-time communication channels"
        />
      </div>

      {/* Assigned Students Quick List */}
      <div className="card">
        <div className="card-title-row">
          <div>
            <h3 className="card-main-title">
              <i className="fa-solid fa-user-check text-indigo mr-2"></i> Your Assigned Students Roster
            </h3>
            <p className="card-subtitle">Students allocated to your guidance by the HOD</p>
          </div>
          <button className="btn btn-sm btn-subtle" onClick={() => onNavigate('my-students')}>
            View Detailed Portfolios <i className="fa-solid fa-arrow-right ml-1"></i>
          </button>
        </div>

        {students.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No students currently assigned to your guidance.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {students.map((s) => (
              <div
                key={s.id}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '16px',
                  backgroundColor: '#fff'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <img src={s.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt="" className="avatar avatar-md" />
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>{s.name}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{s.reg_no} • Sem {s.semester}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  <span className={`badge ${s.strength === 'frontend' ? 'badge-indigo' : s.strength === 'backend' ? 'badge-violet' : 'badge-emerald'}`}>
                    {s.strength}
                  </span>
                  <span className="badge badge-indigo">CGPA: {s.cgpa}</span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <strong>Tech:</strong> {s.languages}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {s.projects && s.projects.length > 0 ? (
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                      <i className="fa-solid fa-circle-check mr-1"></i> {s.projects.length} Project(s) in Progress
                    </span>
                  ) : (
                    <span>No projects created yet</span>
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
