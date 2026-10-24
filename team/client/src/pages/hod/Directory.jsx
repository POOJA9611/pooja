import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function Directory() {
  const [tab, setTab] = useState('students'); // 'students' or 'faculty'
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadDirectory() {
      try {
        setLoading(true);
        const [stdRes, facRes] = await Promise.all([
          api.getHodStudents(),
          api.getHodFaculty()
        ]);
        setStudents(stdRes.students || []);
        setFaculty(facRes.faculty || []);
      } catch (err) {
        console.error('Failed to load directory:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDirectory();
  }, []);

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.reg_no.toLowerCase().includes(search.toLowerCase()) ||
    s.languages.toLowerCase().includes(search.toLowerCase()) ||
    s.strength.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFaculty = faculty.filter((f) =>
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
      {/* Notice Banner Reinforcing Governance Model */}
      <div
        style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          color: '#1E40AF'
        }}
      >
        <i className="fa-solid fa-shield-halved text-lg"></i>
        <div>
          <strong>View-Only Academic Registry:</strong> Student and faculty accounts are self-registered through the public portal. The HOD maintains strictly read-only audit access to technical strengths and mentoring profiles to inform allocation decisions.
        </div>
      </div>

      <div className="card">
        <div className="card-title-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
          {/* Tab Selector */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${tab === 'students' ? 'btn-primary' : 'btn-subtle'}`}
              onClick={() => setTab('students')}
            >
              <i className="fa-solid fa-user-graduate mr-2"></i> Registered Students ({students.length})
            </button>
            <button
              className={`btn ${tab === 'faculty' ? 'btn-primary' : 'btn-subtle'}`}
              onClick={() => setTab('faculty')}
            >
              <i className="fa-solid fa-chalkboard-user mr-2"></i> Registered Faculty ({faculty.length})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }}></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${tab}...`}
              style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Students Tab View */}
        {tab === 'students' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 14px' }}>Student Profile</th>
                  <th style={{ padding: '12px 14px' }}>Reg No</th>
                  <th style={{ padding: '12px 14px' }}>Semester</th>
                  <th style={{ padding: '12px 14px' }}>CGPA</th>
                  <th style={{ padding: '12px 14px' }}>Technical Strength</th>
                  <th style={{ padding: '12px 14px' }}>Programming Languages</th>
                  <th style={{ padding: '12px 14px' }}>Assigned Faculty</th>
                  <th style={{ padding: '12px 14px' }}>Links</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No students found matching search.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={s.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt="" className="avatar avatar-sm" />
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{s.reg_no}</td>
                      <td style={{ padding: '12px 14px' }}>Sem {s.semester}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{s.cgpa}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`badge ${s.strength === 'frontend' ? 'badge-indigo' : s.strength === 'backend' ? 'badge-violet' : 'badge-emerald'}`}>
                          {s.strength}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', maxWidth: '200px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.languages}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {s.faculty_name ? (
                          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{s.faculty_name}</span>
                        ) : (
                          <span className="badge badge-warning">Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {s.github_url && (
                            <a href={s.github_url} target="_blank" rel="noreferrer" title="GitHub Profile" style={{ color: 'var(--text-secondary)' }}>
                              <i className="fa-brands fa-github text-base"></i>
                            </a>
                          )}
                          {s.linkedin_url && (
                            <a href={s.linkedin_url} target="_blank" rel="noreferrer" title="LinkedIn Profile" style={{ color: '#0A66C2' }}>
                              <i className="fa-brands fa-linkedin text-base"></i>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Faculty Tab View */}
        {tab === 'faculty' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 14px' }}>Faculty Member</th>
                  <th style={{ padding: '12px 14px' }}>Designation</th>
                  <th style={{ padding: '12px 14px' }}>Department</th>
                  <th style={{ padding: '12px 14px' }}>Specialization Subjects</th>
                  <th style={{ padding: '12px 14px' }}>Programming Languages</th>
                  <th style={{ padding: '12px 14px' }}>Current Workload</th>
                  <th style={{ padding: '12px 14px' }}>Links</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculty.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No faculty found matching search.
                    </td>
                  </tr>
                ) : (
                  filteredFaculty.map((f) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={f.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="" className="avatar avatar-sm" />
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{f.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{f.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{f.designation}</td>
                      <td style={{ padding: '12px 14px' }}>{f.department}</td>
                      <td style={{ padding: '12px 14px', maxWidth: '240px' }}>{f.subjects}</td>
                      <td style={{ padding: '12px 14px', maxWidth: '200px' }}>{f.languages}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 800,
                            backgroundColor: f.workload > 3 ? '#FEF3C7' : '#DCFCE7',
                            color: f.workload > 3 ? '#D97706' : '#16A34A'
                          }}
                        >
                          {f.workload} Mentees
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {f.linkedin_url && (
                          <a href={f.linkedin_url} target="_blank" rel="noreferrer" title="LinkedIn Profile" style={{ color: '#0A66C2' }}>
                            <i className="fa-brands fa-linkedin text-base"></i>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
