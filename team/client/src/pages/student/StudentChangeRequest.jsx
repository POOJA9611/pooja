import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function StudentChangeRequest({ onOpenFacultyModal }) {
  const [profileData, setProfileData] = useState(null);
  const [facultyList, setFacultyList] = useState([]);
  const [reason, setReason] = useState('');
  const [requestedFacultyId, setRequestedFacultyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const [profRes, facRes] = await Promise.all([
        api.getStudentProfile(),
        api.getFacultyDirectory()
      ]);
      setProfileData(profRes);
      setFacultyList(facRes.faculty || []);
    } catch (err) {
      console.error('Failed to load change request data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setFeedback({ text: 'Please provide a clear justification reason.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setFeedback({ text: '', type: '' });
    try {
      await api.submitChangeRequest({
        reason: reason.trim(),
        requested_faculty_id: requestedFacultyId ? Number(requestedFacultyId) : null
      });
      setFeedback({ text: 'Faculty change request successfully submitted to the HOD!', type: 'success' });
      setReason('');
      setRequestedFacultyId('');
      await loadData();
    } catch (err) {
      setFeedback({ text: err.message || 'Failed to submit request.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>;
  }

  const p = profileData?.profile;
  const changeRequests = profileData?.changeRequests || [];
  const hasPending = profileData?.hasPendingRequest;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
      {/* Request Form */}
      <div className="card">
        <div className="card-title-row">
          <div>
            <h3 className="card-main-title">
              <i className="fa-solid fa-arrow-right-arrow-left text-indigo mr-2"></i> Request Faculty Mentor Change
            </h3>
            <p className="card-subtitle">
              Submit a formal petition to the Head of Department for project topic realignment
            </p>
          </div>
          {hasPending ? (
            <span className="badge badge-warning">Request Under Review</span>
          ) : (
            <span className="badge badge-indigo">Available</span>
          )}
        </div>

        {feedback.text && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '16px',
              backgroundColor: feedback.type === 'success' ? '#DCFCE7' : '#FEE2E2',
              color: feedback.type === 'success' ? '#16A34A' : '#DC2626',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className={`fa-solid ${feedback.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Current Mentor Status */}
        <div style={{ marginBottom: '18px', padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
            Current Assigned Mentor
          </span>
          {p?.faculty_name ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {p.faculty_name}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {p.faculty_designation}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '13px', color: 'var(--color-danger)', fontWeight: 600 }}>
              You do not have an assigned faculty mentor yet.
            </span>
          )}
        </div>

        {hasPending ? (
          <div
            style={{
              padding: '20px',
              backgroundColor: '#FEF3C7',
              borderRadius: '12px',
              color: '#92400E',
              fontSize: '13px',
              lineHeight: 1.5
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>
              <i className="fa-solid fa-clock mr-2"></i> Pending Request Under HOD Review
            </div>
            You currently have an active faculty change request awaiting the Head of Department's decision. Only one pending request is permitted at a time.
          </div>
        ) : !p?.faculty_name ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
            You cannot request a mentor transfer while currently unassigned.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Preferred Replacement Faculty (Optional):
              </label>
              <select
                value={requestedFacultyId}
                onChange={(e) => setRequestedFacultyId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
              >
                <option value="">-- No preference / HOD's discretion --</option>
                {facultyList
                  .filter((f) => f.id !== p?.faculty_id)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.subjects} • {f.workload} mentees)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Reason for Change Request *
              </label>
              <textarea
                required
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State clearly why you require a different mentor (e.g. alignment with specific research area, thesis shift to Machine Learning or Distributed Systems)..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ padding: '12px' }}
            >
              {submitting ? 'Submitting to HOD...' : 'Submit Change Request to HOD'}
            </button>
          </form>
        )}
      </div>

      {/* Change Requests History */}
      <div className="card">
        <div className="card-title-row">
          <h3 className="card-main-title">Request History & HOD Remarks</h3>
          <span className="badge badge-indigo">{changeRequests.length} Total</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {changeRequests.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No previous change requests found.
            </div>
          ) : (
            changeRequests.map((cr) => (
              <div
                key={cr.id}
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
                      cr.status === 'pending'
                        ? 'badge-warning'
                        : cr.status === 'approved'
                        ? 'badge-emerald'
                        : 'badge-danger'
                    }`}
                    style={{ textTransform: 'capitalize' }}
                  >
                    Status: {cr.status}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(cr.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <strong>From:</strong> {cr.current_faculty_name}{' '}
                  {cr.requested_faculty_name && (
                    <span>➔ <strong>To:</strong> {cr.requested_faculty_name}</span>
                  )}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '8px', fontStyle: 'italic' }}>
                  "{cr.reason}"
                </div>

                {cr.hod_remark && (
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#EEF2FF',
                      fontSize: '11px',
                      color: '#4338CA'
                    }}
                  >
                    <strong>HOD Remark:</strong> {cr.hod_remark}
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
