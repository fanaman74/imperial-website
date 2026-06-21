'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

// Photos from Restaurant Imperial's Google Maps listing
const PHOTOS = [
  { src: 'https://lh3.googleusercontent.com/gps-cs-s/APNQkAFSQDn9S6zPjMV0yUNjh-lI2M1XbfmllCC47UHxaBLz_HzQIigyCt9ClIhKkrflCtYbVoUskCEPh-pYKyoFX_EsNbxC60m-2JVoMQUGgIzSRGIYp-xl4PMuLHvoN5k3JuFOWAFZ=w800-h600-k-no', alt: 'Restaurant Imperial' },
  { src: 'https://lh3.googleusercontent.com/gps-cs-s/APNQkAGf43rRzYawnsp2JFnBqk_krT23FqeBc-qXvhSVBDBsaRHRZ9vNDu8iBEyWAxh2Fv7KW6b0EiQ_Md6Dk4zK1qlxiaPbhbKXYiGQ84TVya4NEaYf0SjxfmH3vP7Ls2sR7PWxrw4=w800-h600-k-no', alt: 'Restaurant Imperial' },
  { src: 'https://lh3.googleusercontent.com/gps-cs-s/APNQkAFp3n9OYZZWSZdBVugAJKClqw_Pbvj-ICMgPS7ZciKJ9f1JNB5ttx9GUwA0AQGSSFYv3Cxk5oRBrJ9a5r6P9-9vZG74zOQhjjW42ZwjjMndZtitjduk4l10OYest5iTJkMOskV3dQ=w800-h600-k-no', alt: 'Restaurant Imperial' },
  { src: 'https://lh3.googleusercontent.com/gps-cs-s/APNQkAGx6KFs_B5DjvqC23t5RDpA74EhuYQQOzlp_xBXSoi6RfT_kOPqVF6irEAzcDvpzQqj3Ybp_RcfONfB_ZPwvUxGoXXE-ECpi9dDa7CUeBFFUtLd3G5jvzADTAiAEVgck1oe3hfK=w800-h600-k-no', alt: 'Restaurant Imperial' },
  { src: 'https://lh3.googleusercontent.com/gps-cs-s/APNQkAGb0HeRXdjgyiYKozOkzgYL_1jlgHKwwWwsfnJhY6-Sxp_YObKNj4Gnevpx2IQPCxDr1xOGm05cvBpdqCcGzSk5FWlk1WyLbC5OaS3HPP8xdZA87ItdXl2RKtaXvpDGNBNcXBFnKA=w800-h600-k-no', alt: 'Restaurant Imperial' },
  { src: 'https://lh3.googleusercontent.com/gps-cs-s/APNQkAFOjE6d75WYYLL-ye7zUNjphXAEWEA6af32muOIUYUUOQW_3BwsMPTtbG9uXuNKxH4EAUiI-pClEkAckiQ0rOFftBKl1aiBGSw2h7RxgqJMqdngm7IBuKL-6UGQKyX3YSor=w800-h600-k-no', alt: 'Restaurant Imperial' },
  { src: 'https://lh3.googleusercontent.com/gps-cs-s/APNQkAGFtSGYkaQcAc6i8_0dgi48kXHUfVnwbeGVITLEQ64J3r0PS9BPnRIQOMNrqQj4sY5JPdZvXbaiYn5qVXIfzuafUEuxv3OmH0AuWb6a_iuEwXAoz66XYxsNBL0SOhPzipSPRi_-bAMok68=w800-h600-k-no', alt: 'Restaurant Imperial' },
  { src: 'https://lh3.googleusercontent.com/gps-cs-s/APNQkAFmkje67HEeimpBiIhUljQBt2ZeukcPa-Zs4k3CkDf7RK5EzjCAILCf0IEGgHE48JI5PaTuQAXrUoVQjoouj2LI9FsTbB8ev8GRLFlKVHB6Nt6gpm1rlzMGa7kLl5Sg4ksU8XlGJg=w800-h600-k-no', alt: 'Restaurant Imperial' },
  { src: 'https://lh3.googleusercontent.com/gps-cs-s/APNQkAFZy2LjOt9p4sk4qpwM-B-9Qo-aoaGluAwLYwdFISXwqtmgg0C37vn0vPp9dNQRrgWmDEveimKiLt29m5-VbTX4asHU_fuR9XHgwGYfMyqGrMv7SD7vCn3pwgthEK4LTOUdAwivledsMrAR=w800-h600-k-no', alt: 'Restaurant Imperial' },
  { src: 'https://lh3.googleusercontent.com/gps-cs-s/APNQkAF1seWBaw-H9ygcl0QjaSK717ASS37lHHnVrrQP-0PM2o1M7vaaUEcDGqBO_odSspvt8n2cqTAOMBUoDDy2s-7rWvMbzrpWAhXUU4050s0vosryeElJG28180S9R-6830xWl8k=w800-h600-k-no', alt: 'Restaurant Imperial' },
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
