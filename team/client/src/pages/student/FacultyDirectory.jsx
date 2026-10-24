import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function FacultyDirectory({ onOpenFacultyModal }) {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchFaculty() {
      try {
        setLoading(true);
        const data = await api.getFacultyDirectory();
        setFaculty(data.faculty || []);
      } catch (err) {
        console.error('Failed to load faculty directory:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFaculty();
  }, []);

  const filtered = faculty.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.subjects.toLowerCase().includes(search.toLowerCase()) ||
    f.languages.toLowerCase().includes(search.toLowerCase()) ||
    f.department.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card">
        <div className="card-title-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="card-main-title">
              <i className="fa-solid fa-chalkboard-user text-indigo mr-2"></i> Department Faculty Mentors
            </h3>
            <p className="card-subtitle">
              Browse guide profiles, research subjects, and technical stacks for project alignment
            </p>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }}></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects, faculty name, tech..."
              style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filtered.map((f) => (
            <div
              key={f.id}
              className="card hover-lift"
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <img
                    src={f.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt=""
                    className="avatar avatar-lg"
                  />
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      {f.name}
                    </h4>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{f.designation}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.department}</div>
                  </div>
                </div>

                {f.bio && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '12px' }}>
                    "{f.bio}"
                  </p>
                )}

                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Specialization Subjects
                  </span>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {f.subjects}
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Programming Languages
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {f.languages.split(',').map((l, i) => (
                      <span key={i} style={{ backgroundColor: '#EEF2FF', color: '#4338CA', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                        {l.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="badge badge-indigo">
                  {f.workload} Mentees Guided
                </span>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {f.linkedin_url && (
                    <a href={f.linkedin_url} target="_blank" rel="noreferrer" title="LinkedIn" style={{ color: '#0A66C2' }}>
                      <i className="fa-brands fa-linkedin text-lg"></i>
                    </a>
                  )}
                  {onOpenFacultyModal && (
                    <button
                      className="btn btn-sm btn-subtle"
                      onClick={() => onOpenFacultyModal(f.id)}
                    >
                      Details
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
