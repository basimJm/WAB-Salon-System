const MICON = (window.__resources && window.__resources.wabIcon) || 'assets/wab-app-icon.png';
// WAB Business (Merchant) — 9:16 Arabic promo. All motion keyed to T / CUES.
const MG = 'linear-gradient(135deg,#6D28D9,#A855F7)';
const MBR = 'linear-gradient(135deg,#B83268,#D9467A)';
const MAR = "'IBM Plex Sans Arabic','Poppins',sans-serif";
const MSERIF = "'Playfair Display','IBM Plex Sans Arabic',serif";
const K = { ink: '#1F2233', muted: '#6B7280', faint: '#9CA3AF', line: '#EEEAF4', surf: '#F8F7FB', soft: '#F3EEFB', acc: '#6D28D9', green: '#2E9E78', rose: '#D9467A', amber: '#B7791F' };
const ME = { enter: Easing.easeOutCubic, pop: Easing.easeOutBack, glide: Easing.easeInOutCubic };
const mt = (T, s, e, a, b, ease) => animate({ from: a, to: b, start: s, end: e, ease: ease || ME.glide })(T);
const MA = (x, y, w, h, o) => Object.assign({ position: 'absolute', left: x, top: y, width: w, height: h }, o || {});
const Crown = ({ s = 12, c = '#fff' }) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg>;
const Tick = ({ s = 14, c = '#fff', w = 3, p = 1 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w}><path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="24" strokeDashoffset={24 * (1 - p)} /></svg>;

function MTap({ at, x, y }) {
  const { T } = useComposition();
  const d = T - at;
  if (d < -0.4 || d > 0.6) return null;
  const dotO = d < 0 ? mt(d, -0.4, -0.2, 0, 1, ME.enter) : mt(d, 0.15, 0.45, 1, 0, ME.enter);
  const press = d < 0 ? 1 : mt(d, 0.08, 0.25, 0.82, 1, ME.enter);
  const ringS = mt(d, 0, 0.5, 0.3, 1.9, ME.enter), ringO = d < 0 ? 0 : mt(d, 0, 0.5, 0.7, 0, ME.enter);
  return (
    <div style={MA(x - 24, y - 24, 48, 48, { pointerEvents: 'none', zIndex: 60 })}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #A855F7', transform: `scale(${ringS})`, opacity: ringO }} />
      <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', background: 'rgba(109,40,217,.28)', border: '2px solid rgba(255,255,255,.9)', boxShadow: '0 4px 14px rgba(109,40,217,.35)', transform: `scale(${press})`, opacity: dotO }} />
    </div>
  );
}

function MStatus() {
  return (
    <div style={MA(0, 0, 390, 50, { zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', boxSizing: 'border-box', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15, color: K.ink, direction: 'ltr' })}>
      <span>9:41</span>
      <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <span style={{ width: 17, height: 11, borderRadius: 2, background: 'linear-gradient(90deg,#1F2233 70%,transparent 70%)', border: '1.5px solid #1F2233', boxSizing: 'border-box' }} />
        <span style={{ width: 24, height: 12, borderRadius: 3.5, border: '1.5px solid #1F2233', boxSizing: 'border-box', padding: 1.5 }}><span style={{ display: 'block', width: '80%', height: '100%', borderRadius: 1.5, background: K.ink }} /></span>
      </span>
    </div>
  );
}

function MPhone({ children }) {
  return (
    <div style={MA(0, 0, 414, 868, { borderRadius: 64, background: '#0B0B12', padding: 12, boxSizing: 'border-box', boxShadow: '0 70px 140px rgba(8,4,28,.6), inset 0 0 0 2px rgba(255,255,255,.1)' })}>
      <div style={{ position: 'relative', width: 390, height: 844, borderRadius: 52, overflow: 'hidden', background: '#fff' }}>
        {children}
        <MStatus />
        <div style={MA(133, 11, 124, 36, { borderRadius: 20, background: '#000', zIndex: 55 })} />
        <div style={MA(126, 830, 138, 5, { borderRadius: 3, background: 'rgba(0,0,0,.25)', zIndex: 55 })} />
      </div>
    </div>
  );
}

const MScreen = ({ children, style }) => <div dir="rtl" style={Object.assign({ position: 'absolute', inset: 0, fontFamily: MAR, color: K.ink, background: '#fff', overflow: 'hidden' }, style)}>{children}</div>;

function MTop({ title, sub }) {
  return (
    <div style={MA(0, 50, 390, 54, { display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', zIndex: 5, background: '#fff' })}>
      <svg style={{ position: 'absolute', right: 18, top: 16 }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={K.ink} strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
      <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
      {sub && <div style={{ fontSize: 11.5, color: K.muted }}>{sub}</div>}
    </div>
  );
}

function MNav({ on = 0 }) {
  const items = [['الرئيسية', 'M4 11.5 12 4l8 7.5M6 10v9.5h12V10'], ['الحجوزات', 'M8 6h11M8 12h11M8 18h11M4 6h.01M4 12h.01M4 18h.01'], ['التقويم', 'M5 6h14v14H5zM5 10.5h14M9 3.5v4M15 3.5v4'], ['الصالون', 'M4 9.5 5.5 4h13L20 9.5M4 9.5h16M5.5 12v8h13v-8'], ['المزيد', 'M4 6h16M4 12h16M4 18h16']];
  return (
    <div style={MA(0, 776, 390, 68, { display: 'flex', borderTop: `1px solid ${K.line}`, background: '#fff', zIndex: 6 })}>
      {items.map(([l, d], i) => (
        <div key={l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, paddingTop: 8, fontSize: 10.5, fontWeight: i === on ? 700 : 500, color: i === on ? K.acc : K.faint }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>{l}
        </div>
      ))}
    </div>
  );
}

const Field = ({ label, children, top, err }) => (
  <div style={MA(20, top, 350, 78)}>
    <div style={{ fontSize: 12, fontWeight: 600, color: K.acc, marginBottom: 6 }}>{label}</div>
    <div style={{ height: 50, borderRadius: 14, border: `1.5px solid ${err ? '#A855F7' : K.line}`, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 15, background: '#fff', boxShadow: err ? '0 0 0 4px rgba(168,85,247,.12)' : 'none' }}>{children}</div>
  </div>
);

function RegisterScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Register;
  const name = 'بيلا هاوس';
  const n = Math.round(clamp(mt(t, 0.5, 1.6, 0, name.length, k => k), 0, name.length));
  const typeOn = t > 2.0;
  const up = [mt(t, 2.6, 3.6, 0, 1, ME.enter), mt(t, 2.9, 4.1, 0, 1, ME.enter)];
  const terms = t > 4.5;
  return (
    <MScreen style={{ background: 'linear-gradient(170deg,#FFFFFF 0%,#F7F1FF 45%,#ECDDFC 100%)' }}>
      <div style={MA(20, 62, 350, 60, { display: 'flex', alignItems: 'center', gap: 10 })}>
        <img src={MICON} style={{ width: 42, height: 42, borderRadius: 12, objectFit: 'cover' }} />
        <div style={{ flex: 1 }}><div style={{ fontFamily: MSERIF, fontWeight: 700, fontSize: 21 }}>سجّل صالونك</div><div style={{ fontSize: 12, color: K.muted }}>سنراجع طلبك خلال 1–2 يوم عمل</div></div>
      </div>
      <div style={MA(12, 130, 366, 600, { borderRadius: 24, background: '#fff', border: `1px solid ${K.line}`, boxShadow: '0 16px 40px rgba(31,34,51,.06)' })} />
      <Field label="اسم الصالون" top={146} err={t > 0.4 && t < 1.9}><span>{name.slice(0, n)}</span>{t > 0.4 && t < 1.9 && <span style={{ width: 2, height: 20, background: '#A855F7', marginRight: 2, opacity: Math.floor(T * 3) % 2 }} />}</Field>
      <div style={MA(20, 232, 350, 80)}>
        <div style={{ fontSize: 12, fontWeight: 600, color: K.acc, marginBottom: 6 }}>نوع الصالون</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {['♂  رجالي', '♀  نسائي'].map((l, i) => { const on = typeOn && i === 1; return <div key={l} style={{ height: 50, borderRadius: 14, border: `1.5px solid ${on ? '#A855F7' : K.line}`, background: on ? K.soft : '#fff', color: on ? K.acc : K.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14.5, transform: on ? `scale(${1 + 0.04 * (1 - mt(t, 2.0, 2.4, 0, 1))})` : 'none' }}>{l}</div>; })}
        </div>
      </div>
      <div style={MA(20, 322, 350, 78, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 })}>
        {[['المدينة', 'عمّان'], ['المنطقة', 'عبدون']].map(([l, v]) => <div key={l}><div style={{ fontSize: 12, fontWeight: 600, color: K.acc, marginBottom: 6 }}>{l}</div><div style={{ height: 50, borderRadius: 14, border: `1.5px solid ${K.line}`, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 15 }}>{v}</div></div>)}
      </div>
      <div style={MA(20, 412, 350, 150)}>
        <div style={{ fontSize: 12, fontWeight: 600, color: K.acc, marginBottom: 8 }}>وثائق الترخيص</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[['trade-license.pdf', 'PDF'], ['salon-front.jpg', 'IMG']].map(([nm, k], i) => (
            <div key={nm} style={{ height: 106, borderRadius: 14, border: `1.5px solid ${K.line}`, background: K.surf, position: 'relative', overflow: 'hidden', opacity: up[i] > 0 ? 1 : 0.0, transform: `scale(${0.8 + 0.2 * clamp(up[i] * 3, 0, 1)})` }}>
              <div style={{ position: 'absolute', top: 14, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}><div style={{ width: 38, height: 44, borderRadius: 8, background: k === 'PDF' ? 'rgba(217,70,122,.12)' : K.soft, color: k === 'PDF' ? K.rose : K.acc, fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6, boxSizing: 'border-box' }}>{k}</div></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 7px', background: '#fff', borderTop: `1px solid ${K.line}` }}>
                <div dir="ltr" style={{ fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nm}</div>
                <div style={{ height: 4, borderRadius: 2, background: K.soft, marginTop: 4, overflow: 'hidden' }}><div style={{ width: up[i] * 100 + '%', height: '100%', background: up[i] >= 1 ? K.green : MG }} /></div>
              </div>
            </div>
          ))}
          <div style={{ height: 106, borderRadius: 14, border: '1.5px dashed #D8B4FE', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: K.acc, fontSize: 12, fontWeight: 700 }}><span style={{ fontSize: 22 }}>+</span>إضافة</div>
        </div>
      </div>
      <div style={MA(20, 580, 350, 30, { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 })}>
        <span style={{ width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: terms ? MG : '#fff', border: terms ? 'none' : `1.5px solid ${K.faint}` }}>{terms && <Tick s={13} />}</span>
        أوافق على <b style={{ color: K.acc }}>شروط WAB للصالونات</b>
      </div>
      <div style={MA(20, 740, 350, 54, { borderRadius: 14, background: terms ? MG : K.soft, color: terms ? '#fff' : K.faint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 15, boxShadow: terms ? '0 10px 24px rgba(109,40,217,.3)' : 'none' })}>إرسال الطلب</div>
      <MTap at={CUES.Register + 0.35} x={195} y={196} />
      <MTap at={CUES.Register + 2.0} x={290} y={282} />
      <MTap at={CUES.Register + 2.55} x={315} y={480} />
      <MTap at={CUES.Register + 4.5} x={350} y={594} />
      <MTap at={CUES.Register + 5.3} x={195} y={767} />
    </MScreen>
  );
}

function ApprovalScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Approval;
  const pend = 1 - mt(t, 1.7, 2.1, 0, 1);
  const ok = mt(t, 2.0, 2.6, 0, 1, ME.pop);
  const ny = mt(t, 2.4, 2.9, -130, 60, ME.pop);
  return (
    <MScreen style={{ background: 'linear-gradient(170deg,#FFFFFF 0%,#F7F1FF 45%,#ECDDFC 100%)' }}>
      <div style={MA(0, 70, 390, 40, { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, direction: 'ltr' })}><img src={MICON} style={{ width: 30, height: 30, borderRadius: 9 }} /><span style={{ fontFamily: MSERIF, fontWeight: 700, fontSize: 17 }}>WAB</span><span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: MG, color: '#fff', fontFamily: MAR }}>أعمال</span></div>
      <div style={MA(0, 200, 390, 420, { opacity: pend, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' })}>
        <div style={{ width: 124, height: 124, borderRadius: 62, background: K.soft, color: K.acc, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ transform: `rotate(${Math.floor(t / 0.8) * 180}deg)`, transition: 'none' }}><path d="M7 3h10M7 21h10M8 3v4l4 5-4 5v4M16 3v4l-4 5 4 5v4" /></svg></div>
        <div style={{ fontFamily: MSERIF, fontWeight: 700, fontSize: 22, margin: '20px 0 8px' }}>طلبك قيد المراجعة</div>
        <div style={{ fontSize: 13.5, color: K.muted, lineHeight: 1.7, padding: '0 40px' }}>يراجع فريق WAB وثائقك عادةً خلال 1–2 يوم عمل.</div>
      </div>
      <div style={MA(0, 200, 390, 420, { opacity: clamp(ok, 0, 1), display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' })}>
        <div style={{ width: 124, height: 124, borderRadius: 62, background: MG, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${ok})`, boxShadow: '0 18px 40px rgba(109,40,217,.35)' }}><Tick s={56} w={2.6} p={mt(t, 2.3, 2.7, 0, 1)} /></div>
        <div style={{ fontFamily: MSERIF, fontWeight: 700, fontSize: 23, margin: '20px 0 8px' }}>تمت الموافقة على صالونك!</div>
        <div style={{ fontSize: 13.5, color: K.muted, lineHeight: 1.7, padding: '0 40px' }}>أكمل الخطوات المتبقية ليظهر صالونك للزبائن.</div>
      </div>
      <div style={MA(12, ny, 366, 80, { borderRadius: 24, background: 'rgba(250,250,252,.97)', boxShadow: '0 16px 40px rgba(31,34,51,.2)', display: 'flex', gap: 12, alignItems: 'center', padding: '0 14px', boxSizing: 'border-box', zIndex: 20 })}>
        <img src={MICON} style={{ width: 42, height: 42, borderRadius: 11 }} />
        <div style={{ flex: 1 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: K.muted }}><b style={{ color: K.ink }}>WAB أعمال</b><span>الآن</span></div><div style={{ fontWeight: 700, fontSize: 14 }}>تمت الموافقة على صالونك ✓</div><div style={{ fontSize: 12, color: K.muted }}>بيلا هاوس · أكمل الإعداد ليصبح مباشراً</div></div>
      </div>
    </MScreen>
  );
}

const SETUP = [['الملف والصور', 'الغلاف والوصف'], ['الموقع والتواصل', 'الخريطة والهاتف'], ['ساعات العمل', 'السبت – الخميس'], ['الخدمات', '12 خدمة'], ['الطاقم', '4 مقدمي خدمات'], ['السياسات', 'الإلغاء والعربون']];
function SetupScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Setup;
  const done = SETUP.map((_, i) => mt(t, 0.5 + i * 0.5, 0.8 + i * 0.5, 0, 1, ME.pop));
  const cnt = done.filter(x => x >= 1).length;
  const live = mt(t, 4.0, 4.6, 0, 1, ME.pop);
  return (
    <MScreen>
      <div style={MA(20, 60, 350, 50, { display: 'flex', alignItems: 'center', gap: 10 })}>
        <img src={MICON} style={{ width: 40, height: 40, borderRadius: 12 }} />
        <div style={{ flex: 1 }}><div style={{ fontFamily: MSERIF, fontWeight: 700, fontSize: 20 }}>جهّز صالونك</div><div style={{ fontSize: 12, color: K.muted }}>بيلا هاوس</div></div>
      </div>
      <div style={MA(20, 122, 350, 104, { borderRadius: 22, background: MG, color: '#fff', padding: 18, boxSizing: 'border-box', boxShadow: '0 14px 30px rgba(109,40,217,.25)' })}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}><span style={{ fontSize: 30, fontWeight: 700 }}>{cnt}</span><span style={{ fontSize: 15, opacity: .9 }}>من 6 مكتمل</span></div>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.25)', marginTop: 10, overflow: 'hidden' }}><div style={{ width: (done.reduce((a, b) => a + clamp(b, 0, 1), 0) / 6 * 100) + '%', height: '100%', background: '#fff', marginInlineStart: 0 }} /></div>
      </div>
      {SETUP.map(([a, b], i) => {
        const d = done[i];
        return (
          <div key={a} style={MA(20, 244 + i * 78, 350, 66, { borderRadius: 18, border: `1px solid ${d >= 1 ? K.line : '#D8B4FE'}`, background: d >= 1 ? K.surf : '#fff', display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', boxSizing: 'border-box' })}>
            <span style={{ width: 32, height: 32, borderRadius: 16, background: d > 0 ? K.green : K.soft, color: K.acc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, transform: `scale(${d > 0 ? 0.6 + 0.4 * d : 1})` }}>{d > 0 ? <Tick s={14} /> : i + 1}</span>
            <span style={{ flex: 1 }}><span style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{a}</span><span style={{ display: 'block', fontSize: 12, color: K.muted }}>{b}</span></span>
            {d >= 1 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: 'rgba(46,158,120,.12)', color: K.green }}>مكتمل</span>}
          </div>
        );
      })}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(170deg,#FFFFFF 0%,#F7F1FF 45%,#ECDDFC 100%)', opacity: clamp(live, 0, 1), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', zIndex: 10 }}>
        <div style={{ width: 110, height: 110, borderRadius: 55, background: MG, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${live})`, boxShadow: '0 18px 40px rgba(109,40,217,.35)' }}><Tick s={52} w={2.6} p={mt(t, 4.3, 4.7, 0, 1)} /></div>
        <div style={{ fontFamily: MSERIF, fontWeight: 700, fontSize: 25, margin: '22px 0 8px' }}>صالونك أصبح مباشراً!</div>
        <div style={{ fontSize: 14, color: K.muted, lineHeight: 1.7, padding: '0 40px' }}>أصبح صالونك ظاهراً للزبائن ويمكنهم الحجز الآن.</div>
      </div>
    </MScreen>
  );
}

const TL = [['10:00', 'دينا حمدان', 'مانيكير · مي', 'مكتمل', '#6D28D9', 'rgba(109,40,217,.1)'], ['11:00', 'لانا مصطفى', 'صبغة شعر · رنا', 'جارٍ الآن', '#6D28D9', 'rgba(109,40,217,.1)'], ['1:30', 'هيا الشريف', 'قص وتسريح · هبة', 'مقبول', '#2E9E78', 'rgba(46,158,120,.12)'], ['3:00', 'ريم الزعبي', 'مكياج سهرة · دانة', 'مقبول', '#2E9E78', 'rgba(46,158,120,.12)']];
function HomeBase({ t, count }) {
  const n = Math.round(clamp(count, 0, 1) * 6);
  return (
    <React.Fragment>
      <div style={MA(20, 58, 350, 52, { display: 'flex', alignItems: 'center', gap: 12 })}>
        <div style={{ width: 46, height: 46, borderRadius: 23, background: 'linear-gradient(135deg,#FBCFE8,#A855F7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MSERIF, fontWeight: 700, fontSize: 20 }}>B</div>
        <div style={{ flex: 1 }}><div style={{ fontSize: 12, color: K.muted }}>مرحباً، ليلى</div><div style={{ fontFamily: MSERIF, fontWeight: 700, fontSize: 19 }}>بيلا هاوس</div></div>
        <div style={{ position: 'relative', width: 46, height: 46, borderRadius: 14, border: `1px solid ${K.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={K.ink} strokeWidth="1.8"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" /></svg><span style={{ position: 'absolute', top: 6, left: 6, width: 16, height: 16, borderRadius: 8, background: K.rose, color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span></div>
      </div>
      <div style={MA(20, 120, 350, 28, { display: 'flex', alignItems: 'center', gap: 8 })}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 9, color: K.green, background: 'rgba(46,158,120,.12)' }}><span style={{ width: 7, height: 7, borderRadius: 4, background: K.green, opacity: 0.5 + 0.5 * Math.abs(Math.sin(t * 3)) }} />مباشر</span>
        <span style={{ fontSize: 12, color: K.muted }}>يستقبل الحجوزات الآن</span>
      </div>
      <div style={MA(20, 162, 350, 24, { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' })}><b style={{ fontSize: 16 }}>اليوم</b><span style={{ fontSize: 12, color: K.muted }}>الأربعاء 7 أكتوبر</span></div>
      <div style={MA(20, 194, 350, 84, { display: 'grid', gridTemplateColumns: '1fr 1fr 1.35fr', gap: 10 })}>
        <div style={{ padding: 12, borderRadius: 16, background: K.surf }}><div style={{ fontSize: 22, fontWeight: 700 }}>{n}</div><div style={{ fontSize: 11.5, color: K.muted }}>حجوزات اليوم</div></div>
        <div style={{ padding: 12, borderRadius: 16, background: K.surf }}><div style={{ fontSize: 22, fontWeight: 700, color: K.green }}>{n ? 1 : 0}</div><div style={{ fontSize: 11.5, color: K.muted }}>مكتملة</div></div>
        <div style={{ padding: 12, borderRadius: 16, background: K.soft }}><div style={{ fontSize: 11, color: K.acc, fontWeight: 700 }}>التالي</div><div style={{ fontSize: 14, fontWeight: 700 }}>1:30 م</div><div style={{ fontSize: 11, color: K.muted }}>هيا · هبة</div></div>
      </div>
      <div style={MA(20, 294, 350, 22, { fontWeight: 700, fontSize: 14 })}>جدول اليوم</div>
      {TL.map((r, i) => {
        const o = mt(t, 0.3 + i * 0.15, 0.7 + i * 0.15, 0, 1, ME.enter);
        return (
          <div key={i} style={MA(20, 326 + i * 74, 350, 64, { display: 'flex', gap: 10, opacity: o, transform: `translateY(${(1 - o) * 16}px)` })}>
            <div style={{ width: 48, paddingTop: 12, fontSize: 12.5, fontWeight: 700, textAlign: 'left' }}>{r[0]}</div>
            <div style={{ flex: 1, padding: '10px 12px', borderRadius: 14, border: `1px solid ${i === 1 ? '#D8B4FE' : K.line}`, background: i === 1 ? K.soft : '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 13.5 }}>{r[1]}</b><span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 7, color: r[4], background: r[5] }}>{r[3]}</span></div>
              <div style={{ fontSize: 12, color: K.muted, marginTop: 3 }}>{r[2]}</div>
            </div>
          </div>
        );
      })}
      <MNav on={0} />
    </React.Fragment>
  );
}

function LiveScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Live;
  return <MScreen><HomeBase t={t} count={mt(t, 0.3, 1.4, 0, 1, ME.enter)} /></MScreen>;
}

function RequestScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Request;
  const up = mt(t, 0.4, 0.95, 1, 0, Easing.easeOutBack);
  const dim = mt(t, 0.3, 0.7, 0, 0.55);
  const shake = t > 0.2 && t < 1.2 ? Math.sin(t * 60) * 4 * (1 - (t - 0.2)) : 0;
  const ring = (t * 1.4) % 1;
  const press = mt(t, 4.55, 4.65, 1, 0.94) * 0 + (t > 4.55 && t < 4.75 ? 0.95 : 1);
  const persons = [['سارة العلي', true, 'مكياج عروس + تسريحة عروس', 'رنا · 2:00 – 5:30 م'], ['أم العروس', false, 'مكياج سهرة', 'هبة · 2:00 – 3:00 م'], ['أخت العروس', false, 'قص وتسريح', 'دانة · 3:00 – 3:45 م']];
  return (
    <MScreen style={{ transform: `translateX(${shake}px)` }}>
      <HomeBase t={t + 3} count={1} />
      <div style={{ position: 'absolute', inset: 0, background: `rgba(10,8,20,${dim})`, zIndex: 20 }} />
      <div style={MA(0, 150 + up * 700, 390, 694, { background: '#fff', borderRadius: '28px 28px 0 0', zIndex: 21, padding: '10px 20px', boxSizing: 'border-box', boxShadow: '0 -20px 50px rgba(0,0,0,.25)' })}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: K.line, margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ width: 48, height: 48, borderRadius: 24, background: MG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 ${ring * 16}px rgba(168,85,247,${0.5 * (1 - ring)})` }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ transform: `rotate(${Math.sin(t * 14) * 14 * (t < 2 ? 1 : 0.3)}deg)` }}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" /></svg></span>
          <span style={{ flex: 1 }}><span style={{ display: 'block', fontFamily: MSERIF, fontWeight: 700, fontSize: 21 }}>طلب حجز جديد</span><span style={{ display: 'block', fontSize: 12, color: K.muted }}>منذ دقيقة · <span dir="ltr">WAB-24817</span></span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 16, background: MBR, color: '#fff', marginBottom: 12, boxShadow: '0 10px 24px rgba(217,70,122,.3)', transform: `scale(${0.9 + 0.1 * mt(t, 0.9, 1.3, 0, 1, ME.pop)})` }}>
          <Crown s={22} /><span><span style={{ display: 'block', fontWeight: 700, fontSize: 15 }}>حجز عروس</span><span style={{ display: 'block', fontSize: 11.5, opacity: .92 }}>يتضمن خدمات العروس — أولوية عالية</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, background: K.surf, marginBottom: 10 }}>
          <span style={{ width: 42, height: 42, borderRadius: 21, background: K.soft, color: K.acc, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>س</span>
          <span style={{ flex: 1 }}><b style={{ display: 'block', fontSize: 15 }}>سارة العلي</b><span style={{ fontSize: 12, color: K.muted }}>3 أشخاص</span></span>
          <span style={{ textAlign: 'left' }}><b style={{ display: 'block', fontSize: 15, color: K.acc }}>2:00 م</b><span style={{ fontSize: 11.5, color: K.muted }}>السبت 10 أكتوبر</span></span>
        </div>
        {persons.map(([nm, br, sv, st], i) => {
          const o = mt(t, 1.2 + i * 0.25, 1.6 + i * 0.25, 0, 1, ME.enter);
          return (
            <div key={nm} style={{ padding: '9px 12px', borderRadius: 14, border: `1px solid ${br ? '#F4A7C4' : K.line}`, background: br ? 'rgba(244,167,196,.08)' : '#fff', marginBottom: 7, opacity: o, transform: `translateY(${(1 - o) * 12}px)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>{nm}{br && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: MBR, color: '#fff' }}>عروس</span>}</div>
              <div style={{ fontSize: 12, color: K.muted }}>{sv}</div><div style={{ fontSize: 11.5, color: K.faint }}>{st}</div>
            </div>
          );
        })}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 2px 14px', borderTop: `1px dashed ${K.line}` }}>
          <span><span style={{ display: 'block', fontSize: 12, color: K.muted }}>الإجمالي</span><b style={{ fontSize: 20 }}>360 د.أ</b></span>
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: '5px 10px', borderRadius: 8, background: 'rgba(109,40,217,.1)', color: K.acc }}>تم دفع العربون</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 10 }}>
          <div style={{ height: 58, borderRadius: 16, border: `1.5px solid ${K.rose}`, color: K.rose, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>رفض</div>
          <div style={{ height: 58, borderRadius: 16, background: K.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, fontSize: 17, transform: `scale(${press})`, boxShadow: `0 12px 26px rgba(46,158,120,.35), 0 0 0 ${ring * 14}px rgba(46,158,120,${0.45 * (1 - ring)})` }}><Tick s={20} w={2.6} />قبول</div>
        </div>
      </div>
      <MTap at={CUES.Request + 4.6} x={136} y={803} />
    </MScreen>
  );
}

function AcceptScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Accept;
  const k = mt(t, 0.1, 0.6, 0, 1, ME.pop);
  const txt = mt(t, 0.5, 0.9, 0, 1, ME.enter);
  return (
    <MScreen style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 30px' }}>
      <div style={{ width: 150, height: 150, borderRadius: 75, background: 'radial-gradient(circle,rgba(46,158,120,.2),transparent 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 92, height: 92, borderRadius: 46, background: K.green, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${k})`, boxShadow: '0 14px 34px rgba(46,158,120,.35)' }}><Tick s={44} w={2.6} p={mt(t, 0.35, 0.75, 0, 1)} /></div>
      </div>
      <div style={{ opacity: txt, transform: `translateY(${(1 - txt) * 14}px)` }}>
        <div style={{ fontFamily: MSERIF, fontWeight: 700, fontSize: 23, margin: '10px 0 6px' }}>تم قبول الحجز</div>
        <div dir="ltr" style={{ fontWeight: 700, color: K.acc, fontFamily: 'Poppins,sans-serif', marginBottom: 8 }}>WAB-24817</div>
        <div style={{ fontSize: 14, color: K.muted, lineHeight: 1.7 }}>تم إشعار الزبونة وإضافة الموعد إلى التقويم.</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 18, padding: '10px 14px', borderRadius: 14, background: 'rgba(244,167,196,.15)', color: '#B83268', fontWeight: 700, fontSize: 13 }}><Crown s={14} c="#D9467A" />عروس · السبت 10 أكتوبر · 2:00 م</div>
      </div>
    </MScreen>
  );
}

const CSTF = [['رنا', '#6D28D9', 'rgba(109,40,217,.13)'], ['هبة', '#B83268', 'rgba(244,167,196,.32)'], ['دانة', '#2E9E78', 'rgba(46,158,120,.15)'], ['مي', '#B7791F', 'rgba(245,158,11,.17)']];
function CalendarScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Calendar;
  const HH = 46, S0 = 10;
  const blocks = [[0, 14, 3.5, 'سارة العلي', 'مكياج + تسريحة عروس', 1], [1, 14, 1, 'أم العروس', 'مكياج سهرة', 0], [2, 15, 0.75, 'أخت العروس', 'قص وتسريح', 0], [1, 11, 1.5, 'دينا حمدان', 'صبغة شعر', 0], [3, 17, 0.5, 'ريم الزعبي', 'مانيكير', 0], [0, 10.5, 1, 'نور خليل', 'قص وتسريح', 0], [3, 12, 1, 'لانا مصطفى', 'مكياج سهرة', 0]];
  const days = ['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];
  return (
    <MScreen>
      <div style={MA(20, 56, 350, 50, { display: 'flex', alignItems: 'center' })}><div style={{ flex: 1 }}><div style={{ fontFamily: MSERIF, fontWeight: 700, fontSize: 22 }}>التقويم</div><div style={{ fontSize: 12, color: K.muted }}>أكتوبر 2026</div></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, padding: 3, borderRadius: 12, background: K.surf, width: 140 }}><div style={{ height: 32, borderRadius: 10, background: '#fff', color: K.acc, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(31,34,51,.08)' }}>يوم</div><div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: K.muted }}>أسبوع</div></div></div>
      <div style={MA(12, 112, 366, 58, { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 })}>
        {days.map((d, i) => { const a = i === 0; return <div key={d} style={{ borderRadius: 14, background: a ? MG : K.surf, color: a ? '#fff' : (i === 6 ? K.faint : K.ink), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 10.5 }}>{d}</span><b style={{ fontSize: 15 }}>{10 + i}</b></div>; })}
      </div>
      <div style={MA(0, 180, 390, 46, { display: 'flex', borderBottom: `1px solid ${K.line}` })}>
        <div style={{ width: 44 }} />
        {CSTF.map(([n, c, b]) => <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}><span style={{ width: 26, height: 26, borderRadius: 13, background: b, color: c, fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n[0]}</span><span style={{ fontSize: 11, fontWeight: 700 }}>{n}</span></div>)}
      </div>
      <div style={MA(0, 230, 390, 546, { overflow: 'hidden' })}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(to bottom,${K.line} 0,${K.line} 1px,transparent 1px,transparent ${HH}px)` }} />
        {Array.from({ length: 12 }, (_, i) => <div key={i} style={{ position: 'absolute', right: 6, top: i * HH - 6, fontSize: 10, color: K.faint, fontWeight: 600 }}>{((S0 + i - 1) % 12) + 1} {S0 + i >= 12 ? 'م' : 'ص'}</div>)}
        {blocks.map(([c, h, d, nm, sv, br], i) => {
          const o = mt(t, 0.3 + i * 0.12, 0.7 + i * 0.12, 0, 1, ME.pop);
          const colW = (390 - 44) / 4;
          const left = (3 - c) * colW + 3;
          const pulse = br ? 0.5 + 0.5 * Math.sin(t * 4) : 0;
          return (
            <div key={i} style={{ position: 'absolute', left, width: colW - 6, top: (h - S0) * HH + 1, height: d * HH - 3, borderRadius: 10, padding: '5px 6px', boxSizing: 'border-box', background: br ? 'rgba(244,167,196,.3)' : CSTF[c][2], color: br ? '#B83268' : CSTF[c][1], border: br ? '1.5px solid #D9467A' : 'none', opacity: clamp(o, 0, 1), transform: `scale(${0.8 + 0.2 * o})`, boxShadow: br ? `0 0 0 ${pulse * 5}px rgba(217,70,122,.18)` : 'none', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{br ? <Crown s={11} c="#D9467A" /> : null}{nm}</div>
              <div style={{ fontSize: 9.5, opacity: .85 }}>{sv}</div>
            </div>
          );
        })}
      </div>
      <MNav on={2} />
    </MScreen>
  );
}

function CompleteScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Complete;
  const dlg = mt(t, 1.6, 1.95, 0, 1, ME.pop) - mt(t, 3.2, 3.45, 0, 1);
  const done = t > 3.3;
  const toastO = mt(t, 3.5, 3.8, 0, 1, ME.enter);
  return (
    <MScreen>
      <MTop title="تفاصيل الحجز" />
      <div style={MA(20, 110, 350, 150, { borderRadius: 20, background: K.surf, padding: 16, boxSizing: 'border-box' })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 12, background: MBR, color: '#fff', fontWeight: 700, fontSize: 13.5, marginBottom: 12 }}><Crown s={16} />حجز عروس — 3 أشخاص</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 8, color: done ? K.acc : K.green, background: done ? 'rgba(109,40,217,.1)' : 'rgba(46,158,120,.12)' }}>{done ? 'مكتمل' : 'مقبول'}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 8, color: K.acc, background: 'rgba(109,40,217,.1)' }}>{done ? 'مدفوع' : 'تم دفع العربون'}</span>
        </div>
        <div dir="ltr" style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Poppins,sans-serif', textAlign: 'right' }}>WAB-24817</div>
      </div>
      {[['سارة العلي', 'مكياج عروس + تسريحة عروس', '300 د.أ', 1], ['أم العروس', 'مكياج سهرة', '35 د.أ', 0], ['أخت العروس', 'قص وتسريح', '25 د.أ', 0]].map(([n, s, p, br], i) => (
        <div key={n} style={MA(20, 274 + i * 70, 350, 60, { borderRadius: 16, border: `1px solid ${br ? '#F4A7C4' : K.line}`, background: br ? 'rgba(244,167,196,.08)' : '#fff', padding: '10px 14px', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
          <span><b style={{ display: 'block', fontSize: 13.5 }}>{n}</b><span style={{ fontSize: 12, color: K.muted }}>{s}</span></span><b style={{ fontSize: 13.5 }}>{p}</b>
        </div>
      ))}
      <div style={MA(20, 492, 350, 120, { borderRadius: 18, background: K.surf, padding: '12px 16px', boxSizing: 'border-box', fontSize: 13 })}>
        <b style={{ fontSize: 14.5 }}>الدفع</b>
        {[['الإجمالي', '360 د.أ'], ['المدفوع أونلاين', '72 د.أ']].map(([a, b]) => <div key={a} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ color: K.muted }}>{a}</span><b>{b}</b></div>)}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: `1px dashed ${K.line}` }}><b>المتبقي للتحصيل</b><b style={{ color: K.acc, fontSize: 16 }}>{done ? '0 د.أ' : '288 د.أ'}</b></div>
      </div>
      <div style={MA(0, 666, 390, 178, { borderTop: `1px solid ${K.line}`, background: '#fff', padding: '12px 20px', boxSizing: 'border-box' })}>
        <div style={{ height: 54, borderRadius: 14, background: done ? K.soft : MG, color: done ? K.acc : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15.5, boxShadow: done ? 'none' : '0 10px 24px rgba(109,40,217,.28)' }}>{done ? '✓ تم الإكمال والدفع' : '✓ مكتمل ومدفوع'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8, opacity: done ? 0.3 : 1 }}><div style={{ height: 46, borderRadius: 14, border: `1.5px solid ${K.rose}`, color: K.rose, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>لم يحضر</div><div style={{ height: 46, borderRadius: 14, background: K.soft, color: K.acc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>إعادة توزيع</div></div>
      </div>
      {dlg > 0.01 && <div style={{ position: 'absolute', inset: 0, background: `rgba(10,8,20,${0.5 * clamp(dlg, 0, 1)})`, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 26 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '24px 20px 18px', width: '100%', textAlign: 'center', transform: `scale(${0.85 + 0.15 * dlg})`, opacity: clamp(dlg, 0, 1) }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, margin: '0 auto 12px', background: K.soft, color: K.acc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700 }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>تأكيد اكتمال الحجز</div>
          <div style={{ fontSize: 13.5, color: K.muted }}>أكّد أنك حصّلت المبلغ المتبقي من الزبونة:</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: K.acc, margin: '8px 0 14px' }}>288 د.أ</div>
          <div style={{ height: 50, borderRadius: 14, background: MG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14.5 }}>نعم، حصّلت المبلغ</div>
        </div>
      </div>}
      <div style={MA(20, 600, 350, 48, { borderRadius: 14, background: '#1F2233', color: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', boxSizing: 'border-box', fontSize: 13, fontWeight: 600, opacity: toastO, transform: `translateY(${(1 - toastO) * 16}px)`, zIndex: 40 })}><span style={{ width: 22, height: 22, borderRadius: 11, background: K.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Tick s={12} /></span>تم تسجيل الحجز مكتملاً ومدفوعاً</div>
      <MTap at={CUES.Complete + 1.3} x={195} y={705} />
      <MTap at={CUES.Complete + 3.0} x={195} y={540} />
    </MScreen>
  );
}

function StatsScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Stats;
  const g = mt(t, 0.3, 1.6, 0, 1, ME.enter);
  const bars = [4, 6, 5, 8, 7, 9, 0], lb = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];
  const kp = [['الحجوزات', Math.round(39 * g), '+12%'], ['نسبة القبول', Math.round(92 * g) + '%', '+3%'], ['حجوزات العرائس', Math.round(9 * g), '+3'], ['متوسط التقييم', (4.8 * g).toFixed(1), '+0.1']];
  return (
    <MScreen>
      <MTop title="الإحصائيات" />
      <div style={MA(20, 110, 350, 40, { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, padding: 4, borderRadius: 14, background: K.surf, boxSizing: 'border-box' })}>{['اليوم', 'الأسبوع', 'الشهر', 'مخصص'].map((p, i) => <div key={p} style={{ borderRadius: 10, background: i === 1 ? MG : 'transparent', color: i === 1 ? '#fff' : K.muted, fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p}</div>)}</div>
      <div style={MA(20, 162, 350, 104, { borderRadius: 20, background: MG, color: '#fff', padding: 16, boxSizing: 'border-box', boxShadow: '0 14px 30px rgba(109,40,217,.25)' })}>
        <div style={{ fontSize: 12.5, opacity: .9 }}>الإيرادات</div>
        <div style={{ fontSize: 30, fontWeight: 700 }}>{Math.round(1480 * g).toLocaleString('en-US')} د.أ</div>
        <div style={{ fontSize: 12, opacity: .9 }}>أونلاين 620 · في الصالون 860</div>
      </div>
      <div style={MA(20, 278, 350, 160, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 })}>
        {kp.map(([k, v, d]) => <div key={k} style={{ padding: 12, borderRadius: 16, border: `1px solid ${K.line}` }}><div style={{ fontSize: 11.5, color: K.muted }}>{k}</div><div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}><b style={{ fontSize: 20 }}>{v}</b><span style={{ fontSize: 11, fontWeight: 700, color: K.green }}>{d}</span></div></div>)}
      </div>
      <div style={MA(20, 452, 350, 230, { borderRadius: 20, border: `1px solid ${K.line}`, padding: 14, boxSizing: 'border-box' })}>
        <b style={{ fontSize: 14.5 }}>الحجوزات يومياً</b>
        <div dir="ltr" style={{ height: 150, display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 14, borderBottom: `1px solid ${K.line}` }}>
          {bars.map((b, i) => { const h = b / 9 * 130 * mt(t, 0.5 + i * 0.1, 1.2 + i * 0.1, 0, 1, ME.enter); return <div key={i} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}><div style={{ width: 26, height: Math.max(2, h), borderRadius: '7px 7px 3px 3px', background: b === 9 ? 'linear-gradient(180deg,#A855F7,#6D28D9)' : 'rgba(168,85,247,.35)' }} /></div>; })}
        </div>
        <div dir="ltr" style={{ display: 'flex', gap: 8, marginTop: 6 }}>{lb.map(l => <span key={l} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: K.faint }}>{l}</span>)}</div>
      </div>
      <div style={MA(20, 694, 350, 70, { borderRadius: 18, border: `1px solid ${K.line}`, padding: '10px 14px', boxSizing: 'border-box' })}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>مكياج عروس<span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: MBR, color: '#fff' }}>عروس</span></span><span style={{ color: K.muted }}>24 حجز</span></div>
        <div style={{ height: 7, borderRadius: 4, background: K.line, overflow: 'hidden' }}><div style={{ width: 100 * mt(t, 1.4, 2.2, 0, 1, ME.enter) + '%', height: '100%', background: MBR }} /></div>
      </div>
    </MScreen>
  );
}

function PayoutsScreen() {
  const { T, CUES } = useComposition();
  const t = T - CUES.Payouts;
  const ny = mt(t, 2.2, 2.7, -130, 56, ME.pop);
  const rows = [['دفعة · 1–15 أكتوبر', '1,410.60 د.أ', 'قيد التحويل', K.amber, 'rgba(245,158,11,.14)'], ['دفعة · 16–30 سبتمبر', '1,258.70 د.أ', 'تم التحويل', K.green, 'rgba(46,158,120,.12)'], ['دفعة · 1–15 سبتمبر', '1,086.40 د.أ', 'تم التحويل', K.green, 'rgba(46,158,120,.12)']];
  return (
    <MScreen>
      <MTop title="المالية" />
      <div style={MA(20, 110, 350, 140, { borderRadius: 22, background: MG, color: '#fff', padding: 18, boxSizing: 'border-box', boxShadow: '0 14px 30px rgba(109,40,217,.25)' })}>
        <div style={{ fontSize: 12.5, opacity: .9 }}>الدفعة القادمة (قيد التحويل)</div>
        <div style={{ fontSize: 30, fontWeight: 700, margin: '2px 0 12px' }}>{(1410.6 * mt(t, 0.2, 1.2, 0, 1, ME.enter)).toFixed(2)} د.أ</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.25)', fontSize: 12.5 }}><span style={{ opacity: .9 }}>آخر دفعة · 1 أكتوبر</span><b>1,258.70 د.أ</b></div>
      </div>
      <div style={MA(20, 264, 350, 40, { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, padding: 4, borderRadius: 14, background: K.surf, boxSizing: 'border-box' })}>{['المعاملات', 'المبالغ المستردة', 'الدفعات'].map((p, i) => <div key={p} style={{ borderRadius: 10, background: i === 2 ? MG : 'transparent', color: i === 2 ? '#fff' : K.muted, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p}</div>)}</div>
      {rows.map(([a, b, s, c, bg], i) => {
        const o = mt(t, 0.5 + i * 0.2, 0.9 + i * 0.2, 0, 1, ME.enter);
        return (
          <div key={a} style={MA(20, 318 + i * 128, 350, 116, { borderRadius: 18, border: `1px solid ${K.line}`, padding: 14, boxSizing: 'border-box', opacity: o, transform: `translateY(${(1 - o) * 16}px)` })}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 14 }}>{a}</b><b style={{ fontSize: 15 }}>{b}</b></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}><span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6, color: c, background: bg }}>{s}</span></div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${K.line}`, fontSize: 12, color: K.muted, display: 'flex', justifyContent: 'space-between' }}><span>الإجمالي − الرسوم − المستردات</span><span>الصافي</span></div>
          </div>
        );
      })}
      <div style={MA(12, ny, 366, 80, { borderRadius: 24, background: 'rgba(250,250,252,.97)', boxShadow: '0 16px 40px rgba(31,34,51,.2)', display: 'flex', gap: 12, alignItems: 'center', padding: '0 14px', boxSizing: 'border-box', zIndex: 20 })}>
        <img src={MICON} style={{ width: 42, height: 42, borderRadius: 11 }} />
        <div style={{ flex: 1 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: K.muted }}><b style={{ color: K.ink }}>WAB أعمال</b><span>الآن</span></div><div style={{ fontWeight: 700, fontSize: 14 }}>تم تحويل دفعة 💜</div><div style={{ fontSize: 12, color: K.muted }}>1,410.60 د.أ إلى حسابك البنكي</div></div>
      </div>
    </MScreen>
  );
}

function MBackground() {
  const { T } = useComposition();
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(165deg,#14172B 0%,#1B1030 50%,#2A1450 100%)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 900, height: 900, borderRadius: '50%', left: -300 + Math.sin(T * 0.25) * 120, top: -200 + Math.cos(T * 0.2) * 80, background: 'radial-gradient(circle,rgba(168,85,247,.35),transparent 65%)' }} />
      <div style={{ position: 'absolute', width: 1000, height: 1000, borderRadius: '50%', left: 400 + Math.cos(T * 0.22) * 140, top: 1100 + Math.sin(T * 0.18) * 100, background: 'radial-gradient(circle,rgba(244,167,196,.22),transparent 65%)' }} />
    </div>
  );
}

function MBrand() {
  const { T, CUES, authoredTotal } = useComposition();
  const toTop = mt(T, CUES.Open + 3.0, CUES.Open + 3.9, 0, 1, ME.glide) - mt(T, CUES.Close + 0.3, CUES.Close + 1.2, 0, 1, ME.glide);
  const pop = mt(T, 0.1, 0.8, 0, 1, ME.pop);
  const fade = mt(T, authoredTotal - 0.7, authoredTotal - 0.05, 1, 0, ME.glide);
  const size = 280 - 176 * toTop, cy = 800 - 680 * toTop;
  const wordO = (mt(T, 0.7, 1.2, 0, 1, ME.enter) - mt(T, CUES.Open + 2.8, CUES.Open + 3.2, 0, 1)) + mt(T, CUES.Close + 0.9, CUES.Close + 1.4, 0, 1, ME.enter);
  const tag1 = mt(T, 1.4, 1.9, 0, 1, ME.enter) - mt(T, CUES.Open + 2.8, CUES.Open + 3.2, 0, 1);
  const cl = (d) => mt(T, CUES.Close + d, CUES.Close + d + 0.5, 0, 1, ME.enter);
  const w = clamp(wordO, 0, 1);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fade, fontFamily: MAR }}>
      <div style={{ position: 'absolute', left: 540 - size / 2, top: cy - size / 2, width: size, height: size, borderRadius: size * 0.24, overflow: 'hidden', transform: `scale(${pop})`, opacity: clamp(pop, 0, 1), boxShadow: `0 ${size * 0.12}px ${size * 0.3}px rgba(109,40,217,.45)` }}>
        <img src={MICON} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 990, textAlign: 'center', opacity: w, transform: `translateY(${(1 - w) * 30}px)` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, direction: 'ltr' }}>
          <span style={{ fontFamily: MSERIF, fontWeight: 700, fontSize: 130, color: '#fff', letterSpacing: 6, lineHeight: 1 }}>WAB</span>
          <span style={{ fontFamily: MAR, fontWeight: 700, fontSize: 52, padding: '10px 28px', borderRadius: 24, background: MG, color: '#fff', boxShadow: '0 14px 34px rgba(109,40,217,.5)' }}>أعمال</span>
        </div>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 30, letterSpacing: 10, color: '#C9AEF7', marginTop: 22 }}>WAB BUSINESS</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1250, textAlign: 'center', fontSize: 52, fontWeight: 600, color: '#fff', opacity: clamp(tag1, 0, 1), transform: `translateY(${(1 - clamp(tag1, 0, 1)) * 20}px)` }}>كل صالونك في جيبك</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1250, textAlign: 'center', opacity: cl(1.3), transform: `translateY(${(1 - cl(1.3)) * 20}px)` }}>
        <div style={{ fontSize: 58, fontWeight: 700, color: '#fff' }}>سجّل صالونك مجاناً</div>
        <div style={{ fontSize: 34, fontWeight: 500, color: '#D8B4FE', marginTop: 10 }}>فترة تجريبية مجانية · بدون عمولة على الحجز</div>
      </div>
      <div style={{ position: 'absolute', left: 190, right: 190, top: 1440, height: 120, borderRadius: 60, background: MG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46, fontWeight: 700, color: '#fff', boxShadow: '0 24px 60px rgba(109,40,217,.5)', opacity: cl(1.7), transform: `scale(${0.85 + 0.15 * mt(T, CUES.Close + 1.7, CUES.Close + 2.2, 0, 1, ME.pop)})` }}>حمّل WAB أعمال</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1610, display: 'flex', justifyContent: 'center', gap: 28, opacity: cl(2.1) }}>
        {['App Store', 'Google Play'].map(s => <div key={s} style={{ height: 96, padding: '0 40px', borderRadius: 24, border: '2px solid rgba(255,255,255,.35)', display: 'flex', alignItems: 'center', fontFamily: 'Poppins,sans-serif', fontSize: 34, fontWeight: 600, color: '#fff' }}>{s}</div>)}
      </div>
    </div>
  );
}

function MHeadline() {
  const { CUES } = useComposition();
  const H = (h, s) => (
    <div>
      <div style={{ fontSize: 84, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{h}</div>
      <div style={{ fontSize: 42, fontWeight: 500, color: '#D8B4FE', marginTop: 14 }}>{s}</div>
    </div>
  );
  return <Captions style={{ top: 230, bottom: 'auto', left: '5%', right: '5%', font: 'inherit', fontFamily: MAR, direction: 'rtl', textShadow: 'none' }} items={[
    { at: CUES.Register - 0.2, until: CUES.Approval - 0.15, text: H('سجّل صالونك بدقائق', 'الاسم، النوع والوثائق — هذا كل شيء') },
    { at: CUES.Approval, until: CUES.Setup - 0.15, text: H('موافقة سريعة', 'فريق WAB يراجع طلبك خلال يوم أو يومين') },
    { at: CUES.Setup, until: CUES.Live - 0.15, text: H('جهّز ملفك خطوة بخطوة', 'الخدمات، الطاقم، ساعات العمل والسياسات') },
    { at: CUES.Live, until: CUES.Request - 0.15, text: H('صالونك مباشر', 'يومك كاملاً في شاشة واحدة') },
    { at: CUES.Request, until: CUES.Accept - 0.15, text: H('طلبات فورية', 'تصلك لحظياً — حتى طلبات العرائس') },
    { at: CUES.Accept, until: CUES.Calendar - 0.15, text: H('اقبل بلمسة', 'ويصل الإشعار للزبونة فوراً') },
    { at: CUES.Calendar, until: CUES.Complete - 0.15, text: H('تقويم لكل الطاقم', 'مواعيد واضحة بألوان كل موظف') },
    { at: CUES.Complete, until: CUES.Stats - 0.15, text: H('أنهِ الموعد وحصّل', 'المتبقي محسوب تلقائياً') },
    { at: CUES.Stats, until: CUES.Payouts - 0.15, text: H('أرقامك بوضوح', 'الحجوزات، الإيرادات والتقييمات') },
    { at: CUES.Payouts, until: CUES.Close, text: H('دفعاتك في موعدها', 'تحويل مباشر إلى حسابك البنكي') },
  ]} />;
}

function MPiece() {
  const { T, CUES } = useComposition();
  const secs = Math.floor(T);
  const enterY = mt(T, CUES.Open + 3.1, CUES.Open + 4.2, 1500, 0, ME.enter) + mt(T, CUES.Close, CUES.Close + 0.9, 0, 1600, Easing.easeInCubic);
  const float = Math.sin(T * 0.9) * 6;
  const beats = [
    [CUES.Request + 1.0, CUES.Request + 1.6, CUES.Request + 3.6, CUES.Request + 4.2, 1.14, 195, 330, 40],
    [CUES.Calendar + 1.4, CUES.Calendar + 2.0, CUES.Calendar + 3.6, CUES.Calendar + 4.2, 1.22, 300, 420, 0],
    [CUES.Payouts + 2.2, CUES.Payouts + 2.7, CUES.Payouts + 3.8, CUES.Payouts + 4.3, 1.12, 195, 100, 60],
  ];
  let s = 1, ox = 195, oy = 422, ty = 0;
  for (const [a, b, c, d, S, x, y, dy] of beats) {
    if (T >= a - 0.01 && T <= d + 0.01) { const k = mt(T, a, b, 0, 1, ME.glide) - mt(T, c, d, 0, 1, ME.glide); s = 1 + (S - 1) * k; ox = x; oy = y; ty = dy * k; }
  }
  return (
    <div data-screen-label={`t=${secs}s`} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <MBackground />
      <div style={{ position: 'absolute', left: 219, top: 590, width: 414, height: 868, transformOrigin: '0 0', transform: `translateY(${enterY + float}px) scale(1.55)` }}>
        <div style={{ position: 'absolute', inset: 0, transformOrigin: `${ox + 12}px ${oy + 12}px`, transform: `translateY(${ty / 1.55}px) scale(${s})` }}>
          <MPhone>
            <Shot from={0} to={CUES.Approval}><RegisterScreen /></Shot>
            <Shot from={CUES.Approval} to={CUES.Setup}><ApprovalScreen /></Shot>
            <Shot from={CUES.Setup} to={CUES.Live}><SetupScreen /></Shot>
            <Shot from={CUES.Live} to={CUES.Request}><LiveScreen /></Shot>
            <Shot from={CUES.Request} to={CUES.Accept}><RequestScreen /></Shot>
            <Shot from={CUES.Accept} to={CUES.Calendar}><AcceptScreen /></Shot>
            <Shot from={CUES.Calendar} to={CUES.Complete}><CalendarScreen /></Shot>
            <Shot from={CUES.Complete} to={CUES.Stats}><CompleteScreen /></Shot>
            <Shot from={CUES.Stats} to={CUES.Payouts}><StatsScreen /></Shot>
            <Shot from={CUES.Payouts}><PayoutsScreen /></Shot>
          </MPhone>
        </div>
      </div>
      <MHeadline />
      <MBrand />
    </div>
  );
}

function WabMerchantAd() {
  const [tk, setTweak] = useTweaks(window.TWEAK_DEFAULTS || { motionEditor: true });
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b0b12' }}>
      <CompositionStage width={1080} height={1920} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg="#14172B">
        <MPiece />
      </CompositionStage>
      <TweaksPanel>
        <TweakSection label="Timeline" />
        <TweakToggle label="Motion editor" value={tk.motionEditor} onChange={v => setTweak('motionEditor', v)} />
      </TweaksPanel>
    </div>
  );
}
window.WabMerchantAd = WabMerchantAd;
