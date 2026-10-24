import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function Assignments() {
  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [targetFacultyId, setTargetFacultyId] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [studentFilter, setStudentFilter] = useState('unassigned'); // 'unassigned', 'all', 'assigned'
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const [facRes, stdRes, histRes] = await Promise.all([
        api.getHodFaculty(),
        api.getHodStudents(),
        api.getAssignmentHistory()
      ]);
      setFaculty(facRes.faculty || []);
      setStudents(stdRes.students || []);
      setHistory(histRes.history || []);
      if (facRes.faculty && facRes.faculty.length > 0) {
        setTargetFacultyId(facRes.faculty[0].id);
      }
    } catch (err) {
      console.error('Failed to load assignments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectAll = (filtered) => {
    if (selectedStudentIds.length === filtered.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filtered.map((s) => s.id));
    }
  };

  const handleToggleStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      setMessage({ text: 'Please select at least one student to assign.', type: 'error' });
      return;
    }
    if (!targetFacultyId) {
      setMessage({ text: 'Please select a destination faculty mentor.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await api.assignStudents(selectedStudentIds, targetFacultyId, assignmentNote);
      setMessage({ text: res.message, type: 'success' });
      setSelectedStudentIds([]);
      setAssignmentNote('');
      await loadData();
    } catch (err) {
      setMessage({ text: err.message || 'Failed to assign students.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter students based on filter tab and search
  const filteredStudents = students.filter((s) => {
    const matchesFilter =
      studentFilter === 'all'
        ? true
        : studentFilter === 'unassigned'
        ? !s.faculty_id
        : !!s.faculty_id;
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.reg_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.languages.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.strength.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Workload Overview Cards */}
      <div className="card">
        <div className="card-title-row">
          <div>
            <h3 className="card-main-title">Faculty Mentors & Current Workload</h3>
            <p className="card-subtitle">Review research focus and current mentee allocation to prevent imbalance</p>
          </div>
          <span className="badge badge-indigo">{faculty.length} Mentors Active</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {faculty.map((f) => (
            <div
              key={f.id}
              style={{
                border: targetFacultyId == f.id ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '16px',
                backgroundColor: targetFacultyId == f.id ? '#EEF2FF' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => setTargetFacultyId(f.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={f.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="" className="avatar avatar-sm" />
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>{f.name}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{f.designation}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      display: 'inline-block',
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
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <strong>Subjects:</strong> {f.subjects}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                <strong>Tech:</strong> {f.languages}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assignment Control Box */}
      <div className="card">
        <div className="card-title-row">
          <div>
            <h3 className="card-main-title">Assign / Reassign Students</h3>
            <p className="card-subtitle">Select single or multiple students and allocate to a faculty mentor</p>
          </div>
          {selectedStudentIds.length > 0 && (
            <span className="badge badge-indigo font-bold">{selectedStudentIds.length} Student(s) Selected</span>
          )}
        </div>

        {message.text && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '16px',
              backgroundColor: message.type === 'success' ? '#DCFCE7' : '#FEE2E2',
              color: message.type === 'success' ? '#16A34A' : '#DC2626',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleAssign} style={{ marginBottom: '24px', backgroundColor: 'var(--bg-subtle)', padding: '16px', borderRadius: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr auto', gap: '14px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Target Faculty Mentor:
              </label>
              <select
                value={targetFacultyId}
                onChange={(e) => setTargetFacultyId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: 600 }}
              >
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.workload} assigned mentees)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Assignment Note (Logged in History):
              </label>
              <input
                type="text"
                value={assignmentNote}
                onChange={(e) => setAssignmentNote(e.target.value)}
                placeholder="e.g. Assigned based on Cloud Computing capstone domain"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || selectedStudentIds.length === 0}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                padding: '11px 22px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: submitting || selectedStudentIds.length === 0 ? 'not-allowed' : 'pointer',
                opacity: selectedStudentIds.length === 0 ? 0.6 : 1,
                boxShadow: 'var(--shadow-sm)',
                whiteSpace: 'nowrap'
              }}
            >
              {submitting ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-check mr-2"></i>}
              Assign Selected ({selectedStudentIds.length})
            </button>
          </div>
        </form>

        {/* Filter Controls & Search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn btn-sm ${studentFilter === 'unassigned' ? 'btn-primary' : 'btn-subtle'}`}
              onClick={() => setStudentFilter('unassigned')}
            >
              Unassigned Students ({students.filter((s) => !s.faculty_id).length})
            </button>
            <button
              className={`btn btn-sm ${studentFilter === 'assigned' ? 'btn-primary' : 'btn-subtle'}`}
              onClick={() => setStudentFilter('assigned')}
            >
              Already Assigned ({students.filter((s) => s.faculty_id).length})
            </button>
            <button
              className={`btn btn-sm ${studentFilter === 'all' ? 'btn-primary' : 'btn-subtle'}`}
              onClick={() => setStudentFilter('all')}
            >
              All Students ({students.length})
            </button>
          </div>

          <div style={{ position: 'relative', width: '260px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)', fontSize: '13px' }}></i>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by name, reg no, tech..."
              style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Students Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 14px', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                    onChange={() => handleSelectAll(filteredStudents)}
                  />
                </th>
                <th style={{ padding: '10px 14px' }}>Student</th>
                <th style={{ padding: '10px 14px' }}>Reg No</th>
                <th style={{ padding: '10px 14px' }}>Strength</th>
                <th style={{ padding: '10px 14px' }}>Languages Known</th>
                <th style={{ padding: '10px 14px' }}>CGPA</th>
                <th style={{ padding: '10px 14px' }}>Current Mentor</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No students matching current filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      backgroundColor: selectedStudentIds.includes(s.id) ? '#F5F3FF' : 'transparent',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleToggleStudent(s.id)}
                  >
                    <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => handleToggleStudent(s.id)}
                      />
                    </td>
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
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`badge ${s.strength === 'frontend' ? 'badge-indigo' : s.strength === 'backend' ? 'badge-violet' : 'badge-emerald'}`}>
                        {s.strength}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.languages}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{s.cgpa}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {s.faculty_name ? (
                        <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{s.faculty_name}</span>
                      ) : (
                        <span className="badge badge-warning">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Audit History Log */}
      <div className="card">
        <div className="card-title-row">
          <h3 className="card-main-title">
            <i className="fa-solid fa-clock-rotate-left mr-2 text-indigo"></i> Allocation Audit History Log
          </h3>
          <span className="badge badge-indigo">Tracked Automatically</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 14px' }}>Date & Time</th>
                <th style={{ padding: '10px 14px' }}>Student</th>
                <th style={{ padding: '10px 14px' }}>Assigned Faculty</th>
                <th style={{ padding: '10px 14px' }}>Assigned By</th>
                <th style={{ padding: '10px 14px' }}>Reason / Note</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No assignment history logs recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                      {new Date(h.assigned_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{h.student_name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-primary)', fontWeight: 600 }}>{h.faculty_name}</td>
                    <td style={{ padding: '10px 14px' }}>{h.assigned_by_name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{h.note || 'Direct Assignment'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
