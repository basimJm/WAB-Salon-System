// WAB Admin Panel — 16:9 Arabic demo. All motion keyed to T / CUES.
const GR = 'linear-gradient(135deg,#6D28D9,#A855F7)';
const FA = "'IBM Plex Sans Arabic','Poppins',sans-serif", FS = "'Playfair Display','IBM Plex Sans Arabic',serif", FP = "Poppins,sans-serif";
const K = { ink: '#1F2233', mut: '#646B7B', faint: '#9096A5', line: '#EEEAF4', line2: '#DFD8EB', page: '#F6F4FA', surf: '#F8F7FB', soft: '#F3EEFB', acc: '#6D28D9', green: '#23845F', greenS: 'rgba(46,158,120,.12)', rose: '#C2386B', roseS: 'rgba(217,70,122,.1)', amber: '#946010', amberS: 'rgba(245,158,11,.15)', grey: '#585E6E', greyS: 'rgba(107,114,128,.12)', violet: '#9333EA', violetS: 'rgba(168,85,247,.12)' };
const EZ = { in: Easing.easeOutCubic, pop: Easing.easeOutBack, g: Easing.easeInOutCubic };
const tw = (T, s, e, a, b, ease) => animate({ from: a, to: b, start: s, end: e, ease: ease || EZ.g })(T);
const P = (x, y, w, h, o) => Object.assign({ position: 'absolute', left: x, top: y, width: w, height: h }, o || {});
const IC = { live: 'M3 12h4l3-8 4 16 3-8h4', chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8', users: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', store: 'M4 9.5 5.5 4h13L20 9.5M4 9.5V20h16V9.5M10 20v-5h4v5', cal: 'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM4 10h16M8.5 3v4M15.5 3v4', wallet: 'M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3M4 7.5v10A1.5 1.5 0 0 0 5.5 19H20V8H6.5A2.5 2.5 0 0 1 4 5.5', star: 'm12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z', file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5', bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2.2 2.2 0 0 0 4 0', gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', shield: 'M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4', pay: 'M3 7h18v11H3zM3 11h18M7 15h3', check: 'M5 12.5l4.5 4.5L19 7', x: 'M6 6l12 12M18 6 6 18', down: 'M12 4v12M6 11l6 6 6-6M5 20h14', mail: 'M3 6h18v12H3zM3 6l9 7 9-7', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0', alert: 'M12 4 2.5 20h19zM12 10v4.5M12 17.5h.01', zoom: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4M8 11h6M11 8v6', rot: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5', lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3', eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', send: 'M21 3 10 14M21 3l-6.5 18-3.5-7-7-3.5z', image: 'M4 5h16v14H4z' };
const Ic = ({ d, s = 18, c = 'currentColor', w = 1.8 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const Bd = ({ t, c, bg, s }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, padding: '5px 9px', borderRadius: 7, color: c, background: bg, ...(s || {}) }}>{t}</span>;
const Card = ({ x, y, w, h, children, style }) => <div style={P(x, y, w, h, { background: '#fff', border: `1px solid ${K.line}`, borderRadius: 16, boxShadow: '0 1px 2px rgba(31,34,51,.04),0 6px 20px rgba(31,34,51,.035)', overflow: 'hidden', ...(style || {}) })}>{children}</div>;
const CardHead = ({ t, right }) => <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderBottom: `1px solid ${K.line}` }}><span style={{ fontWeight: 700, fontSize: 15 }}>{t}</span>{right}</div>;
const Btn = ({ t, kind, style }) => <div style={{ height: 40, padding: '0 16px', borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', boxSizing: 'border-box', ...(kind === 'p' ? { background: GR, color: '#fff', boxShadow: '0 6px 16px rgba(109,40,217,.22)' } : kind === 'g' ? { background: K.green, color: '#fff' } : kind === 'r' ? { border: `1px solid ${K.line2}`, color: K.rose, background: '#fff' } : kind === 's' ? { background: K.soft, color: K.acc } : { border: `1px solid ${K.line2}`, background: '#fff', color: K.ink }), ...(style || {}) }}>{t}</div>;
const Live = () => { const { T } = useComposition(); const p = (T * 0.8) % 1; return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: K.green, background: 'rgba(46,158,120,.1)', padding: '4px 11px', borderRadius: 20 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: '#2E9E78', boxShadow: `0 0 0 ${p * 7}px rgba(46,158,120,${0.5 * (1 - p)})` }} />مباشر</span>; };
const Head = ({ title, code, extra, sub, right }) => (
  <div style={P(32, 84, 1296, 70, { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' })}>
    <div><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontFamily: FS, fontSize: 27, fontWeight: 700 }}>{title}</span><span style={{ fontSize: 11, fontFamily: FP, fontWeight: 600, color: K.faint, border: `1px solid ${K.line2}`, borderRadius: 6, padding: '2px 6px' }}>{code}</span>{extra}</div>{sub && <div style={{ fontSize: 13.5, color: K.mut, marginTop: 6 }}>{sub}</div>}</div>
    <div style={{ display: 'flex', gap: 8 }}>{right}</div>
  </div>
);

function Tap({ at, x, y }) {
  const { T } = useComposition(); const d = T - at;
  if (d < -0.45 || d > 0.6) return null;
  const o = d < 0 ? tw(d, -0.45, -0.2, 0, 1, EZ.in) : tw(d, 0.15, 0.45, 1, 0, EZ.in);
  const pr = d < 0 ? 1 : tw(d, 0, 0.08, 1, 0.8, EZ.in) * 0 + tw(d, 0.08, 0.25, 0.8, 1, EZ.in);
  const rs = tw(d, 0, 0.5, 0.3, 2, EZ.in), ro = d < 0 ? 0 : tw(d, 0, 0.5, 0.7, 0, EZ.in);
  return <div style={P(x - 26, y - 26, 52, 52, { pointerEvents: 'none', zIndex: 90 })}><div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #A855F7', transform: `scale(${rs})`, opacity: ro }} /><div style={{ position: 'absolute', inset: 5, borderRadius: '50%', background: 'rgba(109,40,217,.3)', border: '2px solid #fff', boxShadow: '0 4px 14px rgba(109,40,217,.4)', transform: `scale(${pr})`, opacity: o }} /></div>;
}
const Typed = ({ text, s, e, t }) => { const n = Math.floor(clamp((t - s) / (e - s), 0, 1) * text.length + 0.001); return <span>{text.slice(0, n)}{t > s && t < e + 0.4 && Math.floor(t * 3) % 2 === 0 ? <span style={{ color: K.acc }}>|</span> : null}</span>; };
const Toast = ({ t, show, hide, text, tone, prog }) => {
  if (t < show || (hide && t > hide + 0.3)) return null;
  const o = tw(t, show, show + 0.25, 0, 1, EZ.in) - (hide ? tw(t, hide, hide + 0.3, 0, 1) : 0);
  const p = prog ? clamp((t - prog[0]) / (prog[1] - prog[0]), 0, 1) : 1;
  return <div style={P(500, 812, 600, 60, { display: 'flex', justifyContent: 'center', zIndex: 80, opacity: o, transform: `translateY(${(1 - o) * 14}px)` })}><div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px 0 14px', height: 54, borderRadius: 14, background: '#1F2233', color: '#fff', fontSize: 14, fontWeight: 500, boxShadow: '0 16px 40px rgba(20,23,43,.3)' }}><span style={{ width: 26, height: 26, borderRadius: 8, background: prog && p < 1 ? 'rgba(255,255,255,.14)' : tone === 'e' ? K.rose : K.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic d={prog && p < 1 ? IC.down : tone === 'e' ? IC.x : IC.check} s={15} c="#fff" w={2.4} /></span><div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span>{prog && p < 1 ? prog[2] : text}</span>{prog && p < 1 && <span style={{ width: 260, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}><span style={{ display: 'block', width: p * 100 + '%', height: '100%', background: '#C9AEF7' }} /></span>}</div></div></div>;
};
const Modal = ({ t, show, hide, title, tone, children, confirm }) => {
  if (t < show || t > hide + 0.3) return null;
  const o = tw(t, show, show + 0.2, 0, 1, EZ.in) - tw(t, hide, hide + 0.25, 0, 1);
  const c = tone === 'g' ? [K.green, K.greenS] : [K.rose, K.roseS];
  return <div style={P(0, 0, 1600, 900, { background: `rgba(20,23,43,${0.45 * o})`, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' })}><div style={{ width: 540, background: '#fff', borderRadius: 18, boxShadow: '0 30px 80px rgba(20,23,43,.3)', opacity: o, transform: `scale(${0.96 + 0.04 * o}) translateY(${(1 - o) * 10}px)`, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}><div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><span style={{ width: 42, height: 42, borderRadius: 12, background: c[1], color: c[0], display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic d={tone === 'g' ? IC.check : IC.alert} s={20} w={2} /></span><span style={{ fontSize: 18, fontWeight: 700 }}>{title}</span></div>{children}<div style={{ fontSize: 12, color: K.mut, background: K.surf, borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}><Ic d={IC.shield} s={14} />سيُسجَّل هذا الإجراء في سجل الأفعال مع السبب.</div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9 }}><Btn t="إلغاء" /><Btn t={confirm} kind={tone === 'g' ? 'g' : 'p'} /></div></div></div>;
};
const Field = ({ label, children, h = 44 }) => <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}><span style={{ fontSize: 13, fontWeight: 600 }}>{label}<span style={{ color: K.rose }}> *</span></span><div style={{ minHeight: h, borderRadius: 11, border: `1.5px solid ${K.line2}`, padding: '10px 12px', boxSizing: 'border-box', fontSize: 13.5, lineHeight: 1.6 }}>{children}</div></div>;

const NAV = [['live', 'نظرة مباشرة', 'ov'], ['chart', 'التحليلات', 'an'], ['route', 'رحلة المستخدم', 'jr'], ['users', 'العملاء'], ['store', 'الصالونات', 'sa', 4], ['cal', 'الحجوزات', 'bk'], ['wallet', 'المالية', 'fi'], ['star', 'التقييمات', null, 12], ['grid', 'الكتالوج', null, 2], ['image', 'المحتوى'], ['send', 'الإشعارات'], ['file', 'التقارير', 'rp'], ['bell', 'التنبيهات', 'al', 3], ['gear', 'الإعدادات'], ['shield', 'سجل الأفعال']];
function Sidebar({ active }) {
  return <div style={P(1360, 0, 240, 900, { background: '#fff', borderLeft: `1px solid ${K.line}`, zIndex: 20 })}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '18px 18px', borderBottom: `1px solid ${K.line}` }}><img src="assets/wab-app-icon.png" style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'cover' }} /><div><div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}><span style={{ fontFamily: FS, fontWeight: 700, fontSize: 21 }}>WAB</span><span style={{ fontSize: 8, letterSpacing: 1.4, color: '#A855F7', fontWeight: 600, fontFamily: FP, direction: 'ltr' }}>WEDDING &amp; BEAUTY</span></div><span style={{ fontSize: 10.5, fontWeight: 700, color: K.acc, background: K.soft, padding: '2px 8px', borderRadius: 6 }}>لوحة التحكم</span></div></div>
    <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>{NAV.map(([ic, t, id, n]) => { const on = id && id === active; return <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 11, height: 40, padding: '0 12px', borderRadius: 10, fontSize: 13.5, fontWeight: on ? 600 : 500, color: on ? '#fff' : K.ink, background: on ? GR : 'transparent', boxShadow: on ? '0 6px 16px rgba(109,40,217,.25)' : 'none' }}><Ic d={IC[ic]} s={19} /><span style={{ flex: 1 }}>{t}</span>{n && <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: on ? 'rgba(255,255,255,.22)' : K.rose, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FP, padding: '0 6px', boxSizing: 'border-box' }}>{n}</span>}</div>; })}</div>
  </div>;
}
function Topbar({ bell = 3, bellPulse = 0 }) {
  return <div style={P(0, 0, 1360, 64, { borderBottom: `1px solid ${K.line}`, background: K.page, zIndex: 15, display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', boxSizing: 'border-box' })}>
    <div style={{ width: 480, height: 40, borderRadius: 11, background: '#fff', border: `1px solid ${K.line2}`, display: 'flex', alignItems: 'center', gap: 9, padding: '0 13px', color: K.faint, fontSize: 13 }}><Ic d={IC.search} s={17} />ابحث عن عميل، صالون، رقم حجز أو هاتف عضو…</div>
    <div style={{ flex: 1 }} />
    <div style={{ width: 42, height: 38, borderRadius: 10, border: `1px solid ${K.line2}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12.5 }}>EN</div>
    <div style={{ width: 42, height: 38, borderRadius: 10, border: `1px solid ${K.line2}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}><Ic d={IC.bell} s={18} /><span style={{ position: 'absolute', top: -6, right: -6, minWidth: 19, height: 19, borderRadius: 10, background: K.rose, color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${K.page}`, fontFamily: FP, transform: `scale(${1 + bellPulse * 0.35})` }}>{bell}</span></div>
    <div style={{ height: 38, display: 'flex', alignItems: 'center', gap: 9, padding: '0 10px 0 6px', borderRadius: 10, border: `1px solid ${K.line2}`, background: '#fff', fontSize: 13, fontWeight: 600 }}><span style={{ width: 28, height: 28, borderRadius: 8, background: GR, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>ل</span>ليث الحسن</div>
  </div>;
}
const Shell = ({ active, children, bell, bellPulse }) => <div dir="rtl" style={{ position: 'absolute', inset: 0, background: K.page, fontFamily: FA, color: K.ink }}><Sidebar active={active} /><Topbar bell={bell} bellPulse={bellPulse} /><div style={P(0, 0, 1360, 900)}>{children}</div></div>;

// ── Scenes ─────────────────────────────────────────────
function LoginScreen() {
  const { T, CUES } = useComposition(); const t = T - CUES.Login;
  const otp = t > 2.0; const oO = tw(t, 1.95, 2.25, 0, 1, EZ.in);
  const digits = '482915'.split('');
  return <div dir="rtl" style={{ position: 'absolute', inset: 0, background: K.page, fontFamily: FA, color: K.ink }}>
    <div style={P(800, 0, 800, 900, { background: 'linear-gradient(150deg,#4C1D95,#6D28D9 45%,#A855F7)', color: '#fff', overflow: 'hidden' })}>
      <div style={P(-120, -160, 520, 520, { borderRadius: '50%', border: '1px solid rgba(255,255,255,.14)' })} />
      <div style={P(64, 56, 600, 60, { display: 'flex', alignItems: 'center', gap: 14 })}><img src="assets/wab-app-icon.png" style={{ width: 54, height: 54, borderRadius: 15 }} /><div><div style={{ fontFamily: FS, fontWeight: 700, fontSize: 30 }}>WAB</div><span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,.16)', padding: '3px 10px', borderRadius: 7 }}>لوحة التحكم · Admin</span></div></div>
      <div style={P(64, 360, 620, 200)}><div style={{ fontFamily: FS, fontSize: 42, fontWeight: 700, lineHeight: 1.35 }}>رؤية كاملة للمنصة، وتحكم بكل التفاصيل.</div><div style={{ fontSize: 16, lineHeight: 1.8, color: '#EDE4FC', marginTop: 14 }}>كل شاشة، كل حجز، كل محاولة دفع ورحلة كل مستخدم — في مكان واحد.</div></div>
    </div>
    <div style={P(200, 0, 400, 900, { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 })}>
      {!otp ? <>
        <div><div style={{ fontSize: 28, fontWeight: 700 }}>تسجيل الدخول</div><div style={{ fontSize: 14, color: K.mut, marginTop: 6 }}>أدخل بيانات حساب المدير للمتابعة.</div></div>
        <Field label="البريد الإلكتروني"><span dir="ltr" style={{ display: 'block', textAlign: 'right' }}><Typed text="admin@wab.jo" s={0.2} e={0.9} t={t} /></span></Field>
        <Field label="كلمة المرور"><span style={{ letterSpacing: 3 }}><Typed text="••••••••" s={1.0} e={1.45} t={t} /></span></Field>
        <div style={{ height: 50, borderRadius: 13, background: GR, color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 24px rgba(109,40,217,.28)' }}>متابعة</div>
      </> : <div style={{ display: 'flex', flexDirection: 'column', gap: 22, opacity: oO, transform: `translateY(${(1 - oO) * 12}px)` }}>
        <div><div style={{ fontSize: 28, fontWeight: 700 }}>التحقق بخطوتين</div><div style={{ fontSize: 14, color: K.mut, marginTop: 6, lineHeight: 1.7 }}>أرسلنا رمزاً من 6 أرقام إلى <b dir="ltr">a•••n@wab.jo</b></div></div>
        <div dir="ltr" style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>{digits.map((d, i) => { const on = t > 2.4 + i * 0.16; return <div key={i} style={{ width: 54, height: 60, borderRadius: 13, border: `1.5px solid ${on ? K.acc : K.line2}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, fontFamily: FP, boxShadow: on ? '0 0 0 3px #F3EEFB' : 'none' }}>{on ? d : ''}</div>; })}</div>
        <div style={{ height: 50, borderRadius: 13, background: GR, color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>تحقق والدخول</div>
      </div>}
    </div>
    <Tap at={CUES.Login + 1.7} x={400} y={573} />
    <Tap at={CUES.Login + 3.7} x={400} y={530} />
  </div>;
}
const KPI = ({ x, y, w, label, v, fmt, t, sub, tone, alert, spark }) => {
  const k = tw(t, 0.1, 1.3, 0, 1, EZ.in); const val = fmt ? fmt(v * k) : Math.round(v * k).toLocaleString('en-US');
  return <Card x={x} y={y} w={w} h={118} style={{ border: `1px solid ${alert || K.line}`, padding: '15px 16px', boxSizing: 'border-box' }}><div style={{ fontSize: 13, color: K.mut }}>{label}</div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}><span style={{ fontFamily: FP, fontWeight: 700, fontSize: 28, color: tone || K.ink }}>{val}</span>{spark && <svg width="84" height="30" viewBox="0 0 100 32"><path d={spark} fill="none" stroke={tone || K.acc} strokeWidth="2.2" strokeDasharray="200" strokeDashoffset={200 * (1 - k)} /></svg>}</div><div style={{ fontSize: 12, color: K.mut, marginTop: 8 }}>{sub}</div></Card>;
};
const SP = ['M0 26 L16 22 L33 24 L50 15 L66 17 L83 9 L100 6', 'M0 20 L16 22 L33 14 L50 18 L66 10 L83 12 L100 4', 'M0 8 L16 9 L33 10 L50 12 L66 15 L83 20 L100 24'];
function OverviewScreen() {
  const { T, CUES } = useComposition(); const t = T - CUES.Overview;
  const dr = tw(t, 0.5, 2.4, 0, 1, EZ.in);
  const pts = (arr) => arr.map((v, i) => (i ? 'L' : 'M') + (i / (arr.length - 1) * 760).toFixed(0) + ' ' + (220 - v * 16).toFixed(0)).join(' ');
  const today = [2, 3, 5, 7, 9, 10, 12, 11, 13], last = [2, 3, 4, 6, 8, 9, 10, 10, 11, 12, 11, 10, 9];
  const nf = tw(t, 2.6, 3.0, 0, 1, EZ.pop);
  const feed = [['فشل دفع العربون — WAB-24809', 'سارة الزعبي · دار العروس · 05 رفض البنك', K.rose, K.roseS, IC.pay], ['حجز جديد WAB-24817', 'أحمد الخطيب · صالون النخبة للرجال', K.acc, K.soft, IC.cal], ['طلب انضمام جديد', 'ستوديو ليلك · دابوق', K.amber, K.amberS, IC.store], ['تسجيل عميل جديد', 'تالا الروسان · عمّان', K.green, K.greenS, IC.user], ['تقييم جديد', '★ 2 · باربر 962', K.amber, K.amberS, IC.star]];
  return <Shell active="ov" bell={t > 3.2 ? 3 : 2} bellPulse={tw(t, 3.2, 3.4, 0, 1) - tw(t, 3.4, 3.7, 0, 1)}>
    <Head title="نظرة مباشرة" code="A01" extra={<Live />} sub="الأربعاء 7 أكتوبر 2026 · توقيت عمّان" />
    <KPI x={1048} y={176} w={280} t={t} label="مستخدمون نشطون الآن" v={148} sub="زوار 56 · عملاء 75 · تجار 17" spark={SP[0]} />
    <KPI x={752} y={176} w={280} t={t} label="حجوزات اليوم" v={134} sub="معلّق 23 · مؤكد 78 · مكتمل 21" spark={SP[1]} />
    <KPI x={456} y={176} w={280} t={t} label="المبلغ المحصّل" v={3842.5} fmt={v => v.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' د.أ'} sub="↑ 9.8% عن الفترة السابقة" spark={SP[0]} />
    <KPI x={160} y={176} w={280} t={t} label="نسبة نجاح الدفع" v={91.7} fmt={v => v.toFixed(1) + '%'} tone={K.rose} alert={K.rose} sub="أعلى سبب: 05 رفض البنك" spark={SP[2]} />
    <KPI x={32} y={176} w={112} t={t} label="تنبيهات" v={3} tone={K.rose} sub="جديدة" />
    <Card x={472} y={312} w={856} h={330}><CardHead t="الحجوزات بالساعة — اليوم مقابل الأسبوع الماضي" right={<Live />} />
      <svg width="856" height="270" viewBox="-40 -10 840 250" style={{ direction: 'ltr' }}>{[0, 1, 2, 3].map(i => <line key={i} x1="0" x2="760" y1={i * 55 + 55} y2={i * 55 + 55} stroke={K.line2} strokeDasharray="4 4" />)}
        <path d={pts(last)} fill="none" stroke="#A3A8B8" strokeWidth="2" strokeDasharray="6 5" opacity={dr} />
        <path d={pts(today) + ` L${(8 / 12 * 760).toFixed(0)} 220 L0 220 Z`} fill="rgba(109,40,217,.08)" opacity={dr} transform={`scale(${(8 / 12)},1)`} style={{ display: 'none' }} />
        <path d={today.map((v, i) => (i ? 'L' : 'M') + (i / 12 * 760).toFixed(0) + ' ' + (220 - v * 16).toFixed(0)).join(' ')} fill="none" stroke={K.acc} strokeWidth="3" strokeDasharray="900" strokeDashoffset={900 * (1 - dr)} strokeLinecap="round" />
      </svg></Card>
    <Card x={32} y={312} w={424} h={530}><CardHead t="النشاط المباشر" right={<Live />} />
      <div style={{ position: 'relative' }}>{feed.map((f, i) => { const isNew = i === 0; const y = isNew ? 0 : 74 * (i - 1 + nf); return <div key={i} style={P(0, y, 424, 74, { display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', boxSizing: 'border-box', borderBottom: `1px solid ${K.line}`, opacity: isNew ? nf : 1, transform: isNew ? `translateY(${(1 - nf) * -20}px)` : 'none', background: isNew ? `rgba(217,70,122,${0.08 * nf})` : 'transparent' })}><span style={{ width: 38, height: 38, borderRadius: 11, background: f[3], color: f[2], display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic d={f[4]} s={17} /></span><div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{f[0]}</div><div style={{ fontSize: 12, color: K.mut, marginTop: 2 }}>{f[1]}</div></div>{isNew && <Bd t="جديد" c={K.green} bg={K.greenS} />}</div>; })}</div></Card>
    <Card x={472} y={658} w={856} h={184} style={{ padding: 18, boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>{[['طلبات انضمام معلّقة', '4', K.amber], ['صالونات غير متصلة', '3', K.grey], ['تجارب تنتهي ≤ 7 أيام', '5', K.acc], ['مستردات معلّقة', '3', K.rose]].map((r, i) => <div key={i} style={{ background: K.surf, borderRadius: 13, padding: 14 }}><div style={{ fontSize: 12.5, color: K.mut }}>{r[0]}</div><div style={{ fontFamily: FP, fontSize: 30, fontWeight: 700, color: r[2], marginTop: 10 }}>{r[1]}</div></div>)}</Card>
  </Shell>;
}
function AlertScreen() {
  const { T, CUES } = useComposition(); const t = T - CUES.Alert;
  const em = tw(t, 0.2, 0.6, 0, 1, EZ.in) - tw(t, 1.5, 1.8, 0, 1);
  const dd = tw(t, 1.9, 2.15, 0, 1, EZ.in);
  return <Shell active="ov" bellPulse={tw(t, 1.0, 1.2, 0, 1) - tw(t, 1.2, 1.5, 0, 1)}>
    <Head title="نظرة مباشرة" code="A01" extra={<Live />} sub="الأربعاء 7 أكتوبر 2026 · توقيت عمّان" />
    <div style={P(32, 176, 1296, 680, { opacity: 0.45 })}>{[0, 1, 2, 3].map(i => <Card key={i} x={1016 - i * 340} y={0} w={280 + (i ? 0 : 0)} h={118} />)}<Card x={440} y={136} w={856} h={330} /><Card x={0} y={136} w={424} h={530} /></div>
    <div style={P(32, 84, 520, 150, { zIndex: 60, opacity: em, transform: `translateY(${(1 - em) * -20}px)` })}><div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 24px 60px rgba(20,23,43,.2)', border: `1px solid ${K.line}`, padding: 16, display: 'flex', gap: 13 }}><span style={{ width: 44, height: 44, borderRadius: 12, background: K.roseS, color: K.rose, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic d={IC.mail} s={21} /></span><div style={{ flex: 1 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: K.mut, fontFamily: FP }}>WAB Alerts · alerts@wab.jo</span><span style={{ fontSize: 11.5, color: K.faint }}>الآن</span></div><div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>ارتفاع في فشل الدفع: 6 محاولات خلال 15 دقيقة</div><div style={{ fontSize: 12.5, color: K.mut, marginTop: 3 }}>آخرها WAB-24809 · 05 رفض البنك · نسبة الفشل 14.2%</div></div></div></div>
    {t > 1.9 && <div style={P(88, 58, 400, 300, { zIndex: 60, opacity: dd, transform: `translateY(${(1 - dd) * -10}px)`, background: '#fff', borderRadius: 16, border: `1px solid ${K.line2}`, boxShadow: '0 18px 50px rgba(20,23,43,.18)', overflow: 'hidden' })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${K.line}`, fontWeight: 700 }}><span>التنبيهات</span><span style={{ fontSize: 12.5, color: K.acc }}>عرض الكل</span></div>
      {[['ارتفاع في فشل الدفع: 6 محاولات خلال 15 دقيقة', 'حرج · قبل 1 دقيقة', K.rose, 1], ['طلب انضمام جديد: ستوديو ليلك', 'معلومة · قبل 22 دقيقة', K.acc], ['استرداد متأخر > 48 ساعة', 'تحذير · قبل ساعة', K.amber]].map((a, i) => <div key={i} style={{ display: 'flex', gap: 11, padding: '13px 16px', borderBottom: `1px solid ${K.line}`, background: a[3] && t > 3.0 ? K.soft : 'transparent' }}><span style={{ width: 9, height: 9, borderRadius: 5, background: a[2], marginTop: 6 }} /><div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{a[0]}</div><div style={{ fontSize: 12, color: K.mut, marginTop: 2 }}>{a[1]}</div></div></div>)}
    </div>}
    <Tap at={CUES.Alert + 1.75} x={110} y={32} />
    <Tap at={CUES.Alert + 3.1} x={300} y={135} />
  </Shell>;
}
const TL = ({ x, y, w, items, t, s0 = 0.4, step = 0.35 }) => <div style={P(x, y, w, 600)}>{items.map((e, i) => { const o = tw(t, s0 + i * step, s0 + i * step + 0.3, 0, 1, EZ.in); const hl = e[3]; const c = hl === 'e' ? K.rose : hl === 'p' ? K.acc : hl === 'ok' ? K.green : K.grey; return <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 30px 1fr', gap: 10, padding: '9px 16px', opacity: o, transform: `translateX(${(1 - o) * 14}px)`, background: hl === 'e' ? 'rgba(217,70,122,.06)' : hl === 'p' ? 'rgba(109,40,217,.04)' : 'transparent', borderRight: `3px solid ${hl ? c : 'transparent'}` }}><span style={{ fontSize: 12, color: K.mut, fontFamily: FP, paddingTop: 4 }}>{e[0]}</span><span style={{ width: 28, height: 28, borderRadius: 8, background: hl ? c : '#fff', color: hl ? '#fff' : c, border: hl ? 'none' : `1.5px solid ${K.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic d={e[4] || IC.eye} s={14} w={2} /></span><div><div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}><span style={{ fontWeight: 600, fontSize: 13.5 }}>{e[1]}</span>{e[5] && <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11, color: K.acc, background: K.soft, padding: '2px 6px', borderRadius: 5 }}>{e[5]}</span>}{e[6] && <Bd t={e[6]} c={e[7] || K.grey} bg={e[8] || K.greyS} s={{ fontSize: 11, padding: '3px 7px' }} />}</div><div style={{ fontSize: 12, color: K.mut, marginTop: 2 }}>{e[2]}</div></div></div>; })}</div>;
function BookingScreen() {
  const { T, CUES } = useComposition(); const t = T - CUES.Booking;
  const kv = [['العميل', 'سارة الزعبي', 1], ['الهاتف', '+962 77 347 2153'], ['الصالون', 'دار العروس', 1], ['الموعد', '16 أكتوبر · 4:00 م'], ['الأشخاص', '3 · عروس'], ['الموظف', 'سلمى حداد'], ['طريقة الدفع', 'عربون 30%'], ['حالة الدفع', 'فشل الدفع', 0, K.rose], ['الإجمالي', '420.00 د.أ']];
  return <Shell active="bk">
    <Head title="حجز WAB-24809" code="A15" extra={<><Bd t="قيد الانتظار" c={K.amber} bg={K.amberS} /><Bd t="عروس" c={K.violet} bg={K.violetS} /><Bd t="فشل الدفع" c={K.rose} bg={K.roseS} /><Live /></>} sub="الحجوزات / أُنشئ 7 أكتوبر 2026 · 1:58 م" right={[<Btn key="1" t="رفض" kind="r" />, <Btn key="2" t="إلغاء" kind="r" />, <Btn key="3" t="إعادة إسناد" />, <Btn key="4" t="قبول" kind="g" />]} />
    <div style={P(32, 172, 1296, 74, { borderRadius: 14, background: K.roseS, color: K.rose, display: 'flex', alignItems: 'center', gap: 13, padding: '0 18px', boxSizing: 'border-box', opacity: tw(t, 0.3, 0.6, 0, 1) })}><Ic d={IC.pay} s={20} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>فشل دفع العربون مرتين</div><div style={{ fontSize: 13, color: K.ink, opacity: .85, marginTop: 2 }}>رمز البوابة 05 (رفض البنك) على Visa •••• 4417. يُلغى الحجز تلقائياً إذا لم يكتمل الدفع خلال 30 دقيقة.</div></div><Btn t="رحلة العميلة ←" kind="p" /></div>
    <Card x={520} y={264} w={808} h={300}><CardHead t="تفاصيل الحجز" /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '18px 20px', padding: 18 }}>{kv.map((r, i) => <div key={i}><div style={{ fontSize: 12, color: K.mut }}>{r[0]}</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: r[3] || (r[2] ? K.acc : K.ink), direction: r[1][0] === '+' ? 'ltr' : 'rtl', textAlign: 'right' }}>{r[1]}</div></div>)}</div></Card>
    <Card x={520} y={580} w={808} h={262}><CardHead t="المعاملات والمستردات" /><div>{[['TX-90412', '2:06 م', '126.00 د.أ', '05 · Do not honor'], ['TX-90408', '2:02 م', '126.00 د.أ', '05 · Do not honor']].map((r, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 90px 1.4fr', alignItems: 'center', height: 56, padding: '0 18px', borderBottom: `1px solid ${K.line}`, fontSize: 13.5, background: 'rgba(217,70,122,.05)' }}><span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontWeight: 600 }}>{r[0]}</span><span>7 أكتوبر · {r[1]}</span><span style={{ fontFamily: FP }}>{r[2]}</span><Bd t="فاشلة" c={K.rose} bg={K.roseS} /><span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12.5 }}>{r[3]}</span></div>)}</div></Card>
    <Card x={32} y={264} w={472} h={578}><CardHead t="سجل الحالات" /><TL x={0} y={56} w={472} t={t} items={[['2:07 م', 'تنبيه بريد للمدير', 'ارتفاع فشل الدفع', null, IC.mail, null, 'النظام'], ['2:06 م', 'فشل دفع العربون (محاولة 2)', 'TX-90412 · 05 Do not honor', 'e', IC.pay, null, 'النظام'], ['2:02 م', 'فشل دفع العربون', 'TX-90408 · 05 Do not honor', 'e', IC.pay, null, 'النظام'], ['1:58 م', 'أنشأ الحجز', 'سارة الزعبي · 3 أشخاص · عروس', null, IC.cal, null, 'عميل', K.acc, K.soft]]} /></Card>
    <Tap at={CUES.Booking + 4.6} x={110} y={209} />
  </Shell>;
}
function JourneyScreen() {
  const { T, CUES } = useComposition(); const t = T - CUES.Journey;
  const sc = tw(t, 2.6, 4.2, 0, -330);
  const js = tw(t, 1.5, 1.9, 0, 1, EZ.in);
  return <Shell active="jr">
    <Head title="رحلة المستخدم" code="A11" sub="كل حدث لكل مستخدم — مجمّعة حسب الجلسة، مع أحداث الزائر قبل التسجيل" right={<Btn t="تصدير الرحلة" />} />
    <Card x={448} y={172} w={880} h={150}><CardHead t="سارة الزعبي" right={<Bd t="عميلة · مسجّلة" c={K.acc} bg={K.soft} />} /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, padding: '16px 18px' }}>{[['الهاتف', '+962 77 347 2153'], ['الأجهزة', 'iPhone 15 Pro (1)'], ['أول ظهور', '22 أغسطس 2026'], ['التسجيل', '26 أغسطس 2026']].map((r, i) => <div key={i}><div style={{ fontSize: 12, color: K.mut }}>{r[0]}</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, direction: i ? 'rtl' : 'ltr', textAlign: 'right' }}>{r[1]}</div></div>)}</div></Card>
    {[['14', 'جلسة'], ['7', 'حجوزات'], ['9', 'محاولات دفع']].map((k, i) => <Card key={i} x={32 + (2 - i) * 140} y={172} w={128} h={150} style={{ padding: 16, boxSizing: 'border-box' }}><div style={{ fontSize: 12.5, color: K.mut }}>{k[1]}</div><div style={{ fontFamily: FP, fontSize: 32, fontWeight: 700, marginTop: 20 }}>{k[0]}</div></Card>)}
    <Card x={32} y={338} w={1296} h={504}><CardHead t="الخط الزمني" right={<span style={{ fontSize: 12.5, color: K.mut }}>الأخطاء ومحاولات الدفع مميزة</span>} />
      <div style={P(0, 52, 1296, 452, { overflow: 'hidden' })}><div style={{ transform: `translateY(${sc}px)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px 6px' }}><Bd t="جلسة #14 · اليوم" c={K.acc} bg={K.soft} /><span style={{ fontSize: 12.5, color: K.mut }}>iPhone 15 Pro · iOS 18.0 · 2.4.1 · wifi</span></div>
        <TL x={0} y={0} w={1296} t={t} s0={0.2} step={0.18} items={[['2:06 م', 'فشل دفع العربون (محاولة 2)', '126.00 د.أ · Visa •••• 4417 · WAB-24809', 'e', IC.pay, 'payment_failed', '05 · Do not honor', K.rose, K.roseS], ['2:05 م', 'بدء الدفع', '126.00 د.أ · عربون 30%', 'p', IC.pay, 'payment_start'], ['2:02 م', 'فشل دفع العربون (محاولة 1)', '126.00 د.أ', 'e', IC.pay, 'payment_failed', '05 · Do not honor', K.rose, K.roseS]].map(e => e)} />
        <div style={{ position: 'relative', height: 150 * js, overflow: 'hidden', margin: '0 120px 0 18px' }}><pre dir="ltr" style={{ margin: '6px 0', padding: '12px 14px', borderRadius: 10, background: '#14172B', color: '#E9D5FF', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, lineHeight: 1.6, textAlign: 'left' }}>{'{\n  "bookingId": "WAB-24809",  "transactionId": "TX-90412",\n  "amount": 126, "currency": "JOD", "method": "DEPOSIT",\n  "gateway": { "code": "05", "message": "Do not honor", "durationMs": 2140 },\n  "card": { "brand": "VISA", "last4": "4417" }\n}'}</pre></div>
        <div style={{ marginTop: 120, position: 'absolute' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px 6px' }}><Bd t="جلسة #3 · 22 أغسطس" c={K.acc} bg={K.soft} /><Bd t="زائر — قبل التسجيل" c={K.amber} bg={K.amberS} /></div>
        <TL x={0} y={0} w={1296} t={t} s0={2.4} step={0.2} items={[['10:40 م', 'إضافة للمفضلة', 'دار العروس', null, IC.star, 'favorite_add', 'زائر', K.amber, K.amberS], ['10:31 م', 'بحث', '«مكياج عروس» · 14 نتيجة', null, IC.search, 'search', 'زائر', K.amber, K.amberS], ['10:28 م', 'أول فتح للتطبيق', 'تثبيت من App Store', null, IC.eye, 'first_open', 'زائر', K.amber, K.amberS]]} />
      </div></div></Card>
    <Tap at={CUES.Journey + 1.3} x={1100} y={460} />
  </Shell>;
}
function AppsScreen() {
  const { T, CUES } = useComposition(); const t = T - CUES.Apps;
  const rev = t > 1.3; const rO = tw(t, 1.3, 1.6, 0, 1, EZ.in);
  const z = 1 + tw(t, 2.0, 2.4, 0, 0.35, EZ.in) - tw(t, 2.7, 3.0, 0, 0.35), r = tw(t, 3.0, 3.3, 0, 90) - tw(t, 3.5, 3.8, 0, 90);
  return <Shell active="sa" >
    {!rev ? <>
      <Head title="طلبات الانضمام" code="A14" extra={<Live />} sub="الطلبات المعلّقة — الأقدم أولاً" />
      <Card x={32} y={172} w={1296} h={330}><CardHead t="طلبات الانضمام" right={<Bd t="4" c={K.mut} bg={K.surf} />} />{[['ستوديو ليلك', 'نسائي', 'عمّان · دابوق', 'ليلى سماره', '52 س', 0], ['صالون الفارس', 'رجالي', 'إربد · الحصن', 'أنس العزام', '22 س', 1], ['مسك بيوتي', 'نسائي', 'الزرقاء', 'أسيل حمدان', '29 س', 0], ['توب ستايل', 'رجالي', 'عمّان · مرج الحمام', 'معاذ الرواشدة', '3 س', 2]].map((a, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 80px 1.2fr 1.3fr 90px 110px 110px', alignItems: 'center', height: 64, padding: '0 18px', borderBottom: `1px solid ${K.line}`, fontSize: 13.5, background: i === 0 && t > 0.8 ? K.soft : 'transparent', opacity: tw(t, i * 0.12, i * 0.12 + 0.3, 0, 1) }}><span style={{ fontWeight: 600 }}>{a[0]}</span><span>{a[1]}</span><span>{a[2]}</span><span>{a[3]}</span><Bd t={a[4]} c={i === 0 ? K.amber : K.grey} bg={i === 0 ? K.amberS : K.greyS} s={{ justifySelf: 'start' }} /><span>{a[5] ? <Bd t={'× ' + a[5]} c={K.acc} bg={K.soft} /> : '—'}</span><Btn t="مراجعة" kind="p" style={{ height: 34, fontSize: 12.5 }} /></div>)}</Card>
    </> : <div style={{ opacity: rO }}>
      <Head title="مراجعة: ستوديو ليلك" code="A14" extra={<Bd t="قيد المراجعة" c={K.amber} bg={K.amberS} />} sub="طلبات الانضمام / AP-58 · قُدّم 5 أكتوبر 2026" right={[<Btn key="r" t="رفض" kind="r" />, <Btn key="a" t="✓ قبول الطلب" kind="g" />]} />
      <Card x={860} y={172} w={468} h={670}><CardHead t="البيانات المقدّمة" /><div style={{ display: 'flex', flexDirection: 'column' }}>{[['النوع', 'نسائي'], ['المدينة', 'عمّان · دابوق'], ['العنوان', 'شارع الأميرة رحمة، مجمع 14'], ['المالكة', 'ليلى سماره'], ['الهاتف', '+962 79 820 4471'], ['السجل التجاري', '200184573'], ['رخصة المهن', 'سارية حتى 31 ديسمبر 2026']].map((r, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${K.line}`, fontSize: 13.5 }}><span style={{ color: K.mut }}>{r[0]}</span><span style={{ fontWeight: 600, direction: r[1][0] === '+' ? 'ltr' : 'rtl' }}>{r[1]}</span></div>)}{['رخصة المهن مرفوعة وسارية', 'السجل التجاري يطابق الاسم', 'هوية المالكة واضحة'].map((c, i) => <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 18px', fontSize: 13 }}><span style={{ width: 20, height: 20, borderRadius: 6, background: K.greenS, color: K.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic d={IC.check} s={12} w={3} /></span>{c}</div>)}</div></Card>
      <Card x={32} y={172} w={812} h={670}><CardHead t="عارض الوثائق" right={<div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{[IC.zoom, IC.rot, IC.down].map((d, i) => <span key={i} style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${K.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: (i === 0 && t > 2 && t < 2.8) || (i === 1 && t > 3 && t < 3.8) ? K.soft : '#fff' }}><Ic d={d} s={16} /></span>)}<span style={{ fontFamily: FP, fontSize: 12.5, fontWeight: 600, width: 44, textAlign: 'center' }}>{Math.round(z * 100)}%</span></div>} />
        <div style={P(0, 52, 140, 618, { background: K.surf, borderLeft: `1px solid ${K.line}`, right: 0, left: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: 10, boxSizing: 'border-box' })}>{['رخصة المهن', 'السجل التجاري', 'هوية المالكة'].map((d, i) => <div key={i} style={{ padding: 6, borderRadius: 10, border: `1.5px solid ${i ? 'transparent' : K.acc}`, background: i ? 'transparent' : K.soft }}><div style={{ height: 110, borderRadius: 7, background: '#fff', border: `1px solid ${K.line}` }} /><div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 5 }}>{d}</div></div>)}</div>
        <div style={P(0, 52, 672, 618, { overflow: 'hidden', background: 'repeating-conic-gradient(#F8F7FB 0 25%,#fff 0 50%) 0 0/22px 22px', display: 'flex', alignItems: 'center', justifyContent: 'center' })}><div style={{ width: 380, height: 520, background: '#fff', boxShadow: '0 10px 40px rgba(20,23,43,.18)', transform: `scale(${z}) rotate(${r}deg)`, padding: 30, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><div style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid #C4A5F5' }} /><div style={{ textAlign: 'left', fontSize: 11, color: K.mut }}>أمانة عمّان الكبرى<br />رخصة مهن</div></div>{[90, 70, 85, 60, 80, 50, 75].map((w, i) => <div key={i} style={{ height: 9, width: w + '%', borderRadius: 4, background: i === 0 ? '#C4A5F5' : '#ECE9F5' }} />)}<div style={{ marginTop: 'auto', alignSelf: 'flex-start', width: 90, height: 90, borderRadius: '50%', border: '3px solid rgba(109,40,217,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: K.acc, fontWeight: 700, transform: 'rotate(-14deg)' }}>مختوم</div></div></div></Card>
    </div>}
    <Modal t={t} show={4.15} hide={5.3} title="قبول طلب ستوديو ليلك؟" tone="g" confirm="قبول الطلب"><div style={{ fontSize: 13.5, color: K.mut, lineHeight: 1.7 }}>سيُفعَّل الصالون مع فترة تجريبية 30 يوماً. سيصل المالكة إشعار بالقبول.</div><Field label="السبب" h={60}><Typed text="الوثائق مكتملة وسارية" s={4.35} e={4.9} t={t} /></Field></Modal>
    <Toast t={t} show={5.5} text="تم قبول الطلب — ستوديو ليلك نشط الآن" />
    <Tap at={CUES.Apps + 1.0} x={84} y={256} />
    <Tap at={CUES.Apps + 2.0} x={420} y={198} />
    <Tap at={CUES.Apps + 3.0} x={378} y={198} />
    <Tap at={CUES.Apps + 3.95} x={1235} y={136} />
    <Tap at={CUES.Apps + 5.2} x={570} y={642} />
  </Shell>;
}
function FunnelScreen() {
  const { T, CUES } = useComposition(); const t = T - CUES.Funnel;
  const S = [['عرض تفاصيل الصالون', 12840], ['الضغط على احجز', 6120], ['الخدمات', 4980], ['التاريخ والوقت', 4420], ['الملخص', 3810], ['تأكيد OTP', 3620], ['بدء الدفع', 3410], ['نجاح الدفع / الدفع عند الوصول', 2760], ['إنشاء الحجز', 2690]];
  const dw = tw(t, 2.9, 3.25, 0, 1, EZ.in);
  return <Shell active="an">
    <Head title="مسارات التحويل" code="A04" sub="نسب التحويل والتسرب والوقت الوسيط — انقر على أي تسرب لعرض المستخدمين" />
    <div style={P(32, 166, 1296, 44, { display: 'flex', gap: 4, justifyContent: 'flex-start' })}><div style={{ display: 'inline-flex', gap: 3, padding: 4, borderRadius: 12, background: '#fff', border: `1px solid ${K.line}` }}>{['التفعيل', 'التسجيل', 'الحجز', 'الموافقة', 'انضمام التجار', 'مسار مخصص +'].map((x, i) => <span key={i} style={{ height: 32, padding: '0 14px', borderRadius: 9, display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, background: i === 2 ? GR : 'transparent', color: i === 2 ? '#fff' : K.mut }}>{x}</span>)}</div></div>
    <Card x={32} y={226} w={1296} h={616}><CardHead t="مسار الحجز" right={<span style={{ fontSize: 13, color: K.mut }}>آخر 30 يوم · التحويل الكلي <b style={{ fontFamily: FP, color: K.ink }}>20.9%</b></span>} />
      <div style={{ padding: '6px 18px' }}>{S.map((s, i) => { const g = tw(t, 0.2 + i * 0.12, 0.7 + i * 0.12, 0, 1, EZ.in); const nx = S[i + 1]; const dp = nx ? (s[1] - nx[1]) / s[1] : 0; const big = i === 6; const pulse = big ? tw(t, 2.0, 2.3, 0, 1) - tw(t, 2.3, 2.6, 0, 1) * 0.5 : 0; return <div key={i} style={{ display: 'grid', gridTemplateColumns: '30px 250px 1fr 100px 150px', gap: 14, alignItems: 'center', height: 58, borderBottom: `1px solid ${K.line}` }}><span style={{ width: 26, height: 26, borderRadius: 7, background: K.soft, color: K.acc, fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FP }}>{i + 1}</span><span style={{ fontWeight: 600, fontSize: 13.5 }}>{s[0]}</span><div style={{ height: 24, borderRadius: 6, background: K.surf, overflow: 'hidden' }}><div style={{ height: '100%', width: (s[1] / 12840 * 100 * g) + '%', background: GR, borderRadius: 6 }} /></div><span style={{ fontFamily: FP, fontWeight: 700, fontSize: 14, textAlign: 'left' }}>{Math.round(s[1] * g).toLocaleString('en-US')}</span><span>{nx && <span style={{ display: 'inline-block', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700, fontFamily: FP, background: big || dp > .25 ? K.roseS : K.surf, color: big || dp > .25 ? K.rose : K.mut, transform: `scale(${1 + pulse * 0.15})`, boxShadow: big ? `0 0 0 ${pulse * 6}px rgba(217,70,122,.15)` : 'none' }}>↓ {(dp * 100).toFixed(1)}% · {(s[1] - nx[1]).toLocaleString('en-US')}</span>}</span></div>; })}</div></Card>
    {t > 2.9 && <><div style={P(0, 0, 1360, 900, { background: `rgba(20,23,43,${0.35 * dw})`, zIndex: 50 })} /><div style={P(-560 + 560 * dw, 0, 540, 900, { background: '#fff', zIndex: 51, boxShadow: '0 0 60px rgba(20,23,43,.2)' })}>
      <div style={{ padding: '22px 22px 16px', borderBottom: `1px solid ${K.line}` }}><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ fontSize: 17, fontWeight: 700 }}>تسربوا بعد: بدء الدفع</span><Bd t="19.1%" c={K.rose} bg={K.roseS} /></div><div style={{ fontSize: 12.5, color: K.mut, marginTop: 4 }}>650 مستخدم لم يصلوا إلى «نجاح الدفع»</div></div>
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}><div style={{ fontSize: 12, fontWeight: 700, color: K.faint }}>أكثر الأسباب المسجّلة</div>{[['05 رفض البنك', '41%'], ['51 رصيد غير كافٍ', '27%'], ['فشل التحقق 3DS', '19%']].map((r, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '8px 0', borderBottom: `1px solid ${K.line}` }}><span>{r[0]}</span><b style={{ fontFamily: FP }}>{r[1]}</b></div>)}<div style={{ fontSize: 12, fontWeight: 700, color: K.faint, marginTop: 10 }}>المستخدمون</div>{['سارة الزعبي', 'لانا عبيدات', 'هبة النسور', 'دينا المجالي'].map((n, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 11, border: `1px solid ${K.line}`, opacity: tw(t, 3.3 + i * 0.12, 3.6 + i * 0.12, 0, 1) }}><span style={{ width: 32, height: 32, borderRadius: 9, background: K.soft, color: K.acc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{n[0]}</span><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13.5 }}>{n}</div><div style={{ fontSize: 11.5, color: K.mut }}>C-10{43 + i * 7} · اليوم</div></div><span style={{ color: K.acc, fontSize: 12.5, fontWeight: 600 }}>الرحلة ←</span></div>)}</div></div></>}
    <Tap at={CUES.Funnel + 2.7} x={148} y={657} />
  </Shell>;
}
function RefundScreen() {
  const { T, CUES } = useComposition(); const t = T - CUES.Refund;
  const done = t > 4.6; const R = [['RF-1240', 'WAB-24690', 'هبة النسور', 'لمسة لولو', '85.00', 'رفض الصالون', done ? 'ok' : 'f', '99 س'], ['RF-1239', 'WAB-24702', 'زيد القضاة', 'ذا جنتري', '42.00', 'إلغاء الصالون', 'p', '75 س'], ['RF-1238', 'WAB-24741', 'نور الدباس', 'صالون ريم', '30.00', 'إلغاء تلقائي', 'p', '28 س'], ['RF-1236', 'WAB-24733', 'كرم الصمادي', 'ستوديو ليلك', '64.00', 'إلغاء العميل', 'ok', '—'], ['RF-1235', 'WAB-24728', 'لانا عبيدات', 'بيوتي لاونج', '110.00', 'إلغاء الصالون', 'ok', '—']];
  const B = { f: ['فشل الاسترداد', K.rose, K.roseS], p: ['استرداد معلّق', K.amber, K.amberS], ok: ['تم الاسترداد', K.green, K.greenS] };
  const spin = t > 1.0 && t < 2.0;
  return <Shell active="fi">
    <Head title="المبالغ المستردة" code="A17" extra={<Live />} sub="المستردات من كل المصادر مع أعمارها" right={<Btn t="+ استرداد يدوي" kind="p" />} />
    <div style={P(32, 166, 1296, 46, { display: 'flex', gap: 4, borderBottom: `1px solid ${K.line2}` })}>{[['الكل', 10], ['معلّقة', 3], ['فاشلة', done ? 0 : 1], ['مكتملة', done ? 7 : 6]].map((x, i) => <span key={i} style={{ height: 44, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? K.acc : K.mut, borderBottom: `2px solid ${i === 0 ? K.acc : 'transparent'}` }}>{x[0]}<span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 9, background: i === 0 ? K.soft : K.surf, fontFamily: FP }}>{x[1]}</span></span>)}</div>
    <Card x={32} y={228} w={1296} h={400}><CardHead t="المستردات" />{R.map((r, i) => { const b = B[r[6]]; const hl = (r[6] === 'f' || (r[6] === 'p' && i === 1)); return <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 110px 1.2fr 1fr 90px 1fr 130px 80px 210px', alignItems: 'center', height: 66, padding: '0 18px', borderBottom: `1px solid ${K.line}`, fontSize: 13.5, background: hl ? 'rgba(217,70,122,.05)' : i === 0 && done ? `rgba(46,158,120,${0.15 * (1 - tw(t, 4.6, 5.3, 0, 1))})` : 'transparent' }}><span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontWeight: 600 }}>{r[0]}</span><span style={{ fontFamily: 'ui-monospace,Menlo,monospace', color: K.acc }}>{r[1]}</span><span style={{ fontWeight: 600 }}>{r[2]}</span><span>{r[3]}</span><span style={{ fontFamily: FP }}>{r[4]}</span><span>{r[5]}</span><span><Bd t={b[0]} c={b[1]} bg={b[2]} /></span><span>{r[7] !== '—' ? <Bd t={r[7]} c={i < 2 ? K.rose : K.amber} bg={i < 2 ? K.roseS : K.amberS} /> : '—'}</span><span style={{ display: 'flex', gap: 6 }}>{r[6] === 'f' && <Btn t={spin ? '… جاري' : 'إعادة المحاولة'} style={{ height: 32, fontSize: 12 }} />}{r[6] !== 'ok' && <Btn t="تعليم يدوي" kind="s" style={{ height: 32, fontSize: 12 }} />}</span></div>; })}</Card>
    <Modal t={t} show={2.85} hide={4.4} title="تعليم RF-1240 كمسترد يدوياً" tone="g" confirm="تعليم كمسترد"><Field label="مرجع التحويل"><span dir="ltr" style={{ display: 'block', textAlign: 'right', fontFamily: 'ui-monospace,Menlo,monospace' }}><Typed text="CLIQ-88120455" s={3.05} e={3.6} t={t} /></span></Field><Field label="السبب" h={56}><Typed text="البطاقة منتهية — حُوّل المبلغ عبر CliQ" s={3.6} e={4.05} t={t} /></Field></Modal>
    <Toast t={t} show={2.0} hide={2.7} tone="e" text="فشلت المحاولة مجدداً — البطاقة منتهية" />
    <Toast t={t} show={4.55} text="تم تعليم الاسترداد كمكتمل · أُبلغ العميل" />
    <Tap at={CUES.Refund + 0.9} x={170} y={313} />
    <Tap at={CUES.Refund + 2.65} x={72} y={313} />
    <Tap at={CUES.Refund + 4.3} x={565} y={655} />
  </Shell>;
}
function PayoutScreen() {
  const { T, CUES } = useComposition(); const t = T - CUES.Payout;
  const step = t < 1.5 ? 0 : t < 2.9 ? 1 : 2; const so = (a) => tw(t, a, a + 0.3, 0, 1, EZ.in);
  const B = [['صالون النخبة للرجال', '1,840.00', '44.16', '85.00', '1,200.00', '510.84'], ['دار العروس', '1,210.00', '29.04', '120.00', '700.00', '360.96'], ['ذا جنتري', '1,460.00', '35.04', '40.00', '900.00', '484.96'], ['بيوتي لاونج عبدون', '1,120.00', '26.88', '64.00', '700.00', '329.12']];
  return <Shell active="fi">
    <Head title="الدفعات" code="A18" sub="أرصدة الصالونات المستحقة وتسجيل التحويلات اليدوية" />
    <div style={P(32, 168, 1296, 64, { background: '#fff', border: `1px solid ${K.line}`, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', boxSizing: 'border-box' })}>{['اختيار الصالونات والفترة', 'مراجعة المبالغ', 'تسجيل التحويل'].map((s, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12.5, fontFamily: FP, background: i < step ? '#2E9E78' : i === step ? GR : K.surf, color: i <= step ? '#fff' : K.mut }}>{i < step ? '✓' : i + 1}</span><span style={{ fontSize: 13.5, fontWeight: i === step ? 700 : 500, color: i === step ? K.ink : K.mut }}>{s}</span>{i < 2 && <span style={{ width: 50, height: 2, background: K.line2 }} />}</div>)}</div>
    {step === 0 && <Card x={32} y={248} w={1296} h={400}><CardHead t="اختر الصالونات — سبتمبر 2026" right={<Btn t="التالي ←" kind="p" style={{ height: 34 }} />} />{B.map((b, i) => { const on = (i === 0 && t > 0.5) || (i === 1 && t > 0.9); return <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1.6fr 1fr', alignItems: 'center', height: 64, padding: '0 18px', borderBottom: `1px solid ${K.line}`, fontSize: 13.5, background: on ? K.soft : 'transparent' }}><span style={{ width: 38, height: 22, borderRadius: 11, background: on ? GR : K.line2, display: 'flex', justifyContent: on ? 'flex-start' : 'flex-end', padding: 2, boxSizing: 'border-box' }}><span style={{ width: 18, height: 18, borderRadius: 9, background: '#fff' }} /></span><span style={{ fontWeight: 600 }}>{b[0]}</span><span style={{ fontFamily: FP, color: K.green, fontWeight: 600 }}>{b[5]} د.أ</span></div>; })}</Card>}
    {step === 1 && <Card x={32} y={248} w={1296} h={330} style={{ opacity: so(1.5) }}><CardHead t="المبالغ المحسوبة" right={<Btn t="التالي ←" kind="p" style={{ height: 34 }} />} /><div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr', height: 44, alignItems: 'center', padding: '0 18px', background: K.surf, fontSize: 12.5, fontWeight: 700, color: K.mut }}>{['الصالون', 'المحصّل', 'الرسوم', 'المستردات', 'سابقة', 'الصافي'].map(h => <span key={h}>{h}</span>)}</div>{B.slice(0, 2).map((b, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr', alignItems: 'center', height: 60, padding: '0 18px', borderBottom: `1px solid ${K.line}`, fontSize: 13.5, fontFamily: FP }}><span style={{ fontFamily: FA, fontWeight: 600 }}>{b[0]}</span><span>{b[1]}</span><span>− {b[2]}</span><span>− {b[3]}</span><span>− {b[4]}</span><b style={{ color: K.green }}>{b[5]}</b></div>)}<div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr', alignItems: 'center', height: 60, padding: '0 18px', background: K.soft, fontWeight: 700, fontSize: 14 }}><span>الإجمالي</span><span /><span /><span /><span /><span style={{ fontFamily: FP }}>871.80 د.أ</span></div></Card>}
    {step === 2 && <><Card x={500} y={248} w={828} h={520} style={{ opacity: so(2.9) }}><CardHead t="تسجيل التحويل — صالون النخبة للرجال" /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, padding: 20 }}><Field label="تاريخ التحويل"><span style={{ fontFamily: FP }}>07/10/2026</span></Field><Field label="المبلغ"><span style={{ fontFamily: FP }}>510.84</span> د.أ</Field><Field label="المرجع البنكي"><span dir="ltr" style={{ display: 'block', textAlign: 'right', fontFamily: 'ui-monospace,Menlo,monospace' }}><Typed text="ARB-778190" s={3.2} e={3.8} t={t} /></span></Field><Field label="ملاحظة"><span>دفعة شهر سبتمبر 2026</span></Field></div><div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 20px', borderTop: `1px solid ${K.line}`, gap: 9 }}><Btn t="→ رجوع" /><Btn t="تسجيل كمحوّل" kind="p" /></div></Card>
      <Card x={32} y={248} w={452} h={300} style={{ opacity: so(3.0) }}><CardHead t="البيانات البنكية للصالون" right={<Bd t="للقراءة فقط" c={K.grey} bg={K.greyS} />} />{[['البنك', 'البنك العربي'], ['اسم الحساب', 'Elite Men Salon LLC'], ['IBAN', 'JO94 CBJO •••• 0302']].map((r, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 18px', borderBottom: `1px solid ${K.line}`, fontSize: 13.5 }}><span style={{ color: K.mut }}>{r[0]}</span><span style={{ fontWeight: 600, direction: 'ltr' }}>{r[1]}</span></div>)}</Card></>}
    <Toast t={t} show={4.5} text="تم تسجيل التحويل — الحالة: تم التحويل · أُبلغ الصالون" />
    <Tap at={CUES.Payout + 0.5} x={1290} y={332} />
    <Tap at={CUES.Payout + 0.9} x={1290} y={396} />
    <Tap at={CUES.Payout + 1.35} x={92} y={274} />
    <Tap at={CUES.Payout + 2.75} x={92} y={274} />
    <Tap at={CUES.Payout + 4.3} x={600} y={738} />
  </Shell>;
}
function ReportScreen() {
  const { T, CUES } = useComposition(); const t = T - CUES.Report;
  const view = t > 1.1; const vo = tw(t, 1.1, 1.4, 0, 1, EZ.in); const g = tw(t, 1.3, 2.4, 0, 1, EZ.in);
  const cards = [['التقرير اليومي', 'اليوم · 7 أكتوبر'], ['التقرير الأسبوعي', '1 – 7 أكتوبر'], ['التقرير الشهري', 'سبتمبر 2026']];
  const bars = [38.2, 41.9, 47.1, 52.8, 58.4];
  return <Shell active="rp">
    {!view ? <><Head title="التقارير" code="A26" sub="تقارير جاهزة قابلة للعرض والتصدير إلى Excel وPDF في أي وقت" />
      {cards.map((c, i) => <Card key={i} x={32 + (2 - i) * 440} y={176} w={416} h={220} style={{ padding: 20, boxSizing: 'border-box', border: `1px solid ${i === 2 && t > 0.6 ? K.acc : K.line}`, boxShadow: i === 2 && t > 0.6 ? '0 0 0 3px #F3EEFB' : 'none' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 700, fontSize: 17 }}>{c[0]}</span><Bd t={c[1]} c={K.acc} bg={K.soft} /></div><div style={{ fontSize: 13, color: K.mut, lineHeight: 1.7, marginTop: 10 }}>{['التثبيتات، التسجيلات، الحجوزات، المدفوعات والإيراد', 'اليومي مجمّعاً + المسارات وأفضل الصالونات', 'الأسبوعي + الاحتفاظ والاشتراكات والدفعات والنمو'][i]}</div><div style={{ display: 'flex', gap: 8, marginTop: 22 }}><Btn t="عرض" kind="p" style={{ height: 34 }} /><Btn t="Excel" style={{ height: 34 }} /><Btn t="PDF" style={{ height: 34 }} /></div></Card>)}</> :
      <div style={{ opacity: vo }}><Head title="التقرير الشهري" code="A26" sub="التقارير / سبتمبر 2026 · مقارنة بأغسطس" right={[<Btn key="x" t="تصدير Excel" />, <Btn key="p" t="تصدير PDF" kind="p" />]} />
        {[['الحجوزات', '3,842', '+11%'], ['الإيراد المحصّل', '58,420 د.أ', '+12%'], ['نشطون شهرياً', '24,905', '+9.7%'], ['نجاح الدفع', '92.6%', '-1.1%'], ['الدفعات المحوّلة', '47,311 د.أ', ''], ['النمو عن أغسطس', '+10.6%', '']].map((k, i) => <Card key={i} x={32 + (5 - i) * 218} y={176} w={206} h={112} style={{ padding: 15, boxSizing: 'border-box' }}><div style={{ fontSize: 12.5, color: K.mut }}>{k[0]}</div><div style={{ fontFamily: FP, fontSize: 22, fontWeight: 700, marginTop: 10, color: i === 5 ? K.green : K.ink }}>{k[1]}</div>{k[2] && <span style={{ fontSize: 11.5, fontWeight: 700, color: k[2][0] === '-' ? K.rose : K.green, fontFamily: FP }}>{k[2][0] === '-' ? '↓ ' : '↑ '}{k[2].slice(1)}</span>}</Card>)}
        <Card x={472} y={304} w={856} h={538}><CardHead t="المحصّل مقابل المحوّل شهرياً" /><div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 400, padding: '20px 30px 0', direction: 'ltr' }}>{bars.map((b, i) => <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}><div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 360 }}><div style={{ width: 34, height: b / 60 * 340 * g, background: K.acc, borderRadius: '6px 6px 0 0' }} /><div style={{ width: 34, height: b * 0.81 / 60 * 340 * g, background: '#C4A5F5', borderRadius: '6px 6px 0 0' }} /></div><span style={{ fontSize: 12.5, color: K.mut, fontFamily: FA }}>{['مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر'][i]}</span></div>)}</div></Card>
        <Card x={32} y={304} w={424} h={538}><CardHead t="أفضل الصالونات" />{[['صالون النخبة للرجال', '568'], ['ذا جنتري', '472'], ['دار العروس', '384'], ['بيوتي لاونج عبدون', '352'], ['لمسة لولو', '296'], ['صالون ريم', '204']].map((r, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0 18px', height: 62, alignItems: 'center', borderBottom: `1px solid ${K.line}`, fontSize: 13.5 }}><span style={{ fontWeight: 600 }}>{r[0]}</span><span style={{ fontFamily: FP }}>{r[1]}</span></div>)}</Card>
      </div>}
    <Toast t={t} show={2.75} prog={[2.75, 4.3, 'جاري تجهيز التقرير الشهري — سبتمبر 2026 (PDF)']} text="اكتمل التصدير — التقرير_الشهري_سبتمبر_2026.pdf" />
    <Tap at={CUES.Report + 0.75} x={160} y={364} />
    <Tap at={CUES.Report + 2.6} x={88} y={136} />
  </Shell>;
}

function BG() {
  const { T } = useComposition();
  return <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(165deg,#14172B 0%,#1B1030 50%,#2A1450 100%)', overflow: 'hidden' }}><div style={{ position: 'absolute', width: 1100, height: 1100, borderRadius: '50%', left: -300 + Math.sin(T * 0.22) * 140, top: -500 + Math.cos(T * 0.2) * 80, background: 'radial-gradient(circle,rgba(168,85,247,.33),transparent 65%)' }} /><div style={{ position: 'absolute', width: 1000, height: 1000, borderRadius: '50%', left: 1200 + Math.cos(T * 0.2) * 140, top: 300 + Math.sin(T * 0.18) * 100, background: 'radial-gradient(circle,rgba(244,167,196,.2),transparent 65%)' }} /></div>;
}
function Brand() {
  const { T, CUES, authoredTotal } = useComposition();
  const pop = tw(T, 0.1, 0.8, 0, 1, EZ.pop); const out = tw(T, CUES.Open + 2.7, CUES.Open + 3.3, 0, 1);
  const back = tw(T, CUES.Close + 0.6, CUES.Close + 1.3, 0, 1, EZ.pop); const fade = tw(T, authoredTotal - 0.6, authoredTotal - 0.05, 1, 0);
  const show = T < CUES.Open + 3.4 ? pop * (1 - out) : back; const o = clamp(show, 0, 1) * fade;
  const w1 = tw(T, 0.6, 1.1, 0, 1, EZ.in) * (1 - out) + tw(T, CUES.Close + 1.0, CUES.Close + 1.5, 0, 1, EZ.in);
  const tg = T < CUES.Close ? tw(T, 1.3, 1.8, 0, 1, EZ.in) * (1 - out) : tw(T, CUES.Close + 1.5, CUES.Close + 2.0, 0, 1, EZ.in);
  if (o <= 0.001 && w1 <= 0.001) return null;
  return <div dir="rtl" style={{ position: 'absolute', inset: 0, fontFamily: FA, opacity: fade, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, pointerEvents: 'none' }}>
    <div style={{ width: 200, height: 200, borderRadius: 50, overflow: 'hidden', transform: `scale(${Math.max(0, show)})`, opacity: o, boxShadow: '0 30px 70px rgba(109,40,217,.5)' }}><img src="assets/wab-app-icon.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
    <div style={{ textAlign: 'center', opacity: clamp(w1, 0, 1) * fade, transform: `translateY(${(1 - clamp(w1, 0, 1)) * 20}px)` }}><div style={{ display: 'flex', alignItems: 'baseline', gap: 22, justifyContent: 'center', direction: 'ltr' }}><span style={{ fontFamily: FS, fontWeight: 700, fontSize: 110, color: '#fff', letterSpacing: 5, lineHeight: 1 }}>WAB</span><span style={{ fontSize: 44, fontWeight: 700, color: '#C9AEF7', fontFamily: FA }}>لوحة التحكم</span></div><div style={{ fontFamily: FP, fontWeight: 600, fontSize: 24, letterSpacing: 9, color: '#C9AEF7', marginTop: 14 }}>WEDDING &amp; BEAUTY · ADMIN</div></div>
    <div style={{ fontSize: 44, fontWeight: 600, color: '#fff', opacity: clamp(tg, 0, 1), transform: `translateY(${(1 - clamp(tg, 0, 1)) * 16}px)` }}>{T < CUES.Close ? 'كل ما يحدث على المنصة — لحظة بلحظة' : 'رؤية كاملة. تحكم كامل. سجل لكل إجراء.'}</div>
  </div>;
}
function Headline() {
  const { CUES } = useComposition();
  const H = (h, s) => <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 22 }}><span style={{ fontSize: 50, fontWeight: 700, color: '#fff' }}>{h}</span><span style={{ fontSize: 28, fontWeight: 500, color: '#D8B4FE' }}>{s}</span></div>;
  return <Captions style={{ top: 34, bottom: 'auto', left: '4%', right: '4%', font: 'inherit', fontFamily: FA, direction: 'rtl', textShadow: 'none' }} items={[
    { at: CUES.Login, until: CUES.Overview - 0.15, text: H('دخول آمن', 'كلمة مرور + رمز تحقق بالبريد') },
    { at: CUES.Overview, until: CUES.Alert - 0.15, text: H('المنصة مباشرة', 'نشطون، حجوزات، مدفوعات وأخطاء الآن') },
    { at: CUES.Alert, until: CUES.Booking - 0.15, text: H('تنبيه فوري', 'بالبريد وفي الجرس — ارتفاع فشل الدفع') },
    { at: CUES.Booking, until: CUES.Journey - 0.15, text: H('من التنبيه إلى الحجز', 'كل محاولة دفع ورمز البوابة') },
    { at: CUES.Journey, until: CUES.Apps - 0.15, text: H('رحلة كل مستخدم', 'كل حدث، حتى قبل التسجيل') },
    { at: CUES.Apps, until: CUES.Funnel - 0.15, text: H('قبول الصالونات', 'مراجعة الوثائق ثم قرار بسبب مسجّل') },
    { at: CUES.Funnel, until: CUES.Refund - 0.15, text: H('أين يتسرب المستخدمون؟', 'مسارات تحويل حتى المستخدم الواحد') },
    { at: CUES.Refund, until: CUES.Payout - 0.15, text: H('مستردات تحت السيطرة', 'إعادة المحاولة أو التسجيل اليدوي') },
    { at: CUES.Payout, until: CUES.Report - 0.15, text: H('دفعات الصالونات', 'حساب تلقائي وتسجيل التحويل') },
    { at: CUES.Report, until: CUES.Close, text: H('تقارير جاهزة', 'تصدير Excel وPDF بنقرة') },
  ]} />;
}
function Piece() {
  const { T, CUES } = useComposition();
  const enter = tw(T, CUES.Open + 3.0, CUES.Open + 3.9, 1, 0, EZ.in), exit = tw(T, CUES.Close, CUES.Close + 0.8, 0, 1, Easing.easeInCubic);
  const beats = [[CUES.Overview + 2.4, CUES.Overview + 2.9, CUES.Overview + 4.2, CUES.Overview + 4.7, 1.35, 240, 380], [CUES.Journey + 1.2, CUES.Journey + 1.7, CUES.Journey + 2.6, CUES.Journey + 3.0, 1.3, 700, 500], [CUES.Funnel + 1.6, CUES.Funnel + 2.0, CUES.Funnel + 2.6, CUES.Funnel + 2.9, 1.4, 250, 640], [CUES.Apps + 1.9, CUES.Apps + 2.2, CUES.Apps + 3.7, CUES.Apps + 3.95, 1.25, 420, 520]];
  let s = 1, ox = 800, oy = 450;
  for (const [a, b, c, d, S, x, y] of beats) if (T >= a - 0.01 && T <= d + 0.01) { const k = tw(T, a, b, 0, 1) - tw(T, c, d, 0, 1); s = 1 + (S - 1) * k; ox = x; oy = y; }
  const sc = 0.98;
  return <div data-screen-label={`t=${Math.floor(T)}s`} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
    <BG />
    <div style={{ position: 'absolute', left: 176, top: 150, width: 1600, height: 900, transformOrigin: '0 0', transform: `translateY(${enter * 1000 + exit * 1100}px) scale(${sc})`, opacity: 1 - exit * 0.3 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden', boxShadow: '0 50px 120px rgba(8,4,28,.6), 0 0 0 1px rgba(255,255,255,.08)' }}>
        <div style={{ position: 'absolute', inset: 0, transformOrigin: `${ox}px ${oy}px`, transform: `scale(${s})` }}>
          <Shot from={0} to={CUES.Overview}><LoginScreen /></Shot>
          <Shot from={CUES.Overview} to={CUES.Alert}><OverviewScreen /></Shot>
          <Shot from={CUES.Alert} to={CUES.Booking}><AlertScreen /></Shot>
          <Shot from={CUES.Booking} to={CUES.Journey}><BookingScreen /></Shot>
          <Shot from={CUES.Journey} to={CUES.Apps}><JourneyScreen /></Shot>
          <Shot from={CUES.Apps} to={CUES.Funnel}><AppsScreen /></Shot>
          <Shot from={CUES.Funnel} to={CUES.Refund}><FunnelScreen /></Shot>
          <Shot from={CUES.Refund} to={CUES.Payout}><RefundScreen /></Shot>
          <Shot from={CUES.Payout} to={CUES.Report}><PayoutScreen /></Shot>
          <Shot from={CUES.Report}><ReportScreen /></Shot>
        </div>
      </div>
    </div>
    <Headline />
    <Brand />
  </div>;
}
function WabAdminAd() {
  const [tk, setTweak] = useTweaks(window.TWEAK_DEFAULTS || { motionEditor: true });
  return <div style={{ position: 'fixed', inset: 0, background: '#0b0b12' }}>
    <CompositionStage width={1920} height={1080} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg="#14172B"><Piece /></CompositionStage>
    <TweaksPanel><TweakSection label="Timeline" /><TweakToggle label="Motion editor" value={tk.motionEditor} onChange={v => setTweak('motionEditor', v)} /></TweaksPanel>
  </div>;
}
window.WabAdminAd = WabAdminAd;
