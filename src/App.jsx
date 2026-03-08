import { useState, useEffect, useRef } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY";
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";
const INDEX_NAME = "MOCK50";
const STARTING_BALANCE = 100000;

const STOCKS = [
  { symbol: "RELIANCE",  name: "Reliance Industries", sector: "Energy",  base: 2850 },
  { symbol: "TCS",       name: "Tata Consultancy",    sector: "IT",      base: 3920 },
  { symbol: "HDFCBANK",  name: "HDFC Bank",           sector: "Banking", base: 1680 },
  { symbol: "INFY",      name: "Infosys",             sector: "IT",      base: 1540 },
  { symbol: "ICICIBANK", name: "ICICI Bank",          sector: "Banking", base: 1120 },
  { symbol: "WIPRO",     name: "Wipro",               sector: "IT",      base: 480  },
  { symbol: "AXISBANK",  name: "Axis Bank",           sector: "Banking", base: 1050 },
  { symbol: "SUNPHARMA", name: "Sun Pharma",          sector: "Pharma",  base: 1650 },
  { symbol: "TATAMOTORS",name: "Tata Motors",         sector: "Auto",    base: 890  },
  { symbol: "BAJFINANCE",name: "Bajaj Finance",       sector: "Finance", base: 7200 },
];

const BASE_PRICES = Object.fromEntries(STOCKS.map(s => [s.symbol, s.base]));
const BASE_INDEX = 18500;

const fmt = n => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtPct = (a, b) => { const p = ((a - b) / b) * 100; return (p >= 0 ? "+" : "") + p.toFixed(2) + "%"; };
const clr = (a, b) => a >= b ? "#00e676" : "#ff1744";
const clrV = v => v >= 0 ? "#00e676" : "#ff1744";
const tsStr = ts => new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

let _sb = null;
const sb = () => { if (!_sb) _sb = createClient(SUPABASE_URL, SUPABASE_KEY); return _sb; };

function erf(x) {
  const s = x < 0 ? -1 : 1; x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  return s * (1 - ((((1.061405429*t - 1.453152027)*t + 1.421413741)*t - 0.284496736)*t + 0.254829592)*t*Math.exp(-x*x));
}
const N = x => (1 + erf(x / Math.SQRT2)) / 2;
function bsPrice(type, S, K, T = 0.083, r = 0.06, v = 0.22) {
  if (T <= 0) return Math.max(0, type === "CE" ? S - K : K - S);
  const d1 = (Math.log(S / K) + (r + v*v/2)*T) / (v*Math.sqrt(T));
  const d2 = d1 - v*Math.sqrt(T);
  return type === "CE"
    ? Math.max(0.01, S*N(d1) - K*Math.exp(-r*T)*N(d2))
    : Math.max(0.01, K*Math.exp(-r*T)*N(-d2) - S*N(-d1));
}
function getStrikes(idx) {
  const atm = Math.round(idx / 100) * 100;
  return Array.from({ length: 11 }, (_, i) => atm + (i - 5) * 100);
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Plus Jakarta Sans',sans-serif;background:#080810;color:#e2e2f0;overflow-x:hidden}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0f0f1a}::-webkit-scrollbar-thumb{background:#2a2a42;border-radius:3px}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes slideRight{from{transform:translateX(-16px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes toastIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
.fade-up{animation:fadeUp .35s ease both}
.slide-right{animation:slideRight .3s ease both}
.btn{border:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;border-radius:10px;transition:all .18s;letter-spacing:.3px}
.btn:hover{transform:translateY(-1px)}
.btn:active{transform:translateY(0)}
.btn-buy{background:linear-gradient(135deg,#00e676,#00c853);color:#000;padding:10px 22px;font-size:14px}
.btn-buy:hover{box-shadow:0 0 20px rgba(0,230,118,.45)}
.btn-sell{background:linear-gradient(135deg,#ff1744,#d50000);color:#fff;padding:10px 22px;font-size:14px}
.btn-sell:hover{box-shadow:0 0 20px rgba(255,23,68,.45)}
.btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 26px;font-size:15px}
.btn-primary:hover{box-shadow:0 0 22px rgba(99,102,241,.5)}
.btn-ghost{background:rgba(255,255,255,.04);color:#888;border:1px solid #222;padding:8px 16px;font-size:13px;border-radius:9px}
.btn-ghost:hover{background:rgba(255,255,255,.08);color:#ccc}
.btn-danger{background:linear-gradient(135deg,#ff1744,#b71c1c);color:#fff;padding:10px 22px;font-size:14px}
.btn-danger:hover{box-shadow:0 0 20px rgba(255,23,68,.45)}
.btn-warn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;padding:10px 22px;font-size:14px}
.btn-sm{padding:6px 13px!important;font-size:12px!important;border-radius:8px!important}
.card{background:#0e0e1c;border:1px solid #1c1c30;border-radius:16px;padding:20px}
input,select,textarea{background:#0a0a16;border:1px solid #252540;border-radius:10px;color:#e2e2f0;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;padding:10px 14px;outline:none;width:100%;transition:border-color .2s}
input:focus,select:focus,textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.12)}
textarea{resize:vertical;min-height:90px}
.nav{background:#09091a;border-bottom:1px solid #1a1a2e;padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:58px;position:sticky;top:0;z-index:100;flex-wrap:wrap;gap:8px}
.nav-tabs{display:flex;gap:3px;flex-wrap:wrap}
.nav-tab{padding:7px 14px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:none;color:#555;transition:all .2s;font-family:'Plus Jakarta Sans',sans-serif}
.nav-tab.active{background:rgba(99,102,241,.15);color:#818cf8}
.nav-tab:hover:not(.active){color:#aaa;background:rgba(255,255,255,.03)}
.ticker-bar{background:#07070f;border-bottom:1px solid #141428;padding:7px 0;overflow:hidden}
.ticker-wrap{display:flex;width:max-content;animation:ticker 40s linear infinite}
.ticker-item{display:flex;gap:7px;align-items:center;font-size:12px;font-weight:600;padding:0 28px;white-space:nowrap}
.stat{background:#0e0e1c;border:1px solid #1c1c30;border-radius:14px;padding:16px 20px}
.stat-label{font-size:11px;color:#444;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:5px}
.stat-val{font-size:18px;font-weight:800;font-family:'Space Mono',monospace}
table{width:100%;border-collapse:collapse}
th{color:#444;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:8px 12px;text-align:left;border-bottom:1px solid #1a1a2e}
td{padding:9px 12px;font-size:13px;border-bottom:1px solid #0d0d1a}
tr:hover td{background:rgba(255,255,255,.015)}
.tag{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700}
.tag-green{background:rgba(0,230,118,.13);color:#00e676}
.tag-red{background:rgba(255,23,68,.13);color:#ff1744}
.tag-blue{background:rgba(99,102,241,.15);color:#818cf8}
.tag-orange{background:rgba(251,146,60,.15);color:#fb923c}
.tag-yellow{background:rgba(245,158,11,.15);color:#f59e0b}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.82);backdrop-filter:blur(5px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:#0e0e1c;border:1px solid #2a2a44;border-radius:20px;padding:28px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto}
.live-dot{width:7px;height:7px;border-radius:50%;background:#00e676;animation:pulse 1.4s infinite;display:inline-block;margin-right:6px}
.mono{font-family:'Space Mono',monospace}
.news-item{border-left:3px solid #6366f1;background:#0a0a16;border-radius:0 10px 10px 0;padding:14px 16px;margin-bottom:8px}
.login-bg{min-height:100vh;background:radial-gradient(ellipse at 15% 60%,#130a2e 0%,#080810 55%),radial-gradient(ellipse at 85% 15%,#0a1f30 0%,transparent 55%);display:flex;align-items:center;justify-content:center}
.toast{position:fixed;bottom:28px;right:28px;padding:14px 20px;border-radius:12px;font-weight:600;font-size:14px;z-index:999;animation:toastIn .3s ease;max-width:320px}
.toast-success{background:linear-gradient(135deg,#00c853,#00e676);color:#000}
.toast-error{background:linear-gradient(135deg,#d50000,#ff1744);color:#fff}
.toast-info{background:linear-gradient(135deg,#1e40af,#6366f1);color:#fff}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.badge-admin{background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:.8px}
.badge-approved{background:rgba(0,230,118,.13);color:#00e676;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700}
`;

export default function App() {
  const [screen, setScreen] = useState("login");
  const [user, setUser]     = useState(null);
  const [prices, setPrices] = useState({ ...BASE_PRICES });
  const [prevPrices, setPrev] = useState({ ...BASE_PRICES });
  const [indexPrice, setIdx]  = useState(BASE_INDEX);
  const [news, setNews]       = useState([]);
  const [trades, setTrades]   = useState([]);
  const [users, setUsers]     = useState([]);
  const [toast, setToast]     = useState(null);
  const chRef = useRef([]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    if (screen === "login") return;
    loadAll();
    const c1 = sb().channel("price-bc").on("broadcast", { event: "px" }, ({ payload }) => {
      setPrev(payload.prev); setPrices(payload.prices); setIdx(payload.idx);
    }).subscribe();
    const c2 = sb().channel("news-bc").on("broadcast", { event: "news" }, ({ payload }) => {
      setNews(p => [payload.item, ...p]);
    }).subscribe();
    const c3 = sb().channel("trade-bc").on("broadcast", { event: "trade" }, ({ payload }) => {
      setTrades(p => [payload.item, ...p].slice(0, 150));
    }).subscribe();
    const c4 = sb().channel("user-bc").on("broadcast", { event: "user_update" }, () => { loadUsers(); }).subscribe();
    chRef.current = [c1, c2, c3, c4];
    return () => chRef.current.forEach(c => sb().removeChannel(c));
  }, [screen]);

  const loadAll = async () => {
    await Promise.all([loadPrices(), loadNews(), loadTrades(), loadUsers()]);
  };
  const loadPrices = async () => {
    const { data } = await sb().from("mm_prices").select("*").order("updated_at", { ascending: false }).limit(1);
    if (data?.[0]) { setPrices(data[0].prices); setPrev(data[0].prices); setIdx(data[0].index_price ?? BASE_INDEX); }
  };
  const loadNews = async () => {
    const { data } = await sb().from("mm_news").select("*").order("created_at", { ascending: false }).limit(30);
    if (data) setNews(data);
  };
  const loadTrades = async () => {
    const { data } = await sb().from("mm_trades").select("*").order("created_at", { ascending: false }).limit(150);
    if (data) setTrades(data);
  };
  const loadUsers = async () => {
    const { data } = await sb().from("mm_users").select("*").order("created_at", { ascending: true });
    if (data) setUsers(data);
  };
  const refreshUser = async () => {
    if (!user) return;
    const { data } = await sb().from("mm_users").select("*").eq("id", user.id).single();
    if (data) setUser(data);
  };

  const login = async (username, password) => {
    if (username === ADMIN_USER && password === ADMIN_PASS) { setScreen("admin"); return { ok: true }; }
    const { data } = await sb().from("mm_users").select("*").eq("username", username).eq("password", password).single();
    if (!data) return { ok: false, msg: "Invalid credentials" };
    if (data.status === "pending") return { ok: false, msg: "Your account is pending admin approval" };
    if (data.status === "rejected") return { ok: false, msg: "Your account was rejected by the admin" };
    setUser(data); setScreen("market"); return { ok: true };
  };

  const register = async (username, password, displayName) => {
    const { data: exists } = await sb().from("mm_users").select("id").eq("username", username).single();
    if (exists) return { ok: false, msg: "Username already taken" };
    const { error } = await sb().from("mm_users").insert({ username, password, display_name: displayName, status: "pending", cash: STARTING_BALANCE, portfolio: {}, options_portfolio: [], total_invested: 0 });
    if (error) return { ok: false, msg: error.message };
    await sb().channel("user-bc").send({ type: "broadcast", event: "user_update", payload: {} });
    return { ok: true };
  };

  if (screen === "login") return (
    <><style>{CSS}</style>
      <LoginScreen onLogin={login} onRegister={register} />
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </>
  );

  const shared = { prices, prevPrices, indexPrice, news, trades, showToast };
  return (
    <><style>{CSS}</style>
      {screen === "admin"
        ? <AdminScreen {...shared} users={users} onLogout={() => setScreen("login")} setPrices={setPrices} setPrev={setPrev} setIdx={setIdx} setNews={setNews} setTrades={setTrades} setUsers={setUsers} loadAll={loadAll} />
        : <MarketScreen {...shared} user={user} onLogout={() => { setUser(null); setScreen("login"); }} refreshUser={refreshUser} />
      }
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </>
  );
}

function LoginScreen({ onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [dn, setDn] = useState("");
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false); const [done, setDone] = useState(false);

  const submit = async () => {
    setErr(""); setLoading(true);
    if (mode === "login") {
      const r = await onLogin(u, p);
      if (!r.ok) setErr(r.msg);
    } else {
      if (!dn.trim()) { setErr("Display name required"); setLoading(false); return; }
      const r = await onRegister(u, p, dn);
      if (r.ok) setDone(true); else setErr(r.msg);
    }
    setLoading(false);
  };

  return (
    <div className="login-bg">
      <div className="card fade-up" style={{ width: 400, border: "1px solid #2a2a44" }}>
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48 }}>⏳</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 12, color: "#f59e0b" }}>Registration Sent!</div>
            <div style={{ color: "#666", fontSize: 13, marginTop: 8 }}>Waiting for admin approval. Check back soon.</div>
            <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={() => { setDone(false); setMode("login"); setU(""); setP(""); }}>← Back to Login</button>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 44, marginBottom: 6 }}>📈</div>
              <div style={{ fontSize: 26, fontWeight: 800, background: "linear-gradient(135deg,#6366f1,#a78bfa,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MockMarket</div>
              <div style={{ color: "#555", fontSize: 11, marginTop: 4, letterSpacing: 1.5 }}>THE ULTIMATE TRADING SIMULATOR</div>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "#0a0a16", borderRadius: 10, padding: 4 }}>
              {["login","register"].map(m => (
                <button key={m} onClick={() => { setMode(m); setErr(""); }} className="btn" style={{ flex:1, padding:"8px", fontSize:13, borderRadius:8, background: mode===m ? "rgba(99,102,241,.2)" : "none", color: mode===m ? "#818cf8" : "#555" }}>
                  {m === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mode === "register" && <input placeholder="Display Name (shown on leaderboard)" value={dn} onChange={e => setDn(e.target.value)} />}
              <input placeholder="Username" value={u} onChange={e => setU(e.target.value)} onKeyDown={e => e.key==="Enter" && submit()} />
              <input placeholder="Password" type="password" value={p} onChange={e => setP(e.target.value)} onKeyDown={e => e.key==="Enter" && submit()} />
              {err && <div style={{ color:"#ff1744", fontSize:12, textAlign:"center" }}>{err}</div>}
              <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ marginTop:6 }}>
                {loading ? "Please wait..." : mode==="login" ? "Enter the Market →" : "Request Access →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TickerBar({ prices, prevPrices, indexPrice }) {
  const items = [...STOCKS, ...STOCKS];
  return (
    <div className="ticker-bar">
      <div className="ticker-wrap">
        {items.map((s,i) => {
          const p = prices[s.symbol] ?? s.base;
          const pv = prevPrices[s.symbol] ?? s.base;
          return (
            <div key={i} className="ticker-item">
              <span style={{ color:"#555" }}>{s.symbol}</span>
              <span className="mono" style={{ color:clr(p,pv) }}>{fmt(p)}</span>
              <span style={{ color:clr(p,pv), fontSize:10 }}>{fmtPct(p,pv)}</span>
            </div>
          );
        })}
        <div className="ticker-item">
          <span style={{ color:"#f59e0b", fontWeight:800 }}>⬡ {INDEX_NAME}</span>
          <span className="mono" style={{ color:"#f59e0b" }}>{fmt(indexPrice)}</span>
        </div>
      </div>
    </div>
  );
}

function MarketScreen({ user, prices, prevPrices, indexPrice, news, trades, showToast, onLogout, refreshUser }) {
  const [tab, setTab] = useState("market");
  const portfolio = user?.portfolio ?? {};
  const cash = user?.cash ?? STARTING_BALANCE;
  const optPort = user?.options_portfolio ?? [];
  const stockPnl = Object.entries(portfolio).reduce((a,[sym,pos]) => a + ((prices[sym]??BASE_PRICES[sym]) - pos.avg_price)*pos.qty, 0);
  const optPnl = optPort.reduce((a,pos) => a + (bsPrice(pos.type,indexPrice,pos.strike) - pos.premium)*75*pos.lots, 0);
  const totalPnl = stockPnl + optPnl;
  const totalInvested = Object.entries(portfolio).reduce((a,[sym,pos]) => a + pos.avg_price*pos.qty, 0);
  const tabs = ["market","portfolio","derivatives","news","leaderboard","tradelog"];
  const tabLabels = { market:"📊 Market", portfolio:"💼 Portfolio", derivatives:"⚡ Derivatives", news:"📰 News", leaderboard:"🏆 Leaderboard", tradelog:"📋 Trade Log" };

  return (
    <div>
      <TickerBar prices={prices} prevPrices={prevPrices} indexPrice={indexPrice} />
      <div className="nav">
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:17, fontWeight:800, background:"linear-gradient(135deg,#6366f1,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", whiteSpace:"nowrap" }}>📈 MockMarket</span>
          <div className="nav-tabs">
            {tabs.map(t => <button key={t} className={`nav-tab ${tab===t?"active":""}`} onClick={() => setTab(t)}>{tabLabels[t]}</button>)}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, whiteSpace:"nowrap" }}>
          <span style={{ fontSize:12, color:"#555" }}>👤 {user?.display_name}</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </div>
      <div style={{ padding:"10px 24px", borderBottom:"1px solid #1a1a2e", display:"flex", gap:24, alignItems:"center", background:"#09091a", flexWrap:"wrap" }}>
        <div><span style={{ color:"#555", fontSize:11, textTransform:"uppercase", letterSpacing:1 }}>Cash </span><span className="mono" style={{ color:"#818cf8", fontWeight:700 }}>{fmt(cash)}</span></div>
        <div><span style={{ color:"#555", fontSize:11, textTransform:"uppercase", letterSpacing:1 }}>Invested </span><span className="mono" style={{ fontWeight:700 }}>{fmt(totalInvested)}</span></div>
        <div><span style={{ color:"#555", fontSize:11, textTransform:"uppercase", letterSpacing:1 }}>P&amp;L </span><span className="mono" style={{ color:clrV(totalPnl), fontWeight:700 }}>{totalPnl>=0?"+":""}{fmt(totalPnl)}</span></div>
        <div><span className="live-dot" /><span style={{ color:"#555", fontSize:11 }}>LIVE</span></div>
      </div>
      <div style={{ padding:24 }}>
        {tab==="market"      && <MarketTab prices={prices} prevPrices={prevPrices} portfolio={portfolio} cash={cash} user={user} showToast={showToast} refreshUser={refreshUser} />}
        {tab==="portfolio"   && <PortfolioTab portfolio={portfolio} optPort={optPort} prices={prices} indexPrice={indexPrice} cash={cash} />}
        {tab==="derivatives" && <DerivativesTab indexPrice={indexPrice} optPort={optPort} user={user} showToast={showToast} refreshUser={refreshUser} cash={cash} />}
        {tab==="news"        && <NewsTab news={news} />}
        {tab==="leaderboard" && <LeaderboardTab user={user} prices={prices} indexPrice={indexPrice} />}
        {tab==="tradelog"    && <TradeLogTab trades={trades} userId={user?.id} />}
      </div>
    </div>
  );
}

function MarketTab({ prices, prevPrices, portfolio, cash, user, showToast, refreshUser }) {
  const [sel, setSel] = useState(null);
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState("buy");

  const executeTrade = async (sym, type, quantity, price) => {
    const cost = price * quantity;
    if (type==="buy" && cost>cash) { showToast("Insufficient cash!","error"); return; }
    const pos = portfolio[sym] ?? { qty:0, avg_price:0 };
    if (type==="sell" && pos.qty<quantity) { showToast("Not enough shares!","error"); return; }
    let newPort = { ...portfolio };
    let newCash = cash;
    if (type==="buy") {
      const nq = pos.qty+quantity;
      newPort[sym] = { qty:nq, avg_price:(pos.avg_price*pos.qty + price*quantity)/nq };
      newCash -= cost;
    } else {
      const nq = pos.qty-quantity;
      if (nq===0) delete newPort[sym]; else newPort[sym] = { ...pos, qty:nq };
      newCash += cost;
    }
    const impact = (quantity/500)*(type==="buy"?1:-1);
    const newPrices = { ...prices };
    newPrices[sym] = Math.max(1, price*(1+impact));
    const newIdx = Object.values(newPrices).reduce((a,v)=>a+v,0)/STOCKS.length*3.1;
    await Promise.all([
      sb().from("mm_users").update({ cash:newCash, portfolio:newPort }).eq("id", user.id),
      sb().from("mm_prices").upsert({ id:1, prices:newPrices, index_price:newIdx, updated_at:new Date().toISOString() }),
      sb().from("mm_trades").insert({ user_id:user.id, display_name:user.display_name, symbol:sym, type, qty:quantity, price, is_admin:false }),
    ]);
    await sb().channel("price-bc").send({ type:"broadcast", event:"px", payload:{ prev:prices, prices:newPrices, idx:newIdx } });
    await sb().channel("trade-bc").send({ type:"broadcast", event:"trade", payload:{ item:{ display_name:user.display_name, symbol:sym, type, qty:quantity, price, is_admin:false, created_at:new Date().toISOString() } } });
    showToast(`${type==="buy"?"Bought":"Sold"} ${quantity} × ${sym} @ ${fmt(price)}`);
    await refreshUser();
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20 }}>
      <div>
        <div style={{ fontWeight:700, fontSize:16, marginBottom:14 }}>Live Market</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {STOCKS.map(s => {
            const p = prices[s.symbol]??s.base;
            const pv = prevPrices[s.symbol]??s.base;
            const pos = portfolio[s.symbol];
            return (
              <div key={s.symbol} onClick={() => { setSel(s); setQty(1); setMode("buy"); }}
                className="fade-up"
                style={{ background:"#0e0e1c", border:`1px solid ${sel?.symbol===s.symbol?"#6366f1":"#1c1c30"}`, borderRadius:14, padding:16, cursor:"pointer", transition:"all .2s" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <div><div style={{ fontWeight:800, fontSize:14 }}>{s.symbol}</div><div style={{ color:"#555", fontSize:11 }}>{s.sector}</div></div>
                  <span className={`tag tag-${p>=pv?"green":"red"}`}>{fmtPct(p,pv)}</span>
                </div>
                <div className="mono" style={{ fontSize:20, fontWeight:700, color:clr(p,pv) }}>{fmt(p)}</div>
                {pos && <div style={{ marginTop:6, fontSize:11, color:"#555" }}>Holdings: {pos.qty} shares</div>}
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="card" style={{ position:"sticky", top:80 }}>
          {sel ? (
            <>
              <div style={{ fontWeight:800, fontSize:17, marginBottom:2 }}>{sel.symbol}</div>
              <div style={{ color:"#555", fontSize:12, marginBottom:14 }}>{sel.name}</div>
              <div className="mono" style={{ fontSize:24, fontWeight:700, color:clr(prices[sel.symbol]??sel.base, prevPrices[sel.symbol]??sel.base), marginBottom:16 }}>{fmt(prices[sel.symbol]??sel.base)}</div>
              <div style={{ display:"flex", gap:6, marginBottom:14, background:"#0a0a16", borderRadius:10, padding:4 }}>
                {["buy","sell"].map(m => (
                  <button key={m} className="btn" onClick={() => setMode(m)} style={{ flex:1, padding:8, fontSize:13, borderRadius:8, background:mode===m?(m==="buy"?"rgba(0,230,118,.15)":"rgba(255,23,68,.15)"):"none", color:mode===m?(m==="buy"?"#00e676":"#ff1744"):"#555" }}>
                    {m==="buy"?"▲ BUY":"▼ SELL"}
                  </button>
                ))}
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:"#555", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Quantity</div>
                <input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value)||1))} />
              </div>
              <div style={{ background:"#0a0a16", borderRadius:10, padding:12, marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:13 }}>
                  <span style={{ color:"#555" }}>Price</span><span className="mono">{fmt(prices[sel.symbol]??sel.base)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid #1a1a2e", paddingTop:8, fontSize:13 }}>
                  <span style={{ color:"#555" }}>Total</span><span className="mono" style={{ fontWeight:700 }}>{fmt((prices[sel.symbol]??sel.base)*qty)}</span>
                </div>
              </div>
              {mode==="buy"
                ? <button className="btn btn-buy" style={{ width:"100%" }} onClick={() => executeTrade(sel.symbol,"buy",qty,prices[sel.symbol]??sel.base)}>BUY {qty} × {sel.symbol}</button>
                : <button className="btn btn-sell" style={{ width:"100%" }} onClick={() => executeTrade(sel.symbol,"sell",qty,prices[sel.symbol]??sel.base)}>SELL {qty} × {sel.symbol}</button>
              }
              <div style={{ marginTop:10, fontSize:12, color:"#444", textAlign:"center" }}>Cash: {fmt(cash)}</div>
            </>
          ) : (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#444" }}>
              <div style={{ fontSize:32, marginBottom:10 }}>👈</div>
              <div>Select a stock to trade</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PortfolioTab({ portfolio, optPort, prices, indexPrice, cash }) {
  const entries = Object.entries(portfolio);
  const invested = entries.reduce((a,[sym,pos]) => a+pos.avg_price*pos.qty, 0);
  const curVal = entries.reduce((a,[sym,pos]) => a+(prices[sym]??BASE_PRICES[sym])*pos.qty, 0);
  const stockPnl = curVal - invested;
  const optPnl = optPort.reduce((a,pos) => a+(bsPrice(pos.type,indexPrice,pos.strike)-pos.premium)*75*pos.lots, 0);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div className="grid4">
        <div className="stat"><div className="stat-label">Cash Balance</div><div className="stat-val" style={{ color:"#818cf8" }}>{fmt(cash)}</div></div>
        <div className="stat"><div className="stat-label">Invested</div><div className="stat-val">{fmt(invested)}</div></div>
        <div className="stat"><div className="stat-label">Stock P&amp;L</div><div className="stat-val" style={{ color:clrV(stockPnl) }}>{stockPnl>=0?"+":""}{fmt(stockPnl)}</div></div>
        <div className="stat"><div className="stat-label">Options P&amp;L</div><div className="stat-val" style={{ color:clrV(optPnl) }}>{optPnl>=0?"+":""}{fmt(optPnl)}</div></div>
      </div>
      <div className="card">
        <div style={{ fontWeight:700, fontSize:15, marginBottom:14 }}>📦 Stock Holdings</div>
        {entries.length===0 ? <div style={{ color:"#444", textAlign:"center", padding:30 }}>No stock positions yet</div> : (
          <table>
            <thead><tr><th>Symbol</th><th>Qty</th><th>Avg Price</th><th>CMP</th><th>Value</th><th>P&amp;L</th><th>%</th></tr></thead>
            <tbody>
              {entries.map(([sym,pos]) => {
                const cmp = prices[sym]??BASE_PRICES[sym];
                const pnl = (cmp-pos.avg_price)*pos.qty;
                return (
                  <tr key={sym}>
                    <td><b>{sym}</b></td>
                    <td className="mono">{pos.qty}</td>
                    <td className="mono">{fmt(pos.avg_price)}</td>
                    <td className="mono" style={{ color:clr(cmp,pos.avg_price) }}>{fmt(cmp)}</td>
                    <td className="mono">{fmt(cmp*pos.qty)}</td>
                    <td className="mono" style={{ color:clrV(pnl) }}>{pnl>=0?"+":""}{fmt(pnl)}</td>
                    <td><span className={`tag tag-${pnl>=0?"green":"red"}`}>{fmtPct(cmp,pos.avg_price)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="card">
        <div style={{ fontWeight:700, fontSize:15, marginBottom:14 }}>⚡ Options Positions</div>
        {optPort.length===0 ? <div style={{ color:"#444", textAlign:"center", padding:30 }}>No options positions yet</div> : (
          <table>
            <thead><tr><th>Contract</th><th>Type</th><th>Lots</th><th>Buy Premium</th><th>CMP</th><th>P&amp;L</th></tr></thead>
            <tbody>
              {optPort.map((pos,i) => {
                const cmp = bsPrice(pos.type,indexPrice,pos.strike);
                const pnl = (cmp-pos.premium)*75*pos.lots;
                return (
                  <tr key={i}>
                    <td><b>{INDEX_NAME} {pos.strike} {pos.type}</b></td>
                    <td><span className={`tag tag-${pos.type==="CE"?"green":"red"}`}>{pos.type}</span></td>
                    <td className="mono">{pos.lots}</td>
                    <td className="mono">{fmt(pos.premium)}</td>
                    <td className="mono" style={{ color:clr(cmp,pos.premium) }}>{fmt(cmp)}</td>
                    <td className="mono" style={{ color:clrV(pnl) }}>{pnl>=0?"+":""}{fmt(pnl)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function DerivativesTab({ indexPrice, optPort, user, showToast, refreshUser, cash }) {
  const [lots, setLots] = useState(1);
  const [sel, setSel] = useState(null);
  const [mode, setMode] = useState("buy");
  const strikes = getStrikes(indexPrice);
  const atm = Math.round(indexPrice/100)*100;

  const executeTrade = async () => {
    if (!sel) return;
    const premium = bsPrice(sel.type, indexPrice, sel.strike);
    const totalCost = premium*75*lots;
    if (mode==="buy") {
      if (totalCost>cash) { showToast("Insufficient cash!","error"); return; }
      const newOptPort = [...optPort, { strike:sel.strike, type:sel.type, lots, premium, bought_at:indexPrice }];
      await sb().from("mm_users").update({ options_portfolio:newOptPort, cash:cash-totalCost }).eq("id",user.id);
      await sb().from("mm_trades").insert({ user_id:user.id, display_name:user.display_name, symbol:`${INDEX_NAME} ${sel.strike} ${sel.type}`, type:"buy", qty:lots, price:premium, is_admin:false });
      await sb().channel("trade-bc").send({ type:"broadcast", event:"trade", payload:{ item:{ display_name:user.display_name, symbol:`${INDEX_NAME} ${sel.strike} ${sel.type}`, type:"buy", qty:lots, price:premium, is_admin:false, created_at:new Date().toISOString() } } });
      showToast(`Bought ${lots} lot(s) of ${INDEX_NAME} ${sel.strike} ${sel.type} @ ${fmt(premium)}`);
    } else {
      const idx = optPort.findIndex(p => p.strike===sel.strike && p.type===sel.type);
      if (idx===-1) { showToast("No position found!","error"); return; }
      const pos = optPort[idx];
      if (lots>pos.lots) { showToast("Not enough lots!","error"); return; }
      const pnl = (premium-pos.premium)*75*lots;
      const newOptPort = [...optPort];
      if (lots===pos.lots) newOptPort.splice(idx,1); else newOptPort[idx] = { ...pos, lots:pos.lots-lots };
      await sb().from("mm_users").update({ options_portfolio:newOptPort, cash:cash+premium*75*lots }).eq("id",user.id);
      showToast(`Sold ${lots} lot(s) — P&L: ${pnl>=0?"+":""}${fmt(pnl)}`, pnl>=0?"success":"info");
    }
    await refreshUser();
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20 }}>
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <span style={{ fontWeight:800, fontSize:17 }}>⚡ {INDEX_NAME} Option Chain</span>
            <span className="mono" style={{ marginLeft:12, color:"#f59e0b", fontWeight:700 }}>{fmt(indexPrice)}</span>
          </div>
          <span className="tag tag-blue">Lot Size: 75</span>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table>
            <thead>
              <tr>
                <th style={{ color:"#00e676" }}>CE Premium</th>
                <th style={{ textAlign:"center", color:"#f59e0b" }}>STRIKE</th>
                <th style={{ color:"#ff1744", textAlign:"right" }}>PE Premium</th>
              </tr>
            </thead>
            <tbody>
              {strikes.map(strike => {
                const ce = bsPrice("CE",indexPrice,strike);
                const pe = bsPrice("PE",indexPrice,strike);
                const isAtm = strike===atm;
                return (
                  <tr key={strike} style={isAtm?{ background:"rgba(245,158,11,.06)" }:{}}>
                    <td>
                      <button className="btn btn-buy btn-sm" onClick={() => { setSel({strike,type:"CE"}); setMode("buy"); }}>{fmt(ce)}</button>
                    </td>
                    <td style={{ textAlign:"center", fontWeight:800, fontFamily:"Space Mono", color:isAtm?"#f59e0b":"#888" }}>
                      {strike}{isAtm && <span className="tag tag-yellow" style={{ marginLeft:6, fontSize:9 }}>ATM</span>}
                    </td>
                    <td style={{ textAlign:"right" }}>
                      <button className="btn btn-sell btn-sm" onClick={() => { setSel({strike,type:"PE"}); setMode("buy"); }}>{fmt(pe)}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div className="card" style={{ position:"sticky", top:80 }}>
          {sel ? (
            <>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:6 }}>{INDEX_NAME} {sel.strike} {sel.type}</div>
              <span className={`tag tag-${sel.type==="CE"?"green":"red"}`} style={{ marginBottom:14, display:"inline-block" }}>{sel.type==="CE"?"CALL":"PUT"}</span>
              <div className="mono" style={{ fontSize:22, fontWeight:700, marginBottom:16, marginTop:8 }}>{fmt(bsPrice(sel.type,indexPrice,sel.strike))}<span style={{ fontSize:12, color:"#555" }}> /unit</span></div>
              <div style={{ display:"flex", gap:6, marginBottom:14, background:"#0a0a16", borderRadius:10, padding:4 }}>
                {["buy","sell"].map(m => (
                  <button key={m} className="btn" onClick={() => setMode(m)} style={{ flex:1, padding:8, fontSize:13, borderRadius:8, background:mode===m?(m==="buy"?"rgba(0,230,118,.15)":"rgba(255,23,68,.15)"):"none", color:mode===m?(m==="buy"?"#00e676":"#ff1744"):"#555" }}>
                    {m==="buy"?"▲ BUY":"▼ SELL"}
                  </button>
                ))}
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:"#555", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Lots</div>
                <input type="number" min={1} value={lots} onChange={e => setLots(Math.max(1,parseInt(e.target.value)||1))} />
                <div style={{ fontSize:11, color:"#555", marginTop:4 }}>{lots*75} units total</div>
              </div>
              <div style={{ background:"#0a0a16", borderRadius:10, padding:12, marginBottom:14, fontSize:13 }}>
                <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid #1a1a2e", paddingTop:8 }}>
                  <span style={{ color:"#555" }}>Total Cost</span>
                  <span className="mono" style={{ fontWeight:700 }}>{fmt(bsPrice(sel.type,indexPrice,sel.strike)*75*lots)}</span>
                </div>
              </div>
              <button className={`btn btn-${mode==="buy"?"buy":"sell"}`} style={{ width:"100%" }} onClick={executeTrade}>
                {mode==="buy"?"BUY":"SELL"} {lots} LOT{lots>1?"S":""} {sel.type}
              </button>
            </>
          ) : (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#444" }}>
              <div style={{ fontSize:32, marginBottom:10 }}>⚡</div>
              <div>Click CE/PE to select contract</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewsTab({ news }) {
  return (
    <div style={{ maxWidth:700 }}>
      <div style={{ fontWeight:700, fontSize:16, marginBottom:16 }}>📰 Market News</div>
      {news.length===0
        ? <div style={{ color:"#444", textAlign:"center", padding:50 }}>No news posted yet</div>
        : news.map((n,i) => (
          <div key={i} className="news-item slide-right" style={{ animationDelay:`${i*0.04}s`, borderLeftColor:n.impact==="bullish"?"#00e676":n.impact==="bearish"?"#ff1744":"#6366f1" }}>
            <div style={{ fontSize:11, color:"#444", marginBottom:8 }}>🕐 {new Date(n.created_at).toLocaleString("en-IN")}</div>
            <div style={{ fontSize:14, lineHeight:1.65 }}>{n.body}</div>
            {n.impact && <div style={{ marginTop:8 }}><span className={`tag tag-${n.impact==="bullish"?"green":n.impact==="bearish"?"red":"blue"}`}>{n.impact?.toUpperCase()}</span></div>}
          </div>
        ))
      }
    </div>
  );
}

function LeaderboardTab({ user, prices, indexPrice }) {
  const [users2, setUsers2] = useState([]);
  useEffect(() => {
    sb().from("mm_users").select("*").eq("status","approved").then(({ data }) => { if (data) setUsers2(data); });
  }, []);
  const ranked = users2.map(u => {
    const sv = Object.entries(u.portfolio??{}).reduce((a,[sym,pos]) => a+(prices[sym]??BASE_PRICES[sym])*pos.qty, 0);
    const ov = (u.options_portfolio??[]).reduce((a,p) => a+bsPrice(p.type,indexPrice,p.strike)*75*p.lots, 0);
    const total = u.cash+sv+ov;
    return { ...u, total, pnl:total-STARTING_BALANCE };
  }).sort((a,b) => b.total-a.total);
  return (
    <div style={{ maxWidth:800 }}>
      <div style={{ fontWeight:700, fontSize:16, marginBottom:16 }}>🏆 Leaderboard</div>
      <div className="card">
        <table>
          <thead><tr><th>#</th><th>Trader</th><th>Portfolio Value</th><th>P&amp;L</th><th>Return</th></tr></thead>
          <tbody>
            {ranked.map((u,i) => (
              <tr key={u.id} style={u.id===user?.id?{ background:"rgba(99,102,241,.08)" }:{}}>
                <td style={{ fontWeight:800, color:i===0?"#f59e0b":i===1?"#aaa":i===2?"#cd7f32":"#555" }}>
                  {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}
                </td>
                <td><b>{u.display_name}</b>{u.id===user?.id && <span style={{ marginLeft:6, fontSize:10, color:"#6366f1" }}>(you)</span>}</td>
                <td className="mono" style={{ fontWeight:700 }}>{fmt(u.total)}</td>
                <td className="mono" style={{ color:clrV(u.pnl) }}>{u.pnl>=0?"+":""}{fmt(u.pnl)}</td>
                <td><span className={`tag tag-${u.pnl>=0?"green":"red"}`}>{fmtPct(u.total,STARTING_BALANCE)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {ranked.length===0 && <div style={{ color:"#444", textAlign:"center", padding:30 }}>No participants yet</div>}
      </div>
    </div>
  );
}

function TradeLogTab({ trades, userId }) {
  const [filter, setFilter] = useState("all");
  const filtered = trades.filter(t => filter==="all" ? true : filter==="mine" ? t.user_id===userId : t.is_admin);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontWeight:700, fontSize:16 }}>📋 Trade Log <span className="live-dot" style={{ marginLeft:8 }} /></div>
        <div style={{ display:"flex", gap:6 }}>
          {["all","mine","institute"].map(f => (
            <button key={f} className="btn btn-ghost btn-sm" onClick={() => setFilter(f)} style={{ color:filter===f?"#818cf8":"#555", background:filter===f?"rgba(99,102,241,.1)":undefined }}>
              {f==="all"?"All":f==="mine"?"My Trades":"Institute"}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Time</th><th>Trader</th><th>Symbol</th><th>Type</th><th>Qty</th><th>Price</th><th>Value</th></tr></thead>
          <tbody>
            {filtered.slice(0,80).map((t,i) => (
              <tr key={i}>
                <td style={{ color:"#444", fontSize:11 }} className="mono">{tsStr(t.created_at)}</td>
                <td><b style={{ color:t.is_admin?"#f59e0b":"#e2e2f0" }}>{t.is_admin?"🏦 Institute":t.display_name}</b></td>
                <td><b>{t.symbol}</b></td>
                <td><span className={`tag tag-${t.type==="buy"?"green":"red"}`}>{t.type?.toUpperCase()}</span></td>
                <td className="mono">{t.qty}</td>
                <td className="mono">{fmt(t.price)}</td>
                <td className="mono">{fmt(t.price*t.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0 && <div style={{ color:"#444", textAlign:"center", padding:30 }}>No trades yet</div>}
      </div>
    </div>
  );
}

function AdminScreen({ prices, prevPrices, indexPrice, news, trades, users, onLogout, setPrices, setPrev, setIdx, setNews, setTrades, setUsers, loadAll, showToast }) {
  const [tab, setTab] = useState("market");
  const tabs = ["market","users","news","tradelog","portfolios"];
  const tabLabels = { market:"📊 Market Control", users:"👥 Users", news:"📰 Post News", tradelog:"📋 Trade Log", portfolios:"💼 All Portfolios" };
  return (
    <div>
      <TickerBar prices={prices} prevPrices={prevPrices} indexPrice={indexPrice} />
      <div className="nav">
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:17, fontWeight:800, background:"linear-gradient(135deg,#f59e0b,#ef4444)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", whiteSpace:"nowrap" }}>📈 MockMarket</span>
            <span className="badge-admin">ADMIN</span>
          </div>
          <div className="nav-tabs">
            {tabs.map(t => <button key={t} className={`nav-tab ${tab===t?"active":""}`} onClick={() => setTab(t)}>{tabLabels[t]}</button>)}
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <ResetButton showToast={showToast} loadAll={loadAll} setPrices={setPrices} setPrev={setPrev} setIdx={setIdx} setNews={setNews} setTrades={setTrades} setUsers={setUsers} />
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </div>
      <div style={{ padding:24 }}>
        {tab==="market"     && <AdminMarketTab prices={prices} prevPrices={prevPrices} indexPrice={indexPrice} showToast={showToast} />}
        {tab==="users"      && <AdminUsersTab users={users} showToast={showToast} setUsers={setUsers} />}
        {tab==="news"       && <AdminNewsTab news={news} showToast={showToast} />}
        {tab==="tradelog"   && <TradeLogTab trades={trades} userId={null} />}
        {tab==="portfolios" && <AdminPortfoliosTab users={users} prices={prices} indexPrice={indexPrice} showToast={showToast} setUsers={setUsers} />}
      </div>
    </div>
  );
}

function ResetButton({ showToast, loadAll, setPrices, setPrev, setIdx, setNews, setTrades, setUsers }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const doReset = async () => {
    setLoading(true);
    try {
      await Promise.all([
        sb().from("mm_trades").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        sb().from("mm_news").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        sb().from("mm_users").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      ]);
      await sb().from("mm_prices").upsert({ id:1, prices:BASE_PRICES, index_price:BASE_INDEX, updated_at:new Date().toISOString() });
      await sb().channel("price-bc").send({ type:"broadcast", event:"px", payload:{ prev:BASE_PRICES, prices:BASE_PRICES, idx:BASE_INDEX } });
      setPrices({...BASE_PRICES}); setPrev({...BASE_PRICES}); setIdx(BASE_INDEX);
      setNews([]); setTrades([]); setUsers([]);
      showToast("✅ Session reset! All data cleared.", "success");
    } catch(e) { showToast("Reset failed: "+e.message, "error"); }
    setLoading(false); setConfirm(false);
  };
  return (
    <>
      <button className="btn btn-danger btn-sm" onClick={() => setConfirm(true)}>🔄 Reset Session</button>
      {confirm && (
        <div className="modal-bg" onClick={() => setConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:36, textAlign:"center", marginBottom:12 }}>⚠️</div>
            <div style={{ fontWeight:800, fontSize:18, textAlign:"center", marginBottom:8 }}>Reset Everything?</div>
            <div style={{ color:"#888", fontSize:13, textAlign:"center", marginBottom:24, lineHeight:1.6 }}>
              This will delete ALL trades, news, and user accounts, and reset all prices to base values.<br/><b style={{ color:"#ff1744" }}>This cannot be undone.</b>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex:1 }} onClick={doReset} disabled={loading}>{loading?"Resetting...":"Yes, Reset Everything"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AdminMarketTab({ prices, prevPrices, indexPrice, showToast }) {
  const [sel, setSel] = useState(null);
  const [qty, setQty] = useState(100);
  const [customPrice, setCustomPrice] = useState("");
  const [mode, setMode] = useState("buy");

  const executeTrade = async () => {
    if (!sel) return;
    const price = parseFloat(customPrice) || (prices[sel.symbol]??sel.base);
    const impact = (qty/500)*(mode==="buy"?1:-1);
    const newPrices = { ...prices };
    newPrices[sel.symbol] = Math.max(1, price*(1+impact));
    const newIdx = Object.values(newPrices).reduce((a,v)=>a+v,0)/STOCKS.length*3.1;
    await Promise.all([
      sb().from("mm_prices").upsert({ id:1, prices:newPrices, index_price:newIdx, updated_at:new Date().toISOString() }),
      sb().from("mm_trades").insert({ user_id:"admin", display_name:"INSTITUTE", symbol:sel.symbol, type:mode, qty, price, is_admin:true }),
    ]);
    await sb().channel("price-bc").send({ type:"broadcast", event:"px", payload:{ prev:prices, prices:newPrices, idx:newIdx } });
    await sb().channel("trade-bc").send({ type:"broadcast", event:"trade", payload:{ item:{ display_name:"INSTITUTE", symbol:sel.symbol, type:mode, qty, price, is_admin:true, created_at:new Date().toISOString() } } });
    showToast(`Institute ${mode==="buy"?"bought":"sold"} ${qty} × ${sel.symbol} @ ${fmt(price)}`);
    setCustomPrice("");
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:20 }}>
      <div>
        <div style={{ fontWeight:700, fontSize:16, marginBottom:4 }}>Market Control</div>
        <div style={{ color:"#555", fontSize:13, marginBottom:16 }}>Trade as "Institute" — your trades are visible to all participants and move prices via volume</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {STOCKS.map(s => {
            const p = prices[s.symbol]??s.base;
            const pv = prevPrices[s.symbol]??s.base;
            return (
              <div key={s.symbol} onClick={() => { setSel(s); setCustomPrice(""); setQty(100); }}
                style={{ background:"#0e0e1c", border:`1px solid ${sel?.symbol===s.symbol?"#f59e0b":"#1c1c30"}`, borderRadius:14, padding:16, cursor:"pointer", transition:"all .2s" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <div><div style={{ fontWeight:800, fontSize:14 }}>{s.symbol}</div><div style={{ color:"#555", fontSize:11 }}>{s.sector}</div></div>
                  <span className={`tag tag-${p>=pv?"green":"red"}`}>{fmtPct(p,pv)}</span>
                </div>
                <div className="mono" style={{ fontSize:20, fontWeight:700, color:clr(p,pv) }}>{fmt(p)}</div>
                <div style={{ fontSize:11, color:"#333", marginTop:4 }}>Base: {fmt(s.base)}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="card" style={{ position:"sticky", top:80, border:"1px solid rgba(245,158,11,.3)" }}>
          <div style={{ fontSize:12, color:"#f59e0b", marginBottom:12, fontWeight:700 }}>🏦 INSTITUTE TRADE DESK</div>
          {sel ? (
            <>
              <div style={{ fontWeight:800, fontSize:17, marginBottom:14 }}>{sel.symbol}</div>
              <div className="mono" style={{ fontSize:22, fontWeight:700, marginBottom:16 }}>{fmt(prices[sel.symbol]??sel.base)}</div>
              <div style={{ display:"flex", gap:6, marginBottom:14, background:"#0a0a16", borderRadius:10, padding:4 }}>
                {["buy","sell"].map(m => (
                  <button key={m} className="btn" onClick={() => setMode(m)} style={{ flex:1, padding:8, fontSize:13, borderRadius:8, background:mode===m?(m==="buy"?"rgba(0,230,118,.15)":"rgba(255,23,68,.15)"):"none", color:mode===m?(m==="buy"?"#00e676":"#ff1744"):"#555" }}>
                    {m==="buy"?"▲ BUY (push up)":"▼ SELL (push down)"}
                  </button>
                ))}
              </div>
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, color:"#555", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Volume</div>
                <input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1,parseInt(e.target.value)||1))} />
                <div style={{ fontSize:11, color:"#444", marginTop:4 }}>Higher volume = bigger price impact</div>
              </div>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:"#555", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Price Override (optional)</div>
                <input type="number" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder={`Market: ${fmt(prices[sel.symbol]??sel.base)}`} />
              </div>
              <div style={{ background:"rgba(245,158,11,.08)", border:"1px solid rgba(245,158,11,.2)", borderRadius:10, padding:10, marginBottom:14, fontSize:12, color:"#f59e0b" }}>
                📊 Est. new price: <b>{fmt(Math.max(1,(parseFloat(customPrice)||(prices[sel.symbol]??sel.base))*(1+(qty/500)*(mode==="buy"?1:-1))))}</b>
              </div>
              <button className={`btn btn-${mode==="buy"?"buy":"sell"}`} style={{ width:"100%" }} onClick={executeTrade}>
                Execute Institute {mode==="buy"?"Buy":"Sell"}
              </button>
            </>
          ) : (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#444" }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🏦</div>
              <div>Select a stock to trade</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminUsersTab({ users, showToast, setUsers }) {
  const pending = users.filter(u => u.status==="pending");
  const approved = users.filter(u => u.status==="approved");

  const updateStatus = async (id, status) => {
    await sb().from("mm_users").update({ status }).eq("id", id);
    setUsers(prev => prev.map(u => u.id===id ? { ...u, status } : u));
    await sb().channel("user-bc").send({ type:"broadcast", event:"user_update", payload:{} });
    showToast(`User ${status}`);
  };

  const deleteUser = async (id) => {
    await sb().from("mm_users").delete().eq("id", id);
    setUsers(prev => prev.filter(u => u.id!==id));
    showToast("User deleted", "info");
  };

  const resetBalance = async (id) => {
    await sb().from("mm_users").update({ cash:STARTING_BALANCE, portfolio:{}, options_portfolio:[], total_invested:0 }).eq("id", id);
    setUsers(prev => prev.map(u => u.id===id ? { ...u, cash:STARTING_BALANCE, portfolio:{}, options_portfolio:[] } : u));
    showToast("Balance reset");
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {pending.length>0 && (
        <div className="card" style={{ border:"1px solid rgba(245,158,11,.3)" }}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:14, color:"#f59e0b" }}>⏳ Pending Approval ({pending.length})</div>
          <table>
            <thead><tr><th>Display Name</th><th>Username</th><th>Registered</th><th>Action</th></tr></thead>
            <tbody>
              {pending.map(u => (
                <tr key={u.id}>
                  <td><b>{u.display_name}</b></td>
                  <td className="mono" style={{ color:"#666" }}>{u.username}</td>
                  <td style={{ color:"#555", fontSize:12 }}>{new Date(u.created_at).toLocaleString("en-IN")}</td>
                  <td>
                    <div style={{ display:"flex", gap:8 }}>
                      <button className="btn btn-buy btn-sm" onClick={() => updateStatus(u.id,"approved")}>✓ Approve</button>
                      <button className="btn btn-sell btn-sm" onClick={() => updateStatus(u.id,"rejected")}>✗ Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="card">
        <div style={{ fontWeight:700, fontSize:15, marginBottom:14 }}>✅ Approved Participants ({approved.length})</div>
        {approved.length===0
          ? <div style={{ color:"#444", textAlign:"center", padding:20 }}>No approved participants yet</div>
          : <table>
            <thead><tr><th>Name</th><th>Username</th><th>Cash</th><th>Actions</th></tr></thead>
            <tbody>
              {approved.map(u => (
                <tr key={u.id}>
                  <td><b>{u.display_name}</b></td>
                  <td className="mono" style={{ color:"#555" }}>{u.username}</td>
                  <td className="mono">{fmt(u.cash)}</td>
                  <td>
                    <div style={{ display:"flex", gap:6 }}>
                      <button className="btn btn-warn btn-sm" onClick={() => resetBalance(u.id)}>Reset ₹</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>
    </div>
  );
}

function AdminNewsTab({ news, showToast }) {
  const [body, setBody] = useState("");
  const [impact, setImpact] = useState("neutral");
  const [loading, setLoading] = useState(false);

  const post = async () => {
    if (!body.trim()) { showToast("Write something first!","error"); return; }
    setLoading(true);
    const item = { body:body.trim(), impact, created_at:new Date().toISOString() };
    const { data } = await sb().from("mm_news").insert(item).select().single();
    await sb().channel("news-bc").send({ type:"broadcast", event:"news", payload:{ item:data??item } });
    setBody(""); setLoading(false);
    showToast("📡 News broadcast to all participants!");
  };

  return (
    <div style={{ maxWidth:700 }}>
      <div className="card" style={{ marginBottom:24 }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>📡 Broadcast Market News</div>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#555", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Market Sentiment</div>
          <div style={{ display:"flex", gap:8 }}>
            {["bullish","neutral","bearish"].map(imp => (
              <button key={imp} className="btn" onClick={() => setImpact(imp)} style={{ padding:"7px 16px", fontSize:13, borderRadius:8, background:impact===imp?(imp==="bullish"?"rgba(0,230,118,.15)":imp==="bearish"?"rgba(255,23,68,.15)":"rgba(99,102,241,.15)"):"rgba(255,255,255,.03)", color:impact===imp?(imp==="bullish"?"#00e676":imp==="bearish"?"#ff1744":"#818cf8"):"#555", border:"none" }}>
                {imp==="bullish"?"🟢 Bullish":imp==="bearish"?"🔴 Bearish":"⚪ Neutral"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:"#555", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>News Body</div>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your market news update here. This will immediately appear on all participant screens..." />
        </div>
        <button className="btn btn-primary" onClick={post} disabled={loading} style={{ width:"100%" }}>
          {loading?"Posting...":"📡 Broadcast to All Participants"}
        </button>
      </div>
      <div style={{ fontWeight:700, fontSize:14, marginBottom:12, color:"#666" }}>Recent Broadcasts</div>
      {news.map((n,i) => (
        <div key={i} className="news-item" style={{ borderLeftColor:n.impact==="bullish"?"#00e676":n.impact==="bearish"?"#ff1744":"#6366f1" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:11, color:"#444" }}>{new Date(n.created_at).toLocaleString("en-IN")}</span>
            <span className={`tag tag-${n.impact==="bullish"?"green":n.impact==="bearish"?"red":"blue"}`}>{n.impact?.toUpperCase()}</span>
          </div>
          <div style={{ fontSize:13 }}>{n.body}</div>
        </div>
      ))}
    </div>
  );
}

function AdminPortfoliosTab({ users, prices, indexPrice, showToast, setUsers }) {
  const approved = users.filter(u => u.status==="approved");
  const [selId, setSelId] = useState(null);
  const u = selId ? approved.find(u => u.id===selId) : null;

  const resetBalance = async (id) => {
    await sb().from("mm_users").update({ cash:STARTING_BALANCE, portfolio:{}, options_portfolio:[], total_invested:0 }).eq("id", id);
    setUsers(prev => prev.map(u => u.id===id ? { ...u, cash:STARTING_BALANCE, portfolio:{}, options_portfolio:[] } : u));
    showToast("Balance reset");
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"240px 1fr", gap:20 }}>
      <div className="card" style={{ height:"fit-content" }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>Participants</div>
        {approved.map(u => {
          const sv = Object.entries(u.portfolio??{}).reduce((a,[sym,pos]) => a+(prices[sym]??BASE_PRICES[sym])*pos.qty, 0);
          const total = u.cash+sv;
          const pnl = total-STARTING_BALANCE;
          return (
            <div key={u.id} onClick={() => setSelId(u.id)} style={{ padding:"10px 12px", borderRadius:10, cursor:"pointer", marginBottom:6, background:selId===u.id?"rgba(99,102,241,.1)":"#0a0a16", border:`1px solid ${selId===u.id?"#6366f1":"#1a1a2e"}`, transition:"all .2s" }}>
              <div style={{ fontWeight:700, fontSize:13 }}>{u.display_name}</div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                <span className="mono" style={{ fontSize:12, color:"#818cf8" }}>{fmt(total)}</span>
                <span style={{ fontSize:11, color:clrV(pnl) }}>{pnl>=0?"+":""}{fmtPct(total,STARTING_BALANCE)}</span>
              </div>
            </div>
          );
        })}
        {approved.length===0 && <div style={{ color:"#444", fontSize:13 }}>No approved users yet</div>}
      </div>
      <div>
        {u ? (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:18 }}>📊 {u.display_name}</div>
              <button className="btn btn-warn btn-sm" onClick={() => resetBalance(u.id)}>Reset Balance</button>
            </div>
            <div className="grid4" style={{ marginBottom:20 }}>
              {(() => {
                const sv = Object.entries(u.portfolio??{}).reduce((a,[sym,pos]) => a+(prices[sym]??BASE_PRICES[sym])*pos.qty, 0);
                const ov = (u.options_portfolio??[]).reduce((a,p) => a+bsPrice(p.type,indexPrice,p.strike)*75*p.lots, 0);
                const total = u.cash+sv+ov;
                const pnl = total-STARTING_BALANCE;
                return (
                  <>
                    <div className="stat"><div className="stat-label">Cash</div><div className="stat-val" style={{ color:"#818cf8" }}>{fmt(u.cash)}</div></div>
                    <div className="stat"><div className="stat-label">Stocks</div><div className="stat-val">{fmt(sv)}</div></div>
                    <div className="stat"><div className="stat-label">Total</div><div className="stat-val">{fmt(total)}</div></div>
                    <div className="stat"><div className="stat-label">P&amp;L</div><div className="stat-val" style={{ color:clrV(pnl) }}>{pnl>=0?"+":""}{fmt(pnl)}</div></div>
                  </>
                );
              })()}
            </div>
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ fontWeight:700, marginBottom:12 }}>Stock Holdings</div>
              {Object.entries(u.portfolio??{}).length===0
                ? <div style={{ color:"#444", padding:20, textAlign:"center" }}>No stock positions</div>
                : <table>
                  <thead><tr><th>Symbol</th><th>Qty</th><th>Avg</th><th>CMP</th><th>P&amp;L</th></tr></thead>
                  <tbody>
                    {Object.entries(u.portfolio??{}).map(([sym,pos]) => {
                      const cmp = prices[sym]??BASE_PRICES[sym];
                      const pnl = (cmp-pos.avg_price)*pos.qty;
                      return <tr key={sym}><td><b>{sym}</b></td><td className="mono">{pos.qty}</td><td className="mono">{fmt(pos.avg_price)}</td><td className="mono" style={{ color:clr(cmp,pos.avg_price) }}>{fmt(cmp)}</td><td className="mono" style={{ color:clrV(pnl) }}>{pnl>=0?"+":""}{fmt(pnl)}</td></tr>;
                    })}
                  </tbody>
                </table>
              }
            </div>
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:12 }}>Options Positions</div>
              {(u.options_portfolio??[]).length===0
                ? <div style={{ color:"#444", padding:20, textAlign:"center" }}>No options positions</div>
                : <table>
                  <thead><tr><th>Contract</th><th>Lots</th><th>Buy Premium</th><th>CMP</th><th>P&amp;L</th></tr></thead>
                  <tbody>
                    {(u.options_portfolio??[]).map((pos,i) => {
                      const cmp = bsPrice(pos.type,indexPrice,pos.strike);
                      const pnl = (cmp-pos.premium)*75*pos.lots;
                      return <tr key={i}><td><b>{INDEX_NAME} {pos.strike} {pos.type}</b></td><td className="mono">{pos.lots}</td><td className="mono">{fmt(pos.premium)}</td><td className="mono">{fmt(cmp)}</td><td className="mono" style={{ color:clrV(pnl) }}>{pnl>=0?"+":""}{fmt(pnl)}</td></tr>;
                    })}
                  </tbody>
                </table>
              }
            </div>
          </>
        ) : (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#444" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>👈</div>
            <div>Select a participant to view their portfolio</div>
          </div>
        )}
      </div>
    </div>
  );
}
