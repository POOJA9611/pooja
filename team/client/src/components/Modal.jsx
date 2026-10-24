import React from 'react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = '600px' }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#fff',
          borderRadius: '18px',
          boxShadow: 'var(--shadow-modal)',
          padding: '24px',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '20px'
          }}
        >
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
