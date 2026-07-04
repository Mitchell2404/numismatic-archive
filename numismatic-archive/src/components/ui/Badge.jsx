import React from 'react';

const GRADE_COLORS = {
  'MS-65': 'blue',
  'MS-64': 'blue',
  'MS-63': 'blue',
  'EF-40': 'navy',
  'XF-45': 'navy',
  'VF-30': 'grey',
  'VF-20': 'grey',
};

const STATUS_COLORS = {
  active: 'blue',
  sold: 'green',
  certified: 'gold',
  'Completada': 'green',
  'Pendiente': 'gold',
  'Cancelada': 'red',
  'Común': 'grey',
  'Raro': 'blue',
  'Épico': 'purple',
  'Legendario': 'gold',
};

export default function Badge({ text, color, variant, tooltip }) {
  const resolvedColor = color || STATUS_COLORS[text] || 'grey';
  return (
    <span
      className={`badge badge-${resolvedColor}`}
      title={tooltip}
      aria-label={tooltip ? `${text}: ${tooltip}` : text}
    >
      {text}
    </span>
  );
}

export function GradeBadge({ grade, tooltip }) {
  const color = GRADE_COLORS[grade] || 'grey';
  return (
    <span
      className={`badge badge-${color}`}
      title={tooltip}
      aria-label={tooltip ? `Grado ${grade}: ${tooltip}` : grade}
    >
      {grade}
    </span>
  );
}

export function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || 'grey';
  const labels = {
    active: 'Activo',
    sold: 'Vendido',
    certified: 'Certificado',
  };
  return <span className={`badge badge-${color}`}>{labels[status] || status}</span>;
}
