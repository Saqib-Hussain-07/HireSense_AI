import React from 'react';

export default function PageHeader({ eyebrow, title, description }) {
  return (
    <div className="px-8 pt-8 pb-6 border-b border-hairline">
      {eyebrow && <p className="text-xs font-mono text-onair mb-2 uppercase tracking-wider">{eyebrow}</p>}
      <h1 className="font-display text-2xl font-semibold text-text">{title}</h1>
      {description && <p className="text-sm text-muted mt-1 max-w-xl">{description}</p>}
    </div>
  );
}
