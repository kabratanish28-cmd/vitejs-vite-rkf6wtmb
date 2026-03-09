import { useState, useEffect, useRef } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://aruemywjjfnpplqpbywe.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydWVteXdqamZucHBscXBieXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzM1ODUsImV4cCI6MjA4ODUwOTU4NX0.rnQ_pLhQPvtuJa9mre9_t_igopql-nf2CuTCgCP-EW4";
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";
const INDEX_NAME = "MOCK50";
const STARTING_BALANCE = 10000000; // 1 crore

const STOCKS = [
  { symbol: "RELIANCE",   name: "Reliance Industries", sector: "Energy",  base: 2850 },
  { symbol: "TCS",        name: "Tata Consultancy",    sector: "IT",      base: 3920 },
  { symbol: "HDFCBANK",   name: "HDFC Bank",           sector: "Banking", base: 1680 },
  { symbol: "INFY",       name: "Infosys",             sector: "IT",      base: 1540 },
  { symbol: "ICICIBANK",  name: "ICICI Bank",          sector: "Banking", base: 1120 },
  { symbol: "WIPRO",      name: "Wipro",               sector: "IT",      base: 480  },
  { symbol: "AXISBANK",   name: "Axis Bank",           sector: "Banking", base: 1050 },
  { symbol: "SUNPHARMA",  name: "Sun Pharma",          sector: "Pharma",  base: 1650 },
  { symbol: "TATAMOTORS", name: "Tata Motors",         sector: "Auto",    base: 890  },
  { symbol: "BAJFINANCE", name: "Bajaj Finance",       sector: "Finance", base: 7200 },
];

const BASE_PRICES = Object.fromEntries(STOCKS.map(s => [s.symbol, s.base]));
const BASE_INDEX  = 18500;

const fmt    = n  => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtCr  = n  => { if (n >= 1e7) return "₹" + (n/1e7).toFixed(2) + "Cr"; if (n >= 1e5) return "₹" + (n/1e5).toFixed(1) + "L"; return fmt(n); };
const fmtPct = (a,b) => { const p = ((a-b)/b)*100; return (p>=0?"+":"")+p.toFixed(2)+"%"; };
const clr    = (a,b) => a >= b ? "#10b981" : "#ef4444";
const clrV   = v    => v >= 0  ? "#10b981" : "#ef4444";
const tsStr  = ts   => new Date(ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"});

let _sb = null;
const sb = () => { if (!_sb) _sb = createClient(SUPABASE_URL, SUPABASE_KEY); return _sb; };

function erf(x) {
  const s = x < 0 ? -1 : 1; x = Math.abs(x);
  const t = 1/(1+0.3275911*x);
  return s*(1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x));
}
const N = x => (1+erf(x/Math.SQRT2))/2;
function bsPrice(type,S,K,T=0.083,r=0.06,v=0.22) {
  if (T<=0) return Math.max(0,type==="CE"?S-K:K-S);
  const d1=(Math.log(S/K)+(r+v*v/2)*T)/(v*Math.sqrt(T));
  const d2=d1-v*Math.sqrt(T);
  return type==="CE"?Math.max(0.01,S*N(d1)-K*Math.exp(-r*T)*N(d2)):Math.max(0.01,K*Math.exp(-r*T)*N(-d2)-S*N(-d1));
}
function getStrikes(idx) {
  const atm = Math.round(idx/100)*100;
  return Array.from({length:11},(_,i)=>atm+(i-5)*100);
}

// ─── SECTOR COLORS ───────────────────────────────────────────────────
const SECTOR_COLORS = {
  Energy:  { bg:"#fef3c7", accent:"#f59e0b", text:"#92400e" },
  IT:      { bg:"#dbeafe", accent:"#3b82f6", text:"#1e40af" },
  Banking: { bg:"#d1fae5", accent:"#10b981", text:"#065f46" },
  Pharma:  { bg:"#fce7f3", accent:"#ec4899", text:"#9d174d" },
  Auto:    { bg:"#ede9fe", accent:"#8b5cf6", text:"#4c1d95" },
  Finance: { bg:"#ffedd5", accent:"#f97316", text:"#7c2d12" },
};

// ─── CSS ─────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&family=Clash+Display:wght@600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'DM Sans',sans-serif;background:#f0f4ff;color:#1a1f36;overflow-x:hidden;min-height:100vh}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:#e8ecf8}
::-webkit-scrollbar-thumb{background:#c7d0f0;border-radius:3px}

@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes toastIn{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes popIn{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}

.fade-up{animation:fadeUp .35s cubic-bezier(.22,.68,0,1.2) both}

/* ── BUTTONS ── */
.btn{border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;border-radius:10px;transition:all .18s ease;letter-spacing:.1px;display:inline-flex;align-items:center;justify-content:center;gap:5px}
.btn:hover{transform:translateY(-1px)}
.btn:active{transform:translateY(0) scale(.98)}
.btn-buy{background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:10px 22px;font-size:14px;box-shadow:0 2px 12px rgba(16,185,129,.25)}
.btn-buy:hover{box-shadow:0 4px 20px rgba(16,185,129,.4)}
.btn-sell{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:10px 22px;font-size:14px;box-shadow:0 2px 12px rgba(239,68,68,.25)}
.btn-sell:hover{box-shadow:0 4px 20px rgba(239,68,68,.4)}
.btn-primary{background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;padding:12px 26px;font-size:15px;box-shadow:0 2px 16px rgba(99,102,241,.3)}
.btn-primary:hover{box-shadow:0 6px 24px rgba(99,102,241,.45)}
.btn-ghost{background:#fff;color:#6b7280;border:1.5px solid #e5e7eb;padding:8px 16px;font-size:13px;border-radius:9px}
.btn-ghost:hover{background:#f9fafb;border-color:#d1d5db;color:#374151}
.btn-danger{background:linear-gradient(135deg,#ef4444,#b91c1c);color:#fff;padding:10px 22px;font-size:14px}
.btn-warn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:10px 22px;font-size:14px}
.btn-sm{padding:5px 12px!important;font-size:12px!important;border-radius:8px!important}
.btn-xs{padding:3px 9px!important;font-size:11px!important;border-radius:6px!important}

/* ── CARDS ── */
.card{background:#fff;border:1.5px solid #e8ecf8;border-radius:18px;padding:22px;box-shadow:0 2px 12px rgba(99,102,241,.06)}
.card-accent{background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;box-shadow:0 8px 32px rgba(99,102,241,.35)}
.card-green{background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;box-shadow:0 8px 32px rgba(16,185,129,.3)}
.card-orange{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;box-shadow:0 8px 28px rgba(245,158,11,.3)}
.card-red{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;box-shadow:0 8px 28px rgba(239,68,68,.3)}

/* ── INPUTS ── */
input,select,textarea{background:#f8faff;border:1.5px solid #e2e8f8;border-radius:10px;color:#1a1f36;font-family:'DM Sans',sans-serif;font-size:14px;padding:10px 14px;outline:none;width:100%;transition:all .2s}
input:focus,select:focus,textarea:focus{border-color:#6366f1;background:#fff;box-shadow:0 0 0 3px rgba(99,102,241,.12)}
textarea{resize:vertical;min-height:90px}

/* ── NAV ── */
.nav{background:#fff;border-bottom:2px solid #eef0fb;padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:62px;position:sticky;top:0;z-index:100;flex-wrap:wrap;gap:8px;box-shadow:0 2px 16px rgba(99,102,241,.06)}
.nav-logo{font-family:'Syne',sans-serif;font-weight:800;font-size:20px;background:linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-.3px}
.nav-tabs{display:flex;gap:2px;flex-wrap:wrap}
.nav-tab{padding:7px 14px;border-radius:9px;font-size:12.5px;font-weight:600;cursor:pointer;border:none;background:none;color:#9ca3af;transition:all .2s;font-family:'DM Sans',sans-serif;letter-spacing:.1px}
.nav-tab.active{background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(139,92,246,.12));color:#6366f1;box-shadow:inset 0 0 0 1px rgba(99,102,241,.2)}
.nav-tab:hover:not(.active){color:#6b7280;background:rgba(0,0,0,.03)}

/* ── TICKER ── */
.ticker-bar{background:linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899,#f59e0b,#10b981,#6366f1);background-size:300% 100%;animation:shimmer 8s linear infinite;padding:8px 0;overflow:hidden}
.ticker-wrap{display:flex;width:max-content;animation:ticker 35s linear infinite}
.ticker-item{display:flex;gap:6px;align-items:center;font-size:11.5px;font-weight:700;padding:0 28px;white-space:nowrap;color:#fff;letter-spacing:.3px}

/* ── STATS ── */
.stat{background:#fff;border:1.5px solid #e8ecf8;border-radius:14px;padding:16px 20px;box-shadow:0 2px 8px rgba(99,102,241,.04);position:relative;overflow:hidden}
.stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--accent,linear-gradient(90deg,#6366f1,#8b5cf6))}
.stat-label{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:6px;font-weight:600}
.stat-val{font-size:19px;font-weight:700;font-family:'DM Mono',monospace;color:#1a1f36}

/* ── TABLE ── */
table{width:100%;border-collapse:collapse}
th{color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:10px 14px;text-align:left;border-bottom:2px solid #f0f4ff;background:#fafbff}
td{padding:10px 14px;font-size:13px;border-bottom:1px solid #f0f4ff;color:#374151}
tr:last-child td{border-bottom:none}
tr:hover td{background:#fafbff}

/* ── TAGS ── */
.tag{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.3px}
.tag-green{background:#d1fae5;color:#065f46}
.tag-red{background:#fee2e2;color:#991b1b}
.tag-blue{background:#dbeafe;color:#1e40af}
.tag-orange{background:#ffedd5;color:#9a3412}
.tag-yellow{background:#fef3c7;color:#92400e}
.tag-purple{background:#ede9fe;color:#4c1d95}
.tag-gray{background:#f3f4f6;color:#4b5563}

/* ── MODAL ── */
.modal-bg{position:fixed;inset:0;background:rgba(15,23,42,.6);backdrop-filter:blur(8px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:#fff;border:1.5px solid #e8ecf8;border-radius:24px;padding:32px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 32px 80px rgba(15,23,42,.25);animation:popIn .25s cubic-bezier(.22,.68,0,1.2)}

/* ── LIVE DOT ── */
.live-dot{width:7px;height:7px;border-radius:50%;background:#10b981;animation:pulse 1.4s infinite;display:inline-block;margin-right:5px;box-shadow:0 0 6px rgba(16,185,129,.6)}

/* ── MONO ── */
.mono{font-family:'DM Mono',monospace}

/* ── NEWS ── */
.news-item{border-left:4px solid #6366f1;background:#fafbff;border-radius:0 12px 12px 0;padding:14px 18px;margin-bottom:10px;transition:all .2s}
.news-item:hover{background:#f0f4ff;transform:translateX(2px)}

/* ── LOGIN ── */
.login-bg{min-height:100vh;background:linear-gradient(135deg,#f0f4ff 0%,#e8ecff 40%,#f5f0ff 70%,#fff5f8 100%);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.login-bg::before{content:'';position:absolute;width:600px;height:600px;background:radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 65%);top:-100px;right:-150px;pointer-events:none}
.login-bg::after{content:'';position:absolute;width:500px;height:500px;background:radial-gradient(circle,rgba(236,72,153,.09) 0%,transparent 65%);bottom:-100px;left:-100px;pointer-events:none}

/* ── TOAST ── */
.toast{position:fixed;bottom:28px;right:28px;padding:14px 20px;border-radius:14px;font-weight:600;font-size:14px;z-index:999;animation:toastIn .3s cubic-bezier(.22,.68,0,1.2);max-width:340px;box-shadow:0 8px 32px rgba(0,0,0,.15)}
.toast-success{background:linear-gradient(135deg,#059669,#10b981);color:#fff}
.toast-error{background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff}
.toast-info{background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff}

/* ── GRIDS ── */
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}

/* ── BADGES ── */
.badge-admin{background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:.8px}
.badge-approved{background:#d1fae5;color:#065f46;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700}
.badge-pending{background:#fef3c7;color:#92400e;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700}
.badge-phase{padding:5px 14px;border-radius:20px;font-size:12px;font-weight:800;letter-spacing:.5px}
.badge-phase-1{background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1e40af;border:1.5px solid #93c5fd}
.badge-phase-2{background:linear-gradient(135deg,#fef3c7,#fde68a);color:#92400e;border:1.5px solid #fcd34d}

/* ── STOCK CARD ── */
.stock-card{background:#fff;border:2px solid #eef0fb;border-radius:16px;padding:18px;cursor:pointer;transition:all .22s cubic-bezier(.22,.68,0,1.2)}
.stock-card:hover{border-color:#6366f1;box-shadow:0 6px 24px rgba(99,102,241,.15);transform:translateY(-2px)}
.stock-card.selected{border-color:#6366f1;background:linear-gradient(135deg,#fafbff,#f0f4ff);box-shadow:0 8px 32px rgba(99,102,241,.2)}

/* ── ORDER PANEL ── */
.order-panel{background:#fff;border:2px solid #e8ecf8;border-radius:18px;padding:22px;position:sticky;top:80px;box-shadow:0 4px 20px rgba(99,102,241,.08)}

/* ── LEADERBOARD ── */
.lb-row{display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:14px;margin-bottom:8px;transition:all .2s;border:1.5px solid #eef0fb;background:#fff}
.lb-row:hover{background:#f8f9ff;border-color:#c7d2fe}
.lb-rank{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0}

/* ── PHASE TOGGLE ── */
.phase-toggle{display:flex;gap:4px;background:#f0f4ff;border-radius:12px;padding:4px}
.phase-btn{padding:6px 16px;border-radius:9px;font-size:12px;font-weight:700;border:none;cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif}
.phase-btn.active-1{background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;box-shadow:0 2px 8px rgba(99,102,241,.35)}
.phase-btn.active-2{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;box-shadow:0 2px 8px rgba(245,158,11,.35)}
.phase-btn.inactive{background:none;color:#9ca3af}

/* ── CHART MINI ── */
.mini-chart{display:flex;align-items:flex-end;gap:2px;height:28px}
.mini-bar{width:4px;border-radius:2px 2px 0 0;min-height:4px;transition:height .3s ease}

/* ── SECTION HEADER ── */
.sec-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.sec-title{font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:#1a1f36;letter-spacing:-.2px}

/* ── DIVIDER ── */
.divider{height:1px;background:linear-gradient(90deg,transparent,#e8ecf8,transparent);margin:16px 0}

/* ── SCROLLABLE TABLE ── */
.table-wrap{overflow-x:auto;border-radius:12px;border:1.5px solid #eef0fb}
`;

// ─── MAIN APP ─────────────────────────────────────────────────────────
export default function App() {
  const [screen,  setScreen]  = useState("login");
  const [user,    setUser]    = useState(null);
  const [prices,  setPrices]  = useState({...BASE_PRICES});
  const [prev,    setPrev]    = useState({...BASE_PRICES});
  const [idx,     setIdx]     = useState(BASE_INDEX);
  const [news,    setNews]    = useState([]);
  const [trades,  setTrades]  = useState([]);
  const [users,   setUsers]   = useState([]);
  const [orders,  setOrders]  = useState([]);
  const [phase,   setPhase]   = useState(1);
  const [toast,   setToast]   = useState(null);
  const toastRef = useRef(null);
  const chRef    = useRef([]);

  const showToast = (msg, type="success") => {
    setToast({msg,type});
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3200);
  };

  // ── real-time subscriptions ──────────────────────────────────────
  useEffect(() => {
    if (screen === "login") return;
    loadAll();

    const c1 = sb().channel("price-bc")
      .on("broadcast", {event:"px"}, ({payload}) => {
        setPrev(payload.prev); setPrices(payload.prices); setIdx(payload.idx);
      }).subscribe();

    const c2 = sb().channel("news-bc")
      .on("broadcast", {event:"news"}, ({payload}) => {
        setNews(p => [payload.item, ...p]);
      }).subscribe();

    const c3 = sb().channel("trade-bc")
      .on("broadcast", {event:"trade"}, ({payload}) => {
        setTrades(p => [payload.item, ...p].slice(0,150));
      }).subscribe();

    const c4 = sb().channel("app-bc")
      .on("broadcast", {event:"user_update"},  ()           => { loadUsers(); })
      .on("broadcast", {event:"order_update"}, ()           => { loadOrders(); })
      .on("broadcast", {event:"phase_change"}, ({payload})  => { setPhase(payload.phase); })
      .subscribe();

    chRef.current = [c1, c2, c3, c4];

    // ── poll prices every 3s for low-latency feel ──
    const pollInterval = setInterval(async () => {
      const { data } = await sb().from("mm_prices").select("*").order("updated_at",{ascending:false}).limit(1);
      if (data?.[0]) {
        const p = data[0].prices;
        setPrices(curr => {
          if (JSON.stringify(curr) !== JSON.stringify(p)) { setPrev(curr); return p; }
          return curr;
        });
        setIdx(data[0].index_price ?? BASE_INDEX);
      }
    }, 3000);

    return () => {
      chRef.current.forEach(c => sb().removeChannel(c));
      clearInterval(pollInterval);
    };
  }, [screen]);

  const loadAll      = async () => { await Promise.all([loadPrices(), loadNews(), loadTrades(), loadUsers(), loadOrders(), loadPhase()]); };
  const loadPhase    = async () => { const {data} = await sb().from("mm_settings").select("*").eq("key","phase").single(); if (data) setPhase(parseInt(data.value)); };
  const loadOrders   = async () => { const {data} = await sb().from("mm_orders").select("*").eq("status","open").order("created_at",{ascending:false}); if (data) setOrders(data); };
  const loadPrices   = async () => { const {data} = await sb().from("mm_prices").select("*").order("updated_at",{ascending:false}).limit(1); if (data?.[0]) { setPrices(data[0].prices); setPrev(data[0].prices); setIdx(data[0].index_price??BASE_INDEX); } };
  const loadNews     = async () => { const {data} = await sb().from("mm_news").select("*").order("created_at",{ascending:false}).limit(30); if (data) setNews(data); };
  const loadTrades   = async () => { const {data} = await sb().from("mm_trades").select("*").order("created_at",{ascending:false}).limit(150); if (data) setTrades(data); };
  const loadUsers    = async () => { const {data} = await sb().from("mm_users").select("*").order("created_at",{ascending:true}); if (data) setUsers(data); };
  const refreshUser  = async () => { if (!user) return; const {data} = await sb().from("mm_users").select("*").eq("id",user.id).single(); if (data) setUser(data); };

  const portfolio  = user?.portfolio  ?? {};
  const optPort    = user?.options_portfolio ?? [];
  const cash       = user?.cash ?? 0;
  const indexPrice = idx;

  const stockValue = Object.entries(portfolio).reduce((a,[sym,pos])=>a+(prices[sym]??BASE_PRICES[sym])*pos.qty, 0);
  const optValue   = optPort.reduce((a,p)=>a+bsPrice(p.type,indexPrice,p.strike)*75*p.lots, 0);
  const totalValue = cash + stockValue + optValue;
  const pnl        = totalValue - STARTING_BALANCE;

  const handleLogout = () => { setUser(null); setScreen("login"); };

  if (screen === "login") return (
    <>
      <style>{CSS}</style>
      <LoginScreen onLogin={(u,isAdmin) => { if (isAdmin) { setScreen("admin"); } else { setUser(u); setScreen("market"); } }} showToast={showToast} />
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </>
  );

  if (screen === "admin") return (
    <>
      <style>{CSS}</style>
      <AdminScreen prices={prices} prevPrices={prev} indexPrice={indexPrice} news={news} trades={trades} users={users} orders={orders}
        onLogout={handleLogout} setPrices={setPrices} setPrev={setPrev} setIdx={setIdx} setNews={setNews}
        setTrades={setTrades} setUsers={setUsers} setOrders={setOrders} setPhase={setPhase}
        loadAll={loadAll} showToast={showToast} phase={phase} />
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <MarketScreen user={user} prices={prices} prevPrices={prev} indexPrice={indexPrice} news={news}
        trades={trades} users={users} cash={cash} portfolio={portfolio} optPort={optPort}
        stockValue={stockValue} totalValue={totalValue} pnl={pnl} phase={phase} orders={orders}
        loadOrders={loadOrders} onLogout={handleLogout} showToast={showToast} refreshUser={refreshUser} setUser={setUser} />
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────
function LoginScreen({ onLogin, showToast }) {
  const [mode, setMode]   = useState("login");
  const [uname, setUname] = useState("");
  const [dname, setDname] = useState("");
  const [pass,  setPass]  = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    if (!uname || !pass) { showToast("Fill in all fields", "error"); return; }
    if (uname.toLowerCase()===ADMIN_USER && pass===ADMIN_PASS) { onLogin(null,true); return; }
    setLoading(true);
    const {data} = await sb().from("mm_users").select("*").eq("username",uname).eq("password",pass).single();
    if (!data) { showToast("Invalid credentials","error"); setLoading(false); return; }
    if (data.status==="pending") { showToast("Account pending admin approval","info"); setLoading(false); return; }
    if (data.status==="rejected") { showToast("Account rejected","error"); setLoading(false); return; }
    onLogin(data, false);
    setLoading(false);
  };

  const doRegister = async () => {
    if (!uname || !pass || !dname) { showToast("Fill in all fields","error"); return; }
    setLoading(true);
    const {data:ex} = await sb().from("mm_users").select("id").eq("username",uname).single();
    if (ex) { showToast("Username taken","error"); setLoading(false); return; }
    await sb().from("mm_users").insert({ username:uname, password:pass, display_name:dname, cash:STARTING_BALANCE, portfolio:{}, options_portfolio:[], status:"pending", total_invested:0 });
    await sb().channel("app-bc").send({type:"broadcast",event:"user_update",payload:{}});
    showToast("Registration submitted! Wait for admin approval","info");
    setMode("login"); setUname(""); setPass(""); setDname("");
    setLoading(false);
  };

  return (
    <div className="login-bg">
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:420,padding:24}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div className="nav-logo" style={{fontSize:34,marginBottom:8,display:"block"}}>MockMarket</div>
          <div style={{color:"#6b7280",fontSize:14}}>Simulated Stock Exchange · Educational Trading</div>
        </div>
        <div className="card" style={{boxShadow:"0 24px 64px rgba(99,102,241,.15)"}}>
          <div style={{display:"flex",background:"#f0f4ff",borderRadius:12,padding:4,marginBottom:22}}>
            {["login","register"].map(m=>(
              <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"9px 0",borderRadius:10,border:"none",fontWeight:700,fontSize:13,cursor:"pointer",transition:"all .2s",fontFamily:"'DM Sans',sans-serif",background:mode===m?"#fff":"none",color:mode===m?"#6366f1":"#9ca3af",boxShadow:mode===m?"0 2px 8px rgba(99,102,241,.15)":"none"}}>
                {m==="login"?"Sign In":"Register"}
              </button>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <div style={{fontSize:12,color:"#9ca3af",marginBottom:5,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Username</div>
              <input value={uname} onChange={e=>setUname(e.target.value)} placeholder="e.g. dhruv_k" onKeyDown={e=>e.key==="Enter"&&(mode==="login"?doLogin():doRegister())} />
            </div>
            {mode==="register" && (
              <div>
                <div style={{fontSize:12,color:"#9ca3af",marginBottom:5,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Display Name</div>
                <input value={dname} onChange={e=>setDname(e.target.value)} placeholder="e.g. Dhruv Kapoor" />
              </div>
            )}
            <div>
              <div style={{fontSize:12,color:"#9ca3af",marginBottom:5,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Password</div>
              <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&(mode==="login"?doLogin():doRegister())} />
            </div>
            <button className="btn btn-primary" style={{width:"100%",marginTop:4}} onClick={mode==="login"?doLogin:doRegister} disabled={loading}>
              {loading?"Please wait…":mode==="login"?"Sign In →":"Create Account →"}
            </button>
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:16,fontSize:12,color:"#9ca3af"}}>
          Starting balance: <b style={{color:"#6366f1"}}>₹1 Crore</b> · Phase-based trading simulation
        </div>
      </div>
    </div>
  );
}

// ─── TICKER BAR ───────────────────────────────────────────────────────
function TickerBar({ prices, prevPrices, indexPrice }) {
  const items = STOCKS.map(s => ({ sym:s.symbol, p:prices[s.symbol]??s.base, pv:prevPrices[s.symbol]??s.base }));
  const all   = [...items, ...items];
  return (
    <div className="ticker-bar">
      <div className="ticker-wrap">
        {all.map((it,i) => (
          <div key={i} className="ticker-item">
            <span>{it.sym}</span>
            <span style={{opacity:.7}}>₹{Number(it.p).toLocaleString("en-IN",{maximumFractionDigits:1})}</span>
            <span style={{color:it.p>=it.pv?"#a7f3d0":"#fecaca"}}>{fmtPct(it.p,it.pv)}</span>
            <span style={{opacity:.4,margin:"0 8px"}}>·</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LEADERBOARD COMPONENT ────────────────────────────────────────────
function LeaderboardWidget({ users, prices, indexPrice, compact=false }) {
  const approved = users.filter(u=>u.status==="approved");
  const ranked   = approved.map(u => {
    const sv    = Object.entries(u.portfolio??{}).reduce((a,[sym,pos])=>a+(prices[sym]??BASE_PRICES[sym])*pos.qty,0);
    const ov    = (u.options_portfolio??[]).reduce((a,p)=>a+bsPrice(p.type,indexPrice,p.strike)*75*p.lots,0);
    const total = u.cash+sv+ov;
    return {...u, total, pnl:total-STARTING_BALANCE, pnlPct:((total-STARTING_BALANCE)/STARTING_BALANCE)*100};
  }).sort((a,b)=>b.total-a.total);

  const medals = ["🥇","🥈","🥉"];
  const rankColors = [
    {bg:"linear-gradient(135deg,#fef3c7,#fde68a)",border:"#fcd34d",num:"#92400e"},
    {bg:"linear-gradient(135deg,#f3f4f6,#e5e7eb)",border:"#d1d5db",num:"#4b5563"},
    {bg:"linear-gradient(135deg,#ffedd5,#fed7aa)",border:"#fdba74",num:"#7c2d12"},
  ];

  if (ranked.length===0) return <div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>No participants yet</div>;

  return (
    <div>
      {ranked.map((u,i) => {
        const rc = rankColors[i] ?? {bg:"#fff",border:"#eef0fb",num:"#9ca3af"};
        return (
          <div key={u.id} className="lb-row" style={{background:i<3?rc.bg:"#fff",borderColor:rc.border}}>
            <div className="lb-rank" style={{background:i<3?rc.border:"#f0f4ff",color:rc.num}}>
              {i<3?medals[i]:i+1}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14,color:"#1a1f36",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.display_name}</div>
              {!compact && <div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>{u.username}</div>}
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div className="mono" style={{fontWeight:700,fontSize:14,color:"#1a1f36"}}>{fmtCr(u.total)}</div>
              <div style={{fontSize:11,fontWeight:600,color:clrV(u.pnl),marginTop:1}}>{u.pnl>=0?"+":""}{u.pnlPct.toFixed(2)}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MARKET SCREEN ────────────────────────────────────────────────────
function MarketScreen({ user, prices, prevPrices, indexPrice, news, trades, users, cash, portfolio, optPort, stockValue, totalValue, pnl, phase, orders, loadOrders, onLogout, showToast, refreshUser, setUser }) {
  const [tab, setTab] = useState("market");
  const tabs     = ["market","portfolio","derivatives","orderbook","news","leaderboard","tradelog"];
  const tabLabel = { market:"📊 Market", portfolio:"💼 Portfolio", derivatives:"⚡ Derivatives", orderbook:"📋 Order Book", news:"📰 News", leaderboard:"🏆 Leaderboard", tradelog:"📜 Trade Log" };

  return (
    <div style={{minHeight:"100vh",background:"#f0f4ff"}}>
      <TickerBar prices={prices} prevPrices={prevPrices} indexPrice={indexPrice} />
      <div className="nav">
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span className="nav-logo">MockMarket</span>
          <div className="nav-tabs">
            {tabs.map(t=><button key={t} className={`nav-tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>{tabLabel[t]}</button>)}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span className={`badge-phase badge-phase-${phase}`}>PHASE {phase} — {phase===1?"BUILD":"TRADE"}</span>
          <span style={{fontSize:13,fontWeight:600,color:"#6b7280"}}>{user.display_name}</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{background:"#fff",borderBottom:"1.5px solid #eef0fb",padding:"10px 24px"}}>
        <div style={{display:"flex",gap:28,alignItems:"center",flexWrap:"wrap"}}>
          {[
            {label:"Cash",    val:fmtCr(cash),       color:"#6366f1"},
            {label:"Stocks",  val:fmtCr(stockValue), color:"#3b82f6"},
            {label:"Total",   val:fmtCr(totalValue), color:"#1a1f36"},
            {label:"P&L",     val:(pnl>=0?"+":"")+fmtCr(pnl)+" ("+fmtPct(totalValue,STARTING_BALANCE)+")", color:clrV(pnl)},
          ].map(s=>(
            <div key={s.label} style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:"#9ca3af",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>{s.label}</span>
              <span className="mono" style={{fontWeight:700,fontSize:14,color:s.color}}>{s.val}</span>
            </div>
          ))}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5}}>
            <span className="live-dot"/>
            <span style={{fontSize:12,color:"#10b981",fontWeight:600}}>LIVE</span>
          </div>
        </div>
      </div>

      <div style={{padding:24}}>
        {tab==="market"      && <MarketTab      prices={prices} prevPrices={prevPrices} portfolio={portfolio} cash={cash} user={user} showToast={showToast} refreshUser={refreshUser} phase={phase} loadOrders={loadOrders} />}
        {tab==="portfolio"   && <PortfolioTab   portfolio={portfolio} optPort={optPort} prices={prices} indexPrice={indexPrice} cash={cash} user={user} showToast={showToast} refreshUser={refreshUser} />}
        {tab==="derivatives" && <DerivativesTab indexPrice={indexPrice} optPort={optPort} user={user} showToast={showToast} refreshUser={refreshUser} cash={cash} />}
        {tab==="orderbook"   && <OrderBookTab   orders={orders} user={user} prices={prices} showToast={showToast} refreshUser={refreshUser} loadOrders={loadOrders} phase={phase} />}
        {tab==="news"        && <NewsTab        news={news} />}
        {tab==="leaderboard" && <div className="card"><div className="sec-header"><div className="sec-title">🏆 Leaderboard</div></div><LeaderboardWidget users={users} prices={prices} indexPrice={indexPrice} /></div>}
        {tab==="tradelog"    && <TradeLogTab    trades={trades} userId={user.id} />}
      </div>
    </div>
  );
}

// ─── MARKET TAB ───────────────────────────────────────────────────────
function MarketTab({ prices, prevPrices, portfolio, cash, user, showToast, refreshUser, phase, loadOrders }) {
  const [sel,        setSel]        = useState(null);
  const [qty,        setQty]        = useState(1);
  const [mode,       setMode]       = useState("buy");
  const [loading,    setLoading]    = useState(false);
  const [orderType,  setOrderType]  = useState("market"); // "market" | "limit"
  const [limitPrice, setLimitPrice] = useState("");

  const executeBuy = async (sym, quantity, price) => {
    const total = price * quantity;
    if (total > cash) { showToast("Insufficient cash!", "error"); return; }
    setLoading(true);
    const pos   = portfolio[sym] ?? {qty:0,avg_price:0};
    const nq    = pos.qty + quantity;
    const newPf = {...portfolio, [sym]:{qty:nq, avg_price:(pos.avg_price*pos.qty+price*quantity)/nq}};
    const impact      = quantity/10000;
    const newPrices   = {...prices, [sym]:Math.max(1,price*(1+impact))};
    const newIdx      = Object.values(newPrices).reduce((a,v)=>a+v,0)/STOCKS.length*3.1;
    await Promise.all([
      sb().from("mm_users").update({cash:cash-total, portfolio:newPf}).eq("id",user.id),
      sb().from("mm_prices").upsert({id:1,prices:newPrices,index_price:newIdx,updated_at:new Date().toISOString()}),
      sb().from("mm_trades").insert({user_id:user.id,display_name:user.display_name,symbol:sym,type:"buy",qty:quantity,price,is_admin:false}),
    ]);
    await sb().channel("price-bc").send({type:"broadcast",event:"px",payload:{prev:prices,prices:newPrices,idx:newIdx}});
    await sb().channel("trade-bc").send({type:"broadcast",event:"trade",payload:{item:{display_name:user.display_name,symbol:sym,type:"buy",qty:quantity,price,is_admin:false,created_at:new Date().toISOString()}}});
    showToast(`Bought ${quantity} × ${sym} @ ${fmt(price)}`);
    await refreshUser();
    setLoading(false);
  };

  const placeOrder = async (sym, type, quantity, price) => {
    if (type==="buy"  && price*quantity > cash) { showToast("Insufficient cash!","error"); return; }
    const pos = portfolio[sym]??{qty:0,avg_price:0};
    if (type==="sell" && pos.qty < quantity) { showToast("Not enough shares!","error"); return; }
    setLoading(true);
    const {error} = await sb().from("mm_orders").insert({user_id:user.id,display_name:user.display_name,symbol:sym,type,qty:quantity,price,status:"open"});
    if (error) { showToast("Failed to place order","error"); setLoading(false); return; }
    await sb().channel("app-bc").send({type:"broadcast",event:"order_update",payload:{}});
    if (loadOrders) await loadOrders();
    showToast(`${type==="buy"?"Buy":"Sell"} order placed for ${quantity} × ${sym} @ ${fmt(price)} — waiting for counterparty`,"info");
    setLoading(false);
  };

  const handleAction = () => {
    if (!sel) return;
    const marketPrice = prices[sel.symbol]??sel.base;
    if (phase===1) {
      if (mode==="sell") { showToast("Selling disabled in Phase 1 — Portfolio Building","error"); return; }
      executeBuy(sel.symbol, qty, marketPrice);
    } else {
      const execPrice = (orderType==="limit" && limitPrice) ? parseFloat(limitPrice) : marketPrice;
      if (orderType==="limit" && (!limitPrice || isNaN(execPrice) || execPrice <= 0)) { showToast("Enter a valid limit price","error"); return; }
      placeOrder(sel.symbol, mode, qty, execPrice);
    }
  };

  const price = sel ? (prices[sel.symbol]??sel.base) : 0;
  const execPrice = (phase===2 && orderType==="limit" && limitPrice && !isNaN(parseFloat(limitPrice))) ? parseFloat(limitPrice) : price;
  const total = execPrice * qty;
  const pos   = sel ? (portfolio[sel.symbol]??{qty:0}) : {qty:0};

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20}}>
      <div>
        <div className="sec-header">
          <div>
            <div className="sec-title">Live Market</div>
            <div style={{fontSize:13,color:"#9ca3af",marginTop:2}}>
              {phase===1?"Phase 1 — Buy stocks to build your portfolio":"Phase 2 — Place orders, execute via Order Book"}
            </div>
          </div>
          <span className={`badge-phase badge-phase-${phase}`}>Phase {phase} — {phase===1?"Order Book":"Order Book"}</span>
        </div>

        {phase===2 && (
          <div style={{background:"linear-gradient(135deg,#fef3c7,#fde68a)",border:"1.5px solid #fcd34d",borderRadius:14,padding:"12px 16px",marginBottom:18,fontSize:13,color:"#92400e",fontWeight:600}}>
            ⚡ Phase 2: Orders go to the Order Book. Switch to <b>Order Book</b> tab to match trades.
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {STOCKS.map(s => {
            const p   = prices[s.symbol]??s.base;
            const pv  = prevPrices[s.symbol]??s.base;
            const sc  = SECTOR_COLORS[s.sector]??{bg:"#f0f4ff",accent:"#6366f1",text:"#1e40af"};
            const own = portfolio[s.symbol]?.qty ?? 0;
            return (
              <div key={s.symbol} className={`stock-card ${sel?.symbol===s.symbol?"selected":""}`}
                onClick={()=>{setSel(s);setQty(1);setOrderType("market");setLimitPrice("");}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:15,color:"#1a1f36",letterSpacing:"-.2px"}}>{s.symbol}</div>
                    <div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>{s.name}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    <span style={{fontSize:11,fontWeight:700,background:sc.bg,color:sc.text,padding:"2px 8px",borderRadius:20}}>{s.sector}</span>
                    <span className={`tag tag-${p>=pv?"green":"red"}`} style={{fontSize:10}}>{fmtPct(p,pv)}</span>
                  </div>
                </div>
                <div className="mono" style={{fontSize:20,fontWeight:700,color:clr(p,pv),letterSpacing:"-.5px"}}>{fmt(p)}</div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:6,alignItems:"center"}}>
                  <div style={{fontSize:11,color:"#9ca3af"}}>Base: {fmt(s.base)}</div>
                  {own>0 && <div style={{fontSize:11,color:"#6366f1",fontWeight:700}}>Holding: {own}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Order Panel ── */}
      <div className="order-panel">
        {sel ? (
          <div className="fade-up">
            <div style={{marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:18,color:"#1a1f36",letterSpacing:"-.3px"}}>{sel.symbol}</div>
              <div style={{fontSize:12,color:"#9ca3af"}}>{sel.name}</div>
              <div className="mono" style={{fontSize:26,fontWeight:700,color:clr(price,sel.base),marginTop:6}}>{fmt(price)}</div>
              <div style={{fontSize:12,color:clrV(price-sel.base),marginTop:2}}>{price>=sel.base?"▲":"▼"} {fmtPct(price,sel.base)} from base</div>
            </div>

            {/* mode toggle */}
            <div style={{display:"flex",background:"#f0f4ff",borderRadius:12,padding:4,marginBottom:16}}>
              {["buy","sell"].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"9px 0",borderRadius:10,border:"none",fontWeight:700,fontSize:13,cursor:"pointer",transition:"all .2s",fontFamily:"'DM Sans',sans-serif",background:mode===m?(m==="buy"?"#10b981":"#ef4444"):"none",color:mode===m?"#fff":"#9ca3af",boxShadow:mode===m?"0 2px 8px rgba(0,0,0,.15)":"none"}}>
                  {m==="buy"?"▲ BUY":"▼ SELL"}
                </button>
              ))}
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:"#9ca3af",marginBottom:5,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Quantity</div>
              <input type="number" min={1} value={qty} onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))} />
              {pos.qty>0 && <div style={{fontSize:11,color:"#6366f1",marginTop:3}}>Holdings: {pos.qty} shares</div>}
            </div>

            {phase===2 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#9ca3af",marginBottom:5,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Order Type</div>
                <div style={{display:"flex",background:"#f0f4ff",borderRadius:10,padding:3,gap:3}}>
                  {["market","limit"].map(ot=>(
                    <button key={ot} onClick={()=>{ setOrderType(ot); if(ot==="market") setLimitPrice(""); }} style={{flex:1,padding:"7px 0",borderRadius:8,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",transition:"all .2s",fontFamily:"'DM Sans',sans-serif",background:orderType===ot?"#fff":"none",color:orderType===ot?"#6366f1":"#9ca3af",boxShadow:orderType===ot?"0 2px 6px rgba(99,102,241,.15)":"none",textTransform:"uppercase",letterSpacing:.5}}>
                      {ot==="market"?"⚡ Market":"🎯 Limit"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {phase===2 && orderType==="limit" && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#9ca3af",marginBottom:5,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Limit Price (₹)</div>
                <input type="number" min={0.01} step={0.01} value={limitPrice} onChange={e=>setLimitPrice(e.target.value)} placeholder={`e.g. ${price.toFixed(2)}`} />
                <div style={{fontSize:11,color:"#9ca3af",marginTop:3}}>Current market price: {fmt(price)}</div>
              </div>
            )}

            <div style={{background:"#f8f9ff",borderRadius:12,padding:12,marginBottom:14,border:"1.5px solid #eef0fb"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:12,color:"#9ca3af"}}>{phase===2 && orderType==="limit" ? "Limit Price" : "Price"}</span>
                <span className="mono" style={{fontSize:13,fontWeight:600}}>{phase===2 && orderType==="limit" && limitPrice ? fmt(parseFloat(limitPrice)||0) : fmt(price)}</span>
              </div>
              <div style={{height:1,background:"#eef0fb",margin:"8px 0"}} />
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:13,fontWeight:700,color:"#1a1f36"}}>Total</span>
                <span className="mono" style={{fontSize:15,fontWeight:700,color:"#1a1f36"}}>{fmt(total)}</span>
              </div>
            </div>

            <button
              className={`btn btn-${mode==="buy"?"buy":"sell"}`}
              style={{width:"100%",padding:"13px 0",fontSize:14}}
              onClick={handleAction}
              disabled={loading}
            >
              {loading?"Processing…":phase===1?(mode==="buy"?`BUY ${qty} × ${sel.symbol}`:"Disabled in Phase 1"):`PLACE ${orderType==="limit"?"LIMIT ":""}${mode.toUpperCase()} ORDER — ${qty} × ${sel.symbol}`}
            </button>

            {phase===1 && mode==="sell" && (
              <div style={{marginTop:8,fontSize:11,color:"#f59e0b",textAlign:"center"}}>Selling opens in Phase 2</div>
            )}
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"60px 0",color:"#c7d0f0"}}>
            <div style={{fontSize:40,marginBottom:12}}>📊</div>
            <div style={{fontWeight:600,color:"#9ca3af"}}>Select a stock to trade</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PORTFOLIO TAB ────────────────────────────────────────────────────
function PortfolioTab({ portfolio, optPort, prices, indexPrice, cash, user, showToast, refreshUser }) {
  const entries = Object.entries(portfolio);
  const sv      = entries.reduce((a,[sym,pos])=>a+(prices[sym]??BASE_PRICES[sym])*pos.qty,0);
  const ov      = optPort.reduce((a,p)=>a+bsPrice(p.type,indexPrice,p.strike)*75*p.lots,0);
  const total   = cash+sv+ov;
  const pnl     = total-STARTING_BALANCE;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div className="grid4">
        {[
          {label:"Cash",       val:fmtCr(cash),   accent:"#6366f1", css:"linear-gradient(135deg,rgba(99,102,241,.08),rgba(139,92,246,.06))"},
          {label:"Stocks",     val:fmtCr(sv),     accent:"#3b82f6", css:"linear-gradient(135deg,rgba(59,130,246,.08),rgba(99,102,241,.06))"},
          {label:"Total",      val:fmtCr(total),  accent:"#1a1f36", css:"linear-gradient(135deg,rgba(26,31,54,.05),rgba(99,102,241,.04))"},
          {label:"P&L",        val:(pnl>=0?"+":"")+fmtCr(pnl),  accent:clrV(pnl), css:pnl>=0?"linear-gradient(135deg,rgba(16,185,129,.1),rgba(5,150,105,.06))":"linear-gradient(135deg,rgba(239,68,68,.1),rgba(220,38,38,.06))"},
        ].map(s=>(
          <div key={s.label} className="stat" style={{background:s.css,"--accent":s.accent}}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-val" style={{color:s.accent,fontSize:16}}>{s.val}</div>
            {s.label==="P&L" && <div style={{fontSize:11,color:clrV(pnl),marginTop:3}}>{fmtPct(total,STARTING_BALANCE)}</div>}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="sec-header"><div className="sec-title">📈 Stock Holdings</div><span className="tag tag-blue">{entries.length} positions</span></div>
        {entries.length===0
          ? <div style={{textAlign:"center",padding:32,color:"#9ca3af"}}>No stock positions yet — go trade!</div>
          : <div className="table-wrap"><table>
            <thead><tr><th>Symbol</th><th>Company</th><th>Qty</th><th>Avg Price</th><th>CMP</th><th>Value</th><th>P&L</th></tr></thead>
            <tbody>
              {entries.map(([sym,pos])=>{
                const s   = STOCKS.find(s=>s.symbol===sym);
                const cmp = prices[sym]??BASE_PRICES[sym];
                const val = cmp*pos.qty;
                const p   = (cmp-pos.avg_price)*pos.qty;
                const sc  = SECTOR_COLORS[s?.sector]??{bg:"#f0f4ff",text:"#6366f1"};
                return (
                  <tr key={sym}>
                    <td><b style={{color:"#1a1f36"}}>{sym}</b></td>
                    <td style={{color:"#6b7280",fontSize:12}}>{s?.name}</td>
                    <td className="mono">{pos.qty}</td>
                    <td className="mono">{fmt(pos.avg_price)}</td>
                    <td className="mono" style={{color:clr(cmp,pos.avg_price)}}>{fmt(cmp)}</td>
                    <td className="mono" style={{fontWeight:600}}>{fmtCr(val)}</td>
                    <td className="mono" style={{color:clrV(p),fontWeight:600}}>{p>=0?"+":""}{fmt(p)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        }
      </div>

      <div className="card">
        <div className="sec-header"><div className="sec-title">⚡ Options Positions</div><span className="tag tag-purple">{optPort.length} positions</span></div>
        {optPort.length===0
          ? <div style={{textAlign:"center",padding:32,color:"#9ca3af"}}>No options positions yet</div>
          : <div className="table-wrap"><table>
            <thead><tr><th>Contract</th><th>Type</th><th>Lots</th><th>Buy Premium</th><th>CMP</th><th>P&L</th><th>Action</th></tr></thead>
            <tbody>
              {optPort.map((pos,i)=>{
                const cmp = bsPrice(pos.type,indexPrice,pos.strike);
                const pnl = (cmp-pos.premium)*75*pos.lots;
                const squareOff = async () => {
                  const proceeds   = cmp*75*pos.lots;
                  const newOptPort = optPort.filter((_,j)=>j!==i);
                  await sb().from("mm_users").update({options_portfolio:newOptPort,cash:cash+proceeds}).eq("id",user.id);
                  showToast(`Squared off — P&L: ${pnl>=0?"+":""}${fmt(pnl)}`,pnl>=0?"success":"info");
                  await refreshUser();
                };
                return (
                  <tr key={i}>
                    <td><b>{INDEX_NAME} {pos.strike} {pos.type}</b></td>
                    <td><span className={`tag tag-${pos.type==="CE"?"green":"red"}`}>{pos.type}</span></td>
                    <td className="mono">{pos.lots}</td>
                    <td className="mono">{fmt(pos.premium)}</td>
                    <td className="mono" style={{color:clr(cmp,pos.premium)}}>{fmt(cmp)}</td>
                    <td className="mono" style={{color:clrV(pnl),fontWeight:600}}>{pnl>=0?"+":""}{fmt(pnl)}</td>
                    <td><button className="btn btn-sell btn-xs" onClick={squareOff}>Square Off</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        }
      </div>
    </div>
  );
}

// ─── DERIVATIVES TAB ──────────────────────────────────────────────────
function DerivativesTab({ indexPrice, optPort, user, showToast, refreshUser, cash }) {
  const [lots, setLots] = useState(1);
  const [sel,  setSel]  = useState(null);
  const [mode, setMode] = useState("buy");
  const strikes = getStrikes(indexPrice);
  const atm     = Math.round(indexPrice/100)*100;

  const executeTrade = async () => {
    if (!sel) return;
    const premium   = bsPrice(sel.type,indexPrice,sel.strike);
    const totalCost = premium*75*lots;
    if (mode==="buy") {
      if (totalCost>cash) { showToast("Insufficient cash!","error"); return; }
      const newOptPort = [...optPort,{strike:sel.strike,type:sel.type,lots,premium,bought_at:indexPrice}];
      await sb().from("mm_users").update({options_portfolio:newOptPort,cash:cash-totalCost}).eq("id",user.id);
      await sb().from("mm_trades").insert({user_id:user.id,display_name:user.display_name,symbol:`${INDEX_NAME} ${sel.strike} ${sel.type}`,type:"buy",qty:lots,price:premium,is_admin:false});
      await sb().channel("trade-bc").send({type:"broadcast",event:"trade",payload:{item:{display_name:user.display_name,symbol:`${INDEX_NAME} ${sel.strike} ${sel.type}`,type:"buy",qty:lots,price:premium,is_admin:false,created_at:new Date().toISOString()}}});
      showToast(`Bought ${lots} lot(s) of ${INDEX_NAME} ${sel.strike} ${sel.type} @ ${fmt(premium)}`);
    } else {
      const idx2 = optPort.findIndex(p=>p.strike===sel.strike&&p.type===sel.type);
      if (idx2===-1) { showToast("No position found!","error"); return; }
      const pos  = optPort[idx2];
      if (lots>pos.lots) { showToast("Not enough lots!","error"); return; }
      const pnl  = (premium-pos.premium)*75*lots;
      const newOptPort = [...optPort];
      if (lots===pos.lots) newOptPort.splice(idx2,1); else newOptPort[idx2]={...pos,lots:pos.lots-lots};
      await sb().from("mm_users").update({options_portfolio:newOptPort,cash:cash+premium*75*lots}).eq("id",user.id);
      showToast(`Sold ${lots} lot(s) — P&L: ${pnl>=0?"+":""}${fmt(pnl)}`,pnl>=0?"success":"info");
    }
    await refreshUser();
  };

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:20}}>
      <div className="card">
        <div className="sec-header">
          <div>
            <div className="sec-title">⚡ {INDEX_NAME} Option Chain</div>
            <div style={{fontSize:13,color:"#9ca3af",marginTop:2}}>Index: <span className="mono" style={{color:"#f59e0b",fontWeight:700}}>{fmt(indexPrice)}</span></div>
          </div>
          <span className="tag tag-purple">Lot Size: 75</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th style={{color:"#10b981"}}>CE Premium</th>
              <th style={{textAlign:"center",color:"#f59e0b"}}>STRIKE</th>
              <th style={{color:"#ef4444",textAlign:"right"}}>PE Premium</th>
            </tr></thead>
            <tbody>
              {strikes.map(strike=>{
                const ce    = bsPrice("CE",indexPrice,strike);
                const pe    = bsPrice("PE",indexPrice,strike);
                const isAtm = strike===atm;
                return (
                  <tr key={strike} style={isAtm?{background:"rgba(245,158,11,.05)"}:{}}>
                    <td><button className="btn btn-buy btn-xs" onClick={()=>{setSel({strike,type:"CE"});setMode("buy");}}>{fmt(ce)}</button></td>
                    <td style={{textAlign:"center",fontWeight:800,fontFamily:"DM Mono",color:isAtm?"#f59e0b":"#6b7280"}}>
                      {strike}{isAtm&&<span className="tag tag-yellow" style={{marginLeft:6,fontSize:9}}>ATM</span>}
                    </td>
                    <td style={{textAlign:"right"}}><button className="btn btn-sell btn-xs" onClick={()=>{setSel({strike,type:"PE"});setMode("buy");}}>{fmt(pe)}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="order-panel">
        {sel ? (
          <div className="fade-up">
            <div style={{marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:16,color:"#1a1f36"}}>{INDEX_NAME} {sel.strike} {sel.type}</div>
              <span className={`tag tag-${sel.type==="CE"?"green":"red"}`} style={{marginTop:6,display:"inline-block"}}>{sel.type==="CE"?"CALL":"PUT"}</span>
              <div className="mono" style={{fontSize:24,fontWeight:700,color:"#1a1f36",marginTop:10}}>{fmt(bsPrice(sel.type,indexPrice,sel.strike))}<span style={{fontSize:12,color:"#9ca3af"}}>/unit</span></div>
            </div>
            <div style={{display:"flex",background:"#f0f4ff",borderRadius:12,padding:4,marginBottom:14}}>
              {["buy","sell"].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"8px 0",borderRadius:10,border:"none",fontWeight:700,fontSize:13,cursor:"pointer",transition:"all .2s",fontFamily:"'DM Sans',sans-serif",background:mode===m?(m==="buy"?"#10b981":"#ef4444"):"none",color:mode===m?"#fff":"#9ca3af"}}>
                  {m==="buy"?"▲ BUY":"▼ SELL"}
                </button>
              ))}
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:"#9ca3af",marginBottom:5,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Lots</div>
              <input type="number" min={1} value={lots} onChange={e=>setLots(Math.max(1,parseInt(e.target.value)||1))} />
              <div style={{fontSize:11,color:"#9ca3af",marginTop:3}}>{lots*75} units total</div>
            </div>
            <div style={{background:"#f8f9ff",borderRadius:12,padding:12,marginBottom:14,border:"1.5px solid #eef0fb"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:13,fontWeight:700}}>Total Cost</span>
                <span className="mono" style={{fontWeight:700,fontSize:14}}>{fmt(bsPrice(sel.type,indexPrice,sel.strike)*75*lots)}</span>
              </div>
            </div>
            <button className={`btn btn-${mode==="buy"?"buy":"sell"}`} style={{width:"100%",padding:"12px 0"}} onClick={executeTrade}>
              {mode==="buy"?"BUY":"SELL"} {lots} LOT{lots>1?"S":""} {sel.type}
            </button>
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"60px 0",color:"#c7d0f0"}}>
            <div style={{fontSize:36,marginBottom:10}}>⚡</div>
            <div style={{fontWeight:600,color:"#9ca3af"}}>Click CE/PE to select a contract</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ORDER BOOK TAB ───────────────────────────────────────────────────
function OrderBookTab({ orders, user, prices, showToast, refreshUser, loadOrders, phase }) {
  const [loading, setLoading] = useState(null);

  const takeOrder = async (order) => {
    if (order.user_id===user.id) { showToast("Can't take your own order!","error"); return; }
    setLoading(order.id);
    const price    = order.price;
    const qty      = order.qty;
    const sym      = order.symbol;
    const takerType= order.type==="buy"?"sell":"buy";

    const [{data:maker},{data:taker}] = await Promise.all([
      sb().from("mm_users").select("*").eq("id",order.user_id).single(),
      sb().from("mm_users").select("*").eq("id",user.id).single(),
    ]);
    if (!maker||!taker) { showToast("Could not fetch user data","error"); setLoading(null); return; }

    const total = price*qty;
    if (takerType==="buy" && taker.cash<total) { showToast("Insufficient cash!","error"); setLoading(null); return; }
    if (takerType==="sell") {
      const pos = taker.portfolio?.[sym];
      if (!pos||pos.qty<qty) { showToast("Not enough shares!","error"); setLoading(null); return; }
    }

    let makerPort = JSON.parse(JSON.stringify(maker.portfolio??{}));
    let makerCash = maker.cash;
    if (order.type==="buy") {
      const pos = makerPort[sym]??{qty:0,avg_price:0};
      const nq  = pos.qty+qty;
      makerPort[sym] = {qty:nq,avg_price:(pos.avg_price*pos.qty+price*qty)/nq};
      makerCash -= total;
    } else {
      const pos = makerPort[sym]??{qty:0,avg_price:0};
      const nq  = pos.qty-qty;
      if (nq<=0) delete makerPort[sym]; else makerPort[sym]={...pos,qty:nq};
      makerCash += total;
    }

    let takerPort = JSON.parse(JSON.stringify(taker.portfolio??{}));
    let takerCash = taker.cash;
    if (takerType==="buy") {
      const pos = takerPort[sym]??{qty:0,avg_price:0};
      const nq  = pos.qty+qty;
      takerPort[sym] = {qty:nq,avg_price:(pos.avg_price*pos.qty+price*qty)/nq};
      takerCash -= total;
    } else {
      const pos = takerPort[sym]??{qty:0,avg_price:0};
      const nq  = pos.qty-qty;
      if (nq<=0) delete takerPort[sym]; else takerPort[sym]={...pos,qty:nq};
      takerCash += total;
    }

    const impact    = (qty/10000)*(order.type==="buy"?1:-1);
    const newPrices = {...prices,[sym]:Math.max(1,price*(1+impact))};
    const newIdx    = Object.values(newPrices).reduce((a,v)=>a+v,0)/STOCKS.length*3.1;

    await Promise.all([
      sb().from("mm_users").update({cash:makerCash,portfolio:makerPort}).eq("id",maker.id),
      sb().from("mm_users").update({cash:takerCash,portfolio:takerPort}).eq("id",taker.id),
      sb().from("mm_orders").update({status:"executed",executed_by:user.id,executed_at:new Date().toISOString()}).eq("id",order.id),
      sb().from("mm_prices").upsert({id:1,prices:newPrices,index_price:newIdx,updated_at:new Date().toISOString()}),
      sb().from("mm_trades").insert({user_id:user.id,display_name:`${maker.display_name} ↔ ${taker.display_name}`,symbol:sym,type:order.type,qty,price,is_admin:false}),
    ]);
    await sb().channel("price-bc").send({type:"broadcast",event:"px",payload:{prev:prices,prices:newPrices,idx:newIdx}});
    await sb().channel("app-bc").send({type:"broadcast",event:"order_update",payload:{}});
    await sb().channel("trade-bc").send({type:"broadcast",event:"trade",payload:{item:{display_name:`${maker.display_name} ↔ ${taker.display_name}`,symbol:sym,type:order.type,qty,price,is_admin:false,created_at:new Date().toISOString()}}});
    showToast(`Trade executed! ${qty} × ${sym} @ ${fmt(price)}`);
    await refreshUser();
    if (loadOrders) await loadOrders();
    setLoading(null);
  };

  const cancelOrder = async (order) => {
    if (order.user_id!==user.id) return;
    await sb().from("mm_orders").update({status:"cancelled"}).eq("id",order.id);
    await sb().channel("app-bc").send({type:"broadcast",event:"order_update",payload:{}});
    if (loadOrders) await loadOrders();
    showToast("Order cancelled","info");
  };

  const myOrders    = orders.filter(o=>o.user_id===user.id);
  const otherOrders = orders.filter(o=>o.user_id!==user.id);

  if (phase===1) return (
    <div className="card" style={{textAlign:"center",padding:48}}>
      <div style={{fontSize:40,marginBottom:12}}>📋</div>
      <div style={{fontWeight:700,fontSize:16,marginBottom:8,color:"#1a1f36"}}>Order Book unlocks in Phase 2</div>
      <div style={{color:"#9ca3af",fontSize:13}}>Currently in Phase 1 — Portfolio Building mode</div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {otherOrders.length>0 && (
        <div className="card">
          <div className="sec-header">
            <div className="sec-title">🔥 Open Orders — Take a Trade</div>
            <span className="tag tag-orange">{otherOrders.length} orders</span>
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>Trader</th><th>Stock</th><th>Type</th><th>Qty</th><th>Price</th><th>Total</th><th>Action</th></tr></thead>
            <tbody>
              {otherOrders.map(o=>(
                <tr key={o.id}>
                  <td style={{fontWeight:600}}>{o.display_name}</td>
                  <td><b>{o.symbol}</b></td>
                  <td><span className={`tag tag-${o.type==="buy"?"green":"red"}`}>{o.type.toUpperCase()}</span></td>
                  <td className="mono">{o.qty}</td>
                  <td className="mono">{fmt(o.price)}</td>
                  <td className="mono">{fmt(o.price*o.qty)}</td>
                  <td>
                    <button className={`btn btn-${o.type==="buy"?"sell":"buy"} btn-xs`} onClick={()=>takeOrder(o)} disabled={loading===o.id}>
                      {loading===o.id?"…":o.type==="buy"?`SELL to ${o.display_name}`:`BUY from ${o.display_name}`}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      <div className="card">
        <div className="sec-header">
          <div className="sec-title">📌 Your Pending Orders</div>
          <span className="tag tag-blue">{myOrders.length} pending</span>
        </div>
        {myOrders.length===0
          ? <div style={{textAlign:"center",padding:28,color:"#9ca3af"}}>No pending orders — place one in the Market tab</div>
          : <div className="table-wrap"><table>
            <thead><tr><th>Stock</th><th>Type</th><th>Qty</th><th>Price</th><th>Total</th><th>Placed</th><th>Action</th></tr></thead>
            <tbody>
              {myOrders.map(o=>(
                <tr key={o.id}>
                  <td><b>{o.symbol}</b></td>
                  <td><span className={`tag tag-${o.type==="buy"?"green":"red"}`}>{o.type.toUpperCase()}</span></td>
                  <td className="mono">{o.qty}</td>
                  <td className="mono">{fmt(o.price)}</td>
                  <td className="mono">{fmt(o.price*o.qty)}</td>
                  <td style={{fontSize:11,color:"#9ca3af"}}>{tsStr(o.created_at)}</td>
                  <td><button className="btn btn-ghost btn-xs" onClick={()=>cancelOrder(o)}>Cancel</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        }
      </div>
    </div>
  );
}

// ─── NEWS TAB ─────────────────────────────────────────────────────────
function NewsTab({ news }) {
  const impColors = {bullish:{bg:"#d1fae5",border:"#10b981",text:"#065f46"},bearish:{bg:"#fee2e2",border:"#ef4444",text:"#991b1b"},neutral:{bg:"#dbeafe",border:"#3b82f6",text:"#1e40af"}};
  return (
    <div style={{maxWidth:720}}>
      <div className="sec-header"><div className="sec-title">📰 Market News Feed</div><span style={{fontSize:12,color:"#9ca3af"}}>{news.length} broadcasts</span></div>
      {news.length===0
        ? <div className="card" style={{textAlign:"center",padding:48,color:"#9ca3af"}}>No news yet. Check back soon!</div>
        : news.map((n,i)=>{
          const ic = impColors[n.impact]??impColors.neutral;
          return (
            <div key={i} className="news-item" style={{borderLeftColor:ic.border,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:11,color:"#9ca3af",fontWeight:500}}>{new Date(n.created_at).toLocaleString("en-IN")}</span>
                <span style={{fontSize:11,fontWeight:700,background:ic.bg,color:ic.text,padding:"2px 9px",borderRadius:20}}>{(n.impact??"neutral").toUpperCase()}</span>
              </div>
              <div style={{fontSize:14,color:"#374151",lineHeight:1.6}}>{n.body}</div>
            </div>
          );
        })
      }
    </div>
  );
}

// ─── TRADE LOG TAB ────────────────────────────────────────────────────
function TradeLogTab({ trades, userId }) {
  const filtered = userId ? trades.filter(t=>t.user_id===userId||t.display_name?.includes("↔")) : trades;
  return (
    <div className="card">
      <div className="sec-header"><div className="sec-title">📜 Trade Log</div><span className="tag tag-gray">{filtered.length} trades</span></div>
      {filtered.length===0
        ? <div style={{textAlign:"center",padding:32,color:"#9ca3af"}}>No trades yet</div>
        : <div className="table-wrap"><table>
          <thead><tr><th>Time</th><th>Trader</th><th>Stock</th><th>Type</th><th>Qty</th><th>Price</th></tr></thead>
          <tbody>
            {filtered.map((t,i)=>(
              <tr key={i}>
                <td style={{fontSize:11,color:"#9ca3af"}}>{tsStr(t.created_at)}</td>
                <td style={{fontWeight:600,color:t.is_admin?"#f59e0b":"#1a1f36"}}>{t.display_name}{t.is_admin&&<span className="badge-admin" style={{marginLeft:6}}>INST</span>}</td>
                <td><b>{t.symbol}</b></td>
                <td><span className={`tag tag-${t.type==="buy"?"green":"red"}`}>{t.type.toUpperCase()}</span></td>
                <td className="mono">{t.qty}</td>
                <td className="mono">{fmt(t.price)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      }
    </div>
  );
}

// ─── ADMIN SCREEN ─────────────────────────────────────────────────────
function AdminScreen({ prices, prevPrices, indexPrice, news, trades, users, onLogout, setPrices, setPrev, setIdx, setNews, setTrades, setUsers, setOrders, setPhase, loadAll, showToast, phase, orders }) {
  const [tab, setTab]   = useState("market");
  const tabs     = ["market","users","news","tradelog","portfolios","leaderboard"];
  const tabLabel = { market:"📊 Market Control", users:"👥 Users", news:"📰 Post News", tradelog:"📋 Trade Log", portfolios:"💼 Portfolios", leaderboard:"🏆 Leaderboard" };

  const switchPhase = async (newPhase) => {
    await sb().from("mm_settings").upsert({key:"phase",value:String(newPhase)});
    await sb().channel("app-bc").send({type:"broadcast",event:"phase_change",payload:{phase:newPhase}});
    setPhase(newPhase);
    showToast(`Switched to Phase ${newPhase}!`,"success");
  };

  return (
    <div style={{minHeight:"100vh",background:"#f0f4ff"}}>
      <TickerBar prices={prices} prevPrices={prevPrices} indexPrice={indexPrice} />
      <div className="nav">
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span className="nav-logo">MockMarket</span>
            <span className="badge-admin">ADMIN</span>
          </div>
          <div className="nav-tabs">
            {tabs.map(t=><button key={t} className={`nav-tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>{tabLabel[t]}</button>)}
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div className="phase-toggle">
            {[1,2].map(p=>(
              <button key={p} className={`phase-btn ${phase===p?`active-${p}`:"inactive"}`} onClick={()=>switchPhase(p)}>
                Phase {p}
              </button>
            ))}
          </div>
          <ResetButton showToast={showToast} loadAll={loadAll} setPrices={setPrices} setPrev={setPrev} setIdx={setIdx} setNews={setNews} setTrades={setTrades} setUsers={setUsers} setOrders={setOrders} setPhase={setPhase} />
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </div>
      <div style={{padding:24}}>
        {tab==="market"      && <AdminMarketTab   prices={prices} prevPrices={prevPrices} indexPrice={indexPrice} showToast={showToast} />}
        {tab==="users"       && <AdminUsersTab    users={users} showToast={showToast} setUsers={setUsers} />}
        {tab==="news"        && <AdminNewsTab     news={news} showToast={showToast} />}
        {tab==="tradelog"    && <TradeLogTab      trades={trades} userId={null} />}
        {tab==="portfolios"  && <AdminPortfoliosTab users={users} prices={prices} indexPrice={indexPrice} showToast={showToast} setUsers={setUsers} />}
        {tab==="leaderboard" && <div className="card"><div className="sec-header"><div className="sec-title">🏆 Leaderboard</div><span className="tag tag-yellow">{users.filter(u=>u.status==="approved").length} participants</span></div><LeaderboardWidget users={users} prices={prices} indexPrice={indexPrice} /></div>}
      </div>
    </div>
  );
}

// ─── RESET BUTTON ─────────────────────────────────────────────────────
function ResetButton({ showToast, loadAll, setPrices, setPrev, setIdx, setNews, setTrades, setUsers, setOrders, setPhase }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const doReset = async () => {
    setLoading(true);
    try {
      await Promise.all([
        sb().from("mm_trades").delete().neq("id","00000000-0000-0000-0000-000000000000"),
        sb().from("mm_news").delete().neq("id","00000000-0000-0000-0000-000000000000"),
        sb().from("mm_users").delete().neq("id","00000000-0000-0000-0000-000000000000"),
        sb().from("mm_orders").delete().neq("id","00000000-0000-0000-0000-000000000000"),
      ]);
      await Promise.all([
        sb().from("mm_prices").upsert({id:1,prices:BASE_PRICES,index_price:BASE_INDEX,updated_at:new Date().toISOString()}),
        sb().from("mm_settings").upsert({key:"phase",value:"1"}),
      ]);
      await sb().channel("price-bc").send({type:"broadcast",event:"px",payload:{prev:BASE_PRICES,prices:BASE_PRICES,idx:BASE_INDEX}});
      await sb().channel("app-bc").send({type:"broadcast",event:"phase_change",payload:{phase:1}});
      setPrices({...BASE_PRICES}); setPrev({...BASE_PRICES}); setIdx(BASE_INDEX);
      setNews([]); setTrades([]); setUsers([]); setOrders([]); setPhase(1);
      showToast("✅ Session reset! All data cleared.","success");
    } catch(e) { showToast("Reset failed: "+e.message,"error"); }
    setLoading(false); setConfirm(false);
  };
  return (
    <>
      <button className="btn btn-danger btn-sm" onClick={()=>setConfirm(true)}>🔄 Reset</button>
      {confirm && (
        <div className="modal-bg" onClick={()=>setConfirm(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:40,textAlign:"center",marginBottom:12}}>⚠️</div>
            <div style={{fontWeight:800,fontSize:20,textAlign:"center",marginBottom:8}}>Reset Everything?</div>
            <div style={{color:"#6b7280",fontSize:13,textAlign:"center",marginBottom:24,lineHeight:1.7}}>
              Deletes ALL trades, news, and accounts. Resets all prices.<br/><b style={{color:"#ef4444"}}>This cannot be undone.</b>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" style={{flex:1}} onClick={doReset} disabled={loading}>{loading?"Resetting…":"Yes, Reset Everything"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── ADMIN MARKET TAB ─────────────────────────────────────────────────
function AdminMarketTab({ prices, prevPrices, indexPrice, showToast }) {
  const [sel, setSel]         = useState(null);
  const [qty, setQty]         = useState(1000);
  const [customPrice, setCP]  = useState("");
  const [mode, setMode]       = useState("buy");

  const executeTrade = async () => {
    if (!sel) return;
    const price  = parseFloat(customPrice)||(prices[sel.symbol]??sel.base);
    const impact = (qty/10000)*(mode==="buy"?1:-1);
    const newPrices = {...prices, [sel.symbol]:Math.max(1,price*(1+impact))};
    const newIdx    = Object.values(newPrices).reduce((a,v)=>a+v,0)/STOCKS.length*3.1;
    await Promise.all([
      sb().from("mm_prices").upsert({id:1,prices:newPrices,index_price:newIdx,updated_at:new Date().toISOString()}),
      sb().from("mm_trades").insert({user_id:"admin",display_name:"INSTITUTE",symbol:sel.symbol,type:mode,qty,price,is_admin:true}),
    ]);
    await sb().channel("price-bc").send({type:"broadcast",event:"px",payload:{prev:prices,prices:newPrices,idx:newIdx}});
    await sb().channel("trade-bc").send({type:"broadcast",event:"trade",payload:{item:{display_name:"INSTITUTE",symbol:sel.symbol,type:mode,qty,price,is_admin:true,created_at:new Date().toISOString()}}});
    showToast(`Institute ${mode==="buy"?"bought":"sold"} ${qty} × ${sel.symbol} @ ${fmt(price)}`);
    setCP("");
  };

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20}}>
      <div>
        <div className="sec-header">
          <div><div className="sec-title">Market Control</div><div style={{fontSize:13,color:"#9ca3af",marginTop:2}}>Trade as "Institute" — moves prices, visible to all</div></div>
          <div className="mono" style={{fontSize:15,fontWeight:700,color:"#f59e0b"}}>MOCK50: {fmt(indexPrice)}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {STOCKS.map(s=>{
            const p  = prices[s.symbol]??s.base;
            const pv = prevPrices[s.symbol]??s.base;
            const sc = SECTOR_COLORS[s.sector]??{bg:"#f0f4ff",accent:"#6366f1",text:"#6366f1"};
            return (
              <div key={s.symbol} className={`stock-card ${sel?.symbol===s.symbol?"selected":""}`} onClick={()=>{setSel(s);setCP("");setQty(1000);}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div><div style={{fontWeight:800,fontSize:14}}>{s.symbol}</div><div style={{fontSize:11,color:"#9ca3af"}}>{s.sector}</div></div>
                  <span className={`tag tag-${p>=pv?"green":"red"}`}>{fmtPct(p,pv)}</span>
                </div>
                <div className="mono" style={{fontSize:19,fontWeight:700,color:clr(p,pv)}}>{fmt(p)}</div>
                <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>Base: {fmt(s.base)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="order-panel" style={{border:"2px solid rgba(245,158,11,.3)"}}>
        <div style={{fontSize:12,color:"#f59e0b",marginBottom:12,fontWeight:700,letterSpacing:.5}}>🏦 INSTITUTE TRADE DESK</div>
        {sel ? (
          <>
            <div style={{fontWeight:800,fontSize:17,marginBottom:4,color:"#1a1f36"}}>{sel.symbol}</div>
            <div className="mono" style={{fontSize:22,fontWeight:700,marginBottom:14,color:clr(prices[sel.symbol]??sel.base,sel.base)}}>{fmt(prices[sel.symbol]??sel.base)}</div>
            <div style={{display:"flex",background:"#f0f4ff",borderRadius:12,padding:4,marginBottom:12}}>
              {["buy","sell"].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"8px 0",borderRadius:10,border:"none",fontWeight:700,fontSize:13,cursor:"pointer",transition:"all .2s",fontFamily:"'DM Sans',sans-serif",background:mode===m?(m==="buy"?"#10b981":"#ef4444"):"none",color:mode===m?"#fff":"#9ca3af"}}>
                  {m==="buy"?"▲ BUY (push up)":"▼ SELL (push down)"}
                </button>
              ))}
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:"#9ca3af",marginBottom:5,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Volume</div>
              <input type="number" min={1} value={qty} onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))} />
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:"#9ca3af",marginBottom:5,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Price Override (optional)</div>
              <input type="number" value={customPrice} onChange={e=>setCP(e.target.value)} placeholder={`Market: ${fmt(prices[sel.symbol]??sel.base)}`} />
            </div>
            <div style={{background:"#fef3c7",border:"1.5px solid #fcd34d",borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#92400e",fontWeight:600}}>
              📊 New price: <b>{fmt(Math.max(1,(parseFloat(customPrice)||(prices[sel.symbol]??sel.base))*(1+(qty/10000)*(mode==="buy"?1:-1))))}</b>
            </div>
            <button className={`btn btn-${mode==="buy"?"buy":"sell"}`} style={{width:"100%"}} onClick={executeTrade}>
              Execute Institute {mode==="buy"?"Buy":"Sell"}
            </button>
          </>
        ) : (
          <div style={{textAlign:"center",padding:"48px 0",color:"#c7d0f0"}}>
            <div style={{fontSize:32,marginBottom:10}}>🏦</div>
            <div style={{color:"#9ca3af",fontWeight:600}}>Select a stock to trade</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN USERS TAB ──────────────────────────────────────────────────
function AdminUsersTab({ users, showToast, setUsers }) {
  const pending  = users.filter(u=>u.status==="pending");
  const approved = users.filter(u=>u.status==="approved");

  const updateStatus = async (id, status) => {
    await sb().from("mm_users").update({status}).eq("id",id);
    setUsers(prev=>prev.map(u=>u.id===id?{...u,status}:u));
    await sb().channel("app-bc").send({type:"broadcast",event:"user_update",payload:{}});
    showToast(`User ${status}`);
  };
  const deleteUser = async (id) => {
    await sb().from("mm_users").delete().eq("id",id);
    setUsers(prev=>prev.filter(u=>u.id!==id));
    showToast("User deleted","info");
  };
  const resetBalance = async (id) => {
    await sb().from("mm_users").update({cash:STARTING_BALANCE,portfolio:{},options_portfolio:[],total_invested:0}).eq("id",id);
    setUsers(prev=>prev.map(u=>u.id===id?{...u,cash:STARTING_BALANCE,portfolio:{},options_portfolio:[]}:u));
    showToast("Balance reset");
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {pending.length>0 && (
        <div className="card" style={{border:"2px solid #fcd34d"}}>
          <div className="sec-header">
            <div className="sec-title" style={{color:"#d97706"}}>⏳ Pending Approval</div>
            <span className="badge-pending">{pending.length} waiting</span>
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>Display Name</th><th>Username</th><th>Registered</th><th>Action</th></tr></thead>
            <tbody>
              {pending.map(u=>(
                <tr key={u.id}>
                  <td><b>{u.display_name}</b></td>
                  <td className="mono" style={{color:"#6b7280"}}>{u.username}</td>
                  <td style={{color:"#9ca3af",fontSize:12}}>{new Date(u.created_at).toLocaleString("en-IN")}</td>
                  <td>
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn btn-buy btn-xs" onClick={()=>updateStatus(u.id,"approved")}>✓ Approve</button>
                      <button className="btn btn-sell btn-xs" onClick={()=>updateStatus(u.id,"rejected")}>✗ Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
      <div className="card">
        <div className="sec-header"><div className="sec-title">✅ Approved Participants</div><span className="badge-approved">{approved.length} active</span></div>
        {approved.length===0
          ? <div style={{textAlign:"center",padding:24,color:"#9ca3af"}}>No approved participants yet</div>
          : <div className="table-wrap"><table>
            <thead><tr><th>Name</th><th>Username</th><th>Cash</th><th>Actions</th></tr></thead>
            <tbody>
              {approved.map(u=>(
                <tr key={u.id}>
                  <td><b>{u.display_name}</b></td>
                  <td className="mono" style={{color:"#6b7280"}}>{u.username}</td>
                  <td className="mono">{fmtCr(u.cash)}</td>
                  <td>
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn btn-warn btn-xs" onClick={()=>resetBalance(u.id)}>Reset ₹</button>
                      <button className="btn btn-danger btn-xs" onClick={()=>deleteUser(u.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        }
      </div>
    </div>
  );
}

// ─── ADMIN NEWS TAB ───────────────────────────────────────────────────
function AdminNewsTab({ news, showToast }) {
  const [body,    setBody]    = useState("");
  const [impact,  setImpact]  = useState("neutral");
  const [loading, setLoading] = useState(false);

  const post = async () => {
    if (!body.trim()) { showToast("Write something first!","error"); return; }
    setLoading(true);
    const item = {body:body.trim(),impact,created_at:new Date().toISOString()};
    const {data} = await sb().from("mm_news").insert(item).select().single();
    await sb().channel("news-bc").send({type:"broadcast",event:"news",payload:{item:data??item}});
    setBody(""); setLoading(false);
    showToast("📡 News broadcast to all participants!");
  };

  const impOpts = [{key:"bullish",label:"🟢 Bullish",cls:"tag-green"},{key:"neutral",label:"⚪ Neutral",cls:"tag-blue"},{key:"bearish",label:"🔴 Bearish",cls:"tag-red"}];

  return (
    <div style={{maxWidth:680}}>
      <div className="card" style={{marginBottom:20}}>
        <div className="sec-header"><div className="sec-title">📡 Broadcast Market News</div></div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:"#9ca3af",marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Sentiment</div>
          <div style={{display:"flex",gap:8}}>
            {impOpts.map(opt=>(
              <button key={opt.key} onClick={()=>setImpact(opt.key)} style={{padding:"7px 16px",border:`2px solid ${impact===opt.key?"#6366f1":"#e8ecf8"}`,borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",background:impact===opt.key?"#f0f4ff":"#fff",color:impact===opt.key?"#6366f1":"#6b7280",fontFamily:"'DM Sans',sans-serif",transition:"all .2s"}}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:"#9ca3af",marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Message</div>
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Write market news to broadcast to all participants..." />
        </div>
        <button className="btn btn-primary" style={{width:"100%"}} onClick={post} disabled={loading}>
          {loading?"Posting…":"📡 Broadcast to All Participants"}
        </button>
      </div>
      <div style={{fontSize:13,fontWeight:700,color:"#9ca3af",marginBottom:12}}>Recent Broadcasts</div>
      {news.map((n,i)=>(
        <div key={i} className="news-item" style={{borderLeftColor:n.impact==="bullish"?"#10b981":n.impact==="bearish"?"#ef4444":"#6366f1"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{fontSize:11,color:"#9ca3af"}}>{new Date(n.created_at).toLocaleString("en-IN")}</span>
            <span className={`tag tag-${n.impact==="bullish"?"green":n.impact==="bearish"?"red":"blue"}`}>{(n.impact??"neutral").toUpperCase()}</span>
          </div>
          <div style={{fontSize:13,color:"#374151"}}>{n.body}</div>
        </div>
      ))}
    </div>
  );
}

// ─── ADMIN PORTFOLIOS TAB ─────────────────────────────────────────────
function AdminPortfoliosTab({ users, prices, indexPrice, showToast, setUsers }) {
  const approved = users.filter(u=>u.status==="approved");
  const [selId, setSelId] = useState(null);
  const u = selId ? approved.find(u=>u.id===selId) : null;

  const resetBalance = async (id) => {
    await sb().from("mm_users").update({cash:STARTING_BALANCE,portfolio:{},options_portfolio:[],total_invested:0}).eq("id",id);
    setUsers(prev=>prev.map(u=>u.id===id?{...u,cash:STARTING_BALANCE,portfolio:{},options_portfolio:[]}:u));
    showToast("Balance reset");
  };

  return (
    <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:20}}>
      <div className="card" style={{height:"fit-content"}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#1a1f36"}}>Participants</div>
        {approved.map(u=>{
          const sv    = Object.entries(u.portfolio??{}).reduce((a,[sym,pos])=>a+(prices[sym]??BASE_PRICES[sym])*pos.qty,0);
          const total = u.cash+sv;
          const pnl   = total-STARTING_BALANCE;
          return (
            <div key={u.id} onClick={()=>setSelId(u.id)} style={{padding:"10px 12px",borderRadius:12,cursor:"pointer",marginBottom:6,background:selId===u.id?"linear-gradient(135deg,rgba(99,102,241,.08),rgba(139,92,246,.06))":"#fafbff",border:`1.5px solid ${selId===u.id?"#6366f1":"#eef0fb"}`,transition:"all .2s"}}>
              <div style={{fontWeight:700,fontSize:13,color:"#1a1f36"}}>{u.display_name}</div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                <span className="mono" style={{fontSize:12,color:"#6366f1"}}>{fmtCr(total)}</span>
                <span style={{fontSize:11,color:clrV(pnl)}}>{pnl>=0?"+":""}{fmtPct(total,STARTING_BALANCE)}</span>
              </div>
            </div>
          );
        })}
        {approved.length===0 && <div style={{color:"#9ca3af",fontSize:13}}>No approved users yet</div>}
      </div>

      <div>
        {u ? (
          <div className="fade-up">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:20,color:"#1a1f36"}}>📊 {u.display_name}</div>
              <button className="btn btn-warn btn-sm" onClick={()=>resetBalance(u.id)}>Reset Balance</button>
            </div>
            <div className="grid4" style={{marginBottom:20}}>
              {(()=>{
                const sv    = Object.entries(u.portfolio??{}).reduce((a,[sym,pos])=>a+(prices[sym]??BASE_PRICES[sym])*pos.qty,0);
                const ov    = (u.options_portfolio??[]).reduce((a,p)=>a+bsPrice(p.type,indexPrice,p.strike)*75*p.lots,0);
                const total = u.cash+sv+ov;
                const pnl   = total-STARTING_BALANCE;
                return (<>
                  <div className="stat"><div className="stat-label">Cash</div><div className="stat-val" style={{color:"#6366f1",fontSize:15}}>{fmtCr(u.cash)}</div></div>
                  <div className="stat"><div className="stat-label">Stocks</div><div className="stat-val" style={{fontSize:15}}>{fmtCr(sv)}</div></div>
                  <div className="stat"><div className="stat-label">Total</div><div className="stat-val" style={{fontSize:15}}>{fmtCr(total)}</div></div>
                  <div className="stat" style={{"--accent":clrV(pnl)}}><div className="stat-label">P&amp;L</div><div className="stat-val" style={{color:clrV(pnl),fontSize:15}}>{pnl>=0?"+":""}{fmtCr(pnl)}</div></div>
                </>);
              })()}
            </div>
            <div className="card" style={{marginBottom:16}}>
              <div className="sec-header"><div className="sec-title">Stock Holdings</div></div>
              {Object.entries(u.portfolio??{}).length===0
                ? <div style={{color:"#9ca3af",padding:20,textAlign:"center"}}>No stock positions</div>
                : <div className="table-wrap"><table>
                  <thead><tr><th>Symbol</th><th>Qty</th><th>Avg</th><th>CMP</th><th>P&amp;L</th></tr></thead>
                  <tbody>
                    {Object.entries(u.portfolio??{}).map(([sym,pos])=>{
                      const cmp = prices[sym]??BASE_PRICES[sym];
                      const pnl = (cmp-pos.avg_price)*pos.qty;
                      return <tr key={sym}><td><b>{sym}</b></td><td className="mono">{pos.qty}</td><td className="mono">{fmt(pos.avg_price)}</td><td className="mono" style={{color:clr(cmp,pos.avg_price)}}>{fmt(cmp)}</td><td className="mono" style={{color:clrV(pnl)}}>{pnl>=0?"+":""}{fmt(pnl)}</td></tr>;
                    })}
                  </tbody>
                </table></div>
              }
            </div>
            <div className="card">
              <div className="sec-header"><div className="sec-title">Options Positions</div></div>
              {(u.options_portfolio??[]).length===0
                ? <div style={{color:"#9ca3af",padding:20,textAlign:"center"}}>No options positions</div>
                : <div className="table-wrap"><table>
                  <thead><tr><th>Contract</th><th>Lots</th><th>Buy Premium</th><th>CMP</th><th>P&amp;L</th></tr></thead>
                  <tbody>
                    {(u.options_portfolio??[]).map((pos,i)=>{
                      const cmp = bsPrice(pos.type,indexPrice,pos.strike);
                      const pnl = (cmp-pos.premium)*75*pos.lots;
                      return <tr key={i}><td><b>{INDEX_NAME} {pos.strike} {pos.type}</b></td><td className="mono">{pos.lots}</td><td className="mono">{fmt(pos.premium)}</td><td className="mono">{fmt(cmp)}</td><td className="mono" style={{color:clrV(pnl)}}>{pnl>=0?"+":""}{fmt(pnl)}</td></tr>;
                    })}
                  </tbody>
                </table></div>
              }
            </div>
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"80px 0",color:"#c7d0f0"}}>
            <div style={{fontSize:40,marginBottom:12}}>👈</div>
            <div style={{fontWeight:600,color:"#9ca3af"}}>Select a participant to view their portfolio</div>
          </div>
        )}
      </div>
    </div>
  );
}
