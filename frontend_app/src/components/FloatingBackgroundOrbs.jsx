import React from 'react';

export default function FloatingBackgroundOrbs() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: -3
    }}>
      {/* Orb 1: Violet glow in the top-left */}
      <div 
        style={{
          position: 'absolute',
          borderRadius: '50%',
          filter: 'blur(100px)',
          width: '50vw',
          height: '50vw',
          top: '-10%',
          left: '-10%',
          animation: 'drift 25s ease-in-out infinite alternate',
          backgroundColor: 'rgba(139, 92, 246, 0.08)'
        }}
      />
      {/* Orb 2: Indigo glow in the bottom-right */}
      <div 
        style={{
          position: 'absolute',
          borderRadius: '50%',
          filter: 'blur(120px)',
          width: '60vw',
          height: '60vw',
          bottom: '-15%',
          right: '-10%',
          animation: 'drift-reverse 30s ease-in-out infinite alternate',
          backgroundColor: 'rgba(79, 70, 229, 0.08)'
        }}
      />
      {/* Orb 3: Cyan/Teal accent in the center-left */}
      <div 
        style={{
          position: 'absolute',
          borderRadius: '50%',
          filter: 'blur(80px)',
          width: '30vw',
          height: '30vw',
          top: '35%',
          left: '20%',
          animation: 'drift-fast 20s ease-in-out infinite alternate',
          backgroundColor: 'rgba(6, 182, 212, 0.06)'
        }}
      />
    </div>
  );
}
