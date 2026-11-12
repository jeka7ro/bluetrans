import React from 'react';

interface DemoBadgeProps {
  /** Text scurt lângă pastilă, ex. „date de test” */
  label?: string;
  className?: string;
  title?: string;
}

/** Pastilă „DEMO” — marchează datele de test (inventate), ca să nu fie confundate cu cele reale. */
export const DemoBadge: React.FC<DemoBadgeProps> = ({ label, className = '', title }) => {
  const hasCustomDisplay = /\b(hidden|flex|inline-flex|block|inline-block)\b/.test(className);
  return (
    <span
      className={`demo-badge ${hasCustomDisplay ? '' : 'inline-flex'} items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider align-middle shrink-0 ${className}`}
      title={title || 'Date de test (inventate). Nu sunt date reale din firmă.'}
    >
      DEMO{label ? <span className="font-semibold normal-case tracking-normal">· {label}</span> : null}
    </span>
  );
};
