/* ============================================================
   CONTACT ME — rendered underneath the game cabinet.
   Fully self-contained: scoped classes (ct-*) + own stylesheet,
   so it can never collide with the game's CSS.
   ============================================================ */

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export default function ContactSection() {
  return (
    <section className="ct" aria-labelledby="ct-title">
      <style>{CT_CSS}</style>

      <div className="ct-head">
        <div>
          <p className="ct-eyebrow">SERVICE MODE · SUPPORT LINE</p>
          <h2 className="ct-title" id="ct-title">
            CONTACT ME
          </h2>
          <p className="ct-sub">
            Spotted a bug, want a new feature — or did you just beat my high score? Pick any line below; they all ring me directly.
          </p>
        </div>
        <div className="ct-led">
          <span className="ct-dot" aria-hidden="true" />
          ONLINE
        </div>
      </div>

      <div className="ct-rows">
        <a className="ct-row ct-row--phone" href="tel:0543421676">
          <span className="ct-chip">
            <PhoneIcon />
          </span>
          <span className="ct-meta">
            <span className="ct-label">PHONE</span>
            <span className="ct-value">0543421676</span>
          </span>
          <span className="ct-side">
            <span className="ct-hint">TAP TO CALL</span>
            <span className="ct-arrow">
              <Chevron />
            </span>
          </span>
        </a>

        <a className="ct-row ct-row--mail" href="mailto:arifalam1007@gmail.com">
          <span className="ct-chip">
            <MailIcon />
          </span>
          <span className="ct-meta">
            <span className="ct-label">EMAIL</span>
            <span className="ct-value ct-value--mail">arifalam1007@gmail.com</span>
          </span>
          <span className="ct-side">
            <span className="ct-hint">TAP TO WRITE</span>
            <span className="ct-arrow">
              <Chevron />
            </span>
          </span>
        </a>

        <a className="ct-row ct-row--wa" href="https://wa.me/971543421676" target="_blank" rel="noopener noreferrer">
          <span className="ct-chip">
            <WhatsAppIcon />
          </span>
          <span className="ct-meta">
            <span className="ct-label">
              WHATSAPP <em className="ct-tag">FASTEST REPLY</em>
            </span>
            <span className="ct-value">💬 Message me on WhatsApp</span>
          </span>
          <span className="ct-side">
            <span className="ct-hint">OPENS CHAT</span>
            <span className="ct-arrow">
              <Chevron />
            </span>
          </span>
        </a>
      </div>

      <p className="ct-foot">REPLIES USUALLY WITHIN A FEW HOURS · 7 DAYS A WEEK</p>
    </section>
  );
}

/* ------------------------------------------------------------ */
const CT_CSS = `
.ct{
  width:min(620px,100%); position:relative; z-index:1; overflow:hidden;
  background:linear-gradient(180deg,#0a1a12,#07110b);
  border:1px solid #1c3829; border-radius:10px;
  padding:20px 18px 15px;
  box-shadow:0 30px 80px rgba(0,0,0,.55), 0 0 0 4px rgba(9,22,15,.6), inset 0 1px 0 rgba(160,255,200,.06);
  color:#eafff1; font-family:'Space Grotesk','Segoe UI',sans-serif;
}
.ct::before{
  content:""; position:absolute; top:0; left:14px; right:14px; height:2px;
  background:linear-gradient(90deg, transparent, rgba(82,240,107,.75) 30%, rgba(255,198,92,.75) 70%, transparent);
}
.ct-head{display:flex; align-items:flex-start; justify-content:space-between; gap:14px;}
.ct-eyebrow{margin:0 0 9px; font-family:'Press Start 2P','Courier New',monospace; font-size:7px; letter-spacing:.3em; color:#4e8a68;}
.ct-title{
  margin:0; font-family:'Press Start 2P','Courier New',monospace; font-weight:400;
  font-size:clamp(16px,3.4vw,21px); letter-spacing:.05em; color:#eafff1;
  text-shadow:0 0 16px rgba(82,240,107,.5), 3px 3px 0 #0a2416;
}
.ct-sub{margin:11px 0 0; max-width:52ch; font-size:13.5px; line-height:1.6; color:#7fe8a6;}
.ct-led{
  flex:none; display:inline-flex; align-items:center; gap:7px; margin-top:3px;
  font-family:'Press Start 2P','Courier New',monospace; font-size:7px; letter-spacing:.18em; color:#7fe8a6;
}
.ct-dot{
  width:8px; height:8px; border-radius:50%; background:#52f06b;
  box-shadow:0 0 9px 2px rgba(82,240,107,.6); animation:ctpulse 1.4s ease-in-out infinite;
}
@keyframes ctpulse{50%{opacity:.35}}

.ct-rows{margin-top:18px; display:grid; gap:10px;}
.ct-row{
  display:grid; grid-template-columns:46px 1fr auto; align-items:center; gap:14px;
  padding:13px 14px; text-decoration:none; color:inherit;
  background:#0b1d14; border:1px solid #1c3829; border-radius:8px;
  transition:transform .15s ease, border-color .15s ease, box-shadow .15s ease, background .15s ease;
}
.ct-row:hover{
  transform:translateY(-2px); border-color:rgba(82,240,107,.5);
  background:#0d2218; box-shadow:0 12px 26px rgba(0,0,0,.4), 0 0 20px rgba(82,240,107,.14);
}
.ct-row:active{transform:translateY(1px); box-shadow:0 4px 12px rgba(0,0,0,.35);}
.ct-row:focus-visible{outline:2px solid #52f06b; outline-offset:2px;}

.ct-chip{
  width:46px; height:46px; display:flex; align-items:center; justify-content:center;
  background:#0d2418; border:1px solid #2c523c; border-radius:8px; color:#7fe8a6;
  transition:color .15s ease, border-color .15s ease, box-shadow .15s ease;
}
.ct-row:hover .ct-chip{border-color:currentColor;}
.ct-row--phone .ct-chip{color:#ffc65c;}
.ct-row--phone:hover .ct-chip{box-shadow:0 0 16px rgba(255,198,92,.3);}
.ct-row--mail:hover .ct-chip{box-shadow:0 0 16px rgba(127,232,166,.3);}
.ct-row--wa .ct-chip{color:#25d366; border-color:rgba(37,211,102,.4);}
.ct-row--wa:hover .ct-chip{box-shadow:0 0 16px rgba(37,211,102,.35);}

.ct-label{
  display:flex; align-items:center; gap:8px; margin-bottom:6px;
  font-family:'Press Start 2P','Courier New',monospace; font-size:7px; letter-spacing:.26em; color:#4e8a68;
}
.ct-value{display:block; font-size:15px; font-weight:600; letter-spacing:.02em; color:#eafff1;}
.ct-value--mail{font-size:14px; word-break:break-all;}
.ct-tag{
  font-style:normal; font-family:'Press Start 2P','Courier New',monospace; font-size:6px; letter-spacing:.12em;
  color:#062012; background:#ffc65c; padding:3px 6px; border-radius:3px; transform:rotate(-1.5deg);
  box-shadow:0 2px 0 #8a6420;
}
.ct-row--wa{
  background:linear-gradient(180deg,#0e2b1a,#0a1f12); border-color:rgba(82,240,107,.35);
}
.ct-row--wa:hover{border-color:#25d366; box-shadow:0 12px 26px rgba(0,0,0,.4), 0 0 22px rgba(37,211,102,.22);}

.ct-side{display:flex; align-items:center; gap:12px;}
.ct-hint{font-family:'Press Start 2P','Courier New',monospace; font-size:6.5px; letter-spacing:.18em; color:#35684d;}
.ct-arrow{display:flex; color:#4e8a68; transition:transform .15s ease, color .15s ease;}
.ct-row:hover .ct-arrow{transform:translateX(4px); color:#eafff1;}

.ct-foot{
  margin:15px 0 0; font-family:'Press Start 2P','Courier New',monospace;
  font-size:6.5px; letter-spacing:.22em; color:#2f5a43; text-align:center;
}

@media (max-width:560px){
  .ct{padding:17px 14px 13px;}
  .ct-row{grid-template-columns:42px 1fr auto; padding:12px 12px; gap:11px;}
  .ct-chip{width:42px; height:42px;}
  .ct-hint{display:none;}
  .ct-sub{font-size:13px;}
  .ct-led{margin-top:1px;}
}
@media (prefers-reduced-motion:reduce){
  .ct-dot{animation:none;}
  .ct-row,.ct-chip,.ct-arrow{transition:none;}
}
`;
