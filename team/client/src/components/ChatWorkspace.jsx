import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

export default function ChatWorkspace({ initialGroupId, onOpenFacultyModal }) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const messagesEndRef = useRef(null);

  // Load all groups user belongs to
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await api.getChatGroups();
      setGroups(data.groups || []);

      if (data.groups && data.groups.length > 0) {
        if (initialGroupId) {
          const matched = data.groups.find((g) => g.id === Number(initialGroupId));
          setActiveGroup(matched || data.groups[0]);
        } else {
          setActiveGroup(data.groups[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load chat groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [initialGroupId]);

  // Load messages when activeGroup changes & Join Socket Room
  useEffect(() => {
    if (!activeGroup) return;

    let isSubscribed = true;

    async function loadMessages() {
      try {
        setChatError('');
        const data = await api.getGroupMessages(activeGroup.id);
        if (isSubscribed) {
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
        if (isSubscribed) {
          setChatError(err.message || 'Unable to load chat messages.');
        }
      }
    }

    loadMessages();

    // Join Socket Room with server-side membership check
    if (socket && isConnected) {
      socket.emit('join_group', { groupId: activeGroup.id }, (response) => {
        if (response && response.error) {
          console.warn('Socket join error:', response.error);
        }
      });
    }

    return () => {
      isSubscribed = false;
      if (socket && isConnected) {
        socket.emit('leave_group', { groupId: activeGroup.id });
      }
    };
  }, [activeGroup, socket, isConnected]);

  // Listen for real-time messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg) => {
      if (activeGroup && msg.group_id === activeGroup.id) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, activeGroup]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeGroup || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      // Send via REST API (which also emits to socket) or via socket
      const res = await api.sendGroupMessage(activeGroup.id, messageText);
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message.id)) return prev;
        return [...prev, res.message];
      });
    } catch (err) {
      console.error('Send message failed:', err);
      setChatError(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i></div>;
  }

  if (groups.length === 0) {
    return (
      <div className="card text-center p-12">
        <div style={{ fontSize: '48px', color: 'var(--color-primary)', marginBottom: '16px' }}>
          <i className="fa-solid fa-comments"></i>
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>
          No Chat Channels Available
        </h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 16px auto' }}>
          {user.role === 'faculty'
            ? 'Form a new capstone team in the "Capstone Teams" tab to automatically initialize your team group chat channel.'
            : 'You will automatically gain access to your team chat once your faculty mentor forms your project team.'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        padding: 0,
        height: '75vh',
        display: 'grid',
        gridTemplateColumns: '300px 1fr 240px',
        overflow: 'hidden',
        borderRadius: '20px'
      }}
    >
      {/* 1. Groups Sidebar */}
      <div
        style={{
          borderRight: '1px solid var(--border-color)',
          backgroundColor: '#FAF5FF',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
            <i className="fa-solid fa-comments text-indigo mr-2"></i> Chat Channels
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '10px',
              backgroundColor: isConnected ? '#DCFCE7' : '#FEE2E2',
              color: isConnected ? '#16A34A' : '#DC2626'
            }}
          >
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {groups.map((g) => (
            <div
              key={g.id}
              onClick={() => setActiveGroup(g)}
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-light)',
                backgroundColor: activeGroup?.id === g.id ? '#EDE9FE' : 'transparent',
                borderLeft: activeGroup?.id === g.id ? '4px solid var(--color-primary)' : '4px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{g.name}</strong>
                {g.last_message_time && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {new Date(g.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <i className="fa-solid fa-graduation-cap mr-1"></i> Guide: {g.faculty_name || 'Awaiting Allocation'}
              </div>
              {g.last_message && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {g.last_message}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Messages Main Thread */}
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
        {/* Chat Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fff'
          }}
        >
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {activeGroup?.name}
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Mentor: <strong>{activeGroup?.faculty_name || 'Awaiting HOD Allocation'}</strong> • Real-time encrypted channel
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-indigo text-xs">
              <i className="fa-solid fa-users mr-1"></i> {activeGroup?.member_count || (activeGroup?.members ? activeGroup.members.length : 1)} members
            </span>
          </div>
        </div>

        {/* Chat Error Banner */}
        {chatError && (
          <div style={{ padding: '8px 16px', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '12px', fontWeight: 600 }}>
            {chatError}
          </div>
        )}

        {/* Messages List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
              <i className="fa-regular fa-comment-dots text-3xl mb-2 block"></i>
              No messages yet in this group. Say hello to kick off your project discussion!
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === user.id;
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    flexDirection: isMine ? 'row-reverse' : 'row'
                  }}
                >
                  <img
                    src={m.sender_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt=""
                    className="avatar avatar-sm"
                  />

                  <div style={{ maxWidth: '65%' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '3px',
                        justifyContent: isMine ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {m.sender_name}
                      </span>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          backgroundColor: m.sender_role === 'faculty' ? '#EDE9FE' : '#EEF2FF',
                          color: m.sender_role === 'faculty' ? '#7C3AED' : '#4338CA'
                        }}
                      >
                        {m.sender_role}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: isMine ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                        backgroundColor: isMine ? 'var(--color-primary)' : 'var(--bg-subtle)',
                        color: isMine ? '#fff' : 'var(--text-primary)',
                        fontSize: '13px',
                        lineHeight: 1.45,
                        wordBreak: 'break-word',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      {m.body}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          style={{
            padding: '14px 18px',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: '#FAF5FF',
            display: 'flex',
            gap: '10px'
          }}
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${activeGroup?.name}...`}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#fff'
            }}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '0 20px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer',
              opacity: !newMessage.trim() ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fa-solid fa-paper-plane"></i> Send
          </button>
        </form>
      </div>

      {/* 3. Members Sidebar Panel */}
      <div
        style={{
          borderLeft: '1px solid var(--border-color)',
          backgroundColor: '#FAF5FF',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>
          Participants ({activeGroup?.members ? activeGroup.members.length : 0})
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          {activeGroup?.members &&
            activeGroup.members.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  if (m.role === 'faculty' && onOpenFacultyModal) {
                    onOpenFacultyModal(m.id);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: m.role === 'faculty' ? 'pointer' : 'default',
                  padding: '4px',
                  borderRadius: '8px'
                }}
                title={m.role === 'faculty' ? 'Click to inspect faculty research profile' : ''}
              >
                <img src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="" className="avatar avatar-sm" />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.name}
                  </div>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: m.role === 'faculty' ? '#7C3AED' : '#4338CA'
                    }}
                  >
                    {m.role}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
