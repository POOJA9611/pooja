import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from './Modal';

export default function FacultyDetailModal({ facultyId, isOpen, onClose }) {
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!facultyId || !isOpen) return;

    async function loadFaculty() {
      try {
        setLoading(true);
        const data = await api.getFacultyDetail(facultyId);
        setFaculty(data.faculty);
      } catch (err) {
        console.error('Failed to load faculty details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFaculty();
  }, [facultyId, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Faculty Mentor Profile">
      {loading ? (
        <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>
      ) : faculty ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
            <img
              src={faculty.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt=""
              className="avatar avatar-xl"
              style={{ width: '64px', height: '64px', borderRadius: '14px' }}
            />
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px 0' }}>{faculty.name}</h3>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {faculty.designation} • {faculty.department}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '2px' }}>
                <i className="fa-regular fa-envelope mr-1"></i> {faculty.email}
              </div>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Specialization & Guidance Subjects
            </span>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
              {faculty.subjects}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Programming Languages Known
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {faculty.languages.split(',').map((l, i) => (
                <span key={i} style={{ backgroundColor: '#EEF2FF', color: '#4338CA', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                  {l.trim()}
                </span>
              ))}
            </div>
          </div>

          {faculty.bio && (
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Faculty Bio / Mentorship Statement
              </span>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {faculty.bio}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid var(--border-light)' }}>
            <span className="badge badge-indigo">
              {faculty.workload} Active Mentees
            </span>
            {faculty.linkedin_url && (
              <a
                href={faculty.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-subtle"
                style={{ color: '#0A66C2' }}
              >
                <i className="fa-brands fa-linkedin mr-1"></i> View LinkedIn
              </a>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Faculty profile could not be loaded.
        </div>
      )}
    </Modal>
  );
}
