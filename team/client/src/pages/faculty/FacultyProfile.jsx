import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function FacultyProfile() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [bio, setBio] = useState('');
  const [subjects, setSubjects] = useState('');
  const [languages, setLanguages] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [avatar, setAvatar] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const data = await api.getFacultyProfile();
        const p = data.profile;
        setProfile(p);
        setName(p.name || '');
        setDesignation(p.designation || '');
        setDepartment(p.department || '');
        setBio(p.bio || '');
        setSubjects(p.subjects || '');
        setLanguages(p.languages || '');
        setLinkedinUrl(p.linkedin_url || '');
        setAvatar(p.avatar || '');
      } catch (err) {
        console.error('Failed to load faculty profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage({ text: '', type: '' });

    try {
      const res = await api.updateFacultyProfile({
        name,
        designation,
        department,
        bio,
        subjects,
        languages,
        linkedin_url: linkedinUrl,
        avatar
      });
      setStatusMessage({ text: 'Academic profile successfully updated!', type: 'success' });
      setProfile(res.profile);
    } catch (err) {
      setStatusMessage({ text: err.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card">
        <div className="card-title-row">
          <div>
            <h3 className="card-main-title">
              <i className="fa-solid fa-id-card text-indigo mr-2"></i> Faculty Academic Profile & Guidance Domains
            </h3>
            <p className="card-subtitle">
              Keep your research subjects and technical skills up-to-date for HOD mentee allocations
            </p>
          </div>
          <span className="badge badge-indigo">{profile?.department}</span>
        </div>

        {statusMessage.text && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '16px',
              backgroundColor: statusMessage.type === 'success' ? '#DCFCE7' : '#FEE2E2',
              color: statusMessage.type === 'success' ? '#16A34A' : '#DC2626',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className={`fa-solid ${statusMessage.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Official College Email (Read-only)
              </label>
              <input
                type="email"
                disabled
                value={profile?.email || ''}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Academic Designation *
              </label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Department *
              </label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Specialization Subjects & Project Guidance Domains *
            </label>
            <input
              type="text"
              required
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              placeholder="e.g. Cloud Computing, Microservices, Distributed Systems"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Programming Languages Known *
            </label>
            <input
              type="text"
              required
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="e.g. Python, Java, Go, TypeScript"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Profile Avatar URL
              </label>
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Faculty Bio / Research Summary
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Outline your research focus, lab initiatives, and mentoring preferences..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ padding: '12px 28px' }}
            >
              {saving ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-floppy-disk mr-2"></i>}
              Save Profile Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
