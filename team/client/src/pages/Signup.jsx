import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Signup({ onGoToLogin }) {
  const { signup } = useAuth();
  const [role, setRole] = useState('student'); // 'student' or 'faculty' only!
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');

  // Student specific fields
  const [regNo, setRegNo] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [semester, setSemester] = useState(6);
  const [cgpa, setCgpa] = useState(8.5);
  const [strength, setStrength] = useState('fullstack');
  const [languages, setLanguages] = useState('JavaScript, Python, React');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  // Faculty specific fields
  const [designation, setDesignation] = useState('Assistant Professor');
  const [subjects, setSubjects] = useState('Cloud Computing, Distributed Systems');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        role,
        name,
        email,
        password,
        bio
      };

      if (role === 'student') {
        payload.reg_no = regNo;
        payload.department = department;
        payload.semester = Number(semester);
        payload.cgpa = Number(cgpa);
        payload.strength = strength;
        payload.languages = languages;
        payload.linkedin_url = linkedinUrl;
        payload.github_url = githubUrl;
      } else if (role === 'faculty') {
        payload.designation = designation;
        payload.department = department;
        payload.subjects = subjects;
        payload.languages = languages;
        payload.linkedin_url = linkedinUrl;
      }

      await signup(payload);
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #F7F8FC 100%)',
        padding: '32px 16px'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '620px',
          padding: '36px',
          boxShadow: 'var(--shadow-modal)',
          borderRadius: '24px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            Create Your Portal Account
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Join the department project guidance and capstone collaboration portal
          </p>
        </div>

        {/* Role Choice Selector: STUDENT OR FACULTY ONLY */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#F1F5F9',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '20px'
          }}
        >
          <button
            type="button"
            onClick={() => setRole('student')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: role === 'student' ? '#fff' : 'transparent',
              color: role === 'student' ? 'var(--color-primary)' : 'var(--text-secondary)',
              boxShadow: role === 'student' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <i className="fa-solid fa-user-graduate mr-2"></i> Student Account
          </button>
          <button
            type="button"
            onClick={() => setRole('faculty')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: role === 'faculty' ? '#fff' : 'transparent',
              color: role === 'faculty' ? 'var(--color-primary)' : 'var(--text-secondary)',
              boxShadow: role === 'faculty' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <i className="fa-solid fa-chalkboard-user mr-2"></i> Faculty Account
          </button>
        </div>

        {/* Role Info Notice */}
        {role === 'faculty' && (
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#1D4ED8',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fa-solid fa-circle-info"></i>
            <span>Faculty registration requires a valid college domain email address (ends with <strong>@college.edu</strong>).</span>
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: 'var(--color-danger-light)',
              color: 'var(--color-danger)',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'faculty' ? 'Dr. Jane Smith' : 'Alex Chen'}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === 'faculty' ? 'jane.smith@college.edu' : 'alex@student.edu'}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Password (min 6 characters) *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
            />
          </div>

          {/* Student Fields */}
          {role === 'student' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Register Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    placeholder="RA2211003010142"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Semester *
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Current CGPA *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    required
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Core Technical Strength *
                  </label>
                  <select
                    value={strength}
                    onChange={(e) => setStrength(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  >
                    <option value="frontend">Frontend Specialist</option>
                    <option value="backend">Backend Specialist</option>
                    <option value="fullstack">Full-Stack Generalist</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Languages / Tech Stack *
                  </label>
                  <input
                    type="text"
                    required
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    placeholder="Python, React, Node.js, C++"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    GitHub Profile URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    LinkedIn URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Faculty Fields */}
          {role === 'faculty' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Academic Designation *
                  </label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  >
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Professor">Professor</option>
                    <option value="Professor & Lab Director">Professor & Lab Director</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Areas of Expertise & Guidance Subjects *
                </label>
                <input
                  type="text"
                  required
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                  placeholder="Cloud Computing, Microservices, Distributed Systems"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Programming Languages Known *
                  </label>
                  <input
                    type="text"
                    required
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    placeholder="Python, Java, Go, TypeScript"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    LinkedIn URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Bio / Research Summary
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief overview of your interests and capstone goals..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '10px',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              padding: '13px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(67, 56, 202, 0.25)'
            }}
          >
            {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-user-check"></i>}
            <span>{loading ? 'Creating Account...' : `Register as ${role === 'faculty' ? 'Faculty Mentor' : 'Student'}`}</span>
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <button
            onClick={onGoToLogin}
            style={{ color: 'var(--color-primary)', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer' }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
