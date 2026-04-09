'use client';
import { useInView } from 'react-intersection-observer';
import { ReactNode } from 'react';

export default function ScrollReveal({ children }: { children: ReactNode }) {
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true });
  return (
    <div ref={ref} className={`reveal${inView ? ' visible' : ''}`}>
      {children}
    </div>
  );
}
