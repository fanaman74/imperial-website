'use client';
import { useState, useRef } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';

const EVENT_TYPES = ['birthday', 'corporate', 'wedding', 'family', 'catering', 'other'] as const;

export default function EventContactPage() {
  const { locale, dict } = useLanguage();
  const t = (dict as any).eventContact as Record<string, any>;

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    event_type: 'other', event_date: '', guests: '', message: '',
  });
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function sendOtp() {
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, name: `${form.first_name} ${form.last_name}` }),
    });
    return res.ok;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const ok = await sendOtp();
    setSubmitting(false);
    if (!ok) {
      setError(t?.otpError || 'Failed to send code. Please try again.');
      return;
    }
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    setStep('otp');
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  }

  function handleOtpInput(index: number, value: string) {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const next = [...otpDigits];
      digits.forEach((d, i) => { if (index + i < 6) next[index + i] = d; });
      setOtpDigits(next);
      const focusIdx = Math.min(index + digits.length, 5);
      otpRefs.current[focusIdx]?.focus();
      if (index + digits.length >= 6) {
        const full = next.join('');
        if (full.length === 6) submitOtp(full);
      }
      return;
    }
    if (!/^\d?$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (value && index === 5) {
      const full = next.join('');
      if (full.length === 6) submitOtp(full);
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  async function submitOtp(code: string) {
    if (verifying) return;
    setVerifying(true);
    setOtpError('');
    try {
      const res = await fetch('/api/event-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, code }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('success');
      } else {
        setOtpError(t?.otpError || 'Code incorrect ou expiré');
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
      }
    } catch {
      setOtpError(t?.otpError || 'Code incorrect ou expiré');
    }
    setVerifying(false);
  }

  async function handleResend() {
    setResending(true);
    await sendOtp();
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    setResending(false);
    setTimeout(() => otpRefs.current[0]?.focus(), 50);
  }

  if (step === 'success') {
    return (
      <>
        <Navbar />
        <main id="main-content" className="min-h-screen pt-[72px] flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-display italic text-3xl mb-4">{t?.successTitle}</h1>
            <p className="text-text-muted leading-relaxed mb-8">{t?.successBody}</p>
            <Link href="/" className="inline-block border border-accent text-accent px-8 py-3 text-sm uppercase tracking-wider hover:bg-accent hover:text-bg transition-colors">
              {t?.backHome}
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (step === 'otp') {
    return (
      <>
        <Navbar />
        <main id="main-content" className="min-h-screen pt-[72px] flex items-center justify-center px-6">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <p className="text-text-muted">
                {t?.otpSentTo} <span className="text-accent">{form.email}</span>
              </p>
            </div>
            <div className="mb-8">
              <label className="block text-xs uppercase tracking-widest text-text-muted mb-4 text-center">{t?.otpLabel}</label>
              <div className="flex gap-2 justify-center">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    aria-label={`OTP digit ${i + 1} of 6`}
                    className="w-12 h-14 text-center text-xl font-mono border border-border rounded focus:border-accent outline-none bg-transparent transition-colors"
                  />
                ))}
              </div>
              {otpError && <p className="text-red-400 text-sm text-center mt-3">{otpError}</p>}
            </div>
            <button
              onClick={() => submitOtp(otpDigits.join(''))}
              disabled={otpDigits.join('').length < 6 || verifying}
              className="w-full border border-accent text-accent py-4 text-sm uppercase tracking-widest hover:bg-accent hover:text-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {verifying ? t?.verifying : t?.verify}
            </button>
            <div className="flex items-center justify-between mt-4">
              <button onClick={() => setStep('form')} className="text-sm text-text-muted hover:text-text transition-colors">
                &larr; {t?.back}
              </button>
              <button onClick={handleResend} disabled={resending} className="text-sm text-accent hover:underline disabled:opacity-50">
                {resending ? '…' : t?.resendCode}
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-[72px]">
        <div
          className="relative py-32 px-6 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=1920)' }}
        >
          <div className="absolute inset-0 bg-bg/80" />
          <div className="relative z-10 text-center max-w-[600px] mx-auto">
            <p className="text-xs uppercase tracking-[0.3em] text-accent mb-3">{t?.subtitle}</p>
            <h1 className="font-chango text-4xl md:text-5xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">{t?.title}</h1>
          </div>
        </div>

        <div className="py-20 px-6 max-w-[640px] mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-text-muted mb-2">{t?.firstName} *</label>
                <input type="text" required value={form.first_name} onChange={e => set('first_name', e.target.value)} className="w-full bg-transparent border border-border rounded-sm px-4 py-3 text-text focus:outline-none focus:border-accent transition-colors" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-text-muted mb-2">{t?.lastName} *</label>
                <input type="text" required value={form.last_name} onChange={e => set('last_name', e.target.value)} className="w-full bg-transparent border border-border rounded-sm px-4 py-3 text-text focus:outline-none focus:border-accent transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-text-muted mb-2">{t?.email} *</label>
                <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} className="w-full bg-transparent border border-border rounded-sm px-4 py-3 text-text focus:outline-none focus:border-accent transition-colors" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-text-muted mb-2">{t?.phone}</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+32 …" className="w-full bg-transparent border border-border rounded-sm px-4 py-3 text-text focus:outline-none focus:border-accent transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-text-muted mb-2">{t?.eventType} *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EVENT_TYPES.map(type => (
                  <button key={type} type="button" onClick={() => set('event_type', type)}
                    className={`px-3 py-2.5 text-xs uppercase tracking-wider border rounded-sm transition-colors text-left ${
                      form.event_type === type ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-muted hover:border-accent/50 hover:text-text'
                    }`}>
                    {t?.eventTypes?.[type]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-text-muted mb-2">{t?.eventDate}</label>
                <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-transparent border border-border rounded-sm px-4 py-3 text-text focus:outline-none focus:border-accent transition-colors [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-text-muted mb-2">{t?.guests}</label>
                <input type="number" min={1} max={500} value={form.guests} onChange={e => set('guests', e.target.value)} placeholder="10"
                  className="w-full bg-transparent border border-border rounded-sm px-4 py-3 text-text focus:outline-none focus:border-accent transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-text-muted mb-2">{t?.message}</label>
              <textarea rows={4} value={form.message} onChange={e => set('message', e.target.value)}
                className="w-full bg-transparent border border-border rounded-sm px-4 py-3 text-text focus:outline-none focus:border-accent transition-colors resize-none" />
            </div>
            {error && <div className="bg-red-900/30 border border-red-500/40 text-red-300 px-4 py-3 rounded-sm text-sm">{error}</div>}
            <button type="submit" disabled={submitting}
              className="w-full border border-accent text-accent py-4 text-sm uppercase tracking-widest hover:bg-accent hover:text-bg transition-colors disabled:opacity-50">
              {submitting ? t?.submitting : t?.submit}
            </button>
          </form>
        </div>
      </main>
      <Footer dict={{ nav: dict.nav, findUs: dict.findUs, footer: dict.footer }} />
    </>
  );
}
