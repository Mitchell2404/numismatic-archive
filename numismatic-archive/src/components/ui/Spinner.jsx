import React from 'react';

export default function Spinner({ dark = false, size = 'md' }) {
  const classes = [
    'spinner',
    dark ? 'spinner-dark' : '',
    size === 'lg' ? 'spinner-lg' : '',
  ].filter(Boolean).join(' ');
  return <span className={classes} role="status" aria-label="Cargando..." />;
}
