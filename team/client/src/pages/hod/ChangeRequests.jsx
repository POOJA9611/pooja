import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';

export default function ChangeRequests() {
  const [requests, setRequests] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'approve' or 'reject'
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqRes, facRes] = await Promise.all([
        api.getChangeRequests(),
        api.getHodFaculty()
      ]);
      setRequests(reqRes.requests || []);
      setFaculty(facRes.faculty || []);
    } catch (err) {
      console.error('Failed to load change requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openDecisionModal = (req, action) => {
    setSelectedRequest(req);
    setModalAction(action);
    setRemark('');
    setSelectedFacultyId(req.requested_faculty_id || (faculty[0] ? faculty[0].id : ''));
    setFeedback({ text: '', type: '' });
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !modalAction) return;

    setSubmitting(true);
    setFeedback({ text: '', type: '' });
    try {
      const res = await api.decideChangeRequest(
        selectedRequest.id,
        modalAction,
        modalAction === 'approve' ? selectedFacultyId : null,
        remark
      );
      setFeedback({ text: res.message, type: 'success' });
      setTimeout(() => {
        setSelectedRequest(null);
        setModalAction(null);
        loadData();
      }, 1000);
    } catch (err) {
      setFeedback({ text: err.message || 'Failed to submit decision.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card">
        <div className="card-title-row">
          <div>
            <h3 className="card-main-title">Faculty Change Requests Inbox</h3>
            <p className="card-subtitle">Review student transfer petitions, check alignment rationale, and render official decisions</p>
          </div>
          <span className="badge badge-indigo">
            {requests.filter((r) => r.status === 'pending').length} Pending Requests
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 14px' }}>Date</th>
                <th style={{ padding: '10px 14px' }}>Student</th>
                <th style={{ padding: '10px 14px' }}>Current Mentor</th>
                <th style={{ padding: '10px 14px' }}>Requested Mentor</th>
                <th style={{ padding: '10px 14px' }}>Student's Stated Reason</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No faculty change requests submitted.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.student_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {r.reg_no} • {r.strength}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{r.current_faculty_name}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-primary)', fontWeight: 600 }}>
                      {r.requested_faculty_name || <span className="text-muted">Any Appropriate</span>}
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: '280px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {r.reason}
                      </div>
                      {r.hod_remark && (
                        <div style={{ fontSize: '11px', color: '#6366F1', marginTop: '4px', fontStyle: 'italic' }}>
                          <strong>HOD Remark:</strong> {r.hod_remark}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        className={`badge ${
                          r.status === 'pending'
                            ? 'badge-warning'
                            : r.status === 'approved'
                            ? 'badge-emerald'
                            : 'badge-danger'
                        }`}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {r.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => openDecisionModal(r, 'approve')}
                            style={{
                              backgroundColor: '#DCFCE7',
                              color: '#16A34A',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            <i className="fa-solid fa-check mr-1"></i> Approve
                          </button>
                          <button
                            onClick={() => openDecisionModal(r, 'reject')}
                            style={{
                              backgroundColor: '#FEE2E2',
                              color: '#DC2626',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            <i className="fa-solid fa-xmark mr-1"></i> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Decided on {r.decided_at ? new Date(r.decided_at).toLocaleDateString() : 'N/A'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Modal */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => {
          setSelectedRequest(null);
          setModalAction(null);
        }}
        title={modalAction === 'approve' ? 'Approve Mentor Reassignment' : 'Reject Mentor Change Request'}
      >
        {selectedRequest && (
          <form onSubmit={handleDecisionSubmit}>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
              <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                <strong>Student:</strong> {selectedRequest.student_name} ({selectedRequest.reg_no})
              </div>
              <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                <strong>Current Mentor:</strong> {selectedRequest.current_faculty_name}
              </div>
              <div style={{ fontSize: '13px' }}>
                <strong>Reason:</strong> {selectedRequest.reason}
              </div>
            </div>

            {feedback.text && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  backgroundColor: feedback.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                  color: feedback.type === 'success' ? '#16A34A' : '#DC2626',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                {feedback.text}
              </div>
            )}

            {modalAction === 'approve' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Assign New Faculty Mentor:
                </label>
                <select
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px'
                  }}
                  required
                >
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.subjects} • {f.workload} mentees)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                Official HOD Remark / Guidance Note:
              </label>
              <textarea
                rows={3}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder={
                  modalAction === 'approve'
                    ? 'e.g. Approved due to matching distributed systems project topic.'
                    : 'e.g. Current mentor already covers this area; quota limit reached.'
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-subtle"
                onClick={() => {
                  setSelectedRequest(null);
                  setModalAction(null);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`btn ${modalAction === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                style={{
                  backgroundColor: modalAction === 'approve' ? 'var(--color-primary)' : 'var(--color-danger)',
                  color: '#fff'
                }}
              >
                {submitting ? 'Saving...' : modalAction === 'approve' ? 'Confirm Approval & Reassign' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
