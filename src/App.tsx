import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Menu, X, Phone, Mail, MapPin, ChevronRight, CheckCircle, Star } from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ── Local Images (place these in src/assets/ folder) ──
import imgThaiMassage from './assets/img_thai_massage.jpg';
import imgBiohealing from './assets/img_biohealing.jpg';
import imgYogaBalance from './assets/img_yoga_balance.jpg';
import imgWellnessPool from './assets/img_wellness_pool.jpg';
import imgGroupYoga from './assets/img_group_yoga.jpg';
import imgFitnessTraining from './assets/img_fitness_training.jpg';
import imgDryNeedling from './assets/img_dry_needling.jpg';
import imgBiowell from './assets/img_biowell.jpg';
import imgRedLight from './assets/img_red_light.jpg';

const gold = '#059669';
const cream = '#f5f0e8';
const LOGO = 'https://kubattyperfumes.com/demo3/wp-content/uploads/2026/02/logo.png';
const WLOGO = 'https://kubattyperfumes.com/demo3/wp-content/uploads/2026/02/wlogo.png';

if (!document.getElementById('bliss-style')) {
  const l = document.createElement('link');
  l.id = 'bliss-style'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Jost:wght@300;400;500;600&display=swap';
  document.head.appendChild(l);
  const s = document.createElement('style');
  s.textContent = `
    *{box-sizing:border-box;}
    body{font-family:'Jost',sans-serif;background:#ffffff;color:#18181b;margin:0;}
    .fd{font-family:'Cormorant Garamond',serif;}
    input,select,textarea{background:#f9fafb!important;color:#18181b!important;border:1px solid #e4e4e7!important;font-family:'Jost',sans-serif;width:100%;}
    input::placeholder,textarea::placeholder{color:#a1a1aa!important;}
    input:focus,select:focus,textarea:focus{border-color:#059669!important;outline:none!important;box-shadow:0 0 0 3px rgba(5,150,105,0.1)!important;}
    select option{background:#ffffff;color:#18181b;}
    ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#05996930;}
    .gl{height:1px;background:linear-gradient(90deg,transparent,#05996950,transparent);margin:0;}
    .shimmer{background:linear-gradient(90deg,transparent,rgba(5,150,105,0.05),transparent);background-size:200% 100%;animation:sh 4s infinite;}
    @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
    .btn-gold{background:linear-gradient(135deg,#059669,#10b981);color:#ffffff;font-family:'Jost',sans-serif;letter-spacing:.15em;text-transform:uppercase;font-size:11px;cursor:pointer;border:none;transition:opacity .2s;display:inline-block;}
    .btn-gold:hover{opacity:.88;}
    .btn-outline{border:1px solid #059669;color:#059669;background:transparent;font-family:'Jost',sans-serif;letter-spacing:.15em;text-transform:uppercase;font-size:11px;cursor:pointer;transition:all .2s;}
    .btn-outline:hover{background:rgba(5,150,105,0.08);}
    .card{border:1px solid #e4e4e7;transition:all .25s;}
    .card:hover{border-color:#059669;box-shadow:0 16px 48px rgba(5,150,105,0.10);}
    a{text-decoration:none;}
    @media(max-width:768px){.hide-mobile{display:none!important;}.show-mobile{display:flex!important;}}
    @media(min-width:769px){.show-mobile{display:none!important;}}
  `;
  document.head.appendChild(s);
}

const GL = () => <div className="gl" />;

/* ── ScrollToTop: forces page to top on every route change ── */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Force scroll to top -- works even if user was mid-page
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/* ════════════════════════════════════════════════════════════
   SECURITY LAYER
   - All API keys must be in .env as VITE_* variables (never hard-coded)
   - Supabase URL/key are injected at build time via import.meta.env
   - No secrets are ever bundled into client JS
   OWASP A02: Cryptographic Failures / A05: Security Misconfiguration
════════════════════════════════════════════════════════════ */

/* ── Rate Limiter (client-side guard, OWASP A04 / A07)
   Tracks attempts per action key in memory.
   Hard limit: 5 attempts per 60 s window.
   Returns true  → action allowed
   Returns false → blocked, shows toast 429
── */
const _rateLimitStore: Record<string, { count: number; resetAt: number }> = {};
function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = _rateLimitStore[key];
  if (!entry || now > entry.resetAt) {
    _rateLimitStore[key] = { count: 1, resetAt: now + windowMs };
    return true;
  }
  if (entry.count >= maxAttempts) {
    const remaining = Math.ceil((entry.resetAt - now) / 1000);
    toast.error(`Too many attempts. Please wait ${remaining}s before trying again.`);
    return false; // 429 Too Many Requests
  }
  entry.count++;
  return true;
}

/* ── Input Sanitizer (OWASP A03: Injection)
   - Strips HTML tags to prevent XSS
   - Trims whitespace
   - Enforces max length
── */
function sanitize(value: string, maxLen = 500): string {
  return value
    .trim()
    .slice(0, maxLen)
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[<>"'`]/g, c => ({ '<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;','`':'&#x60;' }[c] || c));
}

/* ── Schema Validator (OWASP A03 / A08: Software & Data Integrity)
   Validates that a form object matches expected shape, types, and lengths.
   Returns null if valid, or an error string if invalid.
── */
interface FieldSchema { type: 'string' | 'email'; required?: boolean; min?: number; max?: number; }
function validateSchema(data: Record<string, string>, schema: Record<string, FieldSchema>): string | null {
  for (const [field, rule] of Object.entries(schema)) {
    const val = (data[field] || '').trim();
    if (rule.required && !val) return `${field} is required.`;
    if (val && rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
      return 'Please enter a valid email address.';
    if (val && rule.min && val.length < rule.min) return `${field} must be at least ${rule.min} characters.`;
    if (val && rule.max && val.length > rule.max) return `${field} must be under ${rule.max} characters.`;
    // Reject unexpected control characters
    if (val && /[--]/.test(val)) return `${field} contains invalid characters.`;
  }
  return null;
}

/* ── Loading / Intro Screen ── */
function LoadingScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  const text = 'BLISS NOW GLOBAL';
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 24,
      }}
    >
      {/* Animated glow orb behind text */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.25, scale: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        style={{
          position: 'absolute', width: 500, height: 300,
          background: 'radial-gradient(ellipse, #059669 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', position: 'relative' }}>
        {text.split('').map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: i * 0.06, duration: 0.5, ease: 'easeOut' }}
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: char === ' ' ? 24 : 38,
              letterSpacing: '8px',
              color: '#059669',
              display: 'inline-block',
              minWidth: char === ' ' ? 18 : 'auto',
              textShadow: '0 0 40px rgba(5,150,105,0.6), 0 0 80px rgba(5,150,105,0.2)',
            }}
          >
            {char}
          </motion.span>
        ))}
      </div>
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 180, opacity: 1 }}
        transition={{ delay: 1.1, duration: 1, ease: 'easeInOut' }}
        style={{ height: 1, background: 'linear-gradient(90deg, transparent, #059669, transparent)', position: 'relative' }}
      />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        style={{ fontSize: 10, letterSpacing: '6px', textTransform: 'uppercase', color: 'rgba(5,150,105,0.8)', fontFamily: "'Jost', sans-serif" }}
      >
        Recovery Physiotherapy Clinic
      </motion.div>
    </motion.div>
  );
}

/* ── Fade In on scroll ── */
function FadeIn({ children, delay=0, direction='up' }: { children:React.ReactNode; delay?:number; direction?:'up'|'left'|'right'|'none' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:'-60px' });
  const variants = {
    hidden: { opacity:0, y: direction==='up'?30:0, x: direction==='left'?-30:direction==='right'?30:0 },
    visible: { opacity:1, y:0, x:0 }
  };
  return (
    <motion.div ref={ref} initial="hidden" animate={inView?'visible':'hidden'}
      variants={variants} transition={{ duration:.75, delay, ease:[0.25,0.46,0.45,0.94] }}>
      {children}
    </motion.div>
  );
}

/* ── Animated Image: scroll-reveal + hover zoom ── */
function AnimatedImg({ src, alt='', style, delay=0 }: { src:string; alt?:string; style?:React.CSSProperties; delay?:number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <div ref={ref} style={{ overflow:'hidden', ...style }}>
      <motion.img
        src={src} alt={alt}
        initial={{ opacity:0, scale:1.08, y:18 }}
        animate={inView ? { opacity:1, scale:1, y:0 } : { opacity:0, scale:1.08, y:18 }}
        transition={{ duration:.9, delay, ease:[0.25,0.46,0.45,0.94] }}
        whileHover={{ scale:1.06 }}
        style={{ width:'100%', height:'100%', objectFit:'cover', filter:'grayscale(10%)', display:'block', transition:'transform .6s ease' }}
      />
    </div>
  );
}

function AuthModal({ isOpen, onClose, isSignup, setIsSignup }: { isOpen:boolean; onClose:()=>void; isSignup:boolean; setIsSignup:(b:boolean)=>void; }) {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const [forgot,setForgot]=useState(false);
  const [showPw,setShowPw]=useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();

    // SECURITY: Rate limit auth attempts (OWASP A07 - Identification & Auth Failures)
    const rlKey = forgot ? 'reset' : isSignup ? 'signup' : 'login';
    if (!checkRateLimit(rlKey, 5, 60_000)) return; // blocked → toast already shown

    // SECURITY: Validate + sanitize inputs (OWASP A03 - Injection)
    const emailErr = validateSchema({ email, password }, {
      email: { type: 'email', required: true, max: 254 },
      ...(!forgot ? { password: { type: 'string', required: true, min: 6, max: 128 } } : {}),
    });
    if (emailErr) { toast.error(emailErr); return; }
    const safeEmail = sanitize(email, 254);

    setLoading(true);
    try {
      if(forgot){ const {error}=await supabase.auth.resetPasswordForEmail(safeEmail,{redirectTo:`${window.location.origin}/dashboard`}); if(error)throw error; toast.success('Reset link sent!'); setForgot(false); }
      else if(isSignup){ const {error}=await supabase.auth.signUp({email:safeEmail,password}); if(error)throw error; toast.success('Account created -- verify your email ✦'); }
      else { const {error}=await supabase.auth.signInWithPassword({email:safeEmail,password}); if(error)throw error; toast.success('Welcome back ✦'); }
      onClose();
    } catch(err:any){toast.error(err.message);}
    finally{setLoading(false);}
  };

  if(!isOpen) return null;
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(10px)'}}>
      <motion.div initial={{opacity:0,scale:.96,y:14}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.96}}
        style={{width:'100%',maxWidth:440,padding:40,position:'relative',background:'#ffffff',border:'1px solid #d4d4d8'}}>
        <button onClick={onClose} style={{position:'absolute',top:16,right:16,background:'none',border:'none',cursor:'pointer',color:'#a1a1aa',lineHeight:1}} onMouseEnter={e=>(e.currentTarget.style.color=gold)} onMouseLeave={e=>(e.currentTarget.style.color='#a1a1aa')}>
          <X style={{width:16,height:16}} />
        </button>
        <div style={{textAlign:'center',marginBottom:28}}>
          <img src={LOGO} alt="logo" style={{height:44,margin:'0 auto 14px',objectFit:'contain',display:'block'}} />
          <div className="fd" style={{fontSize:24,color:'#18181b'}}>{forgot?'Reset Password':isSignup?'Create Account':'Welcome Back'}</div>
          <div style={{fontSize:9,letterSpacing:'3px',color:'#059669',marginTop:4,textTransform:'uppercase'}}>{forgot?'Enter your email':isSignup?'Join Bliss Now Global':'Sign in to your account'}</div>
        </div>
        <GL />
        <form onSubmit={handle} style={{marginTop:24,display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <label style={{display:'block',fontSize:9,letterSpacing:'3px',textTransform:'uppercase',color:'#71717a',marginBottom:7}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={{padding:'12px 14px',fontSize:13}} placeholder="your@email.com" required />
          </div>
          {!forgot&&(<div>
            <label style={{display:'block',fontSize:9,letterSpacing:'3px',textTransform:'uppercase',color:'#71717a',marginBottom:7}}>Password</label>
            <div style={{position:'relative'}}>
              <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} style={{padding:'12px 50px 12px 14px',fontSize:13}} placeholder="••••••••" required />
              <button type="button" onClick={()=>setShowPw(v=>!v)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:9,letterSpacing:'2px',textTransform:'uppercase',color:'#059669',background:'none',border:'none',cursor:'pointer'}}>{showPw?'hide':'show'}</button>
            </div>
          </div>)}
          {!isSignup&&!forgot&&(<div style={{textAlign:'right'}}>
            <button type="button" onClick={()=>setForgot(true)} style={{fontSize:9,letterSpacing:'2px',textTransform:'uppercase',color:'#a1a1aa',background:'none',border:'none',cursor:'pointer'}} onMouseEnter={e=>(e.currentTarget.style.color=gold)} onMouseLeave={e=>(e.currentTarget.style.color='#a1a1aa')}>Forgot password?</button>
          </div>)}
          <button type="submit" className="btn-gold" disabled={loading} style={{padding:'14px',marginTop:4,width:'100%'}}>{loading?'...':forgot?'Send Reset Link':isSignup?'Create Account':'Sign In'}</button>
        </form>
        <div style={{textAlign:'center',marginTop:18,fontSize:11,color:'#a1a1aa'}}>
          {forgot?(<button onClick={()=>setForgot(false)} style={{color:'#059669',background:'none',border:'none',cursor:'pointer'}}>← Back to sign in</button>)
          :isSignup?(<>Already a member? <button onClick={()=>setIsSignup(false)} style={{color:'#059669',background:'none',border:'none',cursor:'pointer'}}>Sign in</button></>)
          :(<>New here? <button onClick={()=>setIsSignup(true)} style={{color:'#059669',background:'none',border:'none',cursor:'pointer'}}>Create account</button></>)}
        </div>
      </motion.div>
    </div>
  );
}

function Navbar({user,onLogin,onLogout}:{user:any;onLogin:()=>void;onLogout:()=>void;}) {
  const [open,setOpen]=useState(false);
  const [scrolled,setScrolled]=useState(false);
  useEffect(()=>{ const fn=()=>setScrolled(window.scrollY>40); window.addEventListener('scroll',fn); return()=>window.removeEventListener('scroll',fn); },[]);

  const links=[
    {to:'/',label:'Home'},{to:'/about',label:'About Us'},{to:'/consultancy',label:'Consultancy'},
    {to:'/ecosystem',label:'Our Ecosystem'},{to:'/contact',label:'Contact Us'},
    ...(user?[{to:'/dashboard',label:'Dashboard'}]:[]),
  ];

  return (
    <>
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,background:scrolled?'rgba(255,255,255,0.96)':'rgba(255,255,255,1)',backdropFilter:scrolled?'blur(20px)':'none',borderBottom:'1px solid #e4e4e7',padding:scrolled?'10px 0':'18px 0',transition:'all .4s'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <Link to="/" style={{display:'flex',alignItems:'center',gap:12}}>
            <img src={LOGO} alt="Bliss Now Global" style={{height:48,width:'auto',objectFit:'contain'}} />
          </Link>
          <div className="hide-mobile" style={{display:'flex',alignItems:'center',gap:28}}>
            {links.map(l=>(
              <Link key={l.to} to={l.to}
                onClick={()=>{ document.documentElement.scrollTop=0; document.body.scrollTop=0; window.scrollTo(0,0); }}
                style={{fontSize:14,letterSpacing:'1.5px',textTransform:'uppercase',color:'#000000',fontWeight:500,transition:'color .2s'}}
                onMouseEnter={e=>(e.currentTarget.style.color='#059669')} onMouseLeave={e=>(e.currentTarget.style.color='#111111')}>{l.label}</Link>
            ))}
            <button className="btn-gold" onClick={user?onLogout:onLogin} style={{padding:'10px 22px'}}>{user?'Sign Out':'Get Quotes'}</button>
          </div>
          <button className="show-mobile" onClick={()=>setOpen(v=>!v)} style={{background:'none',border:'none',cursor:'pointer',color:'#059669',padding:4}}>
            {open?<X style={{width:22,height:22}}/>:<Menu style={{width:22,height:22}}/>}
          </button>
        </div>
        <AnimatePresence>
          {open&&(
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
              style={{background:'rgba(255,255,255,0.98)',borderTop:'1px solid #e4e4e7',overflow:'hidden'}}>
              <div style={{padding:'12px 24px 20px',display:'flex',flexDirection:'column'}}>
                {links.map(l=>(
                  <Link key={l.to} to={l.to}
                    onClick={()=>{ setOpen(false); document.documentElement.scrollTop=0; document.body.scrollTop=0; window.scrollTo(0,0); }}
                    style={{padding:'12px 8px',fontSize:10,letterSpacing:'2px',textTransform:'uppercase',color:'#71717a',borderBottom:`1px solid ${gold}08`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    {l.label}<ChevronRight style={{width:12,height:12,color:'#059669'}}/>
                  </Link>
                ))}
                <button className="btn-gold" onClick={()=>{setOpen(false);user?onLogout():onLogin();}} style={{padding:'12px',marginTop:14,width:'100%'}}>{user?'Sign Out':'Get Quotes'}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      <div style={{height:88}}/>
    </>
  );
}

function Footer() {
  return (
    <footer style={{background:'#18181b',borderTop:'1px solid #e4e4e7',padding:'64px 0 32px'}}>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:40,marginBottom:48}}>
          <div>
            <img src={WLOGO} alt="Bliss Now" style={{height:44,objectFit:'contain',marginBottom:16,display:'block'}}/>
            <p style={{fontSize:11,lineHeight:1.8,color:'#a1a1aa',maxWidth:220}}>Bliss Now was first established in New York in 2019 and formally structured in Singapore in 2020</p>
          </div>
          <div>
            <div style={{fontSize:9,letterSpacing:'4px',textTransform:'uppercase',color:'#059669',marginBottom:18}}>Quick Links</div>
            {[['/', 'Home'],['/about','About Us'],['/consultancy','Consultancy'],['/ecosystem','Our Ecosystem'],['/contact','Contact']].map(([to,label])=>(
              <Link key={to} to={to} style={{display:'block',fontSize:12,color:'#a1a1aa',marginBottom:10,transition:'color .2s'}}
                onMouseEnter={e=>(e.currentTarget.style.color=cream)} onMouseLeave={e=>(e.currentTarget.style.color='#a1a1aa')}>{label}</Link>
            ))}
          </div>
          <div>
            <div style={{fontSize:9,letterSpacing:'4px',textTransform:'uppercase',color:'#059669',marginBottom:18}}>Services</div>
            {['Privacy Policy','Terms & Conditions','Data Privacy & Consent','Careers'].map(l=>(
              <div key={l} style={{fontSize:12,color:'#a1a1aa',marginBottom:10,cursor:'pointer'}}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{fontSize:9,letterSpacing:'4px',textTransform:'uppercase',color:'#059669',marginBottom:18}}>Information</div>
            <div style={{fontSize:12,color:'#71717a',lineHeight:2}}>
              <div>📞 +971 567-8900</div>
              <div>✉️ hello@blissnow.ae</div>
              <div style={{marginTop:10,fontSize:10,letterSpacing:'2px',color:'#059669'}}>DUBAI OFFICE</div>
              <div style={{fontSize:11,color:'#a1a1aa'}}>Silicon Central Mall, Al Ain - Dubai Rd<br/>Nadd Hessa, Dubai, UAE</div>
              <div style={{marginTop:10,fontSize:10,letterSpacing:'2px',color:'#059669'}}>SINGAPORE OFFICE</div>
              <div style={{fontSize:11,color:'#a1a1aa'}}>531A Upper Cross St, #04-95<br/>Singapore 051531</div>
            </div>
          </div>
        </div>
        <GL/>
        <div style={{paddingTop:24,display:'flex',flexWrap:'wrap',justifyContent:'space-between',gap:12,fontSize:10,letterSpacing:'1px',color:'#d4d4d8'}}>
          <div>Copyright © {new Date().getFullYear()} Bliss Now. All Rights Reserved.</div>
          <div style={{display:'flex',gap:20}}>
            {['Privacy Policy','Terms & Conditions','Disclaimer'].map(l=><span key={l} style={{cursor:'pointer'}}>{l}</span>)}
          </div>
        </div>
      </div>
    </footer>
  );
}

function Home({onLogin}:{onLogin:()=>void}) {
  const [openFaq,setOpenFaq]=useState<number|null>(null);

  const services=[
    {icon:'🧬',title:'Consulting',desc:'Strategic advisory for structured, measurable, future-ready health ecosystems.'},
    {icon:'👥',title:'Team Workshops',desc:'Interactive workshops designed to support team wellbeing and long-term performance.'},
    {icon:'🏥',title:'Our Ecosystem',desc:'Connecting clinics, genomics, diagnostics, and digital intelligence into one unified infrastructure.'},
    {icon:'⚡',title:'Burnout Recovery',desc:'A structured program to help professionals recover from burnout and regain balance.'},
  ];
  const steps=[
    {n:'01',title:'Initial Assessment',desc:'We start by understanding your current challenges, goals, and environment.'},
    {n:'02',title:'Personalized Plan',desc:'We create a tailored action plan focused on balance, clarity, and sustainable routines.'},
    {n:'03',title:'Ongoing Support',desc:'We provide continuous guidance, feedback, and adjustments to ensure progress.'},
  ];
  const testimonials=[
    {
      name:'Clauricio Neto',
      img:'https://ui-avatars.com/api/?name=Clauricio+Neto&background=059669&color=fff&size=80',
      text:'I would like to thank you for your professionalism and excellent care. Yazan is one of the most skilled physiotherapists I have ever worked with. He applies precise trigger point techniques that are both effective and results-driven. After just a few sessions, I experienced significant relief, improved mobility, and overall better body function. Highly recommend!',
      verified:true,
    },
    {
      name:'Greg Basilio',
      img:'https://ui-avatars.com/api/?name=Greg+Basilio&background=e05c2a&color=fff&size=80',
      text:'Therapist Yazan helps me to comeback in running & cycling after my (literally) first session with him due to my stiffed & muscle spasm...been to other therapist but never experienced the way he treat my pain, coming back and still on my road to recovery but this clinic is worth to try.',
      verified:true,
    },
    {
      name:'Tarek El Hout',
      img:'https://ui-avatars.com/api/?name=Tarek+El+Hout&background=e05c2a&color=fff&size=80',
      text:'Excellent sports massage by Yazan. He always manages to take away my pain. Great pressure and technique, also really skilled with cupping and physio exercises.',
      verified:true,
    },
    {
      name:'Avanti B',
      img:'https://ui-avatars.com/api/?name=Avanti+B&background=4285F4&color=fff&size=80',
      text:'Me and my husband got to know of Bliss Now for recovery after extensive cycling and sports. During my 1st consultation I could see their doctors and therapist have in depth knowledge. It is good to know next to the Gym in Silicon Oasis we have this kind of wellness and recovery place specialising in Sports Massage, dry needling, cupping therapy. My husband and I feel relief from pain and that comforting lightness again. We would recommend to our friends!',
      verified:true,
    },
    {
      name:'Jad Kobrossi',
      img:'https://ui-avatars.com/api/?name=Jad+Kobrossi&background=7c3aed&color=fff&size=80',
      text:'excellent!!!! I had shoulder and back pain for so long... but from the FIRST session with Yazan I felt a huge difference! Perfect pressure, clear explanation, and helpful exercises. Now I can move without pain again. Highly recommend!',
      verified:true,
    },
    {
      name:'Ahmed Babiker',
      img:'https://ui-avatars.com/api/?name=Ahmed+Babiker&background=e05c2a&color=fff&size=80',
      text:'My first session there was amazing and I did it with the best Yazan and he explain to me everything and fix me before my competition and was really a big difference to feel relief after the session and feeling good. And for sure I am gonna keep my session with him.',
      verified:true,
    },
    {
      name:'Bashar Shbeb',
      img:'https://ui-avatars.com/api/?name=Bashar+Shbeb&background=059669&color=fff&size=80',
      text:'Had an excellent recovery massage session. Yazan is very professional, skilled, and knows exactly what he is doing. I felt a huge difference and deep relief right after the session. Highly recommended!',
      verified:true,
    },
    {
      name:'momen amin (الزنجبالي)',
      img:'https://ui-avatars.com/api/?name=Momen+Amin&background=059669&color=fff&size=80',
      text:'I truly appreciate their strong knowledge and deep expertise in handling injuries. They understand exactly what they are doing, explain every step clearly, and provide professional guidance that makes you feel safe and confident. Highly recommended for anyone looking for real experience and excellent care.',
      verified:true,
    },
    {
      name:'Asma Ahmad',
      img:'https://ui-avatars.com/api/?name=Asma+Ahmad&background=e05c2a&color=fff&size=80',
      text:'I have tried one of the therapists, Yazan, a magician in a form of human. With his gracious hands was able to sooth knots in my shoulders and have improved my mobility significantly. He knows what he is doing and understands the anatomy of the muscles. I strongly recommend him for rehabilitation and sports massages.',
      verified:true,
    },
    {
      name:'youssef hamed',
      img:'https://ui-avatars.com/api/?name=Youssef+Hamed&background=7c3aed&color=fff&size=80',
      text:'To be honest, I have tried dozens of physiotherapy clinics, but none came close to this one. Dr. Yazan is simply exceptional -- it felt like magic. He identified and treated every issue with such precision and deep understanding of how each muscle works and heals. Truly the best experience I have ever had.',
      verified:true,
    },
    {
      name:'Aymen Raseloued',
      img:'https://ui-avatars.com/api/?name=Aymen+Raseloued&background=059669&color=fff&size=80',
      text:'Awesome experience! I have tried many many physiotherapy clinics and doctors.. but Dr. Yazan is an exception really. He was so special in identifying and treating each issue with such precision that made me really wanna stay there for the day long haha, I will definitely visit again.',
      verified:true,
    },
    {
      name:'Bárbara Cavalcanti',
      img:'https://ui-avatars.com/api/?name=Barbara+Cavalcanti&background=4285F4&color=fff&size=80',
      text:'I had an amazing experience at Bliss Hub! I went for acupuncture and cupping and it was exactly what I needed. The treatment really helped with my back pain and was super relaxing. The staff was professional and welcoming. It is conveniently located inside Silicon Mall, within UFC Gym. Definitely worth a visit!',
      verified:true,
    },
    {
      name:'Baker Nassour',
      img:'https://ui-avatars.com/api/?name=Baker+Nassour&background=e05c2a&color=fff&size=80',
      text:'I had a great experience at this physiotherapy center. Yazan is very professional, knowledgeable, and genuinely cares about his patients. He explained every step of the treatment clearly and made sure I was comfortable throughout the sessions. I noticed real improvement in a short time. Highly recommended.',
      verified:true,
    },
  ];
  const pricing=[
    {
      name:'Performance',
      price:'AED 5,999',
      old:'AED 13,820',
      desc:'Entry-level structured health plan for individuals beginning their wellness journey.',
      perks:[
        '🏋️ UFC Gym -- All branches unlimited access',
        '🩺 Onboarding wellness assessment',
        '🧬 20% discount on genetic wellness testing',
        '💆 1 physiotherapy & performance assessment',
        '💆 6 physiotherapy or sports massage sessions',
        '🥗 1 dietitian consultation',
        '💡 1 personal fitness coaching session',
        '🔴 Red light therapy -- 2/month',
        '❄️ Cold plunge -- 2/month',
        '🩹 Compression therapy -- 2/month',
        '🍹 10% discount at UFC Arm Bar',
        '🎉 2 wellness community events/year',
      ],
      popular:false
    },
    {
      name:'Presence',
      price:'AED 9,999',
      old:'AED 26,760',
      desc:'Comprehensive wellness architecture for consistent health and performance.',
      perks:[
        '🏋️ UFC Gym -- All branches unlimited access',
        '🩺 Onboarding wellness assessment',
        '🧬 Fitness genetics test (1 report, 1 kit)',
        '🔬 Blood biomarkers -- Basic Wellness (19 parameters) × 2/year',
        '💆 2 physiotherapy & performance assessments',
        '💆 8 physiotherapy or sports massage sessions',
        '🏷️ 25% discount on additional sessions',
        '🥗 3 dietitian consultations',
        '💊 Basic supplement recommendation',
        '💡 4 personal fitness coaching sessions',
        '📊 2 health & performance monitoring screenings',
        '🔴 Red light therapy -- 4/month',
        '❄️ Cold plunge -- 4/month',
        '🩹 Compression therapy -- 4/month',
        '🍹 20% discount at UFC Arm Bar',
        '🎉 4 wellness community events/year',
        '👶 10 children activity sessions (dance/music)',
      ],
      popular:true
    },
    {
      name:'Precision',
      price:'AED 17,999',
      old:'AED 46,100',
      desc:'The ultimate 12-month structured health architecture for peak performance and longevity.',
      perks:[
        '🏋️ UFC Gym -- All branches unlimited access',
        '🩺 Onboarding wellness assessment',
        '🧬 2 genetic reports (1 kit included)',
        '🔬 Blood biomarkers -- General Wellness (53 parameters) × 2/year',
        '⚡ 2 BioWell energy assessments',
        '🎂 Biological age assessment',
        '💆 Alternative medicine consultation with gut & sleep guidance',
        '📋 Quarterly physiotherapy & performance review',
        '💆 12 physiotherapy or sports massage sessions',
        '🏷️ 25% discount on additional sessions',
        '🥗 6 DHA dietitian consultations & nutrition plan',
        '💊 Personalized supplement plan',
        '💡 8 personal fitness coaching sessions',
        '📊 4 health & performance monitoring screenings',
        '📈 Quarterly strategy reviews',
        '⌚ Integrated wearable performance tracking device',
        '🔴 Red light therapy -- 6/month',
        '❄️ Cold plunge -- 6/month',
        '🩹 Compression therapy -- 6/month',
        '🍹 30% discount at UFC Arm Bar',
        '🎉 8 wellness community events/year',
        '👶 20 children activity sessions + 5 playground visits',
        '🥊 50% discount on UFC Kids classes (Jiu-Jitsu/Kickboxing)',
      ],
      popular:false
    },
  ];
  const faqs=[
    {q:'Who is this consulting service for?',a:'Our services are designed for professionals, teams, and organizations seeking healthier work-life balance and sustainable ways of working.'},
    {q:'Is this suitable for individuals and companies?',a:'Yes. We work with both individuals and companies looking to build healthier workplace cultures.'},
    {q:'How does the consulting process work?',a:'We begin with an assessment, craft a personalized plan, and provide ongoing support throughout your journey.'},
    {q:'Do you offer online sessions?',a:'Yes. Sessions are available online, allowing clients to participate from anywhere in the world.'},
  ];

  return (
    <div style={{background:'#ffffff'}}>
      {/* HERO */}
      <div style={{position:'relative',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#ffffff',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(5,150,105,0.04), transparent)'}}/>
        <div style={{position:'absolute',inset:0,backgroundImage:`radial-gradient(ellipse 70% 55% at 50% 50%, rgba(5,150,105,0.06), transparent)`}}/>
        {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h],i)=>(
          <div key={i} style={{position:'absolute',[v]:80,[h]:24,width:48,height:48,borderTop:v==='top'?'1px solid rgba(5,150,105,0.2)':'none',borderBottom:v==='bottom'?'1px solid rgba(5,150,105,0.2)':'none',borderLeft:h==='left'?'1px solid rgba(5,150,105,0.2)':'none',borderRight:h==='right'?'1px solid rgba(5,150,105,0.2)':'none'}}/>
        ))}
        <div style={{position:'relative',zIndex:10,textAlign:'center',padding:'0 24px',maxWidth:820}}>
          <motion.div initial={{opacity:0,y:28}} animate={{opacity:1,y:0}} transition={{duration:.9}}>
            <div style={{fontSize:10,letterSpacing:'6px',textTransform:'uppercase',color:'#059669',marginBottom:24}}>Dubai · Singapore · Est. 2020</div>
            <h1 className="fd" style={{fontSize:'clamp(44px,8vw,92px)',lineHeight:1.05,color:'#0d1a0d',marginBottom:24}}>Building the Future of<br/><em style={{color:'#059669'}}>Preventive Infrastructure</em></h1>
            <p style={{maxWidth:480,margin:'0 auto 40px',fontSize:15,lineHeight:1.8,color:'#52525b'}}>Global Infrastructure for Preventive & Predictive Care. A human-centered approach helping individuals and teams reduce stress and build healthy routines.</p>
            <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:16}}>
              <motion.button whileHover={{scale:1.03}} whileTap={{scale:.97}} className="btn-gold" onClick={onLogin} style={{padding:'14px 40px'}}>Start Your Journey</motion.button>
              <Link to="/about"><motion.button whileHover={{scale:1.03}} whileTap={{scale:.97}} className="btn-outline" style={{padding:'14px 40px',border:'1px solid #059669',color:'#059669',background:'transparent'}}>Learn More</motion.button></Link>
            </div>
          </motion.div>
        </div>

      </div>

      {/* BENEFITS */}
      <div style={{maxWidth:1200,margin:'0 auto',padding:'96px 24px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:56,alignItems:'center'}}>
          <div>
            <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>Benefits</div>
            <h2 className="fd" style={{fontSize:'clamp(28px,4vw,48px)',color:'#18181b',lineHeight:1.2,marginBottom:24}}>A Better Way to<br/>Create Balance</h2>
            {['Fitness Without Genetic Insight','Nutrition Without Personalization','Reactive Instead of Preventive Wellness','Emotional Wellness Without Insight'].map((b,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,fontSize:14,color:'#71717a'}}>
                <span style={{color:'#059669',fontSize:10}}>✦</span>{b}
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <AnimatedImg src={imgThaiMassage} style={{width:'100%',height:220}} delay={0} />
            <AnimatedImg src={imgBiohealing} style={{width:'100%',height:220,marginTop:32}} delay={0.2} />
          </div>
        </div>
      </div>

      <GL/>

      {/* ABOUT SNIPPET */}
      <div style={{maxWidth:1200,margin:'0 auto',padding:'96px 24px'}}>
        <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:10}}>About Us</div>
        <h2 className="fd" style={{fontSize:'clamp(28px,4vw,48px)',color:'#18181b',marginBottom:14}}>A Human-Centered Approach</h2>
        <div style={{fontSize:11,letterSpacing:'2px',color:'#059669',marginBottom:28}}>Supporting Sustainable Work and Wellbeing</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:40}}>
          <div>
            {['People -- We design systems that serve individuals, families, and organizations.','Purpose -- We operate with intention and long-term impact.','Life -- We believe health is the foundation of meaningful living.'].map((p,i)=>(
              <div key={i} style={{display:'flex',gap:12,marginBottom:14,fontSize:14,color:'#71717a'}}><span style={{color:'#059669',marginTop:4}}>✦</span>{p}</div>
            ))}
          </div>
          <p style={{fontSize:15,lineHeight:1.9,color:'#71717a'}}>What began in 2020 as a premium wellness and spa operator has evolved into a multidisciplinary health platform integrating genomics, precision diagnostics, integrative medicine, recovery sciences, and AI-driven personalization.</p>
        </div>
        <div style={{marginTop:28}}><Link to="/about"><button className="btn-outline" style={{padding:'12px 32px'}}>Read More →</button></Link></div>
      </div>

      {/* SERVICES */}
      <div style={{background:'#f4f4f5',borderTop:'1px solid #e4e4e7',borderBottom:'1px solid #e4e4e7',padding:'96px 0'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px'}}>
          <FadeIn><div style={{textAlign:'center',marginBottom:52}}>
            <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>Collaborate</div>
            <h2 className="fd" style={{fontSize:'clamp(28px,4vw,52px)',color:'#18181b'}}>Ecosystem Curated for Holistic Care</h2>
          </div></FadeIn>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:20}}>
            {services.map((s,i)=>(
              <motion.div key={i} className="card" whileHover={{y:-6}}
                initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:'-40px'}}
                transition={{duration:.6,delay:i*0.12,ease:[0.25,0.46,0.45,0.94]}}
                style={{padding:32,background:'#f4f4f5'}}>
                <div style={{fontSize:32,marginBottom:16}}>{s.icon}</div>
                <div style={{fontSize:9,letterSpacing:'3px',textTransform:'uppercase',color:'#059669',marginBottom:10}}>{s.title}</div>
                <p style={{fontSize:13,lineHeight:1.8,color:'#71717a',marginBottom:16}}>{s.desc}</p>
                <div style={{fontSize:10,letterSpacing:'2px',textTransform:'uppercase',color:'#059669',cursor:'pointer'}}>Read More →</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{maxWidth:1200,margin:'0 auto',padding:'96px 24px'}}>
        <div style={{textAlign:'center',marginBottom:52}}>
          <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>How It Works</div>
          <h2 className="fd" style={{fontSize:'clamp(28px,4vw,52px)',color:'#18181b'}}>A Simple, Human-Centered Process</h2>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:24}}>
          {steps.map((s,i)=>(
            <motion.div key={i} className="card" whileHover={{y:-5,boxShadow:'0 20px 60px rgba(5,150,105,0.12)'}}
              initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:'-40px'}}
              transition={{duration:.6,delay:i*0.15}}
              style={{padding:40,textAlign:'center',background:'#f9fafb',border:'1px solid #e4e4e7'}}>
              <div className="fd" style={{fontSize:72,color:'rgba(5,150,105,0.12)',lineHeight:1,marginBottom:16}}>{s.n}</div>
              <div style={{fontSize:9,letterSpacing:'4px',textTransform:'uppercase',color:'#059669',marginBottom:14,fontWeight:600}}>{s.title}</div>
              <p style={{fontSize:14,lineHeight:1.9,color:'#52525b'}}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div style={{background:'#f4f4f5',borderTop:'1px solid #e4e4e7',borderBottom:'1px solid #e4e4e7',padding:'96px 0'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px'}}>
          <FadeIn><div style={{textAlign:'center',marginBottom:52}}>
            <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>Google Reviews</div>
            <h2 className="fd" style={{fontSize:'clamp(28px,4vw,52px)',color:'#18181b'}}>What Our Clients Say</h2>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:12}}>
              <div style={{display:'flex',gap:2}}>{[1,2,3,4,5].map(k=><Star key={k} style={{width:18,height:18,fill:'#f59e0b',color:'#f59e0b'}}/>)}</div>
              <span style={{fontSize:22,fontWeight:700,color:'#18181b',marginLeft:4}}>5.0</span>
              <span style={{fontSize:13,color:'#71717a',marginLeft:4}}>· 13 Google Reviews</span>
            </div>
          </div></FadeIn>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:20}}>
            {testimonials.map((t,i)=>(
              <motion.div key={i} whileHover={{y:-5}}
                initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:'-40px'}}
                transition={{duration:.6,delay:i*0.1,ease:[0.25,0.46,0.45,0.94]}}
                style={{
                  padding:28,
                  background:'#ffffff',
                  border:t.verified?'1px solid rgba(5,150,105,0.3)':'1px solid #e4e4e7',
                  borderRadius:16,
                  boxShadow:t.verified?'0 4px 24px rgba(5,150,105,0.08)':'0 2px 8px rgba(0,0,0,0.04)',
                }}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                  <div style={{display:'flex',gap:2}}>
                    {[1,2,3,4,5].map(k=><Star key={k} style={{width:13,height:13,fill:'#f59e0b',color:'#f59e0b'}}/>)}
                  </div>
                  {t.verified&&(
                    <div style={{display:'flex',alignItems:'center',gap:4,fontSize:9,letterSpacing:'1px',color:'#4285F4',fontWeight:600}}>
                      <svg width="12" height="12" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google Review
                    </div>
                  )}
                </div>
                <p style={{fontSize:t.verified?12:13,lineHeight:1.8,color:'#52525b',marginBottom:20,fontStyle:'italic'}}>"{t.text}"</p>
                <div style={{display:'flex',alignItems:'center',gap:12,borderTop:'1px solid #f4f4f5',paddingTop:14}}>
                  <img src={t.img} alt="" style={{width:40,height:40,borderRadius:'50%',objectFit:'cover',border:'2px solid #e4e4e7'}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'#18181b'}}>{t.name}</div>
                    <div style={{fontSize:10,letterSpacing:'1px',color:t.verified?'#4285F4':'#059669'}}>{t.verified ? 'Google Review' : ''}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div style={{maxWidth:1200,margin:'0 auto',padding:'96px 24px'}}>
        <div style={{textAlign:'center',marginBottom:52}}>
          <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>Integrative Care Membership</div>
          <h2 className="fd" style={{fontSize:'clamp(28px,4vw,52px)',color:'#18181b'}}>Precision. Presence. Performance.</h2>
          <p style={{maxWidth:640,margin:'16px auto 0',fontSize:14,lineHeight:1.8,color:'#71717a'}}>A 12-month structured health architecture in collaboration with UFC Gym, Dubai Silicon Oasis. Integrated Fitness. Structured Prevention. Long-Term Longevity.</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20}}>
          {pricing.map((p,i)=>(
            <motion.div key={i} whileHover={{y:-6}}
              initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:'-40px'}}
              transition={{duration:.6,delay:i*0.12,ease:[0.25,0.46,0.45,0.94]}}
              style={{
                padding:40,
                border:p.popular?'2px solid #059669':'1px solid #e4e4e7',
                background:p.popular?'linear-gradient(160deg,#f0fdf4,#ffffff)':'#ffffff',
                position:'relative',
                transform:p.popular?'scale(1.04)':'scale(1)',
                boxShadow:p.popular?'0 20px 60px rgba(5,150,105,0.15)':'0 2px 16px rgba(0,0,0,0.04)',
                zIndex:p.popular?1:0,
                borderRadius:16,
              }}>
              {p.popular&&<div style={{position:'absolute',top:-1,left:0,right:0,height:3,background:'linear-gradient(90deg,transparent,#059669,transparent)',borderRadius:'16px 16px 0 0'}}/>}
              {p.popular&&<div style={{position:'absolute',top:-14,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#059669,#34d399)',color:'#ffffff',fontSize:9,letterSpacing:'3px',textTransform:'uppercase',padding:'4px 16px',whiteSpace:'nowrap',fontWeight:700,borderRadius:20}}>Most Popular</div>}
              <div style={{fontSize:9,letterSpacing:'3px',textTransform:'uppercase',color:'#059669',marginBottom:6,fontWeight:700}}>{p.name}</div>
              <div style={{fontSize:12,color:'#71717a',marginBottom:16,lineHeight:1.6}}>{p.desc}</div>
              <div style={{marginBottom:4}}>
                <span className="fd" style={{fontSize:42,color:'#18181b',fontWeight:600}}>{p.price}</span>
                <span style={{fontSize:10,color:'#71717a',marginLeft:6}}>/year</span>
              </div>
              {p.old&&<div style={{fontSize:11,color:'#a1a1aa',marginBottom:14}}>Value: <span style={{textDecoration:'line-through'}}>{p.old}</span></div>}
              <div style={{height:1,background:'#e4e4e7',margin:'14px 0'}}/>
              <ul style={{listStyle:'none',padding:0,marginBottom:24,maxHeight:260,overflowY:'auto'}}>
                {p.perks.map((pk,j)=>(
                  <li key={j} style={{display:'flex',gap:8,fontSize:11,color:'#52525b',marginBottom:8,lineHeight:1.5,alignItems:'flex-start'}}>
                    {pk}
                  </li>
                ))}
              </ul>
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:.97}} className={p.popular?'btn-gold':'btn-outline'} style={{width:'100%',padding:'13px',borderRadius:8}}>Get Started</motion.button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* PHILOSOPHY + DIFFERENCE */}
      <div style={{background:'#f0fdf4',padding:'80px 0'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:48,alignItems:'center'}}>
            <div>
              <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>Our Philosophy</div>
              <h2 className="fd" style={{fontSize:'clamp(32px,4vw,52px)',color:'#0d1a0d',marginBottom:20,lineHeight:1.2}}>A New Standard<br/>of Living Well</h2>
              <p style={{fontSize:15,lineHeight:1.9,color:'#52525b',marginBottom:20}}>Bliss Now Life Integrative Care Membership is not a package. It is not a collection of services. It is a <strong style={{color:'#f5f0e8'}}>12-month structured health architecture</strong> designed for individuals and families who choose intention over impulse and longevity over reaction.</p>
              <p style={{fontSize:14,lineHeight:1.9,color:'#71717a'}}>In collaboration with UFC Gym, we bring together clinical care, performance science, and lifestyle integration into one intelligent system.</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              {['Structure over spontaneity','Measurable outcomes','Predictable commitment','Long-term strength'].map((v,i)=>(
                <div key={i} style={{padding:24,border:'1px solid rgba(5,150,105,0.2)',borderRadius:12,background:'rgba(5,150,105,0.06)'}}>
                  <div style={{color:'#059669',fontSize:20,marginBottom:8}}>✦</div>
                  <div style={{fontSize:13,color:'#0d1a0d',fontWeight:500}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(5,150,105,0.3),transparent)',margin:'64px 0'}}/>
          <div style={{textAlign:'center',marginBottom:48}}>
            <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>The Bliss Now Life Difference</div>
            <h2 className="fd" style={{fontSize:'clamp(28px,4vw,48px)',color:'#f5f0e8',marginBottom:16}}>We Design Integrated Systems</h2>
            <p style={{maxWidth:560,margin:'0 auto',fontSize:14,lineHeight:1.8,color:'#71717a'}}>We do not offer scattered services. We do not sell temporary motivation. Bliss Now Life connects:</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16}}>
            {[
              {icon:'🏥',title:'Clinical Expertise',desc:'Licensed physiotherapy & integrative medicine'},
              {icon:'⚡',title:'Performance Science',desc:'UFC Gym partnership & fitness coaching'},
              {icon:'🔬',title:'Recovery Intelligence',desc:'Red light, cold plunge & compression therapy'},
              {icon:'👨‍👩‍👧‍👦',title:'Family Lifestyle',desc:"Children's activities & community events"},
            ].map((d,i)=>(
              <motion.div key={i} whileHover={{y:-5}} style={{padding:28,border:'1px solid rgba(5,150,105,0.15)',borderRadius:12,background:'rgba(255,255,255,0.03)',textAlign:'center'}}>
                <div style={{fontSize:32,marginBottom:12}}>{d.icon}</div>
                <div style={{fontSize:11,letterSpacing:'2px',textTransform:'uppercase',color:'#059669',marginBottom:8}}>{d.title}</div>
                <div style={{fontSize:12,color:'#71717a',lineHeight:1.6}}>{d.desc}</div>
              </motion.div>
            ))}
          </div>
          <div style={{marginTop:48,padding:32,border:'1px solid rgba(5,150,105,0.2)',borderRadius:16,background:'rgba(5,150,105,0.08)',textAlign:'center'}}>
            <div style={{fontSize:13,color:'#059669',letterSpacing:'2px',marginBottom:8}}>ENROLLMENT IS LIMITED</div>
            <p style={{fontSize:14,color:'#52525b',marginBottom:20,lineHeight:1.7}}>Members receive dedicated onboarding, a structured annual roadmap, exclusive access privileges, and private community events. This is about refinement -- not volume.</p>
            <div style={{fontSize:20,fontWeight:700,color:'#0d1a0d'}}>📞 +971 56 480 9600</div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{background:'#f4f4f5',borderTop:'1px solid #e4e4e7',padding:'96px 0'}}>
        <div style={{maxWidth:760,margin:'0 auto',padding:'0 24px'}}>
          <div style={{textAlign:'center',marginBottom:48}}>
            <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>FAQ</div>
            <h2 className="fd" style={{fontSize:'clamp(28px,4vw,48px)',color:'#18181b'}}>Any Question? We Got You</h2>
          </div>
          {faqs.map((f,i)=>(
            <div key={i} style={{borderBottom:'1px solid #e4e4e7'}}>
              <button onClick={()=>setOpenFaq(openFaq===i?null:i)}
                style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 0',background:'none',border:'none',cursor:'pointer',color:'#18181b',fontSize:14,textAlign:'left',gap:16}}>
                <span>{f.q}</span>
                <ChevronRight style={{width:16,height:16,color:'#059669',transform:openFaq===i?'rotate(90deg)':'none',transition:'transform .2s',flexShrink:0}}/>
              </button>
              <AnimatePresence>
                {openFaq===i&&(
                  <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} style={{overflow:'hidden'}}>
                    <div style={{fontSize:13,lineHeight:1.8,color:'#71717a',paddingBottom:20}}>{f.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{textAlign:'center',padding:'96px 24px',position:'relative',overflow:'hidden',background:'#f0fdf4'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:`radial-gradient(ellipse 50% 60% at 50% 100%, ${gold}0e, transparent)`}}/>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{fontSize:9,letterSpacing:'6px',textTransform:'uppercase',color:'#059669',marginBottom:20}}>Ready to Begin</div>
          <h2 className="fd" style={{fontSize:'clamp(32px,5vw,64px)',color:'#0d1a0d',lineHeight:1.2,marginBottom:32}}>Ready to Create<br/><em style={{color:'#059669'}}>Better Balance?</em></h2>
          <motion.button className="btn-gold" whileHover={{scale:1.04}} whileTap={{scale:.97}} onClick={onLogin} style={{padding:'16px 48px'}}>Book a Free Consultation</motion.button>
        </div>
      </div>
    </div>
  );
}

function About() {
  return (
    <div style={{background:'#ffffff'}}>
      <div style={{padding:'80px 24px 60px',background:'#f8faf8',borderBottom:'1px solid #e4e4e7'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:8}}>About Us</div>
          <h1 className="fd" style={{fontSize:'clamp(36px,5vw,72px)',color:'#18181b',lineHeight:1.1}}>Founded in 2020<br/><em style={{color:'#059669'}}>Singapore HQ · UAE & Asia</em></h1>
        </div>
      </div>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'80px 24px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:60,alignItems:'center'}}>
          <FadeIn direction="left" delay={0}>
          <div>
            <div style={{fontSize:11,letterSpacing:'3px',textTransform:'uppercase',color:'#059669',marginBottom:16}}>People • Purpose • Life</div>
            {['People : We serve individuals and communities.','Purpose : We act with long-term impact.','Life : We believe holistic health is the foundation of meaningful living.'].map((p,i)=>(
              <div key={i} style={{display:'flex',gap:12,marginBottom:14,fontSize:14,color:'#71717a'}}><span style={{color:'#059669'}}>✦</span>{p}</div>
            ))}
            <p style={{marginTop:24,fontSize:15,lineHeight:1.9,color:'#71717a'}}>Bliss Now Global is a health infrastructure and wellness ecosystem company integrating genomics, diagnostics, integrative medicine, recovery and digital health. From luxury spa origins to regulated clinics and predictive health platforms, we build structured, data-driven wellbeing systems across industries.</p>
          </div>
          </FadeIn>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <AnimatedImg src={imgYogaBalance} style={{width:'100%',height:240}} delay={0} />
            <AnimatedImg src={imgWellnessPool} style={{width:'100%',height:240,marginTop:32}} delay={0.2} />
          </div>
        </div>
      </div>
      <GL/>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'80px 24px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:60,alignItems:'center'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <AnimatedImg src={imgGroupYoga} style={{width:'100%',height:220}} delay={0} />
            <AnimatedImg src={imgFitnessTraining} style={{width:'100%',height:220,marginTop:32}} delay={0.2} />
          </div>
          <div>
            <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>Our Approach</div>
            <h2 className="fd" style={{fontSize:'clamp(28px,3vw,48px)',color:'#18181b',marginBottom:16}}>Precision • Presence • Performance</h2>
            <p style={{fontSize:15,lineHeight:1.9,color:'#71717a'}}>At the core of Bliss Now Global -- a multidisciplinary approach that thoughtfully combines genetics, modern medicine, traditional medicine, and complementary therapies in a structured, holistic, and well-considered manner.</p>
          </div>
        </div>
      </div>
      <div style={{background:'#f4f4f5',borderTop:'1px solid #e4e4e7',borderBottom:'1px solid #e4e4e7',padding:'80px 0'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:32}}>
          {[{label:'Vision',text:"To lead the future of integrative and predictive health. We envision a world where precision-driven, preventive care is embedded across clinics, fitness, education, women's health, beauty, and longevity -- creating one connected ecosystem for every stage of life."},{label:'Mission',text:'To build a globally connected health infrastructure that unites wellness, medicine, genomics, and technology into one intelligent, preventive care model. We empower individuals and industries with data-driven systems that elevate performance, resilience, and lifelong wellbeing.'}].map((v,i)=>(
            <motion.div key={i} className="card" whileHover={{y:-5}} style={{padding:40,background:'#f4f4f5'}}>
              <div style={{fontSize:9,letterSpacing:'4px',textTransform:'uppercase',color:'#059669',marginBottom:16}}>{v.label}</div>
              <p style={{fontSize:14,lineHeight:1.9,color:'#71717a'}}>{v.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'80px 24px'}}>
        <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>Global Structure</div>
        <h2 className="fd" style={{fontSize:'clamp(28px,4vw,52px)',color:'#18181b',marginBottom:20}}>How It Works</h2>
        <p style={{fontSize:15,lineHeight:1.9,color:'#71717a',maxWidth:680,marginBottom:40}}>Bliss Now Global is headquartered in Singapore. United Arab Emirates -- regulated clinic operations and health partnerships. Asia -- hospitality and wellness operations.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:20}}>
          {[{n:'1',title:'Bliss Now Hub',desc:'Integrative & mobile clinics'},{n:'2',title:'Bliss Now Origins',desc:'Genomics & precision wellness'},{n:'3',title:'Bliss Now Life',desc:'Digital twin and AI health platform'}].map((e,i)=>(
            <motion.div key={i} className="card" whileHover={{y:-5}} style={{padding:36,background:'#f4f4f5',textAlign:'center'}}>
              <div className="fd" style={{fontSize:52,color:'rgba(5,150,105,0.12)',lineHeight:1,marginBottom:12}}>{e.n}</div>
              <div style={{fontSize:11,letterSpacing:'2px',textTransform:'uppercase',color:'#059669',marginBottom:8}}>{e.title}</div>
              <div style={{fontSize:13,color:'#a1a1aa'}}>{e.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
      <div style={{background:'#f4f4f5',borderTop:'1px solid #e4e4e7',padding:'80px 0'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px'}}>
          <div style={{textAlign:'center',marginBottom:48}}>
            <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>Leadership & Advisors</div>
            <h2 className="fd" style={{fontSize:'clamp(28px,4vw,52px)',color:'#18181b'}}>The People Behind Bliss Now</h2>
            <p style={{maxWidth:600,margin:'16px auto 0',fontSize:14,lineHeight:1.8,color:'#a1a1aa'}}>A multidisciplinary leadership team spanning hospitality, healthcare operations, genomics, fitness science, and digital health infrastructure.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20}}>
            {[{name:'Harrison Hudson',role:'WordPress Dev.',img:imgFitnessTraining},{name:'Elizabeth Sofia',role:'WordPress Dev.',img:imgYogaBalance},{name:'Lucy Evelyn',role:'UI/UX Designer',img:imgDryNeedling}].map((m,i)=>(
              <motion.div key={i} className="card" whileHover={{y:-6}}
                initial={{opacity:0,y:40}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:'-40px'}}
                transition={{duration:.65,delay:i*0.15,ease:[0.25,0.46,0.45,0.94]}}
                style={{overflow:'hidden'}}>
                <AnimatedImg src={m.img} alt={m.name} style={{width:'100%',height:260}} />
                <div style={{padding:28,borderTop:'1px solid #e4e4e7'}}>
                  <div className="fd" style={{fontSize:20,color:'#18181b'}}>{m.name}</div>
                  <div style={{fontSize:10,letterSpacing:'2px',textTransform:'uppercase',color:'#059669',marginTop:4}}>{m.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Consultancy() {
  const areas=[
    {title:'Luxury Hospitality',icon:'🏨',points:['Guest retention','Premium positioning','Measurable revenue growth'],desc:'From spa experiences to science-backed longevity environments. We transform properties into structured wellness destinations.'},
    {title:'Fitness & Performance',icon:'⚡',points:['Higher retention','Premium offerings','Better measurable results'],desc:'From generic training to precision performance. We integrate recovery, diagnostics, and intelligent programming.'},
    {title:'Corporates',icon:'🏢',points:['Reduced burnout risk','Higher engagement','Clear health ROI'],desc:'From surface-level wellness to strategic health systems. We design preventive, data-informed workforce health models.'},
    {title:'Integrative Clinics',icon:'🏥',points:['Standardized protocols','Stronger clinical positioning','Higher patient lifetime value'],desc:'From fragmented therapies to structured care pathways. We build preventive, genomics-integrated clinic models that scale.'},
  ];
  return (
    <div style={{background:'#ffffff'}}>
      <div style={{padding:'80px 24px 60px',background:'#f8faf8',borderBottom:'1px solid #e4e4e7'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:8}}>Consultancy</div>
          <h1 className="fd" style={{fontSize:'clamp(36px,5vw,72px)',color:'#18181b',lineHeight:1.1}}>Global Health &<br/><em style={{color:'#059669'}}>Wellness Infrastructure</em></h1>
        </div>
      </div>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'80px 24px'}}>
        <p style={{fontSize:16,lineHeight:1.9,color:'#71717a',maxWidth:720,marginBottom:60}}>We design and implement structured, scalable health ecosystems for forward-thinking organizations -- moving beyond isolated wellness initiatives into integrated health infrastructure.</p>
        <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>Where We Work</div>
        <h2 className="fd" style={{fontSize:'clamp(28px,4vw,48px)',color:'#18181b',marginBottom:48}}>Industries We Transform</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20}}>
          {areas.map((a,i)=>(
            <motion.div key={i} className="card" whileHover={{y:-6}}
              initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:'-40px'}}
              transition={{duration:.6,delay:i*0.12}}
              style={{padding:36,background:'#f4f4f5'}}>
              <div style={{fontSize:36,marginBottom:16}}>{a.icon}</div>
              <div style={{fontSize:11,letterSpacing:'2px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>{a.title}</div>
              <p style={{fontSize:13,lineHeight:1.8,color:'#71717a',marginBottom:20}}>{a.desc}</p>
              <ul style={{listStyle:'none',padding:0}}>
                {a.points.map((p,j)=>(
                  <li key={j} style={{display:'flex',gap:10,fontSize:12,color:'#a1a1aa',marginBottom:8}}>
                    <CheckCircle style={{width:14,height:14,color:'#059669',flexShrink:0,marginTop:1}}/>{p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
      <div style={{background:'#f4f4f5',borderTop:'1px solid #e4e4e7',padding:'80px 0'}}>
        <div style={{maxWidth:800,margin:'0 auto',padding:'0 24px',textAlign:'center'}}>
          <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>How We Work</div>
          <h2 className="fd" style={{fontSize:'clamp(28px,4vw,48px)',color:'#18181b',marginBottom:24}}>Our Methodology</h2>
          <p style={{fontSize:15,lineHeight:1.9,color:'#71717a',marginBottom:32}}>We combine integrative medicine, genomics, operational architecture, and digital intelligence into one structured framework.</p>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:24}}>
            {['Strategic design.','Operational execution.','Measurable outcomes.'].map((p,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#71717a'}}>
                <span style={{color:'#059669'}}>✦</span>{p}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Ecosystem() {
  return (
    <div style={{background:'#ffffff'}}>
      <div style={{padding:'80px 24px 60px',background:'#f8faf8',borderBottom:'1px solid #e4e4e7'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:8}}>Our Ecosystem</div>
          <h1 className="fd" style={{fontSize:'clamp(36px,5vw,72px)',color:'#18181b',lineHeight:1.1}}>Purpose • People •<br/><em style={{color:'#059669'}}>Life</em></h1>
        </div>
      </div>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'80px 24px'}}>
        <p style={{fontSize:16,lineHeight:1.9,color:'#71717a',maxWidth:720,marginBottom:12}}>Bliss Now Global operates as a connected health infrastructure -- uniting clinical care, genomics, and digital intelligence under one vision.</p>
        <div style={{fontSize:11,letterSpacing:'3px',textTransform:'uppercase',color:'#059669',marginBottom:64}}>Three verticals. One integrated model.</div>
        {[
          {tag:'Bliss Now Integrative Care Hub',title:'Integrative & Mobile Clinics',img:imgBiohealing,points:['Structured, preventive, and recovery-focused healthcare delivered through regulated clinics and mobile activations.','Integrative medicine.','Longevity pathways.','Performance and recovery optimization.'],reverse:false},
          {tag:'Bliss Now Origins',title:'Genomics & Precision Wellness',img:imgBiowell,desc:'Transforming DNA and biomarker insights into personalized health intelligence. From genetic analysis to structured activation pathways, Origins powers preventive and predictive wellbeing across industries.',reverse:true},
          {tag:'Bliss Now Life',title:'Digital Health Intelligence Platform',img:imgRedLight,desc:'An AI-powered human-first integrative twin platform combining genetics-informed biological blueprints, real-time health data and adaptive personalized intervention strategies into one unified ecosystem.',sub:'Educate • Monitor • Support',reverse:false},
        ].map((v,i)=>(
          <div key={i}>
            {i>0&&<div style={{margin:'64px 0'}}><GL/></div>}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:60,alignItems:'center',direction:v.reverse?'rtl':'ltr'}}>
              <div style={{direction:'ltr'}}>
                <div style={{fontSize:9,letterSpacing:'4px',textTransform:'uppercase',color:'#059669',marginBottom:8}}>{v.tag}</div>
                <h2 className="fd" style={{fontSize:36,color:'#18181b',marginBottom:20}}>{v.title}</h2>
                {v.points?v.points.map((p,j)=>(<div key={j} style={{display:'flex',gap:12,marginBottom:12,fontSize:14,color:'#71717a'}}><span style={{color:'#059669',marginTop:2}}>✦</span>{p}</div>)):null}
                {v.desc&&<p style={{fontSize:15,lineHeight:1.9,color:'#71717a'}}>{v.desc}</p>}
                {v.sub&&<div style={{marginTop:20,fontSize:11,letterSpacing:'3px',textTransform:'uppercase',color:'#059669'}}>{v.sub}</div>}
              </div>
              <AnimatedImg src={v.img} style={{width:'100%',height:320}} delay={0.15} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Contact() {
  const [form,setForm]=useState({name:'',email:'',phone:'',company:'',subject:'',message:''});
  const [sending,setSending]=useState(false);
  const handle=async(e:React.FormEvent)=>{
    e.preventDefault();

    // SECURITY: Rate limit contact form (OWASP A04 - Insecure Design / spam prevention)
    if (!checkRateLimit('contact', 3, 120_000)) return; // max 3 submissions per 2 min

    // SECURITY: Schema validation + sanitization (OWASP A03 - Injection)
    const err = validateSchema(form, {
      name:    { type:'string', required:true, min:2, max:100 },
      email:   { type:'email',  required:true, max:254 },
      subject: { type:'string', required:true, min:3, max:200 },
      message: { type:'string', required:true, min:10, max:2000 },
      phone:   { type:'string', required:false, max:30 },
      company: { type:'string', required:false, max:150 },
    });
    if (err) { toast.error(err); return; }

    // Sanitize all fields before sending
    const safeForm = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, sanitize(v, k === 'message' ? 2000 : 200)])
    );

    setSending(true);
    console.log('Form submitted:', safeForm);
    await new Promise(r=>setTimeout(r,1200));
    toast.success('Thank you! We will contact you soon ✦');
    setForm({name:'',email:'',phone:'',company:'',subject:'',message:''});
    setSending(false);
  };
  return (
    <div style={{background:'#ffffff'}}>
      <div style={{padding:'80px 24px 60px',background:'#f8faf8',borderBottom:'1px solid #e4e4e7'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:8}}>Contact Us</div>
          <h1 className="fd" style={{fontSize:'clamp(36px,5vw,72px)',color:'#18181b',lineHeight:1.1}}>Your Next Step<br/><em style={{color:'#059669'}}>Starts Here</em></h1>
        </div>
      </div>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'80px 24px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:64}}>
          <div>
            <div style={{fontSize:9,letterSpacing:'4px',textTransform:'uppercase',color:'#059669',marginBottom:24}}>Send Us a Message</div>
            <form onSubmit={handle} style={{display:'flex',flexDirection:'column',gap:16}}>
              {[{key:'name',label:'Full Name',type:'text',req:true},{key:'email',label:'Email',type:'email',req:true},{key:'phone',label:'Phone (optional)',type:'tel',req:false},{key:'company',label:'Company (optional)',type:'text',req:false},{key:'subject',label:'Subject',type:'text',req:true}].map(f=>(
                <div key={f.key}>
                  <label style={{display:'block',fontSize:9,letterSpacing:'3px',textTransform:'uppercase',color:'#a1a1aa',marginBottom:7}}>{f.label}</label>
                  <input type={f.type} required={f.req} value={(form as any)[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} style={{padding:'12px 14px',fontSize:13}} placeholder={f.label}/>
                </div>
              ))}
              <div>
                <label style={{display:'block',fontSize:9,letterSpacing:'3px',textTransform:'uppercase',color:'#a1a1aa',marginBottom:7}}>Message</label>
                <textarea required value={form.message} onChange={e=>setForm({...form,message:e.target.value})} style={{padding:'12px 14px',fontSize:13,height:120,resize:'none'}} placeholder="Tell us how we can help you"/>
              </div>
              <motion.button type="submit" disabled={sending} className="btn-gold" whileHover={{scale:1.02}} style={{padding:'14px',marginTop:4}}>{sending?'Sending...':'Send Message'}</motion.button>
            </form>
          </div>
          <div>
            <FadeIn direction="right" delay={0.1}>
            <div style={{fontSize:9,letterSpacing:'4px',textTransform:'uppercase',color:'#059669',marginBottom:24}}>Reach Out</div>
            <p style={{fontSize:14,lineHeight:1.9,color:'#71717a',marginBottom:36}}>Reach out to explore how our consulting approach can help you create healthier routines, clearer boundaries, and sustainable balance in your work and life.</p>
            {[{icon:<Phone style={{width:16,height:16}}/>,label:'Phone',value:'+971 56 480 9600'},{icon:<Mail style={{width:16,height:16}}/>,label:'Email',value:'hello@blissnow.ae'}].map((c,i)=>(
              <motion.div key={i} className="card" whileHover={{x:4}} style={{display:'flex',gap:16,padding:'18px 22px',marginBottom:12,background:'#f4f4f5'}}>
                <div style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #d4d4d8',color:'#059669',flexShrink:0}}>{c.icon}</div>
                <div><div style={{fontSize:9,letterSpacing:'3px',textTransform:'uppercase',color:'#a1a1aa',marginBottom:4}}>{c.label}</div><div style={{fontSize:14,color:'#18181b'}}>{c.value}</div></div>
              </motion.div>
            ))}
            <div style={{marginTop:28}}>
              <div style={{fontSize:9,letterSpacing:'3px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>Dubai Office</div>
              <div className="card" style={{padding:'18px 22px',background:'#f4f4f5',fontSize:13,lineHeight:1.9,color:'#71717a'}}>
                Bliss Now Recovery Wellness Clinic LLC<br/>Silicon Central Mall<br/>Al Ain - Dubai Rd, Nadd Hessa<br/>Dubai, United Arab Emirates
              </div>
            </div>
            <div style={{marginTop:16}}>
              <div style={{fontSize:9,letterSpacing:'3px',textTransform:'uppercase',color:'#059669',marginBottom:12}}>Singapore Office</div>
              <div className="card" style={{padding:'18px 22px',background:'#f4f4f5',fontSize:13,lineHeight:1.9,color:'#71717a'}}>
                BLISS NOW PTE LTD<br/>531A Upper Cross St, #04-95<br/>Singapore 051531
              </div>
            </div>

            {/* WhatsApp direct contact */}
            <motion.a
              href="https://wa.me/971564809600?text=Hello%20Bliss%20Now!%20I%20would%20like%20to%20book%20a%20session."
              target="_blank" rel="noopener noreferrer"
              whileHover={{scale:1.02}} whileTap={{scale:0.98}}
              style={{
                display:'flex', alignItems:'center', gap:14,
                padding:'16px 22px', marginTop:16,
                background:'linear-gradient(135deg,#25D366,#128C7E)',
                borderRadius:8, textDecoration:'none', cursor:'pointer',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style={{flexShrink:0}}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <div>
                <div style={{color:'white',fontWeight:600,fontSize:13,letterSpacing:'1px'}}>CHAT ON WHATSAPP</div>
                <div style={{color:'rgba(255,255,255,0.85)',fontSize:12}}>+971 56 480 9600 — Instant reply</div>
              </div>
            </motion.a>
            </FadeIn>
          </div>
        </div>
      </div>

      {/* ── Google Maps Embed ── */}
      <div style={{width:'100%',borderTop:'1px solid #e4e4e7'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px 80px'}}>
          <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',margin:'48px 0 20px'}}>Find Us</div>
          <h2 className="fd" style={{fontSize:'clamp(24px,3vw,40px)',color:'#18181b',marginBottom:28}}>Silicon Central Mall, Dubai Silicon Oasis</h2>
          <div style={{borderRadius:16,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.08)',border:'1px solid #e4e4e7'}}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3610.178384537517!2d55.37800937600754!3d25.11825953291535!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f65f93e45b337%3A0xf93a66b70b16e81f!2sSilicon%20Central%20Mall!5e0!3m2!1sen!2sae!4v1708000000000!5m2!1sen!2sae"
              width="100%"
              height="420"
              style={{border:0,display:'block'}}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Bliss Now Recovery Wellness Clinic - Silicon Central Mall Dubai"
            />
          </div>
          <div style={{display:'flex',gap:24,marginTop:20,flexWrap:'wrap'}}>
            <a
              href="https://maps.google.com/?q=Silicon+Central+Mall+Dubai+Silicon+Oasis"
              target="_blank" rel="noopener noreferrer"
              style={{display:'inline-flex',alignItems:'center',gap:8,padding:'12px 24px',background:'#059669',color:'white',borderRadius:8,fontSize:12,letterSpacing:'1px',textTransform:'uppercase',fontWeight:600,textDecoration:'none'}}
            >
              <MapPin style={{width:16,height:16}}/> Get Directions
            </a>
            <a
              href="https://wa.me/971564809600?text=Hello!%20I%20need%20directions%20to%20Bliss%20Now%20clinic."
              target="_blank" rel="noopener noreferrer"
              style={{display:'inline-flex',alignItems:'center',gap:8,padding:'12px 24px',background:'#25D366',color:'white',borderRadius:8,fontSize:12,letterSpacing:'1px',textTransform:'uppercase',fontWeight:600,textDecoration:'none'}}
            >
              Ask on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [user,setUser]=useState<any>(null);
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>setUser(session?.user??null));
    const {data:l}=supabase.auth.onAuthStateChange((_,s)=>setUser(s?.user??null));
    return()=>l.subscription.unsubscribe();
  },[]);
  if(!user) return(
    <div style={{background:'#ffffff',minHeight:'60vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}>
      <div className="fd" style={{fontSize:48,color:'#18181b'}}>Your Sanctuary</div>
      <div style={{fontSize:10,letterSpacing:'4px',textTransform:'uppercase',color:'#059669'}}>Please sign in to continue</div>
    </div>
  );
  return(
    <div style={{background:'#ffffff',minHeight:'80vh',maxWidth:800,margin:'0 auto',padding:'60px 24px'}}>
      <div style={{fontSize:9,letterSpacing:'5px',textTransform:'uppercase',color:'#059669',marginBottom:8}}>Welcome Back</div>
      <div className="fd" style={{fontSize:48,color:'#18181b',marginBottom:8}}>Your Dashboard</div>
      <div style={{fontSize:13,color:'#a1a1aa',marginBottom:40}}>{user.email}</div>
      <GL/>
      <div style={{marginTop:40,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16}}>
        {[{label:'Member Since',value:format(new Date(user.created_at),'MMM yyyy')},{label:'Account Status',value:'Active'},{label:'Plan',value:'Professional'}].map((s,i)=>(
          <motion.div key={i} className="card" whileHover={{y:-4}} style={{padding:28,textAlign:'center',background:'#f4f4f5'}}>
            <div style={{fontSize:9,letterSpacing:'3px',textTransform:'uppercase',color:'#059669',marginBottom:8}}>{s.label}</div>
            <div className="fd" style={{fontSize:28,color:'#18181b'}}>{s.value}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [user,setUser]=useState<any>(null);
  const [showAuth,setShowAuth]=useState(false);
  const [isSignup,setIsSignup]=useState(false);
  // LOADING SCREEN: show intro animation on first load
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    // SECURITY: ensure Supabase env vars are present (OWASP A05)
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || url.includes('your-project') || !key || key.includes('your-anon')) {
      console.warn('[Security] Supabase env vars not set. Check your .env file.');
    }

    supabase.auth.getSession().then(({data:{session}})=>setUser(session?.user??null));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setUser(s?.user??null));
    return()=>subscription.unsubscribe();
  },[]);

  const handleLogout=async()=>{await supabase.auth.signOut();toast.success('Until next time ✦');};

  return(
    <>
      {/* LOADING / INTRO SCREEN */}
      <AnimatePresence>
        {loading && <LoadingScreen onDone={()=>setLoading(false)} />}
      </AnimatePresence>

      <div style={{fontFamily:"'Jost',sans-serif",background:'#ffffff',color:'#18181b',minHeight:'100vh'}}>
        <ScrollToTop/>
        <Navbar user={user} onLogin={()=>setShowAuth(true)} onLogout={handleLogout}/>
        <Routes>
          <Route path="/" element={<Home onLogin={()=>setShowAuth(true)}/>}/>
          <Route path="/about" element={<About/>}/>
          <Route path="/consultancy" element={<Consultancy/>}/>
          <Route path="/ecosystem" element={<Ecosystem/>}/>
          <Route path="/contact" element={<Contact/>}/>
          <Route path="/dashboard" element={<Dashboard/>}/>
        </Routes>
        <Footer/>
        <AuthModal isOpen={showAuth} onClose={()=>setShowAuth(false)} isSignup={isSignup} setIsSignup={setIsSignup}/>

        {/* ── WhatsApp Floating Button ── */}
        <motion.a
          href="https://wa.me/971564809600?text=Hello%20Bliss%20Now!%20I%20would%20like%20to%20know%20more%20about%20your%20services."
          target="_blank" rel="noopener noreferrer"
          initial={{scale:0,opacity:0}}
          animate={{scale:1,opacity:1}}
          transition={{delay:2,type:'spring',stiffness:200}}
          whileHover={{scale:1.12}}
          whileTap={{scale:0.95}}
          style={{
            position:'fixed', bottom:28, right:28, zIndex:999,
            width:56, height:56, borderRadius:'50%',
            background:'linear-gradient(135deg,#25D366,#128C7E)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 20px rgba(37,211,102,0.5)',
            cursor:'pointer', textDecoration:'none',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          {/* Pulse ring */}
          <motion.div
            animate={{scale:[1,1.5,1],opacity:[0.6,0,0.6]}}
            transition={{duration:2,repeat:Infinity}}
            style={{position:'absolute',inset:0,borderRadius:'50%',border:'2px solid #25D366'}}
          />
        </motion.a>
      </div>
    </>
  );
}
