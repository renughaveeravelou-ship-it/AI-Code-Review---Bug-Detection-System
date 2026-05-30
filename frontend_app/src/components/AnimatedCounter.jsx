import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function AnimatedCounter({ value, decimals = 1, duration = 1.5 }) {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      element.textContent = value;
      return;
    }

    const obj = { val: 0 };

    gsap.to(obj, {
      val: numValue,
      duration: duration,
      ease: 'power2.out',
      onUpdate: () => {
        element.textContent = obj.val.toFixed(decimals);
      }
    });
  }, [value, decimals, duration]);

  return <span ref={elementRef}>0.0</span>;
}
