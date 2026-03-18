import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Calendar, CreditCard, Heart, Star, Users, Menu, X, ChevronRight, Leaf, Shield, Award, Mail, Phone, MapPin, ArrowRight, Sparkles, Clock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Service {
  id: number;
  name: string;
  slug: string;
  description: string;
  benefits: string;
  price: number;
  duration: number;
  image_url: string;
}

interface Practitioner {
  id: number;
  name: string;
  bio: string;
  image_url: string;
}

interface Testimonial {
  id: number;
  service_id: number;
  name: string;
  rating: number;
  comment: string;
}

interface Booking {
  id: number;
  appointment_time: string;
  status: string;
  credits_used: number;
  services: { name: string };
  practitioners: { name: string };
}

interface JournalEntry {
  id: number;
  entry_date: string;
  mood: number;
  energy: number;
  notes: string;
}

interface Profile {
  credits: number;
  membership_tier: string | null;
  membership_expires: string | null;
  full_name?: string;
  avatar_url?: string;
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────

function Navbar({ user, onLogin, onLogout }: { user: any; onLogin: () => void; onLogout: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/services', label: 'Services' },
    { to: '/membership', label: 'Membership' },
    { to: '/about', label: 'About' },
    ...(user ? [{ to: '/dashboard', label: 'Dashboard' }, { to: '/profile', label: 'Profile' }] : []),
  ];

  return (
    <>
      <nav className={`bg-white sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-md border-b' : 'border-b'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-xl tracking-tight leading-none">BlissNow</div>
              <div className="text-[10px] text-emerald-600 tracking-widest">HOLISTIC HEALTH</div>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to} className="hover:text-emerald-600 transition-colors">{l.label}</Link>
            ))}
            <button
              onClick={user ? onLogout : onLogin}
              className="px-5 py-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-all text-sm ml-2"
            >
              {user ? 'Sign Out' : 'Sign In'}
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t bg-white overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                {navLinks.map(l => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 transition-colors font-medium"
                  >
                    {l.label}
                    <ChevronRight className="w-4 h-4 opacity-40" />
                  </Link>
                ))}
                <div className="pt-2">
                  <button
                    onClick={() => { setMobileOpen(false); user ? onLogout() : onLogin(); }}
                    className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-medium hover:bg-emerald-700 transition"
                  >
                    {user ? 'Sign Out' : 'Sign In'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}

// ─── AUTH MODAL ──────────────────────────────────────────────────────────────

function AuthModal({ isOpen, onClose, isSignup, setIsSignup }: {
  isOpen: boolean; onClose: () => void; isSignup: boolean; setIsSignup: (b: boolean) => void
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (forgotMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/profile`,
        });
        if (error) throw error;
        toast.success('Password reset email sent! Check your inbox.');
        setForgotMode(false);
      } else if (isSignup) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Account created! Check your email to confirm.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back! 🌿');
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) toast.error(error.message);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-3xl p-8 sm:p-10 w-full max-w-md relative shadow-2xl"
          >
            <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-7">
              <div className="mx-auto w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <Heart className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-semibold">
                {forgotMode ? 'Reset Password' : isSignup ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-gray-500 mt-1 text-sm">
                {forgotMode ? "We'll send you a reset link" : isSignup ? 'Begin your wellness journey today' : 'Sign in to your BlissNow account'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm mb-1.5 text-gray-600 font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition text-sm"
                  placeholder="you@email.com"
                  required
                />
              </div>
              {!forgotMode && (
                <div>
                  <label className="block text-sm mb-1.5 text-gray-600 font-medium">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition text-sm pr-12"
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">
                      {showPass ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </div>
              )}

              {!isSignup && !forgotMode && (
                <div className="text-right">
                  <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-emerald-600 hover:underline">
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-medium transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                {loading ? 'Processing...' : forgotMode ? 'Send Reset Link' : isSignup ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            {!forgotMode && (
              <>
                <div className="my-5 flex items-center gap-3 text-sm">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <div className="text-gray-400 text-xs">OR</div>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full py-3.5 border border-gray-200 hover:bg-gray-50 rounded-2xl flex items-center justify-center gap-3 font-medium text-sm transition"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </>
            )}

            <div className="text-center mt-5 text-sm">
              {forgotMode ? (
                <button onClick={() => setForgotMode(false)} className="text-emerald-600 hover:underline">← Back to sign in</button>
              ) : isSignup ? (
                <>Already have an account? <button onClick={() => setIsSignup(false)} className="text-emerald-600 font-medium hover:underline">Sign in</button></>
              ) : (
                <>New to BlissNow? <button onClick={() => setIsSignup(true)} className="text-emerald-600 font-medium hover:underline">Create account</button></>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── SERVICE DETAIL ───────────────────────────────────────────────────────────

function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedPractitioner, setSelectedPractitioner] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const s = await fetch(`/api/services`).then(r => r.json());
      const found = s.find ? s.find((sv: Service) => sv.slug === slug) : (s.data || []).find((sv: Service) => sv.slug === slug);
      setService(found);
      if (found) {
        const t = await fetch(`/api/testimonials?service_id=${found.id}`).then(r => r.json());
        setTestimonials(t || []);
      }
      const p = await fetch(`/api/practitioners`).then(r => r.json());
      setPractitioners(p || []);
    };
    fetchData();
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
  }, [slug]);

  const handleBook = async () => {
    if (!user || !selectedPractitioner || !selectedDate || !selectedTime || !service) {
      toast.error('Please select all fields and be logged in');
      return;
    }
    const appointmentTime = new Date(`${selectedDate}T${selectedTime}`).toISOString();
    const creditsUsed = Math.ceil(service.price / 15);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, practitioner_id: selectedPractitioner, service_id: service.id, appointment_time: appointmentTime, credits_used: creditsUsed })
      });
      if (res.ok) {
        toast.success('Booking confirmed! Check your email.');
        setShowBookingModal(false);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Booking failed');
      }
    } catch {
      toast.error('Failed to book');
    }
  };

  const timeSlots = ['09:00', '10:00', '11:30', '14:00', '15:30', '16:45', '18:00'];

  if (!service) return (
    <div className="flex items-center justify-center py-40">
      <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-10">
        <div>
          <div className="uppercase tracking-[3px] text-xs text-emerald-600 mb-2">EXPERT CARE</div>
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tighter">{service.name}</h1>
        </div>
        <div className="sm:text-right">
          <div className="text-4xl sm:text-5xl font-semibold text-emerald-600">${service.price}</div>
          <div className="text-sm text-gray-500">per {service.duration} min session</div>
        </div>
      </div>

      <img src={service.image_url} alt={service.name} className="w-full h-56 sm:h-[400px] object-cover rounded-3xl mb-10" />

      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <h3 className="font-semibold text-xl mb-3">About this service</h3>
          <p className="text-base sm:text-lg leading-relaxed text-gray-600">{service.description}</p>
          <h3 className="font-semibold text-xl mt-10 mb-3">Key Benefits</h3>
          <ul className="space-y-3">
            {service.benefits.split('. ').filter(Boolean).map((b, i) => (
              <li key={i} className="flex gap-3 text-gray-600 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-xl mb-4">Our Practitioners</h3>
          <div className="space-y-5">
            {practitioners.slice(0, 3).map((p, idx) => (
              <div key={idx} className="flex gap-4 border-b pb-5 last:border-none">
                <img src={p.image_url} alt="" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-gray-500 mt-1 line-clamp-2">{p.bio}</div>
                  <button
                    onClick={() => { setSelectedPractitioner(p.id); setShowBookingModal(true); }}
                    className="mt-3 text-xs uppercase tracking-widest border border-emerald-600 px-4 py-1.5 rounded-full hover:bg-emerald-50 transition"
                  >
                    Book with {p.name.split(' ')[0]}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {testimonials.length > 0 && (
        <div className="mt-14">
          <h3 className="font-semibold text-xl mb-6">Patient Stories</h3>
          <div className="grid sm:grid-cols-2 gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white border p-7 rounded-3xl">
                <div className="flex mb-4">
                  {Array.from({ length: t.rating }).map((_, k) => <Star key={k} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="italic text-base text-gray-700">"{t.comment}"</p>
                <div className="mt-5 text-sm font-medium">{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 flex justify-center">
        <button
          onClick={() => setShowBookingModal(true)}
          className="px-10 py-4 bg-black text-white rounded-full text-base flex items-center gap-3 hover:bg-zinc-800 transition"
        >
          Book Your Session <Calendar className="w-5 h-5" />
        </button>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {showBookingModal && (
          <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
              <div className="p-7 sm:p-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-semibold">Book {service.name}</h3>
                    <p className="text-gray-500 text-sm mt-1">Select practitioner, date and time</p>
                  </div>
                  <button onClick={() => setShowBookingModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2">Practitioner</label>
                    <select value={selectedPractitioner || ''} onChange={e => setSelectedPractitioner(parseInt(e.target.value))} className="w-full p-3.5 border rounded-2xl focus:outline-none focus:border-emerald-500 text-sm">
                      <option value="">Select practitioner</option>
                      {practitioners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Date</label>
                      <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} className="w-full p-3.5 border rounded-2xl focus:outline-none focus:border-emerald-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Time</label>
                      <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="w-full p-3.5 border rounded-2xl focus:outline-none focus:border-emerald-500 text-sm">
                        <option value="">Select time</option>
                        {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {selectedPractitioner && selectedDate && selectedTime && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-5 p-4 bg-emerald-50 rounded-2xl text-sm text-emerald-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Summary:</span>
                    </div>
                    <div className="mt-1 ml-6 text-emerald-600">
                      {practitioners.find(p => p.id === selectedPractitioner)?.name} • {selectedDate} at {selectedTime} • ~{Math.ceil(service.price / 15)} credits
                    </div>
                  </motion.div>
                )}

                <div className="mt-6 flex gap-3">
                  <button onClick={() => setShowBookingModal(false)} className="flex-1 py-3.5 border rounded-2xl text-sm hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={handleBook} className="flex-1 py-3.5 bg-emerald-600 text-white rounded-2xl text-sm font-medium hover:bg-emerald-700 transition">Confirm Booking</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MEMBERSHIP ───────────────────────────────────────────────────────────────

function Membership() {
  const [credits, setCredits] = useState(10);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user));
  }, []);

  const getPricePerCredit = (qty: number) => {
    if (qty <= 5) return 12;
    if (qty <= 15) return 11;
    if (qty <= 25) return 10;
    return 9;
  };

  const totalPrice = Math.round(credits * getPricePerCredit(credits));

  const handlePurchaseCredits = async () => {
    if (!user) { toast.error('Please sign in first'); return; }
    try {
      const res = await fetch('/api/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, type: 'credits', credits }) });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch { toast.error('Payment setup failed'); }
  };

  const tiers = [
    { name: 'Essentials', price: 49, credits: 8, perks: ['8 credits/mo', 'Email support', 'Rollover credits'] },
    { name: 'Wellness', price: 89, credits: 15, popular: true, perks: ['15 credits/mo', 'Priority booking', 'Wellness journal', 'Member discounts'] },
    { name: 'Premium', price: 149, credits: 30, perks: ['30 credits/mo', 'VIP concierge', 'Unlimited journal', 'Guest passes'] },
    { name: 'Unlimited', price: 249, credits: 999, perks: ['Unlimited sessions', 'Dedicated practitioner', 'Home visits', 'Annual wellness plan'] },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium mb-4 tracking-widest">MEMBERSHIPS</div>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tighter">Choose your path to wellness</h1>
        <p className="max-w-md mx-auto mt-4 text-base sm:text-lg text-gray-600">Flexible plans with credits that roll over every 30 days</p>
      </div>

      {/* Tier grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
        {tiers.map((tier, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -4 }}
            className={`relative border rounded-3xl p-7 flex flex-col transition-all ${tier.popular ? 'border-emerald-500 shadow-lg shadow-emerald-100' : 'border-gray-200'}`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold tracking-widest px-4 py-1 rounded-full">POPULAR</div>
            )}
            <div className="uppercase text-xs tracking-[2px] text-emerald-600 mb-2">{tier.name}</div>
            <div className="text-4xl font-semibold mb-0.5">${tier.price}</div>
            <div className="text-sm text-gray-400 mb-5">per month</div>
            <ul className="space-y-2 flex-1">
              {tier.perks.map((p, j) => (
                <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  </div>
                  {p}
                </li>
              ))}
            </ul>
            <button
              onClick={async () => {
                if (!user) return toast.error('Sign in to subscribe');
                const res = await fetch('/api/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, type: 'membership', tier: tier.name }) });
                const { url } = await res.json();
                if (url) window.location.href = url;
              }}
              className={`mt-7 w-full py-3 rounded-2xl text-sm font-medium transition-all ${tier.popular ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border-2 border-black hover:bg-black hover:text-white'}`}
            >
              Subscribe
            </button>
          </motion.div>
        ))}
      </div>

      {/* Credits calculator */}
      <div className="border border-gray-200 rounded-3xl p-8 sm:p-12">
        <div className="text-center mb-8">
          <div className="text-lg font-semibold">Or Build Your Own</div>
          <div className="text-gray-500 text-sm mt-1">Purchase credits à la carte — no subscription required</div>
        </div>
        <div className="max-w-md mx-auto">
          <div className="flex justify-between text-sm mb-3 font-medium">
            <div className="text-gray-500">CREDITS</div>
            <div className="text-3xl font-semibold text-emerald-600">{credits}</div>
          </div>
          <input type="range" min="2" max="30" step="1" value={credits} onChange={e => setCredits(parseInt(e.target.value))} className="w-full accent-emerald-600 h-2" />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><div>2</div><div>30</div></div>
          <div className="flex items-baseline gap-2 my-7">
            <div className="text-5xl font-semibold">${totalPrice}</div>
            <div className="text-gray-500">one-time</div>
          </div>
          <button onClick={handlePurchaseCredits} className="w-full py-4 bg-black text-white rounded-2xl font-medium hover:bg-zinc-800 transition">
            Purchase {credits} Credits
          </button>
          <div className="text-xs text-center mt-3 text-gray-400">Volume discounts applied automatically</div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [newJournal, setNewJournal] = useState({ mood: 3, energy: 3, notes: '' });
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'journal'>('upcoming');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user;
      setUser(u);
      if (u) { fetchProfile(u.id); fetchBookings(u.id); fetchJournals(u.id); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    const res = await fetch(`/api/profiles?user_id=${uid}`);
    setProfile(await res.json());
  };
  const fetchBookings = async (uid: string) => {
    const res = await fetch(`/api/bookings?user_id=${uid}`);
    setBookings((await res.json()) || []);
  };
  const fetchJournals = async (uid: string) => {
    const res = await fetch(`/api/journals?user_id=${uid}`);
    setJournals((await res.json()) || []);
  };
  const saveJournal = async () => {
    if (!user) return;
    const res = await fetch('/api/journals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, ...newJournal }) });
    if (res.ok) { toast.success('Journal entry saved 🌿'); fetchJournals(user.id); setNewJournal({ mood: 3, energy: 3, notes: '' }); }
  };
  const cancelBooking = async (id: number) => {
    if (!user) return;
    await fetch('/api/bookings', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    toast.success('Booking cancelled');
    fetchBookings(user.id);
  };

  if (!user) return (
    <div className="text-center py-32 px-6">
      <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <Heart className="w-7 h-7 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">Sign in to view your dashboard</h2>
      <p className="text-gray-500">Track your bookings, wellness journal, and more.</p>
    </div>
  );

  const upcoming = bookings.filter(b => new Date(b.appointment_time) > new Date());
  const past = bookings.filter(b => new Date(b.appointment_time) <= new Date());

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-10">
        <div>
          <div className="text-emerald-600 text-xs tracking-widest font-medium mb-1">WELCOME BACK</div>
          <div className="text-3xl sm:text-5xl font-semibold tracking-tight">Your Wellness Hub</div>
        </div>
        <div className="sm:text-right">
          <div className="text-4xl sm:text-5xl font-semibold text-emerald-600">{profile?.credits || 0}</div>
          <div className="text-xs text-gray-500 mt-0.5 tracking-widest">CREDITS REMAINING</div>
          {profile?.membership_tier && (
            <div className="text-xs mt-2 uppercase tracking-widest bg-emerald-100 text-emerald-700 px-3 py-1 inline-block rounded-full">{profile.membership_tier}</div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Upcoming', value: upcoming.length, icon: <Calendar className="w-5 h-5 text-emerald-600" /> },
          { label: 'Completed', value: past.length, icon: <CheckCircle className="w-5 h-5 text-emerald-600" /> },
          { label: 'Journal Entries', value: journals.length, icon: <Sparkles className="w-5 h-5 text-emerald-600" /> },
        ].map((stat, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(16,185,129,0.15)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="bg-white border border-gray-200 hover:border-emerald-300 rounded-2xl p-4 text-center cursor-default transition-colors duration-200"
          >
            <div className="flex justify-center mb-2">{stat.icon}</div>
            <div className="text-2xl font-semibold">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-7 overflow-x-auto">
        {(['upcoming', 'history', 'journal'] as const).map(tab => (
          <motion.button
            key={tab}
            onClick={() => setActiveTab(tab)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            className={`px-5 sm:px-8 pb-3 text-sm font-medium capitalize transition-all whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-gray-400 hover:text-gray-700'}`}
          >
            {tab === 'upcoming' ? `Upcoming (${upcoming.length})` : tab === 'history' ? `History (${past.length})` : 'Journal'}
          </motion.button>
        ))}
      </div>

      {/* Upcoming */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {upcoming.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No upcoming appointments</p>
              <Link to="/services" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">Book a session →</Link>
            </div>
          ) : upcoming.map((b, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(16,185,129,0.12)' }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border border-gray-200 hover:border-emerald-300 bg-white hover:bg-emerald-50/30 p-5 rounded-2xl gap-4 cursor-default transition-colors duration-200">
              <div className="flex items-start gap-4">
                <motion.div whileHover={{ scale: 1.1, rotate: -5 }} className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                </motion.div>
                <div>
                  <div className="font-medium">{b.services?.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{b.practitioners?.name}</div>
                  <div className="text-xs text-emerald-600 mt-1 font-medium">{format(new Date(b.appointment_time), 'PPP • p')}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">{b.credits_used} credits</div>
                <button onClick={() => cancelBooking(b.id)} className="text-xs text-red-500 border border-red-200 px-3 py-1 rounded-full hover:bg-red-50 hover:border-red-400 transition-all duration-200">Cancel</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {past.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No past bookings yet</p>
            </div>
          ) : past.map((b, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 p-5 rounded-2xl gap-4 opacity-80 hover:opacity-100 cursor-default transition-all duration-200">
              <div className="flex items-start gap-4">
                <motion.div whileHover={{ scale: 1.1 }} className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-gray-400" />
                </motion.div>
                <div>
                  <div className="font-medium">{b.services?.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{b.practitioners?.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{format(new Date(b.appointment_time), 'PPP • p')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{b.credits_used} credits used</div>
                <div className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full font-medium capitalize">{b.status || 'completed'}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Journal */}
      {activeTab === 'journal' && (
        <div>
          <motion.div whileHover={{ boxShadow: '0 8px 30px rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 200 }} className="bg-white border border-gray-200 hover:border-emerald-200 rounded-3xl p-7 sm:p-10 mb-7 transition-colors duration-200">
            <h3 className="font-semibold text-lg mb-6">How are you feeling today?</h3>
            <div className="grid sm:grid-cols-2 gap-8">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-3 tracking-widest">MOOD</div>
                <div className="flex gap-3">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setNewJournal({...newJournal, mood: n})} className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition-all ${newJournal.mood === n ? 'bg-amber-100 scale-110 shadow-sm' : 'hover:bg-gray-100'}`}>
                      {['😢','🙁','😐','🙂','😊'][n-1]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-3 tracking-widest">ENERGY LEVEL</div>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setNewJournal({...newJournal, energy: n})} className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-semibold transition-all ${newJournal.energy === n ? 'bg-sky-100 text-sky-700 scale-110 shadow-sm' : 'bg-gray-50 hover:bg-gray-100 text-gray-500'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <textarea
              value={newJournal.notes}
              onChange={e => setNewJournal({...newJournal, notes: e.target.value})}
              className="mt-7 w-full h-28 border rounded-2xl p-5 text-sm focus:outline-none focus:border-emerald-400 transition resize-none"
              placeholder="Any reflections or notes for today..."
            />
            <button onClick={saveJournal} className="mt-5 px-8 py-3 bg-black text-white rounded-2xl text-sm font-medium hover:bg-zinc-800 transition">
              Save Entry
            </button>
          </motion.div>

          <div className="space-y-4">
            {journals.map((j, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(14,165,233,0.10)' }} transition={{ delay: idx * 0.04, type: 'spring', stiffness: 300, damping: 20 }} className="border border-gray-200 hover:border-sky-200 bg-white hover:bg-sky-50/20 rounded-2xl p-6 cursor-default transition-colors duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs font-mono text-gray-400">{j.entry_date}</div>
                  <div className="flex gap-4 text-sm">
                    <span>{['😢','🙁','😐','🙂','😊'][j.mood-1]} Mood</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-sky-600 font-medium">⚡ {j.energy}/5</span>
                  </div>
                </div>
                {j.notes && <p className="text-sm text-gray-600 leading-relaxed">{j.notes}</p>}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PROFILE SETTINGS ────────────────────────────────────────────────────────

function ProfileSettings() {
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setFullName(session.user.user_metadata?.full_name || '');
      }
    });
  }, []);

  const saveName = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (error) toast.error(error.message);
    else toast.success('Name updated!');
    setSaving(false);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
    if (error) toast.error(error.message);
    else { toast.success('Password updated!'); setPasswordData({ newPassword: '', confirm: '' }); }
    setPasswordSaving(false);
  };

  if (!user) return (
    <div className="text-center py-32 text-gray-400">Please sign in to view profile settings.</div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <div className="text-xs tracking-widest text-emerald-600 mb-1">ACCOUNT</div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Profile Settings</h1>
      </div>

      {/* Avatar + info */}
      <div className="bg-white border rounded-3xl p-7 mb-6">
        <div className="flex items-center gap-5 mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-semibold text-emerald-700">
              {(fullName || user.email || '?')[0].toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-semibold text-lg">{fullName || 'Your Name'}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
            <div className="text-xs text-gray-400 mt-1">Member since {format(new Date(user.created_at), 'MMMM yyyy')}</div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Full Name</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="flex-1 px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:border-emerald-500 transition"
              placeholder="Enter your full name"
            />
            <button onClick={saveName} disabled={saving} className="px-5 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-60">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-600 mb-2">Email Address</label>
          <input value={user.email} disabled className="w-full px-4 py-3 border rounded-2xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
          <p className="text-xs text-gray-400 mt-1.5">Email cannot be changed. Contact support for help.</p>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white border rounded-3xl p-7 mb-6">
        <h2 className="font-semibold text-lg mb-5">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">New Password</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              className="w-full px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:border-emerald-500 transition"
              placeholder="Min. 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={passwordData.confirm}
              onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
              className="w-full px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:border-emerald-500 transition"
              placeholder="Re-enter new password"
            />
          </div>
          <button type="submit" disabled={passwordSaving} className="px-8 py-3 bg-black text-white rounded-2xl text-sm font-medium hover:bg-zinc-800 transition disabled:opacity-60">
            {passwordSaving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="border border-red-100 rounded-3xl p-7">
        <h2 className="font-semibold text-lg text-red-600 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-5">These actions are irreversible. Please be certain before proceeding.</p>
        <button
          onClick={() => toast.error('Please contact support to delete your account.')}
          className="px-6 py-3 border border-red-300 text-red-600 rounded-2xl text-sm hover:bg-red-50 transition"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}

// ─── ABOUT PAGE ───────────────────────────────────────────────────────────────

function About() {
  const values = [
    { icon: <Leaf className="w-7 h-7 text-emerald-600" />, title: 'Holistic Healing', desc: 'We treat the whole person — mind, body and spirit — with evidence-based, integrative therapies.' },
    { icon: <Shield className="w-7 h-7 text-emerald-600" />, title: 'Expert Practitioners', desc: 'Every practitioner is fully certified, vetted, and passionate about their area of specialization.' },
    { icon: <Award className="w-7 h-7 text-emerald-600" />, title: 'Excellence in Care', desc: 'We maintain the highest standards so each session leaves you feeling genuinely transformed.' },
    { icon: <Heart className="w-7 h-7 text-emerald-600" />, title: 'Community First', desc: 'We believe wellness is a journey best taken together. Our community is here to support you.' },
  ];

  const team = [
    { name: 'Dr. Elena Voss', role: 'Founder & Physiotherapy Lead', img: 'https://picsum.photos/id/64/600/400', bio: 'With 15+ years of experience, Elena founded BlissNow with a vision to make holistic healthcare accessible to all.' },
    { name: 'Dr. Sophia Patel', role: 'Head of Naturopathic Medicine', img: 'https://picsum.photos/id/66/600/400', bio: 'Sophia blends ancient naturopathic wisdom with modern diagnostics to create personalized healing plans.' },
    { name: 'Elena Moreau', role: 'Director of Mindfulness', img: 'https://picsum.photos/id/69/600/400', bio: 'A certified mindfulness coach and yoga therapist, Elena leads all mental wellness and meditation programs.' },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="bg-zinc-950 text-white py-24 sm:py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-emerald-400 text-xs tracking-[4px] mb-5">OUR STORY</div>
          <h1 className="text-5xl sm:text-7xl font-semibold tracking-tighter leading-none mb-6">
            Wellness is not a<br />destination — it's a way of life
          </h1>
          <p className="max-w-xl mx-auto text-lg text-gray-400 leading-relaxed">
            Founded in 2018 in New York City, BlissNow was born from a simple belief: everyone deserves access to exceptional holistic care.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-emerald-600 text-white py-14 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '10K+', label: 'Members' },
            { num: '50+', label: 'Practitioners' },
            { num: '25+', label: 'Services' },
            { num: '6', label: 'Years of Care' },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-4xl sm:text-5xl font-semibold">{s.num}</div>
              <div className="text-emerald-200 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mission */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="text-xs tracking-widest text-emerald-600 mb-3">OUR MISSION</div>
            <h2 className="text-4xl sm:text-5xl font-semibold tracking-tighter mb-6">Rooted in science, guided by heart</h2>
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-4">
              We combine evidence-based therapies with ancient healing traditions to deliver experiences that are both deeply effective and profoundly nourishing.
            </p>
            <p className="text-gray-500 leading-relaxed">
              Each session is carefully tailored to the individual, because we know that no two wellness journeys are the same.
            </p>
          </div>
          <div className="rounded-3xl overflow-hidden">
            <img src="https://picsum.photos/id/1062/800/600" alt="Our space" className="w-full h-72 sm:h-80 object-cover" />
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="bg-zinc-50 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs tracking-widest text-emerald-600 mb-2">WHAT WE STAND FOR</div>
            <h2 className="text-4xl sm:text-5xl font-semibold tracking-tighter">Our Core Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <div key={i} className="bg-white border rounded-3xl p-8">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-5">{v.icon}</div>
                <div className="font-semibold text-xl mb-2">{v.title}</div>
                <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-xs tracking-widest text-emerald-600 mb-2">LEADERSHIP</div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tighter">The People Behind BlissNow</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-8">
          {team.map((m, i) => (
            <div key={i} className="rounded-3xl overflow-hidden border group">
              <img src={m.img} alt={m.name} className="w-full h-64 object-cover group-hover:scale-105 transition duration-500" />
              <div className="p-7">
                <div className="font-semibold text-xl">{m.name}</div>
                <div className="text-sm text-emerald-600 mb-3">{m.role}</div>
                <p className="text-sm text-gray-500 leading-relaxed">{m.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-zinc-950 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs tracking-widest text-emerald-400 mb-2">GET IN TOUCH</div>
            <h2 className="text-4xl font-semibold tracking-tighter">We'd love to hear from you</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: <Mail className="w-5 h-5" />, label: 'Email', value: 'hello@blissnow.com' },
              { icon: <Phone className="w-5 h-5" />, label: 'Phone', value: '+1 (212) 555-0100' },
              { icon: <MapPin className="w-5 h-5" />, label: 'Address', value: '420 Madison Ave, NYC' },
            ].map((c, i) => (
              <div key={i} className="bg-white/5 rounded-2xl p-6 text-center">
                <div className="w-10 h-10 bg-emerald-900 rounded-xl flex items-center justify-center mx-auto mb-3 text-emerald-400">{c.icon}</div>
                <div className="text-xs tracking-widest text-gray-400 mb-1">{c.label}</div>
                <div className="text-sm font-medium">{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DEMO DATA ────────────────────────────────────────────────────────────────

const DEMO_SERVICES: Service[] = [
  {
    id: 1, name: 'Physiotherapy', slug: 'physiotherapy',
    description: 'Evidence-based physical therapy to restore movement, reduce pain, and rebuild strength after injury or surgery.',
    benefits: 'Reduces chronic pain. Improves mobility and flexibility. Speeds up injury recovery. Prevents future injuries. Strengthens muscles and joints.',
    price: 95, duration: 60,
    image_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80',
  },
  {
    id: 2, name: 'Naturopathic Medicine', slug: 'naturopathic-medicine',
    description: 'Holistic diagnosis and treatment using natural remedies, nutrition, and lifestyle medicine to address root causes of illness.',
    benefits: 'Treats root causes of illness. Personalized nutrition plans. Hormone balancing. Immune system support. Sustainable long-term wellness.',
    price: 110, duration: 75,
    image_url: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&q=80',
  },
  {
    id: 3, name: 'Mindfulness & Meditation', slug: 'mindfulness-meditation',
    description: 'Guided mindfulness sessions designed to reduce stress, improve focus, and cultivate a deep sense of inner calm.',
    benefits: 'Reduces stress and anxiety. Improves sleep quality. Enhances focus and clarity. Boosts emotional resilience. Promotes overall well-being.',
    price: 75, duration: 50,
    image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
  },
  {
    id: 4, name: 'Nutrition Counselling', slug: 'nutrition-counselling',
    description: 'Personalized nutrition plans crafted by registered dietitians to optimize energy, manage weight, and support long-term health goals.',
    benefits: 'Personalized meal planning. Weight management support. Improved energy levels. Gut health optimization. Disease prevention through diet.',
    price: 85, duration: 60,
    image_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
  },
  {
    id: 5, name: 'Massage Therapy', slug: 'massage-therapy',
    description: 'Therapeutic deep tissue and relaxation massage to relieve muscle tension, improve circulation, and restore your body\'s natural balance.',
    benefits: 'Relieves muscle tension and soreness. Improves blood circulation. Reduces stress hormones. Enhances sleep quality. Supports injury recovery.',
    price: 90, duration: 60,
    image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
  },
  {
    id: 6, name: 'Acupuncture', slug: 'acupuncture',
    description: 'Traditional Chinese acupuncture combined with modern techniques to restore energy flow, relieve pain, and promote deep healing.',
    benefits: 'Relieves chronic pain. Reduces inflammation. Balances hormones naturally. Improves digestion. Boosts immune function.',
    price: 100, duration: 55,
    image_url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80',
  },
];

const DEMO_TESTIMONIALS: Testimonial[] = [
  { id: 1, service_id: 0, name: 'Sarah M.', rating: 5, comment: 'BlissNow completely changed my relationship with my health. I feel like a new person after just 3 sessions.' },
  { id: 2, service_id: 0, name: 'James K.', rating: 5, comment: 'The practitioners here are world-class. Incredibly professional and deeply caring about your progress.' },
  { id: 3, service_id: 0, name: 'Priya R.', rating: 5, comment: 'I love the credit system — it makes booking so flexible. I use BlissNow every single week now.' },
];

// ─── HOME ─────────────────────────────────────────────────────────────────────

function Home() {
  const [services, setServices] = useState<Service[]>(DEMO_SERVICES);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(DEMO_TESTIMONIALS);

  useEffect(() => {
    fetch('/api/services').then(r => r.json()).then(d => { const arr = Array.isArray(d) ? d : d.data; if (arr?.length) setServices(arr); }).catch(() => {});
    fetch('/api/testimonials').then(r => r.json()).then(d => { const arr = Array.isArray(d) ? d : d.data; if (arr?.length) setTestimonials(arr); }).catch(() => {});
  }, []);

  const pricingCalcTiers = [
    { name: 'Essentials', mo: 49, desc: '8 credits/mo' },
    { name: 'Wellness', mo: 89, desc: '15 credits/mo' },
    { name: 'Premium', mo: 149, desc: '30 credits/mo' },
  ];

  return (
    <div>
      {/* HERO */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950 text-white px-6">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] bg-[length:4px_4px]"></div>
        <div className="absolute inset-0 bg-radial-gradient" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(16,185,129,0.12), transparent)' }}></div>
        <div className="relative z-10 text-center max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="uppercase tracking-[5px] text-xs mb-6 text-emerald-400">EST. 2018 · NEW YORK CITY</div>
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-semibold tracking-tighter leading-none mb-6">
              Rediscover<br />Your Balance
            </h1>
            <p className="max-w-md mx-auto text-lg sm:text-xl text-gray-400 leading-relaxed">
              Premium holistic health experiences. Book today and begin your transformation.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
              <Link to="/services" className="px-8 py-4 bg-white text-black rounded-full font-medium inline-flex items-center justify-center gap-2 hover:bg-gray-100 transition">
                Explore Services <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/membership" className="px-8 py-4 border border-white/30 hover:bg-white/10 rounded-full font-medium text-center transition">
                View Memberships
              </Link>
            </div>
          </motion.div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center">
          <div className="text-[10px] tracking-[4px] text-gray-500 mb-2">SCROLL TO BEGIN</div>
          <div className="w-px h-8 bg-gray-600 mx-auto"></div>
        </div>
      </div>

      {/* SERVICES GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-10">
          <div>
            <div className="uppercase text-xs tracking-widest text-emerald-600">OUR OFFERINGS</div>
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight">Signature Experiences</h2>
          </div>
          <Link to="/services" className="text-sm text-emerald-600 hover:underline flex items-center gap-1">All Services <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service, index) => (
            <Link to={`/services/${service.slug}`} key={index} className="group">
              <div className="overflow-hidden rounded-3xl border aspect-video relative">
                <img src={service.image_url} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70"></div>
                <div className="absolute bottom-0 p-6 sm:p-8 text-white">
                  <div className="font-semibold text-2xl sm:text-3xl tracking-tight">{service.name}</div>
                  <div className="text-xs mt-2 opacity-70 tracking-widest">FROM ${service.price}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="bg-zinc-950 py-20 sm:py-24 text-white px-6">
        <div className="max-w-4xl mx-auto">
          <div className="uppercase text-xs tracking-[4px] mb-3 text-emerald-500">PROCESS</div>
          <h2 className="text-4xl sm:text-6xl font-semibold tracking-tighter mb-14">Your journey begins in<br />three simple steps</h2>
          <div className="grid sm:grid-cols-3 gap-10">
            {[
              { icon: <Users className="w-8 h-8" />, title: 'Choose Practitioner', desc: 'Browse expert profiles and read reviews.' },
              { icon: <Calendar className="w-8 h-8" />, title: 'Book Instantly', desc: 'Select convenient dates and times.' },
              { icon: <CreditCard className="w-8 h-8" />, title: 'Arrive Restored', desc: 'Use your credits or membership for seamless payment.' },
            ].map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="inline-block p-4 bg-white/10 rounded-2xl mb-6">{step.icon}</div>
                <div className="text-xl font-medium mb-2">{step.title}</div>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRICING CALCULATOR */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-10">
          <div className="text-emerald-600 font-medium tracking-widest text-xs mb-2">CALCULATOR</div>
          <h3 className="text-3xl sm:text-5xl font-semibold tracking-tighter">How much will it cost?</h3>
        </div>
        <div className="bg-white border p-8 sm:p-12 rounded-3xl">
          <div className="flex flex-wrap gap-x-10 gap-y-8 justify-center">
            {pricingCalcTiers.map((t, i) => (
              <div key={i} className="text-center min-w-[140px]">
                <div className="text-4xl sm:text-6xl font-semibold text-emerald-600 mb-1">${t.mo}</div>
                <div className="text-lg font-medium mb-1">{t.name}</div>
                <div className="text-xs text-gray-500">{t.desc}</div>
              </div>
            ))}
          </div>
          <div className="h-px bg-gray-200 my-8"></div>
          <p className="text-center text-sm text-gray-500">Credits roll over monthly. Upgrade anytime.</p>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div className="py-20 bg-zinc-50 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs tracking-widest text-emerald-600">TESTIMONIALS</div>
            <h3 className="text-3xl sm:text-5xl font-semibold tracking-tighter">Real transformations</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {testimonials.slice(0, 3).map((t, i) => (
              <div key={i} className="bg-white p-7 rounded-3xl border">
                <div className="flex text-amber-400 mb-5">{'★'.repeat(t.rating)}</div>
                <p className="text-sm sm:text-base leading-snug text-gray-700">"{t.comment}"</p>
                <div className="mt-6 text-xs font-medium text-gray-500">— {t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRACTITIONER SPOTLIGHT */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-8">
          <div>
            <div className="text-emerald-600 text-xs tracking-widest">MEET OUR TEAM</div>
            <h3 className="font-semibold text-3xl sm:text-5xl tracking-tighter">Practitioner Spotlight</h3>
          </div>
          <Link to="/about" className="self-start sm:self-end text-sm text-emerald-600 hover:underline">Meet the team →</Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { name: 'Dr. Elena Voss', role: 'Physiotherapy Lead', img: 'https://picsum.photos/id/64/600/400' },
            { name: 'Dr. Sophia Patel', role: 'Naturopathic Doctor', img: 'https://picsum.photos/id/66/600/400' },
            { name: 'Elena Moreau', role: 'Mindfulness Coach', img: 'https://picsum.photos/id/69/600/400' },
          ].map((p, idx) => (
            <div key={idx} className="rounded-3xl overflow-hidden border group">
              <img src={p.img} alt="" className="w-full h-60 object-cover group-hover:scale-105 transition duration-500" />
              <div className="p-6">
                <div className="font-semibold text-lg">{p.name}</div>
                <div className="text-sm text-emerald-600">{p.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FINAL CTA */}
      <div className="bg-black text-white py-24 text-center px-6">
        <div className="max-w-xl mx-auto">
          <div className="text-emerald-500 tracking-[3px] text-xs mb-5">START TODAY</div>
          <div className="text-4xl sm:text-6xl font-semibold tracking-tighter leading-tight">Your health transformation<br />is one decision away</div>
          <Link to="/membership" className="mt-10 inline-flex items-center gap-2 px-10 py-4 bg-white text-black rounded-full text-base font-medium hover:bg-gray-100 transition">
            Join BlissNow <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── SERVICES PAGE ────────────────────────────────────────────────────────────

function ServicesPage() {
  const [services, setServices] = useState<Service[]>(DEMO_SERVICES);

  useEffect(() => {
    fetch('/api/services').then(res => res.json()).then(data => { const arr = Array.isArray(data) ? data : data.data; if (arr?.length) setServices(arr); }).catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-14 text-center">
        <div className="uppercase tracking-[4px] text-emerald-600 text-xs mb-3">DISCOVER</div>
        <h1 className="text-5xl sm:text-7xl tracking-tighter font-semibold">Our Services</h1>
      </div>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-10">
        {services.map(s => (
          <Link key={s.id} to={`/services/${s.slug}`} className="group flex gap-5 sm:gap-7 border-b pb-10 last:border-none">
            <img src={s.image_url} className="w-36 sm:w-52 h-36 sm:h-52 object-cover rounded-2xl flex-shrink-0" />
            <div className="flex-1 pt-1 min-w-0">
              <div className="font-semibold text-2xl sm:text-4xl tracking-tight group-hover:text-emerald-600 transition-colors leading-tight">{s.name}</div>
              <div className="mt-4 text-sm sm:text-base text-gray-500 leading-snug line-clamp-3">{s.description}</div>
              <div className="mt-5 text-xs uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
                Book Session <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-zinc-950 text-white/60 py-16 text-sm px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <div className="text-white font-semibold">BlissNow</div>
            </div>
            <p className="text-xs leading-relaxed text-white/40">Premium holistic wellness experiences. Est. 2018, NYC.</p>
          </div>
          {[
            { heading: 'Company', links: ['About', 'Our Story', 'Press', 'Contact Us'] },
            { heading: 'Services', links: ['Physiotherapy', 'Naturopathy', 'Mindfulness', 'Nutrition'] },
            { heading: 'Account', links: ['Sign In', 'Create Account', 'Dashboard', 'Membership'] },
          ].map((col, i) => (
            <div key={i}>
              <div className="text-white font-medium text-xs tracking-widest mb-4">{col.heading}</div>
              <ul className="space-y-2">
                {col.links.map(l => <li key={l} className="text-xs hover:text-white/80 cursor-pointer transition">{l}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between gap-3 text-xs text-white/30">
          <div>© {new Date().getFullYear()} BlissNow. All rights reserved.</div>
          <div className="flex gap-5">
            <span className="hover:text-white/60 cursor-pointer transition">Privacy Policy</span>
            <span className="hover:text-white/60 cursor-pointer transition">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out. See you soon! 🌿');
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar user={user} onLogin={() => setShowAuthModal(true)} onLogout={handleLogout} />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:slug" element={<ServiceDetail />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<ProfileSettings />} />
        <Route path="/about" element={<About />} />
      </Routes>

      <Footer />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        isSignup={isSignup}
        setIsSignup={setIsSignup}
      />
    </div>
  );
}
