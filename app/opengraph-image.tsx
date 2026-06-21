import { ImageResponse } from 'next/og';

export const alt = 'Restaurant Imperial — Cuisine Chinoise & Thaïlandaise, Vilvoorde';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#c41e24',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 110, fontWeight: 700, letterSpacing: 12 }}>IMPERIAL</div>
        <div style={{ fontSize: 40, marginTop: 16, opacity: 0.9 }}>
          Cuisine Chinoise &amp; Thaïlandaise
        </div>
        <div
          style={{
            fontSize: 28,
            marginTop: 40,
            padding: '12px 32px',
            border: '2px solid rgba(255,255,255,0.6)',
            borderRadius: 9999,
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          Vilvoorde · Belgique
        </div>
      </div>
    ),
    size,
  );
}
