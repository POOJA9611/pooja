import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Modal from '../../components/Modal';

export default function StudentProfile({ onOpenFacultyModal }) {
  const { user, refreshUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTab, setEditTab] = useState('personal'); // 'personal' | 'professional' | 'additional' | 'avatar'
  const [savingProfile, setSavingProfile] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Form Fields State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [bio, setBio] = useState('');

  const [headline, setHeadline] = useState('');
  const [strength, setStrength] = useState('fullstack');
  const [experienceLevel, setExperienceLevel] = useState('Intermediate');
  const [languages, setLanguages] = useState('');
  const [frameworks, setFrameworks] = useState('');
  const [technicalSkills, setTechnicalSkills] = useState('');
  const [college, setCollege] = useState('');
  const [education, setEducation] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [semester, setSemester] = useState(6);
  const [cgpa, setCgpa] = useState(8.5);

  const [interests, setInterests] = useState('');
  const [achievements, setAchievements] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('available');

  // Avatar Upload State
  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [removeAvatarFlag, setRemoveAvatarFlag] = useState(false);

  // Add Project Modal State
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectStatus, setProjectStatus] = useState('ongoing');
  const [addingProject, setAddingProject] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getStudentProfile();
      setProfileData(data);
      populateFormFields(data);
    } catch (err) {
      console.error('Failed to load student profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const populateFormFields = (data) => {
    const p = data?.profile;
    if (!p) return;

    setFullName(p.name || user?.name || '');
    setUsername(p.username || '');
    setEmail(p.email || user?.email || '');
    setLocation(p.location || 'Chennai, India');
    setWebsiteUrl(p.website_url || '');
    setBio(p.bio || '');

    setHeadline(p.headline || 'Full-Stack Developer & Undergraduate Researcher');
    setStrength(p.strength || 'fullstack');
    setExperienceLevel(p.experience_level || 'Intermediate');
    setLanguages(p.languages || 'JavaScript, Python, C++, SQL');
    setFrameworks(p.frameworks || 'React, Node.js, Express, Tailwind CSS');
    setTechnicalSkills(p.technical_skills || 'REST APIs, Microservices, Git, Database Design');
    setCollege(p.college || 'Department of Computer Science & Engineering');
    setEducation(p.education || 'B.Tech in Computer Science & Engineering (2023 - 2027)');
    setGithubUrl(p.github_url || '');
    setLinkedinUrl(p.linkedin_url || '');
    setSemester(p.semester || 6);
    setCgpa(p.cgpa || 8.5);

    setInterests(p.interests || 'Cloud Systems, Distributed Systems, AI Agent Frameworks');
    setAchievements(p.achievements || 'Published paper on Edge Computing; Finalist in Department Hackathon');
    setAvailabilityStatus(p.availability_status || 'available');

    setAvatarPreview(p.avatar || user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');
    setSelectedAvatarFile(null);
    setRemoveAvatarFlag(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle local image file picker
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setModalError('Invalid image type. Please select a JPG, PNG, or WebP image.');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      setModalError(`Selected file is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum allowed image size is 5MB.`);
      return;
    }

    setModalError('');
    setSelectedAvatarFile(file);
    setRemoveAvatarFlag(false);

    // Create instant local preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
  };

  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleRemovePhoto = () => {
    setRemoveAvatarFlag(true);
    setSelectedAvatarFile(null);
    setAvatarPreview('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');
  };

  const handleCancelAvatarChange = () => {
    setSelectedAvatarFile(null);
    setRemoveAvatarFlag(false);
    setAvatarPreview(profileData?.profile?.avatar || user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');
  };

  const openEditModal = () => {
    if (profileData) populateFormFields(profileData);
    setModalError('');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (savingProfile) return;
    setShowEditModal(false);
    handleCancelAvatarChange();
  };

  // Submit profile updates
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setModalError('');

    try {
      // 1. Handle Avatar upload if a local file was chosen
      if (selectedAvatarFile) {
        await api.uploadAvatar(selectedAvatarFile);
      } else if (removeAvatarFlag) {
        await api.removeAvatar();
      }

      // 2. Update Student Profile & User record
      await api.updateStudentProfile({
        name: fullName.trim(),
        email: email.trim(),
        username: username.trim(),
        location: location.trim(),
        website_url: websiteUrl.trim(),
        bio: bio.trim(),

        headline: headline.trim(),
        strength,
        experience_level: experienceLevel,
        languages: languages.trim(),
        frameworks: frameworks.trim(),
        technical_skills: technicalSkills.trim(),
        college: college.trim(),
        education: education.trim(),
        github_url: githubUrl.trim(),
        linkedin_url: linkedinUrl.trim(),
        semester: Number(semester),
        cgpa: Number(cgpa),

        interests: interests.trim(),
        achievements: achievements.trim(),
        availability_status: availabilityStatus
      });

      // 3. Synchronize avatar & user info in AuthContext across Topbar, Sidebar, Chat
      await refreshUser();

      // 4. Reload local data and notify user
      await loadData();
      setShowEditModal(false);
      setSuccessToast('Profile and credentials updated successfully!');
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setModalError(err.message || 'Failed to update profile. Please verify your details.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!projectTitle.trim()) return;

    setAddingProject(true);
    try {
      await api.addProject({
        title: projectTitle.trim(),
        description: projectDesc.trim(),
        status: projectStatus
      });
      setShowAddProjectModal(false);
      setProjectTitle('');
      setProjectDesc('');
      setProjectStatus('ongoing');
      await loadData();
      setSuccessToast('New project milestone successfully added!');
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to add project.');
    } finally {
      setAddingProject(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i>
      </div>
    );
  }

  const p = profileData?.profile;
  const projects = profileData?.projects || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {successToast && (
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: '#15803D',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-circle-check text-emerald"></i>
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast('')}
            style={{ background: 'transparent', border: 'none', color: '#15803D', cursor: 'pointer' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative' }}>
              <img
                src={p?.avatar || user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt={p?.name}
                className="avatar"
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '20px',
                  border: '3px solid #EEF2FF',
                  boxShadow: 'var(--shadow-md)',
                  objectFit: 'cover'
                }}
              />
              <button
                onClick={openEditModal}
                title="Change Profile Photo"
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  border: '2px solid #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <i className="fa-solid fa-camera text-xs"></i>
              </button>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  {p?.name || user?.name}
                </h2>
                {p?.username && (
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    @{p.username}
                  </span>
                )}
                <span className={`badge ${p?.availability_status === 'available' ? 'badge-emerald' : 'badge-indigo'}`}>
                  <i className="fa-solid fa-circle text-2xs mr-1"></i>
                  {p?.availability_status === 'available' ? 'Available for Teams' : p?.availability_status || 'Active Student'}
                </span>
              </div>

              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)', marginTop: '4px' }}>
                {p?.headline || 'Undergraduate Capstone Developer'}
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <span><strong>Reg No:</strong> {p?.reg_no || 'RA2026001'}</span>
                <span>•</span>
                <span><i className="fa-solid fa-building-columns mr-1 text-muted"></i> {p?.department || 'Computer Science & Engineering'}</span>
                {p?.location && (
                  <>
                    <span>•</span>
                    <span><i className="fa-solid fa-location-dot mr-1 text-muted"></i> {p.location}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action & Links Block */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            <button
              className="btn btn-primary"
              onClick={openEditModal}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <i className="fa-solid fa-pen-to-square"></i>
              <span>Edit Profile</span>
            </button>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {p?.website_url && (
                <a href={p.website_url} target="_blank" rel="noreferrer" className="btn btn-subtle btn-sm" title="Website / Portfolio">
                  <i className="fa-solid fa-globe mr-1"></i> Portfolio
                </a>
              )}
              {p?.github_url && (
                <a href={p.github_url} target="_blank" rel="noreferrer" className="btn btn-subtle btn-sm" title="GitHub">
                  <i className="fa-brands fa-github mr-1"></i> GitHub
                </a>
              )}
              {p?.linkedin_url && (
                <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="btn btn-subtle btn-sm" style={{ color: '#0A66C2' }} title="LinkedIn">
                  <i className="fa-brands fa-linkedin mr-1"></i> LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 4-Stat Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '14px',
            backgroundColor: 'var(--bg-subtle)',
            padding: '16px 20px',
            borderRadius: '14px',
            marginTop: '22px'
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Semester</span>
            <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>Sem {p?.semester || 6}</span>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Cumulative CGPA</span>
            <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-primary)' }}>{p?.cgpa || '8.5'} / 10.0</span>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Core Strength</span>
            <span className={`badge ${p?.strength === 'frontend' ? 'badge-indigo' : p?.strength === 'backend' ? 'badge-violet' : 'badge-emerald'}`}>
              {p?.strength || 'Full-Stack'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Faculty Mentor</span>
            {p?.faculty_name ? (
              <span
                onClick={() => onOpenFacultyModal && onOpenFacultyModal(p.faculty_id)}
                style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                title="Click to view Faculty Profile"
              >
                {p.faculty_name} <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
              </span>
            ) : (
              <span className="badge badge-warning">Awaiting Allocation</span>
            )}
          </div>
        </div>

        {/* Bio statement */}
        {p?.bio && (
          <div style={{ marginTop: '20px', padding: '14px 18px', backgroundColor: '#F8FAFC', borderRadius: '12px', borderLeft: '4px solid var(--color-primary)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Student Statement & Bio
            </span>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {p.bio}
            </p>
          </div>
        )}
      </div>

      {/* Two Column Technical & Professional Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px' }}>
        {/* Technical Profile Card */}
        <div className="card">
          <div className="card-title-row">
            <h3 className="card-main-title">
              <i className="fa-solid fa-code text-indigo mr-2"></i> Technical Stack & Skills
            </h3>
            <span className="badge badge-indigo text-xs">{p?.experience_level || 'Intermediate'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Programming Languages */}
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Programming Languages
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(p?.languages || 'JavaScript, Python, C++').split(',').map((l, i) => (
                  <span key={i} style={{ backgroundColor: '#EEF2FF', color: '#4338CA', padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                    {l.trim()}
                  </span>
                ))}
              </div>
            </div>

            {/* Frameworks & Technologies */}
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Frameworks & Technologies
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(p?.frameworks || 'React, Node.js, Express, Tailwind CSS').split(',').map((f, i) => (
                  <span key={i} style={{ backgroundColor: '#EDE9FE', color: '#6D28D9', padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                    {f.trim()}
                  </span>
                ))}
              </div>
            </div>

            {/* Technical Skills */}
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Technical Competencies
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(p?.technical_skills || 'REST APIs, Microservices, System Architecture, Database Design').split(',').map((s, i) => (
                  <span key={i} style={{ backgroundColor: '#E0F2FE', color: '#0369A1', padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                    {s.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Academic & Background Card */}
        <div className="card">
          <div className="card-title-row">
            <h3 className="card-main-title">
              <i className="fa-solid fa-graduation-cap text-indigo mr-2"></i> Education & Achievements
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                Current College & Degree
              </span>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {p?.education || 'B.Tech in Computer Science & Engineering'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {p?.college || 'Department of Computer Science & Engineering'}
              </div>
            </div>

            {p?.interests && (
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Areas of Interest
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {p.interests.split(',').map((item, idx) => (
                    <span key={idx} style={{ backgroundColor: '#F1F5F9', color: '#475569', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                      <i className="fa-regular fa-lightbulb mr-1 text-amber"></i> {item.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {p?.achievements && (
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Projects & Key Achievements
                </span>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  <i className="fa-solid fa-trophy text-amber mr-1"></i> {p.achievements}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Projects Section (Ongoing & Completed) */}
      <div className="card">
        <div className="card-title-row">
          <div>
            <h3 className="card-main-title">
              <i className="fa-solid fa-folder-tree text-indigo mr-2"></i> Capstone & Technical Projects
            </h3>
            <p className="card-subtitle">Manage both ongoing and completed project milestones</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddProjectModal(true)}>
            <i className="fa-solid fa-plus mr-1"></i> Add Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No projects logged yet. Click <strong>"Add Project"</strong> to showcase your work.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {projects.map((proj) => (
              <div
                key={proj.id}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '16px',
                  backgroundColor: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      {proj.title}
                    </h4>
                    <span className={`badge ${proj.status === 'completed' ? 'badge-emerald' : 'badge-warning'}`}>
                      {proj.status}
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '10px' }}>
                    {proj.description || 'No detailed description provided.'}
                  </p>

                  {proj.team_name && (
                    <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>
                      <i className="fa-solid fa-people-group mr-1"></i> Team: {proj.team_name}
                    </div>
                  )}
                </div>

                <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border-light)', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Logged {new Date(proj.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* COMPREHENSIVE EDIT PROFILE MODAL */}
      <Modal isOpen={showEditModal} onClose={closeEditModal} title="Edit Student Profile & Portfolio">
        {/* Tab Navigation inside Modal */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '18px', gap: '16px' }}>
          {[
            { id: 'personal', label: 'Personal Info', icon: 'fa-regular fa-user' },
            { id: 'professional', label: 'Professional & Skills', icon: 'fa-solid fa-code' },
            { id: 'additional', label: 'Academics & Bio', icon: 'fa-solid fa-graduation-cap' },
            { id: 'avatar', label: 'Profile Picture', icon: 'fa-solid fa-camera' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setEditTab(tab.id)}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 700,
                color: editTab === tab.id ? 'var(--color-primary)' : 'var(--text-muted)',
                border: 'none',
                background: 'transparent',
                borderBottom: editTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                cursor: 'pointer'
              }}
            >
              <i className={`${tab.icon} mr-1`}></i> {tab.label}
            </button>
          ))}
        </div>

        {modalError && (
          <div style={{ padding: '10px 14px', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', fontWeight: 600 }}>
            <i className="fa-solid fa-triangle-exclamation mr-1"></i> {modalError}
          </div>
        )}

        <form onSubmit={handleSaveProfile}>
          {/* TAB 1: PERSONAL INFORMATION */}
          {editTab === 'personal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. alexchen"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Institutional Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Chennai, India"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Personal Website or Portfolio URL
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://alexchen.dev"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Bio / About Me
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Summarize your passions, research interests, and project aspirations..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: PROFESSIONAL & SKILLS */}
          {editTab === 'professional' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Professional Headline / Role
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Full-Stack Developer & Cloud Systems Enthusiast"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Core Technical Strength *
                  </label>
                  <select
                    value={strength}
                    onChange={(e) => setStrength(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  >
                    <option value="frontend">Frontend Specialist</option>
                    <option value="backend">Backend Specialist</option>
                    <option value="fullstack">Full-Stack Generalist</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Experience Level
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  >
                    <option value="Beginner">Beginner (1st - 2nd year)</option>
                    <option value="Intermediate">Intermediate (Capstone ready)</option>
                    <option value="Advanced">Advanced (Production experienced)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Programming Languages (comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="JavaScript, Python, C++, Go, Java, TypeScript"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Frameworks & Technologies (comma-separated)
                </label>
                <input
                  type="text"
                  value={frameworks}
                  onChange={(e) => setFrameworks(e.target.value)}
                  placeholder="React, Node.js, Express, Docker, PostgreSQL, Redis"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Technical Skills & Competencies (comma-separated)
                </label>
                <input
                  type="text"
                  value={technicalSkills}
                  onChange={(e) => setTechnicalSkills(e.target.value)}
                  placeholder="REST APIs, Microservices, System Architecture, CI/CD"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    GitHub Profile URL
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    LinkedIn Profile URL
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACADEMICS & ADDITIONAL */}
          {editTab === 'additional' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Cumulative CGPA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Current College / Department
                </label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="Department of Computer Science & Engineering"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Education Details / Degree Program
                </label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="B.Tech in Computer Science & Engineering (2023 - 2027)"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Availability Status for Teams
                </label>
                <select
                  value={availabilityStatus}
                  onChange={(e) => setAvailabilityStatus(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                >
                  <option value="available">Available to Join a Project Team</option>
                  <option value="committed">Already Committed to a Team</option>
                  <option value="looking_leader">Looking to Form a Team as Leader</option>
                  <option value="busy">Focusing on Academic Studies</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Areas of Interest (comma-separated)
                </label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="Cloud Systems, Distributed Algorithms, Machine Learning, UI/UX"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Key Achievements & Certifications
                </label>
                <textarea
                  rows={2}
                  value={achievements}
                  onChange={(e) => setAchievements(e.target.value)}
                  placeholder="Awards, hackathon wins, research publications, certifications..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>
            </div>
          )}

          {/* TAB 4: PROFILE PICTURE UPLOAD */}
          {editTab === 'avatar' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '10px 0' }}>
              {/* Native hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
              />

              <div style={{ position: 'relative' }}>
                <img
                  src={avatarPreview}
                  alt="Profile Preview"
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '24px',
                    objectFit: 'cover',
                    border: '4px solid var(--color-primary-light)',
                    boxShadow: 'var(--shadow-md)'
                  }}
                />
                {selectedAvatarFile && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '4px',
                      backgroundColor: '#16A34A',
                      color: '#fff',
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 700
                    }}
                  >
                    New
                  </span>
                )}
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedAvatarFile ? selectedAvatarFile.name : 'Upload Device Image'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  JPG, JPEG, PNG, or WebP up to 5 MB
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleTriggerUpload}
                >
                  <i className="fa-solid fa-cloud-arrow-up mr-1"></i>
                  {selectedAvatarFile ? 'Choose Different Photo' : 'Upload From Device'}
                </button>

                {selectedAvatarFile && (
                  <button
                    type="button"
                    className="btn btn-subtle btn-sm"
                    onClick={handleCancelAvatarChange}
                  >
                    <i className="fa-solid fa-rotate-left mr-1"></i> Revert
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-subtle btn-sm"
                  onClick={handleRemovePhoto}
                  style={{ color: 'var(--color-danger)' }}
                >
                  <i className="fa-solid fa-trash mr-1"></i> Remove Photo
                </button>
              </div>

              {removeAvatarFlag && (
                <div style={{ fontSize: '12px', color: 'var(--color-warning)', fontWeight: 600 }}>
                  <i className="fa-solid fa-info-circle mr-1"></i> Default avatar will be restored upon saving.
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Step {editTab === 'personal' ? '1/4' : editTab === 'professional' ? '2/4' : editTab === 'additional' ? '3/4' : '4/4'}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-subtle" onClick={closeEditModal} disabled={savingProfile}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                {savingProfile ? (
                  <span><i className="fa-solid fa-spinner fa-spin mr-1"></i> Saving Changes...</span>
                ) : (
                  <span><i className="fa-solid fa-floppy-disk mr-1"></i> Save Changes</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Project Modal */}
      <Modal isOpen={showAddProjectModal} onClose={() => setShowAddProjectModal(false)} title="Add New Project Milestone">
        <form onSubmit={handleAddProject}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
              Project Title *
            </label>
            <input
              type="text"
              required
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="e.g. Distributed Telemetry Pipeline"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
              Project Status *
            </label>
            <select
              value={projectStatus}
              onChange={(e) => setProjectStatus(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
            >
              <option value="ongoing">Ongoing (In Development)</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
              Project Description
            </label>
            <textarea
              rows={3}
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              placeholder="Explain tech stack used, architecture highlights, and outcomes..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-subtle" onClick={() => setShowAddProjectModal(false)}>
              Cancel
            </button>
            <button type="submit" disabled={addingProject} className="btn btn-primary">
              {addingProject ? 'Saving...' : 'Add Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
