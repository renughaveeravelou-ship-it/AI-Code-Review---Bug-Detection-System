import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function MouseFollower() {
  const followerRef = useRef(null);

  useEffect(() => {
    const follower = followerRef.current;
    if (!follower) return;

    // Center the element on the cursor coordinates
    gsap.set(follower, { xPercent: -50, yPercent: -50, x: window.innerWidth / 2, y: window.innerHeight / 2 });

    const handleMouseMove = (e) => {
      gsap.to(follower, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.8,
        ease: 'power3.out'
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={followerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: -1,
        filter: 'blur(90px)',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 50%, rgba(0,0,0,0) 70%)',
        mixBlendMode: 'screen'
      }}
    />
  );
}
