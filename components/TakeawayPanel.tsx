'use client';
import { useState, useRef, useEffect } from 'react';
import { useOrder } from './OrderProvider';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/components/UserProvider';
import { createBrowserClient } from '@/lib/supabase-browser';

type Step = 'cart' | 'details' | 'otp' | 'success';

export default function TakeawayPanel() {
  const { items, updateQuantity, removeItem, clearOrder, total } = useOrder();
  const { locale, dict } = useLanguage();
  const { user } = useUser();
  const t = (dict as any).order as Record<string, string>;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('cart');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  useEffect(() => {
    if (user) {
      const fullName = (user.user_metadata?.full_name as string | undefined) ?? '';
      setName(fullName || user.email?.split('@')[0] || '');
      setEmail(user.email ?? '');
    }
  }, [user]);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusable = panel.querySelectorAll<HTMLElement>('button, input, a, select');
    focusable[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab' && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function close() { setOpen(false); }

  function reset() {
    setStep('cart');
    setName(''); setEmail(''); setPhone('');
    setOtp(['', '', '', '', '', '']);
    setSending(false); setVerifying(false);
    setDetailsError(''); setOtpError('');
  }

  async function placeOrder() {
    const res = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: name, customerPhone: phone || undefined, items, total }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');
    clearOrder();
    setStep('success');
  }

  async function handleDetails(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setDetailsError('');

    if (user) {
      try { await placeOrder(); }
      catch (err: unknown) { setDetailsError(err instanceof Error ? err.message : 'Error'); }
      finally { setSending(false); }
      return;
    }

    // Guest: send Supabase email OTP
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) { setDetailsError(error.message); return; }
      setStep('otp');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch {
      setDetailsError('Network error');
    } finally {
      setSending(false);
    }
  }

  async function handleResend() {
    setSending(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) { setOtpError(error.message); return; }
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch {
      setOtpError('Network error');
    } finally {
      setSending(false);
    }
  }

  function handleOtpInput(i: number, val: string) {
    const digit = val.replace(/\D/, '').slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
    if (digit && i === 5 && next.every(d => d)) verifyOtp(next.join(''));
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
      verifyOtp(pasted);
    }
    e.preventDefault();
  }

  async function verifyOtp(code: string) {
    setVerifying(true);
    setOtpError('');
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) {
        setOtpError(t.otpError || 'Code incorrect ou expiré');
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
        return;
      }
      // OTP verified → user now has a session → place order
      await placeOrder();
    } catch {
      setOtpError('Network error');
    } finally {
      setVerifying(false);
    }
  }

  if (count === 0 && !open && step !== 'success') return null;

  return (
    <>
      {!open && count > 0 && (
        <button
          onClick={() => { setOpen(true); setStep('cart'); }}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-bg flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          aria-label="Open cart"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-bg text-accent text-xs font-medium flex items-center justify-center">
            {count}
          </span>
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={close} aria-hidden="true" />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t.title || 'Cart'}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[400px] bg-bg border-l border-border flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                {(step === 'details' || step === 'otp') && (
                  <button
                    onClick={() => setStep(step === 'otp' ? 'details' : 'cart')}
                    className="text-text-muted hover:text-text transition-colors"
                    aria-label="Back"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <h3 className="font-display text-xl italic">
                  {step === 'cart' && t.title}
                  {step === 'details' && (t.customerName?.replace('Votre ', '').replace('Uw ', '') || 'Commande')}
                  {step === 'otp' && t.otpLabel}
                  {step === 'success' && t.successTitle}
                </h3>
              </div>
              <button onClick={close} className="text-text-muted hover:text-text transition-colors text-sm">
                {t.close}
              </button>
            </div>

            {step === 'cart' && (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {items.length === 0 ? (
                    <p className="text-text-muted text-center py-12">{t.empty}</p>
                  ) : (
                    <div className="space-y-4">
                      {items.map(item => (
                        <div key={item.id} className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            {item.desc && <p className="text-xs text-text-muted truncate">{item.desc}</p>}
                            <p className="text-sm text-accent mt-1">{(item.price * item.quantity).toFixed(2)}&euro;</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full border border-border text-text-muted hover:border-accent hover:text-accent transition-colors flex items-center justify-center text-xs">&minus;</button>
                            <span className="text-sm w-5 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full border border-border text-text-muted hover:border-accent hover:text-accent transition-colors flex items-center justify-center text-xs">+</button>
                            <button onClick={() => removeItem(item.id)} className="ml-1 text-text-muted hover:text-red-400 transition-colors" aria-label={`Remove ${item.name}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {items.length > 0 && (
                  <div className="border-t border-border px-6 py-4 space-y-3 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm uppercase tracking-wider text-text-muted">{t.total}</span>
                      <span className="font-display text-xl text-accent">{total.toFixed(2)}&euro;</span>
                    </div>
                    <button
                      onClick={() => setStep('details')}
                      className="w-full py-3 text-sm uppercase tracking-wider bg-accent text-bg hover:bg-accent/90 transition-colors"
                    >
                      {t.emailOrder}
                    </button>
                  </div>
                )}
              </>
            )}

            {step === 'details' && (
              <form onSubmit={handleDetails} className="flex flex-col flex-1 overflow-y-auto">
                <div className="flex-1 px-6 py-6 space-y-4">
                  {!user && (
                    <p className="text-xs text-text-muted leading-relaxed">
                      Un code de vérification sera envoyé à votre adresse email.
                    </p>
                  )}
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-text-muted mb-1.5">{t.customerName} *</label>
                    <input type="text" required value={name} onChange={e => !user && setName(e.target.value)} readOnly={!!user} className={`w-full bg-transparent border border-border rounded-sm px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors${user ? ' opacity-60 cursor-not-allowed' : ''}`} />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-text-muted mb-1.5">{t.customerEmail} *</label>
                    <input type="email" required value={email} onChange={e => !user && setEmail(e.target.value)} readOnly={!!user} className={`w-full bg-transparent border border-border rounded-sm px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors${user ? ' opacity-60 cursor-not-allowed' : ''}`} />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-text-muted mb-1.5">{t.customerPhone}</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+32 …" className="w-full bg-transparent border border-border rounded-sm px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                  </div>
                  {detailsError && <p className="text-red-400 text-xs">{detailsError}</p>}
                </div>
                <div className="px-6 py-3 border-t border-border/50 bg-bg-alt/40 shrink-0">
                  <div className="flex justify-between text-xs text-text-muted mb-0.5">
                    <span>{count} article{count > 1 ? 's' : ''}</span>
                    <span className="text-accent font-semibold">{total.toFixed(2)}&euro;</span>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-border shrink-0">
                  <button type="submit" disabled={sending} className="w-full py-3 text-sm uppercase tracking-wider bg-accent text-bg hover:bg-accent/90 transition-colors disabled:opacity-50">
                    {sending ? t.sending : user ? (t.placeOrder || 'Confirmer') : t.sendOtp}
                  </button>
                </div>
              </form>
            )}

            {step === 'otp' && (
              <div className="flex flex-col flex-1 px-6 py-6">
                <p className="text-sm text-text-muted mb-1">{t.otpSentTo}</p>
                <p className="text-sm font-medium text-accent mb-8 truncate">{email}</p>
                <p className="text-xs uppercase tracking-widest text-text-muted mb-4">{t.otpLabel}</p>
                <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpInput(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      disabled={verifying}
                      aria-label={`OTP digit ${i + 1} of 6`}
                      className="w-11 h-14 text-center text-xl font-mono font-bold border border-border rounded-sm bg-transparent text-text focus:outline-none focus:border-accent transition-colors disabled:opacity-40"
                    />
                  ))}
                </div>
                {otpError && <p className="text-red-400 text-xs text-center mb-4">{otpError}</p>}
                {verifying && <p className="text-text-muted text-xs text-center">{t.verifying}</p>}
                {!verifying && (
                  <button onClick={() => verifyOtp(otp.join(''))} disabled={otp.some(d => !d)} className="w-full py-3 text-sm uppercase tracking-wider bg-accent text-bg hover:bg-accent/90 transition-colors disabled:opacity-40 mt-auto">
                    {t.verify}
                  </button>
                )}
                <button
                  onClick={() => { setOtp(['', '', '', '', '', '']); handleResend(); }}
                  className="mt-3 text-xs text-text-muted hover:text-text underline text-center"
                >
                  {t.resendCode || 'Renvoyer le code'}
                </button>
              </div>
            )}

            {step === 'success' && (
              <div className="flex flex-col flex-1 items-center justify-center px-6 text-center gap-5">
                <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-display italic text-2xl mb-2">{t.successTitle}</h4>
                  <p className="text-text-muted text-sm leading-relaxed">{t.successBody}</p>
                </div>
                <button onClick={() => { reset(); close(); }} className="border border-accent text-accent px-8 py-2.5 text-xs uppercase tracking-widest hover:bg-accent hover:text-bg transition-colors">
                  {t.newOrder}
                </button>
              </div>
            )}

          </div>
        </>
      )}
    </>
  );
}
