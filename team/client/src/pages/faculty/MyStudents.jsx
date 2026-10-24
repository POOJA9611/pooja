import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function MyStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStrength, setFilterStrength] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchStudents() {
      try {
        setLoading(true);
        const data = await api.getMyStudents();
        setStudents(data.students || []);
      } catch (err) {
        console.error('Failed to load my students:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  const filteredStudents = students.filter((s) => {
    const matchesStrength = filterStrength === 'all' || s.strength === filterStrength;
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.reg_no.toLowerCase().includes(search.toLowerCase()) ||
      s.languages.toLowerCase().includes(search.toLowerCase());
    return matchesStrength && matchesSearch;
  });

  if (loading) {
    return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card">
        <div className="card-title-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="card-main-title">
              <i className="fa-solid fa-user-graduate text-indigo mr-2"></i> My Assigned Mentees
            </h3>
            <p className="card-subtitle">
              Strictly restricted to students allocated to your guidance by the HOD
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Filter by technical strength */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {['all', 'frontend', 'backend', 'fullstack'].map((st) => (
                <button
                  key={st}
                  className={`btn btn-sm ${filterStrength === st ? 'btn-primary' : 'btn-subtle'}`}
                  onClick={() => setFilterStrength(st)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', width: '240px' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }}></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students..."
                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
              />
            </div>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No assigned students found matching criteria.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {filteredStudents.map((s) => (
              <div
                key={s.id}
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
                  {/* Student Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={s.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt="" className="avatar avatar-md" />
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>{s.name}</h4>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.reg_no}</span>
                      </div>
                    </div>
                    <span className={`badge ${s.strength === 'frontend' ? 'badge-indigo' : s.strength === 'backend' ? 'badge-violet' : 'badge-emerald'}`}>
                      {s.strength}
                    </span>
                  </div>

                  {/* Academic Metrics Row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      backgroundColor: 'var(--bg-subtle)',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      marginBottom: '14px',
                      fontSize: '12px'
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Semester:</span> <strong>Sem {s.semester}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>CGPA:</span> <strong>{s.cgpa} / 10.0</strong>
                    </div>
                  </div>

                  {/* Bio */}
                  {s.bio && (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
                      "{s.bio}"
                    </p>
                  )}

                  {/* Languages */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Programming Languages & Frameworks
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {s.languages.split(',').map((lang, idx) => (
                        <span key={idx} style={{ backgroundColor: '#EEF2FF', color: '#4338CA', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                          {lang.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Projects Section */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Projects ({s.projects ? s.projects.length : 0})
                    </div>
                    {!s.projects || s.projects.length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No projects logged yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {s.projects.map((proj) => (
                          <div
                            key={proj.id}
                            style={{
                              border: '1px solid var(--border-light)',
                              borderRadius: '8px',
                              padding: '8px 10px',
                              backgroundColor: '#F8FAFC'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{proj.title}</strong>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: proj.status === 'completed' ? '#DCFCE7' : '#FEF3C7',
                                  color: proj.status === 'completed' ? '#16A34A' : '#D97706'
                                }}
                              >
                                {proj.status}
                              </span>
                            </div>
                            {proj.description && (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                                {proj.description}
                              </div>
                            )}
                            {proj.team_name && (
                              <div style={{ fontSize: '10px', color: 'var(--color-primary)', marginTop: '4px' }}>
                                <i className="fa-solid fa-people-group mr-1"></i> Team: {proj.team_name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Links */}
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <i className="fa-regular fa-envelope mr-1"></i> {s.email}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {s.github_url && (
                      <a href={s.github_url} target="_blank" rel="noreferrer" title="GitHub" style={{ color: 'var(--text-primary)' }}>
                        <i className="fa-brands fa-github text-lg"></i>
                      </a>
                    )}
                    {s.linkedin_url && (
                      <a href={s.linkedin_url} target="_blank" rel="noreferrer" title="LinkedIn" style={{ color: '#0A66C2' }}>
                        <i className="fa-brands fa-linkedin text-lg"></i>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
