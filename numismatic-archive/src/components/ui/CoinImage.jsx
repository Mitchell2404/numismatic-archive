import React, { useState } from 'react';

/**
 * CoinImage — renders a coin image with a graceful fallback placeholder
 * when the src is missing or fails to load.
 */
export default function CoinImage({ src, alt = 'Coin', style }) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#e8dfd1', color: '#757780',
      }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 40, opacity: 0.4 }}
        >
          token
        </span>
        <span style={{
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          opacity: 0.4,
          marginTop: 4,
          textTransform: 'uppercase',
        }}>
          No imagen
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={style}
      onError={() => setError(true)}
    />
  );
}
