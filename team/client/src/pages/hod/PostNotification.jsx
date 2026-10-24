import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function PostNotification() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('both'); // 'students', 'faculty', 'both'
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setMessage({ text: 'Title and message body are required.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      await api.postNotification({
        title: title.trim(),
        body: body.trim(),
        audience,
        deadline: deadline || null
      });

      setMessage({ text: 'Announcement posted and dispatched via real-time WebSocket!', type: 'success' });
      setTitle('');
      setBody('');
      setDeadline('');
      setAudience('both');
      await loadNotifications();
    } catch (err) {
      setMessage({ text: err.message || 'Failed to post notification.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '24px' }}>
      {/* Post Form Card */}
      <div className="card">
        <div className="card-title-row">
          <div>
            <h3 className="card-main-title">
              <i className="fa-solid fa-bullhorn text-indigo mr-2"></i> Broadcast Announcement
            </h3>
            <p className="card-subtitle">
              Dispatch departmental deadlines and project milestones in real-time
            </p>
          </div>
          <span className="badge badge-indigo">HOD Broadcast</span>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Target Audience (Select Before Posting) *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { id: 'both', label: 'All (Students & Faculty)', icon: 'fa-solid fa-users' },
                { id: 'students', label: 'Students Only', icon: 'fa-solid fa-user-graduate' },
                { id: 'faculty', label: 'Faculty Only', icon: 'fa-solid fa-chalkboard-user' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAudience(opt.id)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '8px',
                    border: audience === opt.id ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                    backgroundColor: audience === opt.id ? '#EEF2FF' : '#fff',
                    color: audience === opt.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <i className={opt.icon}></i>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Announcement Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Capstone Phase-1 Architecture Submission Deadline"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Detailed Message / Instructions *
            </label>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Provide complete guidelines, submission formats, or meeting links..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Optional Milestone Deadline (Date & Time)
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              padding: '12px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
            <span>{loading ? 'Posting...' : 'Dispatch Notification Now'}</span>
          </button>
        </form>
      </div>

      {/* Broadcast History Card */}
      <div className="card">
        <div className="card-title-row">
          <h3 className="card-main-title">Dispatched Department Notices</h3>
          <span className="badge badge-indigo">{notifications.length} Total</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '600px', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No notifications posted yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '14px',
                  backgroundColor: '#fff'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span
                    className={`badge ${
                      n.audience === 'both' ? 'badge-indigo' : n.audience === 'students' ? 'badge-emerald' : 'badge-violet'
                    }`}
                    style={{ textTransform: 'capitalize' }}
                  >
                    Audience: {n.audience}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>

                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                  {n.title}
                </h4>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                  {n.body}
                </p>

                {n.deadline && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--color-amber)',
                      backgroundColor: 'var(--color-warning-light)',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    <i className="fa-regular fa-clock"></i>
                    <span>Deadline: {new Date(n.deadline).toLocaleString()}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
