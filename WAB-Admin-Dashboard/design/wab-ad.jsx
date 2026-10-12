// WAB Customer App — 9:16 promo ad. All motion keyed to T / CUES.
const GRAD = 'linear-gradient(135deg,#6D28D9,#A855F7)';
const AR = "'IBM Plex Sans Arabic','Poppins',sans-serif";
const SERIF = "'Playfair Display','IBM Plex Sans Arabic',serif";
const INK = '#1F2233', MUTED = '#6B7280', FAINT = '#9CA3AF', LINE = '#EEEAF4', SURF = '#F8F7FB', SOFT = '#F3EEFB', ACC = '#6D28D9', GREEN = '#2E9E78', ROSE = '#D9467A';
const M = { enter: Easing.easeOutCubic, pop: Easing.easeOutBack, glide: Easing.easeInOutCubic };
const tw = (T, s, e, a, b, ease) => animate({ from: a, to: b, start: s, end: e, ease: ease || M.glide })(T);
const A = (x, y, w, h, o) => Object.assign({ position: 'absolute', left: x, top: y, width: w, height: h }, o || {});
const SAL_G = ['linear-gradient(135deg,#F5D0FE,#A855F7)', 'linear-gradient(135deg,#FBCFE8,#C084FC)', 'linear-gradient(135deg,#DDD6FE,#6D28D9)', 'linear-gradient(135deg,#FCE7F3,#D8B4FE)'];

function Star({ size = 12, fill = '#F59E0B' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="#F59E0B" strokeWidth="1.5"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" /></svg>;
}

function Tap({ at, x, y }) {
  const { T } = useComposition();
  const d = T - at;
  if (d < -0.4 || d > 0.6) return null;
  const dotO = d < 0 ? tw(d, -0.4, -0.2, 0, 1, M.enter) : tw(d, 0.15, 0.45, 1, 0, M.enter);
  const press = d < 0 ? 1 : tw(d, 0, 0.08, 1, 0.82, M.enter) * 0 + tw(d, 0.08, 0.25, 0.82, 1, M.enter);
  const ringS = tw(d, 0, 0.5, 0.3, 1.9, M.enter), ringO = d < 0 ? 0 : tw(d, 0, 0.5, 0.7, 0, M.enter);
  return (
    <div style={A(x - 24, y - 24, 48, 48, { pointerEvents: 'none', zIndex: 60 })}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #A855F7', transform: `scale(${ringS})`, opacity: ringO }} />
      <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', background: 'rgba(109,40,217,.28)', border: '2px solid rgba(255,255,255,.9)', boxShadow: '0 4px 14px rgba(109,40,217,.35)', transform: `scale(${press})`, opacity: dotO }} />
    </div>
  );
}

function StatusBar() {
  return (
    <div style={A(0, 0, 390, 50, { zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', boxSizing: 'border-box', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15, color: INK, direction: 'ltr' })}>
      <span>9:41</span>
      <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <span style={{ width: 17, height: 11, borderRadius: 2, background: 'linear-gradient(90deg,#1F2233 70%,transparent 70%)', border: '1.5px solid #1F2233', boxSizing: 'border-box' }} />
        <span style={{ width: 24, height: 12, borderRadius: 3.5, border: '1.5px solid #1F2233', boxSizing: 'border-box', padding: 1.5 }}><span style={{ display: 'block', width: '80%', height: '100%', borderRadius: 1.5, background: INK }} /></span>
      </span>
    </div>
  );
}

function Phone({ children }) {
  return (
    <div style={A(0, 0, 414, 868, { borderRadius: 64, background: '#0B0B12', padding: 12, boxSizing: 'border-box', boxShadow: '0 70px 140px rgba(8,4,28,.6), inset 0 0 0 2px rgba(255,255,255,.1)' })}>
      <div style={{ position: 'relative', width: 390, height: 844, borderRadius: 52, overflow: 'hidden', background: '#fff' }}>
        {children}
        <StatusBar />
        <div style={A(133, 11, 124, 36, { borderRadius: 20, background: '#000', zIndex: 55 })} />
        <div style={A(126, 830, 138, 5, { borderRadius: 3, background: 'rgba(0,0,0,.25)', zIndex: 55 })} />
      </div>
    </div>
  );
}

function Screen({ children, style }) {
  return <div dir="rtl" style={Object.assign({ position: 'absolute', inset: 0, fontFamily: AR, color: INK, background: '#fff', overflow: 'hidden' }, style)}>{children}</div>;
}

function TopBar({ title, sub }) {
  return (
    <div style={A(0, 50, 390, 54, { display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', zIndex: 5, background: '#fff' })}>
      <svg style={{ position: 'absolute', right: 18, top: 16 }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
      <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
      {sub && <div style={{ fontSize: 11.5, color: MUTED }}>{sub}</div>}
    </div>
  );
}

function BottomNav() {
  const items = [['الرئيسية', 'M4 11.5 12 4l8 7.5M6 10v9.5h12V10', 1], ['المفضلة', 'M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z'], ['الحجوزات', 'M5 6h14v14H5zM5 10.5h14M9 3.5v4M15 3.5v4'], ['الملف الشخصي', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0']];
  return (
    <div style={A(0, 776, 390, 68, { display: 'flex', borderTop: `1px solid ${LINE}`, background: '#fff', zIndex: 6 })}>
      {items.map(([l, d, on]) => (
        <div key={l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, paddingTop: 8, fontSize: 10.5, fontWeight: on ? 700 : 500, color: on ? ACC : FAINT }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>{l}
        </div>
      ))}
    </div>
  );
}

function StepHeader({ step, label, T0, T }) {
  return (
    <React.Fragment>
      <TopBar title="حجز موعد" sub="بيلا هاوس" />
      <div style={A(20, 110, 350, 4, { display: 'flex', gap: 5 })}>
        {[0, 1, 2, 3, 4, 5].map(i => {
          const fill = clamp(step - i, 0, 1);
          return <div key={i} style={{ flex: 1, borderRadius: 2, background: LINE, overflow: 'hidden' }}><div style={{ width: fill * 100 + '%', height: '100%', background: GRAD, marginInlineStart: 'auto' }} /></div>;
        })}
      </div>
      <div style={A(20, 122, 350, 20, { fontSize: 12, fontWeight: 700, color: ACC, textAlign: 'right' })}>{label}</div>
    </React.Fragment>
  );
}

function SalonCard({ right, top, s, i, opacity = 1 }) {
  return (
    <div style={{ position: 'absolute', right, top, width: 220, height: 226, borderRadius: 20, background: '#fff', border: `1px solid ${LINE}`, overflow: 'hidden', boxShadow: '0 8px 20px rgba(31,34,51,.06)', opacity }}>
      <div style={{ height: 112, background: SAL_G[i % 4], position: 'relative' }}>
        <div style={{ position: 'absolute', left: -20, bottom: -30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
        <div style={{ position: 'absolute', right: 14, bottom: 12, fontFamily: SERIF, fontSize: 34, fontWeight: 700, color: 'rgba(255,255,255,.95)' }}>{s[4]}</div>
        <div style={{ position: 'absolute', left: 10, top: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.94)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ROSE} strokeWidth="2"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" /></svg></div>
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{s[0]}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700 }}><Star />{s[2]}<span style={{ color: FAINT, fontWeight: 500 }}>({s[3]})</span></div>
        </div>
        <div style={{ fontSize: 11.5, color: MUTED }}>عمّان، {s[1]}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: GREEN }}><span style={{ width: 6, height: 6, borderRadius: 3, background: GREEN }} />مفتوح · 10:00 ص – 8:00 م</div>
      </div>
    </div>
  );
}

const WOMEN = [['بيلا هاوس', 'عبدون', '4.9', 268, 'B'], ['روز آند آيفوري', 'الجاردنز', '4.8', 190, 'R'], ['صالون أمارا', 'خلدا', '4.9', 121, 'A'], ['لومير بيوتي', 'الصويفية', '4.6', 88, 'L']];
const MEN = [['صالون النخبة', 'عبدون', '4.9', 214, 'E'], ['ذا جنتري', 'الجاردنز', '4.8', 176, 'G'], ['حلاق رويال', 'خلدا', '4.6', 98, 'R'], ['بليد آند فيد', 'أم أذينة', '4.7', 132, 'B']];

function HomeScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Discover;
  const menOn = t >= 3.0 && t < 5.2;
  const hl = t < 3.0 ? tw(t, 2.6, 3.0, 175, 175) : t < 5.2 ? tw(t, 3.0, 3.35, 175, 5) : tw(t, 5.2, 5.55, 5, 175);
  const womenO = t < 3.0 ? 1 : t < 5.2 ? tw(t, 3.0, 3.25, 1, 0) : tw(t, 5.2, 5.5, 0, 1);
  const scroll = tw(t, 1.0, 2.6, 0, 150) + tw(t, 3.4, 4.8, 0, 90) - tw(t, 5.4, 6.2, 0, 240);
  const b2 = tw(t, 3.6, 4.1, 0, 1);
  return (
    <Screen>
      <div style={A(20, 56, 350, 50)}>
        <div style={{ fontSize: 12.5, color: MUTED }}>ماذا تودّ أن تحجز اليوم؟</div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 22 }}>مرحباً، ليلى</div>
      </div>
      <div style={A(20, 58, 44, 44, { borderRadius: '50%', background: SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="1.8"><path d="M12 3a5.5 5.5 0 0 0-5.5 5.5c0 3.6-1.1 5-2 6.5h15c-.9-1.5-2-2.9-2-6.5A5.5 5.5 0 0 0 12 3zM9.5 19a2.5 2.5 0 0 0 5 0" /></svg>
        <div style={A(28, -3, 20, 20, { borderRadius: 10, background: ROSE, color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' })}>3</div>
      </div>
      <div style={A(20, 118, 350, 150, { borderRadius: 22, overflow: 'hidden', background: GRAD, boxShadow: '0 12px 28px rgba(109,40,217,.25)' })}>
        <div style={A(-40, -30, 180, 180, { borderRadius: '50%', background: 'rgba(255,255,255,.12)' })} />
        <div style={A(50, 80, 120, 120, { borderRadius: '50%', background: 'rgba(255,255,255,.1)' })} />
        {[['خصم 20% على أول حجز', 'للعملاء الجدد فقط', 1 - b2], ['باقات العرائس الجديدة', 'احجزي موعدك مبكراً', b2]].map(([h, s, o]) => (
          <div key={h} style={{ position: 'absolute', right: 22, top: 44, opacity: o, transform: `translateY(${(1 - o) * 10}px)` }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 19, maxWidth: 200, lineHeight: 1.35 }}>{h}</div>
            <div style={{ color: '#E9D5FF', fontSize: 12.5, marginTop: 4 }}>{s}</div>
          </div>
        ))}
        <div style={A(0, 134, 350, 6, { display: 'flex', justifyContent: 'center', gap: 5 })}>
          {[1 - b2, b2, 0].map((a, i) => <div key={i} style={{ width: 6 + a * 12, height: 6, borderRadius: 3, background: a > .5 ? '#fff' : 'rgba(255,255,255,.5)' }} />)}
        </div>
      </div>
      <div style={A(20, 284, 350, 48, { borderRadius: 14, background: SURF, border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', boxSizing: 'border-box', fontSize: 13, color: FAINT })}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.5-4.5" /></svg>ابحث عن اسم الصالون، الخدمة أو الفئة
      </div>
      <div style={A(20, 346, 350, 48, { borderRadius: 16, background: SURF })}>
        <div style={A(hl, 5, 170, 38, { borderRadius: 12, background: GRAD, boxShadow: '0 6px 16px rgba(109,40,217,.25)' })} />
        <div style={A(175, 5, 170, 38, { display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, color: menOn ? MUTED : '#fff' })}>نساء</div>
        <div style={A(5, 5, 170, 38, { display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, color: menOn ? '#fff' : MUTED })}>رجال</div>
      </div>
      <div style={A(20, 416, 350, 24, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 17 }}>صالونات موصى بها</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: ACC }}>عرض الكل</div>
      </div>
      {WOMEN.map((s, i) => <SalonCard key={'w' + i} right={20 + i * 232 - scroll} top={452} s={s} i={i} opacity={womenO} />)}
      {MEN.map((s, i) => <SalonCard key={'m' + i} right={20 + i * 232 - scroll} top={452} s={s} i={i + 2} opacity={1 - womenO} />)}
      <div style={A(20, 696, 350, 24, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 17 }}>الأقرب إليك</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: ACC }}>عرض الكل</div>
      </div>
      {[0, 1].map(i => <div key={i} style={{ position: 'absolute', right: 20 + i * 232, top: 732, width: 220, height: 80, borderRadius: '20px 20px 0 0', background: SAL_G[(i + 1) % 4] }} />)}
      <BottomNav />
      <Tap at={CUES.Discover + 3.0} x={90} y={370} />
      <Tap at={CUES.Discover + 5.2} x={260} y={370} />
      <Tap at={CUES.Discover + 6.5} x={195} y={308} />
    </Screen>
  );
}

const FCHIPS = ['تسريحة شعر', 'مكياج', 'مكياج عروس', 'مناكير', 'صبغة شعر', 'تنظيف بشرة', 'رموش', 'حواجب', 'بروتين'];
function FilterScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Filter;
  const typed = 'بيلا'.slice(0, Math.floor(clamp(tw(t, 0.3, 1.1, 0, 4.99, Easing.linear), 0, 4.99)));
  const sheetY = t < 3 ? tw(t, 1.55, 2.0, 844, 110, M.enter) : tw(t, 4.55, 4.95, 110, 844, M.glide);
  const sel = [t >= 2.3, t >= 2.7];
  const priceO = tw(t, 2.8, 3.1, 0, 1, M.enter);
  const maxP = tw(t, 3.1, 3.7, 60, 35);
  const pct = v => (v - 5) / 55;
  const rate = t >= 3.95;
  return (
    <Screen>
      <TopBar title="جميع الصالونات" />
      <div style={A(80, 112, 290, 48, { borderRadius: 14, border: `1.5px solid ${t > 0.2 && t < 1.4 ? '#A855F7' : LINE}`, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', boxSizing: 'border-box', fontSize: 14 })}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={FAINT} strokeWidth="2"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.5-4.5" /></svg>
        <span>{typed}</span>{t > 0.2 && t < 1.4 && <span style={{ width: 2, height: 20, background: ACC, opacity: Math.floor(t * 3) % 2 ? 1 : 0.2 }} />}
      </div>
      <div style={A(20, 112, 48, 48, { borderRadius: 14, background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
      </div>
      {WOMEN.slice(0, 4).map((s, i) => {
        const o = t < 1.1 ? 1 : i === 0 ? 1 : tw(t, 1.1, 1.3, 1, 0.25);
        return (
          <div key={i} style={A(20, 178 + i * 112, 350, 100, { borderRadius: 18, border: `1px solid ${LINE}`, display: 'flex', gap: 12, padding: 10, boxSizing: 'border-box', opacity: o })}>
            <div style={{ width: 80, height: 80, borderRadius: 14, background: SAL_G[i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 30, color: '#fff', fontWeight: 700 }}>{s[4]}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{s[0]}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700 }}><Star />{s[2]}<span style={{ color: FAINT, fontWeight: 500 }}>({s[3]})</span></div>
              <div style={{ fontSize: 12, color: MUTED }}>عمّان، {s[1]}</div>
            </div>
          </div>
        );
      })}
      <div style={A(0, 0, 390, 844, { background: 'rgba(10,8,20,.4)', opacity: clamp((844 - sheetY) / 734, 0, 1), zIndex: 8 })} />
      <div style={A(0, sheetY, 390, 734, { background: '#fff', borderRadius: '26px 26px 0 0', zIndex: 9, boxShadow: '0 -10px 30px rgba(0,0,0,.12)' })}>
        <div style={A(20, 16, 350, 30, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
          <span style={{ fontSize: 18 }}>✕</span><span style={{ fontWeight: 700, fontSize: 16 }}>فلتر</span><span style={{ fontSize: 13.5, fontWeight: 600, color: sel[0] ? ACC : FAINT }}>إعادة تعيين</span>
        </div>
        <div style={A(20, 64, 350, 22, { fontWeight: 700, fontSize: 15 })}>الخدمات</div>
        {FCHIPS.map((c, i) => {
          const on = i < 2 && sel[i];
          return <div key={c} style={{ position: 'absolute', right: 20 + (i % 3) * 116, top: 96 + Math.floor(i / 3) * 46, width: 108, height: 38, borderRadius: 19, border: `1.5px solid ${on ? '#A855F7' : LINE}`, background: on ? SOFT : '#fff', color: on ? ACC : INK, fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c}</div>;
        })}
        <div style={A(20, 250, 350, 70, { opacity: priceO, transform: `translateY(${(1 - priceO) * 12}px)` })}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 700, fontSize: 15 }}>نطاق السعر</span><span style={{ fontWeight: 700, fontSize: 13, color: ACC }}>10 – {Math.round(maxP)} د.أ</span></div>
          <div style={A(10, 44, 330, 4, { borderRadius: 2, background: LINE })} />
          <div style={{ position: 'absolute', top: 44, height: 4, borderRadius: 2, background: GRAD, right: 10 + pct(10) * 330, width: (pct(maxP) - pct(10)) * 330 }} />
          {[10, maxP].map((v, i) => <div key={i} style={{ position: 'absolute', top: 35, right: 10 + pct(v) * 330 - 11, width: 22, height: 22, borderRadius: 11, background: '#fff', border: '3px solid #A855F7', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(109,40,217,.3)' }} />)}
        </div>
        <div style={A(20, 340, 350, 22, { fontWeight: 700, fontSize: 15 })}>التقييم</div>
        {[1, 2, 3, 4, 5].map((n, i) => {
          const on = n === 4 && rate;
          return <div key={n} style={{ position: 'absolute', right: 20 + i * 70, top: 372, width: 62, height: 38, borderRadius: 19, border: `1.5px solid ${on ? '#A855F7' : LINE}`, background: on ? SOFT : '#fff', color: on ? ACC : INK, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>{n}<Star size={11} /></div>;
        })}
        <div style={A(20, 632, 350, 54, { borderRadius: 14, background: GRAD, color: '#fff', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 24px rgba(109,40,217,.3)' })}>تطبيق الفلتر</div>
      </div>
      <Tap at={CUES.Filter + 1.4} x={44} y={136} />
      <Tap at={CUES.Filter + 2.3} x={316} y={225} />
      <Tap at={CUES.Filter + 2.7} x={200} y={225} />
      <Tap at={CUES.Filter + 3.1} x={260} y={406} />
      <Tap at={CUES.Filter + 3.95} x={129} y={501} />
      <Tap at={CUES.Filter + 4.5} x={195} y={769} />
    </Screen>
  );
}

const STAFF = [['رنا', 'ر'], ['دانة', 'د'], ['لين', 'ل'], ['هبة', 'ه'], ['سلمى', 'س']];
function SalonScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Salon;
  const sy = tw(t, 4.2, 5.4, 0, -330);
  const heroS = tw(t, 0, 7, 1.08, 1, Easing.linear);
  return (
    <Screen>
      <TopBar title="بيلا هاوس" />
      <div style={A(20, 60, 60, 30, { display: 'flex', gap: 14, zIndex: 6 })}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.8"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5V20h14v-7.5" /></svg>
        <svg width="20" height="20" viewBox="0 0 24 24" fill={t > 1 ? ROSE : 'none'} stroke={ROSE} strokeWidth="1.9"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" /></svg>
      </div>
      <div style={A(0, 104, 390, 662, { overflow: 'hidden' })}>
        <div style={A(0, sy, 390, 1100)}>
          <div style={A(20, 6, 350, 170, { borderRadius: 22, overflow: 'hidden' })}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#FBCFE8 0%,#D8B4FE 50%,#8B5CF6 100%)', transform: `scale(${heroS})` }} />
            <div style={A(-30, -40, 180, 180, { borderRadius: '50%', background: 'rgba(255,255,255,.2)' })} />
            <div style={A(220, 70, 150, 150, { borderRadius: '50%', background: 'rgba(255,255,255,.14)' })} />
          </div>
          <div style={A(149, 128, 92, 92, { borderRadius: '50%', background: GRAD, border: '4px solid #fff', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 40, fontWeight: 700, color: '#fff', boxShadow: '0 8px 20px rgba(31,34,51,.15)' })}>B</div>
          <div style={A(0, 230, 390, 30, { textAlign: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: 21 })}>بيلا هاوس</div>
          <div style={A(0, 266, 390, 26, { display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' })}>
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: 'rgba(46,158,120,.12)', color: GREEN, whiteSpace: 'nowrap' }}>مفتوح · 10:00 ص – 8:00 م</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12.5, fontWeight: 700 }}><Star size={13} />4.9<span style={{ color: FAINT, fontWeight: 500 }}>(268)</span></span>
          </div>
          <div style={A(0, 300, 390, 20, { textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: ACC })}>عمّان، عبدون، شارع 5</div>
          {['اتصال', 'واتساب'].map((l, i) => <div key={l} style={A(i ? 20 : 201, 334, 169, 46, { borderRadius: 14, border: `1.5px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, color: i ? GREEN : INK })}>{l}</div>)}
          <div style={A(20, 402, 350, 24, { fontFamily: SERIF, fontWeight: 700, fontSize: 17, textAlign: 'right' })}>الطاقم</div>
          {STAFF.map((p, i) => {
            const k = tw(t, 1.2 + i * 0.18, 1.6 + i * 0.18, 0, 1, M.pop);
            return (
              <div key={i} style={{ position: 'absolute', right: 20 + i * 72, top: 436, width: 64, textAlign: 'center', transform: `scale(${k})`, opacity: clamp(k, 0, 1) }}>
                <div style={{ width: 60, height: 60, margin: '0 auto', borderRadius: '50%', background: SAL_G[i % 4], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 22, position: 'relative' }}>{p[1]}<span style={{ position: 'absolute', bottom: 1, left: 1, width: 13, height: 13, borderRadius: 7, border: '2.5px solid #fff', background: i === 2 ? ROSE : GREEN }} /></div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 5 }}>{p[0]}</div>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: i === 2 ? ROSE : GREEN }}>{i === 2 ? 'في إجازة' : 'مداوم اليوم'}</div>
              </div>
            );
          })}
          <div style={A(20, 552, 350, 24, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
            <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 17 }}>التقييمات</span><span style={{ fontSize: 12, color: MUTED }}><b style={{ color: INK }}>4.9 من 5</b> · 268 تقييم</span>
          </div>
          <div style={A(20, 586, 350, 116, { borderRadius: 16, background: SURF, padding: 14, boxSizing: 'border-box' })}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 13.5 }}>رهف ع.</b><span style={{ fontSize: 11, color: FAINT }}>قبل يومين</span></div>
            <div style={{ display: 'flex', gap: 2, margin: '6px 0' }}>{[0, 1, 2, 3, 4].map(i => <Star key={i} size={14} fill={t > 2.6 + i * 0.15 ? '#F59E0B' : 'none'} />)}</div>
            <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>الخبيرة كانت رائعة، المكياج ثابت طوال الحفلة والتعامل راقٍ جداً.</div>
          </div>
          <div style={A(20, 722, 350, 24, { fontFamily: SERIF, fontWeight: 700, fontSize: 17, textAlign: 'right' })}>الخدمات</div>
          {[['تسريحة شعر', '60 دقيقة', 25], ['مكياج سهرة', '60 دقيقة', 35], ['مكياج عروس', '120 دقيقة', 180, 1], ['مناكير وباديكير', '60 دقيقة', 20]].map((x, i) => (
            <div key={i} style={A(20, 756 + i * 64, 350, 60, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${LINE}` })}>
              <div><div style={{ fontWeight: 600, fontSize: 14, display: 'flex', gap: 6, alignItems: 'center' }}>{x[0]}{x[3] && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: GRAD, color: '#fff' }}>VIP</span>}</div><div style={{ fontSize: 12, color: MUTED }}>{x[1]}</div></div>
              <div style={{ fontWeight: 700, color: ACC }}>{x[2]} د.أ</div>
            </div>
          ))}
        </div>
      </div>
      <div style={A(0, 766, 390, 78, { borderTop: `1px solid ${LINE}`, background: '#fff' })}>
        <div style={A(20, 12, 350, 52, { borderRadius: 14, background: GRAD, color: '#fff', fontWeight: 600, fontSize: 15.5, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 24px rgba(109,40,217,.3)' })}>احجز الآن</div>
      </div>
      <Tap at={CUES.Salon + 0.9} x={30} y={76} />
      <Tap at={CUES.Salon + 6.4} x={195} y={804} />
    </Screen>
  );
}

function Check({ on }) {
  return <div style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? GRAD : 'transparent', border: on ? 'none' : `1.5px solid ${FAINT}`, boxSizing: 'border-box' }}>{on && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}</div>;
}
function Radio({ on }) { return <div style={{ width: 20, height: 20, borderRadius: 10, boxSizing: 'border-box', flexShrink: 0, border: on ? `6px solid ${ACC}` : `1.5px solid ${FAINT}` }} />; }

function BookScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Book;
  const phase = t < 2.5 ? 0 : t < 5.5 ? 1 : 2;
  const pA = t < 2.5 ? 0 : tw(t, 2.5, 2.9, 0, 1, M.glide), pB = t < 5.5 ? 0 : tw(t, 5.5, 5.9, 0, 1, M.glide);
  const step = t < 2.5 ? 2 : t < 5.5 ? tw(t, 2.5, 2.9, 2, 3) : tw(t, 5.5, 5.9, 3, 4);
  const labels = ['الخطوة 2 من 6 · الخدمات', 'الخطوة 3 من 6 · الموعد', 'الخطوة 4 من 6 · الموظف'];
  const svc = [['تسريحة شعر', 60, 25], ['مكياج سهرة', 60, 35], ['مناكير وباديكير', 60, 20], ['تنظيف بشرة', 50, 30]];
  const c0 = t >= 0.8, c1 = t >= 1.5;
  const total = Math.round(tw(t, 0.8, 1.1, 0, 25) + tw(t, 1.5, 1.8, 0, 35));
  const day = t >= 3.1, slot = t >= 4.3, staff = t >= 6.3;
  const slots = ['10:00 ص', '10:15 ص', '10:30 ص', '10:45 ص', '11:00 ص', '11:15 ص', '11:30 ص', '11:45 ص'];
  const full = [2, 5];
  const wd = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];
  const px = (k) => ({ opacity: 1 - Math.abs(k), transform: `translateX(${k * -60}px)` });
  return (
    <Screen>
      <StepHeader step={step} label={labels[phase]} />
      <div style={A(0, 150, 390, 616, px(pA))}>
        <div style={A(20, 6, 350, 30, { fontFamily: SERIF, fontWeight: 700, fontSize: 20, textAlign: 'right' })}>اختر الخدمات</div>
        {svc.map((x, i) => {
          const on = (i === 0 && c0) || (i === 1 && c1);
          return (
            <div key={i} style={A(20, 46 + i * 72, 350, 62, { borderRadius: 16, border: `1.5px solid ${on ? '#A855F7' : LINE}`, background: on ? SOFT : '#fff', display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', boxSizing: 'border-box' })}>
              <Check on={on} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{x[0]}</div><div style={{ fontSize: 12, color: MUTED }}>{x[1]} دقيقة</div></div>
              <div style={{ fontWeight: 700, color: ACC }}>{x[2]} د.أ</div>
            </div>
          );
        })}
      </div>
      <div style={A(0, 150, 390, 616, px(pA - 1 + pB))}>
        <div style={A(20, 6, 350, 30, { fontFamily: SERIF, fontWeight: 700, fontSize: 20, textAlign: 'right' })}>اختر التاريخ والوقت</div>
        <div style={A(20, 44, 350, 300, { borderRadius: 20, border: `1px solid ${LINE}` })}>
          <div style={A(0, 14, 350, 22, { textAlign: 'center', fontWeight: 700, fontSize: 15 })}>أكتوبر 2026</div>
          {wd.map((w, c) => <div key={w} style={{ position: 'absolute', right: 12 + c * 46, top: 48, width: 46, textAlign: 'center', fontSize: 11, color: FAINT, fontWeight: 600 }}>{w}</div>)}
          {Array.from({ length: 31 }, (_, i) => {
            const idx = i + 5, c = idx % 7, r = Math.floor(idx / 7), d = i + 1, on = d === 3 && day, fri = c === 6;
            return <div key={d} style={{ position: 'absolute', right: 14 + c * 46, top: 72 + r * 36, width: 42, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: on ? 700 : 500, background: on ? GRAD : fri ? 'rgba(217,70,122,.1)' : 'transparent', color: on ? '#fff' : fri ? '#E28AA9' : INK, transform: on ? `scale(${tw(t, 3.1, 3.4, 0.7, 1, M.pop)})` : 'none' }}>{d}</div>;
          })}
        </div>
        <div style={A(20, 360, 350, 24, { display: 'flex', justifyContent: 'space-between', opacity: day ? 1 : 0 })}><b style={{ fontSize: 15 }}>الأوقات المتاحة</b><span style={{ fontSize: 12, color: MUTED }}>120 دقيقة</span></div>
        {slots.map((s, i) => {
          const k = tw(t, 3.4 + i * 0.07, 3.75 + i * 0.07, 0, 1, M.enter), f = full.includes(i), on = i === 4 && slot;
          return <div key={s} style={{ position: 'absolute', right: 20 + (i % 4) * 90, top: 392 + Math.floor(i / 4) * 50, width: 80, height: 40, borderRadius: 12, border: `1.5px solid ${on ? '#A855F7' : LINE}`, background: on ? GRAD : f ? SURF : '#fff', color: on ? '#fff' : f ? FAINT : INK, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: f ? 'line-through' : 'none', opacity: k, transform: `translateY(${(1 - k) * 10}px)` }}>{f ? 'ممتلئ' : s}</div>;
        })}
      </div>
      <div style={A(0, 150, 390, 616, px(pB - 1))}>
        <div style={A(20, 6, 350, 30, { fontFamily: SERIF, fontWeight: 700, fontSize: 20, textAlign: 'right' })}>اختر الموظف</div>
        <div style={A(20, 36, 350, 20, { fontSize: 12.5, color: MUTED, textAlign: 'right' })}>السبت 3 أكتوبر · 11:00 ص · 120 دقيقة</div>
        {[['أي موظف متاح', 'سيقوم الصالون بتعيين موظف متاح', '+'], ['رنا', 'متاح · ★ 4.9', 'ر'], ['دانة', 'متاح · ★ 4.8', 'د'], ['هبة', 'متاح · ★ 4.8', 'ه'], ['لين', 'في إجازة', 'ل', 1]].map((x, i) => {
          const on = i === 1 && staff;
          return (
            <div key={i} style={A(20, 66 + i * 74, 350, 64, { borderRadius: 16, border: `1.5px solid ${on ? '#A855F7' : LINE}`, background: on ? SOFT : '#fff', display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', boxSizing: 'border-box', opacity: x[3] ? 0.5 : 1 })}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: i ? SAL_G[i % 4] : SOFT, color: i ? '#fff' : ACC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>{x[2]}</div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14.5 }}>{x[0]}</div><div style={{ fontSize: 12, color: x[3] ? ROSE : i ? GREEN : MUTED }}>{x[1]}</div></div>
              <Radio on={on} />
            </div>
          );
        })}
      </div>
      <div style={A(0, 766, 390, 78, { borderTop: `1px solid ${LINE}`, background: '#fff', display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px 14px', boxSizing: 'border-box' })}>
        <div style={{ opacity: phase === 0 ? 1 : 0 }}><div style={{ fontWeight: 700, fontSize: 17, color: ACC }}>{total} د.أ</div><div style={{ fontSize: 11.5, color: MUTED }}>{(c0 ? 60 : 0) + (c1 ? 60 : 0)} دقيقة</div></div>
        <div style={{ flex: 1, height: 52, borderRadius: 14, background: GRAD, color: '#fff', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>متابعة</div>
      </div>
      <Tap at={CUES.Book + 0.8} x={195} y={227} />
      <Tap at={CUES.Book + 1.5} x={195} y={299} />
      <Tap at={CUES.Book + 2.2} x={140} y={792} />
      <Tap at={CUES.Book + 3.1} x={335} y={324} />
      <Tap at={CUES.Book + 4.3} x={330} y={612} />
      <Tap at={CUES.Book + 5.1} x={140} y={792} />
      <Tap at={CUES.Book + 6.3} x={195} y={290} />
      <Tap at={CUES.Book + 7.3} x={140} y={792} />
    </Screen>
  );
}

function BrideScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Bride;
  const on = tw(t, 0.9, 1.15, 0, 1, M.glide);
  const comps = [['ريم', 'ر', 3.0], ['جنى', 'ج', 3.4], ['تالا', 'ت', 3.8]];
  const count = comps.filter(c => t >= c[2]).length;
  return (
    <Screen>
      <StepHeader step={1} label="الخطوة 1 من 6 · الشخص" />
      <div style={A(20, 156, 350, 30, { fontFamily: SERIF, fontWeight: 700, fontSize: 20, textAlign: 'right' })}>لمن هذا الحجز؟</div>
      <div style={A(20, 198, 350, 20, { fontSize: 12.5, fontWeight: 600, color: ACC, textAlign: 'right' })}>الاسم</div>
      <div style={A(20, 222, 350, 52, { borderRadius: 14, border: `1.5px solid ${LINE}`, display: 'flex', alignItems: 'center', padding: '0 14px', boxSizing: 'border-box', fontSize: 15 })}>سارة الحداد</div>
      <div style={A(20, 290, 350, 76, { borderRadius: 18, border: `1.5px solid ${on > .5 ? '#F4A7C4' : LINE}`, background: on > .5 ? 'linear-gradient(135deg,rgba(244,167,196,.16),rgba(168,85,247,.08))' : SURF, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', boxSizing: 'border-box' })}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(244,167,196,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B83268', fontSize: 20 }}>♛</div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14.5 }}>هذا الشخص عروس</div><div style={{ fontSize: 12, color: MUTED }}>تظهر خدمات VIP الخاصة بالعرائس</div></div>
        <div style={{ width: 48, height: 28, borderRadius: 14, padding: 3, boxSizing: 'border-box', background: on > .5 ? GRAD : LINE, position: 'relative' }}><div style={{ position: 'absolute', top: 3, left: 3 + on * 20, width: 22, height: 22, borderRadius: 11, background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,.2)' }} /></div>
      </div>
      {[['مكياج عروس', '120 دقيقة', 180, 1.3], ['باقة العروس الكاملة', '240 دقيقة', 350, 1.6]].map((x, i) => {
        const k = tw(t, x[3], x[3] + 0.45, 0, 1, M.pop);
        return (
          <div key={i} style={A(20, 384 + i * 70, 350, 60, { borderRadius: 16, border: '1.5px solid #D8B4FE', background: 'linear-gradient(135deg,rgba(109,40,217,.07),rgba(244,167,196,.16))', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', boxSizing: 'border-box', opacity: clamp(k, 0, 1), transform: `scale(${0.9 + 0.1 * k})`, boxShadow: `0 0 ${24 * k}px rgba(168,85,247,${0.25 * k})` })}>
            <Check on={i === 0 && t > 2.0} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14, display: 'flex', gap: 6, alignItems: 'center' }}>{x[0]}<span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: GRAD, color: '#fff' }}>للعروس فقط</span></div><div style={{ fontSize: 12, color: MUTED }}>{x[1]}</div></div>
            <div style={{ fontWeight: 700, color: ACC }}>{x[2]} د.أ</div>
          </div>
        );
      })}
      <div style={A(20, 540, 350, 24, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: tw(t, 2.4, 2.7, 0, 1) })}>
        <b style={{ fontSize: 15 }}>الأشخاص في الحجز</b><span style={{ fontSize: 12.5, fontWeight: 700, color: ACC }}>{count} من 5 مرافقين</span>
      </div>
      <div style={{ position: 'absolute', right: 20, top: 578, width: 56, height: 56, borderRadius: 28, background: GRAD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, opacity: tw(t, 2.4, 2.7, 0, 1), border: '3px solid #F4A7C4', boxSizing: 'border-box' }}>س</div>
      {comps.map((c, i) => {
        const k = tw(t, c[2], c[2] + 0.4, 0, 1, M.pop);
        return <div key={i} style={{ position: 'absolute', right: 88 + i * 68, top: 578, width: 56, textAlign: 'center', transform: `scale(${k})`, opacity: clamp(k, 0, 1) }}><div style={{ width: 56, height: 56, borderRadius: 28, background: SAL_G[i + 1], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20 }}>{c[1]}</div><div style={{ fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>{c[0]}</div></div>;
      })}
      <div style={{ position: 'absolute', left: 20, top: 578, width: 56, height: 56, borderRadius: 28, border: '1.5px dashed #A855F7', background: SOFT, color: ACC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, opacity: tw(t, 2.4, 2.7, 0, 1) }}>+</div>
      <div style={A(0, 766, 390, 78, { borderTop: `1px solid ${LINE}`, background: '#fff' })}><div style={A(20, 12, 350, 52, { borderRadius: 14, background: GRAD, color: '#fff', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>متابعة</div></div>
      <Tap at={CUES.Bride + 0.9} x={56} y={328} />
      <Tap at={CUES.Bride + 2.9} x={48} y={606} />
      <Tap at={CUES.Bride + 3.3} x={48} y={606} />
      <Tap at={CUES.Bride + 3.7} x={48} y={606} />
    </Screen>
  );
}

function PayScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Pay;
  const sel = t >= 1.0 ? 1 : -1;
  const otpY = tw(t, 2.15, 2.5, 844, 400, M.enter);
  const digits = '4821';
  return (
    <Screen>
      <StepHeader step={6} label="الخطوة 6 من 6 · الملخص" />
      <div style={A(20, 152, 350, 184, { borderRadius: 18, border: `1px solid ${LINE}`, padding: '12px 16px', boxSizing: 'border-box' })}>
        {[['سارة · عروس', 'مكياج عروس', 180], ['ريم', 'مكياج سهرة', 35], ['جنى', 'مناكير وباديكير', 20], ['تالا', 'تسريحة شعر', 25]].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: i < 3 ? `1px dashed ${LINE}` : 'none' }}><span><b>{r[0]}</b> <span style={{ color: MUTED }}>· {r[1]}</span></span><b>{r[2]} د.أ</b></div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '8px 12px', borderRadius: 12, background: SOFT }}><b>الإجمالي</b><b style={{ fontSize: 18, color: ACC }}>260 د.أ</b></div>
      </div>
      <div style={A(20, 350, 350, 104, { borderRadius: 18, background: SURF, padding: '12px 16px', boxSizing: 'border-box', fontSize: 12.5, color: MUTED, lineHeight: 1.75 })}>
        <b style={{ color: INK, fontSize: 14 }}>قواعد الصالون</b>
        <div>• يمكن الإلغاء حتى 3 ساعات قبل الموعد</div><div>• الحجز بحاجة لموافقة الصالون</div>
      </div>
      <div style={A(20, 470, 350, 22, { fontWeight: 700, fontSize: 15, textAlign: 'right' })}>طريقة الدفع</div>
      {[['الدفع عند الوصول', 'ادفع كامل المبلغ في الصالون'], ['عربون 20% = 52 د.أ', 'ادفع الآن والباقي عند الوصول'], ['الدفع كاملاً', 'ادفع كامل المبلغ أونلاين']].map((o, i) => (
        <div key={i} style={A(20, 502 + i * 70, 350, 60, { borderRadius: 16, border: `1.5px solid ${sel === i ? '#A855F7' : LINE}`, background: sel === i ? SOFT : '#fff', display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', boxSizing: 'border-box' })}>
          <Radio on={sel === i} /><div><div style={{ fontWeight: 700, fontSize: 14 }}>{o[0]}</div><div style={{ fontSize: 12, color: MUTED }}>{o[1]}</div></div>
        </div>
      ))}
      <div style={A(0, 766, 390, 78, { borderTop: `1px solid ${LINE}`, background: '#fff' })}><div style={A(20, 12, 350, 52, { borderRadius: 14, background: GRAD, color: '#fff', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>تأكيد الحجز</div></div>
      <div style={A(0, 0, 390, 844, { background: 'rgba(10,8,20,.4)', opacity: clamp((844 - otpY) / 444, 0, 1), zIndex: 8 })} />
      <div style={A(0, otpY, 390, 444, { background: '#fff', borderRadius: '26px 26px 0 0', zIndex: 9, textAlign: 'center' })}>
        <div style={A(175, 10, 40, 5, { borderRadius: 3, background: LINE })} />
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21, marginTop: 36 }}>تأكيد الحجز</div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>أرسلنا رمزاً إلى <b dir="ltr" style={{ color: INK, unicodeBidi: 'isolate' }}>+962 79 123 4567</b></div>
        <div dir="ltr" style={A(20, 130, 350, 64, { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 })}>
          {[0, 1, 2, 3].map(i => {
            const at = 2.6 + i * 0.3, v = t >= at;
            return <div key={i} style={{ borderRadius: 16, border: `1.5px solid ${v ? '#D8B4FE' : i === Math.min(3, Math.floor(clamp((t - 2.6) / 0.3 + 1, 0, 4))) ? '#A855F7' : LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, fontFamily: 'Poppins,sans-serif', transform: v ? `scale(${tw(t, at, at + 0.2, 0.8, 1, M.pop)})` : 'none' }}>{v ? digits[i] : ''}</div>;
          })}
        </div>
      </div>
      <Tap at={CUES.Pay + 1.0} x={195} y={602} />
      <Tap at={CUES.Pay + 2.0} x={195} y={804} />
    </Screen>
  );
}

function ConfirmScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Confirm;
  const k = tw(t, 0.2, 0.7, 0, 1, M.pop);
  const txt = tw(t, 0.6, 1.0, 0, 1, M.enter);
  const ny = tw(t, 1.8, 2.3, -130, 56, M.pop);
  return (
    <Screen style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 28px' }}>
      <div style={{ width: 140, height: 140, borderRadius: 70, background: 'radial-gradient(circle,rgba(168,85,247,.22),transparent 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 88, height: 88, borderRadius: 44, background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${k})`, boxShadow: '0 14px 34px rgba(109,40,217,.35)' }}><svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6"><path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="24" strokeDashoffset={24 * (1 - tw(t, 0.45, 0.85, 0, 1, M.enter))} /></svg></div>
      </div>
      <div style={{ opacity: txt, transform: `translateY(${(1 - txt) * 14}px)` }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 22, margin: '12px 0 8px' }}>تم إرسال طلب الحجز</div>
        <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, marginBottom: 22 }}>بانتظار موافقة الصالون، وسنرسل لك إشعاراً فور الموافقة.</div>
        <div style={{ display: 'inline-flex', gap: 12, alignItems: 'center', padding: '12px 16px', borderRadius: 16, background: SURF, border: `1px dashed ${LINE}` }}><div style={{ textAlign: 'right' }}><div style={{ fontSize: 11.5, color: MUTED }}>رقم المرجع</div><div dir="ltr" style={{ fontWeight: 700, fontSize: 17, letterSpacing: 1, fontFamily: 'Poppins,sans-serif' }}>WAB-26-48213</div></div><div style={{ padding: '8px 14px', borderRadius: 10, background: SOFT, color: ACC, fontWeight: 600, fontSize: 12.5 }}>نسخ</div></div>
      </div>
      <div style={A(12, ny, 366, 84, { borderRadius: 24, background: 'rgba(250,250,252,.96)', boxShadow: '0 16px 40px rgba(31,34,51,.2)', display: 'flex', gap: 12, alignItems: 'center', padding: '0 14px', boxSizing: 'border-box', textAlign: 'right', zIndex: 20 })}>
        <img src="assets/wab-app-icon.png" style={{ width: 44, height: 44, borderRadius: 11, objectFit: 'cover' }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: MUTED }}><b style={{ color: INK }}>WAB</b><span>الآن</span></div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>تمت الموافقة على حجزك ✓</div>
          <div style={{ fontSize: 12, color: MUTED }}>بيلا هاوس · السبت 3 أكتوبر، 11:00 ص</div>
        </div>
      </div>
    </Screen>
  );
}

function Background() {
  const { T } = useComposition();
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(165deg,#14172B 0%,#1B1030 50%,#2A1450 100%)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 900, height: 900, borderRadius: '50%', left: -300 + Math.sin(T * 0.25) * 120, top: -200 + Math.cos(T * 0.2) * 80, background: 'radial-gradient(circle,rgba(168,85,247,.35),transparent 65%)' }} />
      <div style={{ position: 'absolute', width: 1000, height: 1000, borderRadius: '50%', left: 400 + Math.cos(T * 0.22) * 140, top: 1100 + Math.sin(T * 0.18) * 100, background: 'radial-gradient(circle,rgba(244,167,196,.22),transparent 65%)' }} />
    </div>
  );
}

function Brand() {
  const { T, CUES, authoredTotal } = useComposition();
  const toTop = tw(T, CUES.Open + 3.0, CUES.Open + 3.9, 0, 1, M.glide) - tw(T, CUES.Close + 0.3, CUES.Close + 1.2, 0, 1, M.glide);
  const pop = tw(T, 0.1, 0.8, 0, 1, M.pop);
  const fade = tw(T, authoredTotal - 0.7, authoredTotal - 0.05, 1, 0, M.glide);
  const size = 280 - 176 * toTop, cy = 800 - 680 * toTop;
  const wordO = (tw(T, 0.7, 1.2, 0, 1, M.enter) - tw(T, CUES.Open + 2.8, CUES.Open + 3.2, 0, 1)) + tw(T, CUES.Close + 0.9, CUES.Close + 1.4, 0, 1, M.enter);
  const tag1 = tw(T, 1.4, 1.9, 0, 1, M.enter) - tw(T, CUES.Open + 2.8, CUES.Open + 3.2, 0, 1);
  const cl = (d) => tw(T, CUES.Close + d, CUES.Close + d + 0.5, 0, 1, M.enter);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fade, fontFamily: AR }}>
      <div style={{ position: 'absolute', left: 540 - size / 2, top: cy - size / 2, width: size, height: size, borderRadius: size * 0.24, overflow: 'hidden', transform: `scale(${pop})`, opacity: clamp(pop, 0, 1), boxShadow: `0 ${size * 0.12}px ${size * 0.3}px rgba(109,40,217,.45)` }}>
        <img src="assets/wab-app-icon.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 990, textAlign: 'center', opacity: clamp(wordO, 0, 1), transform: `translateY(${(1 - clamp(wordO, 0, 1)) * 30}px)` }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 130, color: '#fff', letterSpacing: 6, lineHeight: 1 }}>WAB</div>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 30, letterSpacing: 10, color: '#C9AEF7', marginTop: 18 }}>WEDDING &amp; BEAUTY</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1250, textAlign: 'center', fontSize: 50, fontWeight: 600, color: '#fff', opacity: clamp(tag1, 0, 1), transform: `translateY(${(1 - clamp(tag1, 0, 1)) * 20}px)` }}>صالونات الأردن في تطبيق واحد</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1250, textAlign: 'center', opacity: cl(1.3), transform: `translateY(${(1 - cl(1.3)) * 20}px)` }}>
        <div style={{ fontSize: 58, fontWeight: 700, color: '#fff' }}>جمالك يبدأ بموعد</div>
      </div>
      <div style={{ position: 'absolute', left: 190, right: 190, top: 1400, height: 120, borderRadius: 60, background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46, fontWeight: 700, color: '#fff', boxShadow: '0 24px 60px rgba(109,40,217,.5)', opacity: cl(1.7), transform: `scale(${0.85 + 0.15 * tw(T, CUES.Close + 1.7, CUES.Close + 2.2, 0, 1, M.pop)})` }}>حمّل التطبيق الآن</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1580, display: 'flex', justifyContent: 'center', gap: 28, opacity: cl(2.1) }}>
        {['App Store', 'Google Play'].map(s => <div key={s} style={{ height: 96, padding: '0 40px', borderRadius: 24, border: '2px solid rgba(255,255,255,.35)', display: 'flex', alignItems: 'center', fontFamily: 'Poppins,sans-serif', fontSize: 34, fontWeight: 600, color: '#fff' }}>{s}</div>)}
      </div>
    </div>
  );
}

function Headline() {
  const { CUES } = useComposition();
  const H = (h, s) => (
    <div>
      <div style={{ fontSize: 84, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{h}</div>
      <div style={{ fontSize: 42, fontWeight: 500, color: '#D8B4FE', marginTop: 14 }}>{s}</div>
    </div>
  );
  return <Captions style={{ top: 230, bottom: 'auto', left: '5%', right: '5%', font: 'inherit', fontFamily: AR, direction: 'rtl', textShadow: 'none' }} items={[
    { at: CUES.Discover - 0.2, until: CUES.Filter - 0.15, text: H('اكتشف أفضل الصالونات', 'رجالية ونسائية في جميع أنحاء الأردن') },
    { at: CUES.Filter, until: CUES.Salon - 0.15, text: H('ابحث وفلتر بذكاء', 'حسب الخدمة والسعر والتقييم') },
    { at: CUES.Salon, until: CUES.Book - 0.15, text: H('كل التفاصيل قبل الحجز', 'الطاقم، التقييمات والخدمات') },
    { at: CUES.Book, until: CUES.Bride - 0.15, text: H('احجز في ثوانٍ', 'الخدمة ← الموعد ← الموظف') },
    { at: CUES.Bride, until: CUES.Pay - 0.15, text: H('ليلتك الأجمل', 'باقات VIP للعرائس ومرافقين حتى 5') },
    { at: CUES.Pay, until: CUES.Confirm - 0.15, text: H('ادفع كما يناسبك', 'عند الوصول، عربون، أو كاملاً') },
    { at: CUES.Confirm, until: CUES.Close, text: H('تأكيد فوري', 'تابع حجزك بالإشعارات لحظة بلحظة') },
  ]} />;
}

function Piece() {
  const { T, CUES } = useComposition();
  const secs = Math.floor(T);
  const enterY = tw(T, CUES.Open + 3.1, CUES.Open + 4.2, 1500, 0, M.enter) + tw(T, CUES.Close, CUES.Close + 0.9, 0, 1600, Easing.easeInCubic);
  const float = Math.sin(T * 0.9) * 6;
  const beats = [
    [CUES.Salon + 1.0, CUES.Salon + 1.7, CUES.Salon + 3.5, CUES.Salon + 4.1, 1.2, 195, 560, 0],
    [CUES.Book + 3.3, CUES.Book + 3.9, CUES.Book + 4.8, CUES.Book + 5.3, 1.16, 195, 600, 0],
    [CUES.Confirm + 1.6, CUES.Confirm + 2.2, CUES.Confirm + 3.4, CUES.Confirm + 3.9, 1.12, 195, 100, 60],
  ];
  let s = 1, ox = 195, oy = 422, ty = 0;
  for (const [a, b, c, d, S, x, y, dy] of beats) {
    if (T >= a - 0.01 && T <= d + 0.01) { const k = tw(T, a, b, 0, 1, M.glide) - tw(T, c, d, 0, 1, M.glide); s = 1 + (S - 1) * k; ox = x; oy = y; ty = dy * k; }
  }
  return (
    <div data-screen-label={`t=${secs}s`} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Background />
      <div style={{ position: 'absolute', left: 219, top: 590, width: 414, height: 868, transformOrigin: '0 0', transform: `translateY(${enterY + float}px) scale(1.55)` }}>
        <div style={{ position: 'absolute', inset: 0, transformOrigin: `${ox + 12}px ${oy + 12}px`, transform: `translateY(${ty / 1.55}px) scale(${s})` }}>
          <Phone>
            <Shot from={0} to={CUES.Filter}><HomeScreen /></Shot>
            <Shot from={CUES.Filter} to={CUES.Salon}><FilterScreen /></Shot>
            <Shot from={CUES.Salon} to={CUES.Book}><SalonScreen /></Shot>
            <Shot from={CUES.Book} to={CUES.Bride}><BookScreen /></Shot>
            <Shot from={CUES.Bride} to={CUES.Pay}><BrideScreen /></Shot>
            <Shot from={CUES.Pay} to={CUES.Confirm}><PayScreen /></Shot>
            <Shot from={CUES.Confirm}><ConfirmScreen /></Shot>
          </Phone>
        </div>
      </div>
      <Headline />
      <Brand />
    </div>
  );
}

function WabAd() {
  const [tk, setTweak] = useTweaks(window.TWEAK_DEFAULTS || { motionEditor: true });
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b0b12' }}>
      <CompositionStage width={1080} height={1920} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg="#14172B">
        <Piece />
      </CompositionStage>
      <TweaksPanel>
        <TweakSection label="Timeline" />
        <TweakToggle label="Motion editor" value={tk.motionEditor} onChange={v => setTweak('motionEditor', v)} />
      </TweaksPanel>
    </div>
  );
}
window.WabAd = WabAd;
