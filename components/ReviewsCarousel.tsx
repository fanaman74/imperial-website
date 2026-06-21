'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

// Replace these with your downloaded Google review photos
// Place images in /public/reviews/ named review-1.jpg through review-10.jpg
const PHOTOS = [
  { src: 'https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Restaurant Imperial' },
  { src: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Restaurant Imperial' },
  { src: 'https://images.pexels.com/photos/3926133/pexels-photo-3926133.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Restaurant Imperial' },
  { src: 'https://images.pexels.com/photos/2098085/pexels-photo-2098085.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Restaurant Imperial' },
  { src: 'https://images.pexels.com/photos/1907244/pexels-photo-1907244.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Restaurant Imperial' },
  { src: 'https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Restaurant Imperial' },
  { src: 'https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Restaurant Imperial' },
  { src: 'https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Restaurant Imperial' },
  { src: 'https://images.pexels.com/photos/1410235/pexels-photo-1410235.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Restaurant Imperial' },
  { src: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Restaurant Imperial' },
];

export default function ReviewsCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = PHOTOS.length;

  function startTimer() {
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % count);
    }, 3500);
  }

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function goTo(i: number) {
    setCurrent(i);
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isPaused) startTimer();
  }

  function prev() { goTo((current - 1 + count) % count); }
  function next() { goTo((current + 1) % count); }

  // Show 3 visible slides (center + adjacent) on md+, 1 on mobile
  const visible = [
    (current - 1 + count) % count,
    current,
    (current + 1) % count,
  ];

  return (
    <section className="py-20 px-6 bg-bg-alt overflow-hidden">
      <div className="max-w-[1200px] mx-auto">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-text-muted mb-10">
          Ils nous ont visités
        </p>

        {/* Slides */}
        <div
          className="relative"
          onMouseEnter={() => { setIsPaused(true); if (timerRef.current) clearInterval(timerRef.current); }}
          onMouseLeave={() => { setIsPaused(false); startTimer(); }}
        >
          {/* Mobile: single image */}
          <div className="md:hidden relative aspect-[4/3] rounded-lg overflow-hidden">
            <Image
              src={PHOTOS[current].src}
              alt={PHOTOS[current].alt}
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized
            />
          </div>

          {/* Desktop: 3-up with center highlighted */}
          <div className="hidden md:grid grid-cols-3 gap-4 items-center">
            {visible.map((idx, pos) => (
              <div
                key={idx}
                onClick={() => goTo(idx)}
                className={`relative rounded-lg overflow-hidden cursor-pointer transition-all duration-500 ${
                  pos === 1
                    ? 'aspect-[4/3] shadow-2xl scale-105 z-10'
                    : 'aspect-[4/3] opacity-50 scale-95'
                }`}
              >
                <Image
                  src={PHOTOS[idx].src}
                  alt={PHOTOS[idx].alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1200px) 33vw, 400px"
                  unoptimized
                />
              </div>
            ))}
          </div>

          {/* Arrows */}
          <button
            onClick={prev}
            aria-label="Previous"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 md:-translate-x-5 z-20 w-10 h-10 rounded-full bg-bg/80 border border-border flex items-center justify-center hover:border-accent hover:text-accent transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            onClick={next}
            aria-label="Next"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 md:translate-x-5 z-20 w-10 h-10 rounded-full bg-bg/80 border border-border flex items-center justify-center hover:border-accent hover:text-accent transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {PHOTOS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to photo ${i + 1}`}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'bg-accent w-4' : 'bg-border hover:bg-text-muted'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
