import React from 'react';

export default function StatCard({ title, value, icon, colorClass, subtext }) {
  return (
    <div className="card stat-card hover-lift">
      <div className={`stat-icon-wrap ${colorClass || 'bg-indigo-light'}`}>
        <i className={icon}></i>
      </div>
      <div className="stat-info-col">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{title}</div>
        {subtext && <div className="stat-subtext">{subtext}</div>}
      </div>
    </div>
  );
}
