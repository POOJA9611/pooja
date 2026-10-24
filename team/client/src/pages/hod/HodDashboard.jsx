import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatCard from '../../components/StatCard';

export default function HodDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await api.getHodStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load HOD stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>;
  }

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
          boxShadow: '0 10px 25px -5px rgba(67, 56, 202, 0.4)'
        }}
      >
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85 }}>
            Department Executive Console
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', marginBottom: '8px' }}>
            Welcome, Head of Department
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.9, maxWidth: '600px', margin: 0 }}>
            Oversee capstone project guidance, faculty student allocations, mentor change requests, and department broadcasts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => onNavigate('assignments')}
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
            <i className="fa-solid fa-user-plus mr-2"></i> Assign Students
          </button>
          <button
            onClick={() => onNavigate('post-notification')}
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
            <i className="fa-solid fa-bullhorn mr-2"></i> Post Notice
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid-four">
        <StatCard
          title="Registered Students"
          value={stats?.totalStudents || 0}
          icon="fa-solid fa-user-graduate"
          colorClass="bg-indigo-light"
          subtext="Undergraduate cohort"
        />
        <StatCard
          title="Faculty Mentors"
          value={stats?.totalFaculty || 0}
          icon="fa-solid fa-chalkboard-user"
          colorClass="bg-violet-light"
          subtext="Department guides"
        />
        <StatCard
          title="Unassigned Students"
          value={stats?.unassignedStudents || 0}
          icon="fa-solid fa-user-clock"
          colorClass={stats?.unassignedStudents > 0 ? "bg-amber-light" : "bg-emerald-light"}
          subtext={stats?.unassignedStudents > 0 ? "Needs mentor allocation" : "All students allocated"}
        />
        <StatCard
          title="Change Requests"
          value={stats?.pendingChangeRequests || 0}
          icon="fa-solid fa-inbox"
          colorClass={stats?.pendingChangeRequests > 0 ? "bg-amber-light" : "bg-emerald-light"}
          subtext={stats?.pendingChangeRequests > 0 ? "Pending review" : "Inbox clear"}
        />
      </div>

      {/* Quick Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div className="card hover-lift" style={{ cursor: 'pointer' }} onClick={() => onNavigate('assignments')}>
          <div className="card-title-row">
            <h3 className="card-main-title">
              <i className="fa-solid fa-users-gear text-indigo mr-2"></i> Faculty Mentorship Allocation
            </h3>
            <span className="badge badge-indigo">Manage</span>
          </div>
          <p className="card-subtitle" style={{ marginBottom: '16px' }}>
            Balance department workloads by assigning students to faculty mentors based on specialization subjects and technical languages.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-primary)', fontWeight: 700 }}>
            <span>Review workload distributions</span>
            <i className="fa-solid fa-arrow-right"></i>
          </div>
        </div>

        <div className="card hover-lift" style={{ cursor: 'pointer' }} onClick={() => onNavigate('hod-team-requests')}>
          <div className="card-title-row">
            <h3 className="card-main-title">
              <i className="fa-solid fa-clipboard-check text-indigo mr-2"></i> Project Team Proposals & Mentors
            </h3>
            <span className="badge badge-indigo">Manage</span>
          </div>
          <p className="card-subtitle" style={{ marginBottom: '16px' }}>
            Review student project team submissions, approve capstone proposals, and allocate faculty mentors using genuine algorithmic compatibility.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-primary)', fontWeight: 700 }}>
            <span>Review team proposals & mentor allocation</span>
            <i className="fa-solid fa-arrow-right"></i>
          </div>
        </div>

        <div className="card hover-lift" style={{ cursor: 'pointer' }} onClick={() => onNavigate('change-requests')}>
          <div className="card-title-row">
            <h3 className="card-main-title">
              <i className="fa-solid fa-arrows-split-up-and-left text-violet mr-2"></i> Mentor Change Requests
            </h3>
            {stats?.pendingChangeRequests > 0 ? (
              <span className="badge badge-warning">{stats.pendingChangeRequests} Pending</span>
            ) : (
              <span className="badge badge-emerald">Clear</span>
            )}
          </div>
          <p className="card-subtitle" style={{ marginBottom: '16px' }}>
            Review student applications for mentor changes, examine project alignment reasons, and approve or reject with official remarks.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-secondary)', fontWeight: 700 }}>
            <span>Go to change requests inbox</span>
            <i className="fa-solid fa-arrow-right"></i>
          </div>
        </div>
      </div>
    </div>
  );
}
