/* ═══════════════════════════════════════════════════════════════
   CRMPro — Full Business Automation Suite
   app.js — All logic, data, and rendering
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ── Utilities ─────────────────────────────────────────────────────────────────
const genId    = () => Math.random().toString(36).slice(2, 9);
const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const SERVICE_AREA = ['Mumbai','Delhi','Bangalore','Chennai','Hyderabad','Pune','Kolkata','Ahmedabad','Jaipur','Surat'];
const SERVICES     = ['Interior Design','Home Renovation','Painting','Plumbing','Electrical','Carpentry','Landscaping','Cleaning','Security Systems','Modular Kitchen'];
const SOURCES      = ['Website','Missed Call','Referral','Campaign','Walk-in','Social Media'];

const STATUS_CFG = {
  'New Lead':        { color:'#3B82F6', bg:'#EFF6FF' },
  'Qualified':       { color:'#10B981', bg:'#ECFDF5' },
  'Not Qualified':   { color:'#EF4444', bg:'#FEF2F2' },
  'Follow Up Later': { color:'#F59E0B', bg:'#FFFBEB' },
  'Converted':       { color:'#8B5CF6', bg:'#F5F3FF' },
  'Closed':          { color:'#6B7280', bg:'#F9FAFB' },
};

function qualify(lead) {
  const budget = parseInt(lead.budget) || 0;
  const inArea = SERVICE_AREA.some(c => (lead.location||'').toLowerCase().includes(c.toLowerCase()));
  if (budget >= 10000 && inArea) return 'Qualified';
  if (budget < 5000)  return 'Not Qualified';
  if (!inArea)        return 'Follow Up Later';
  return 'New Lead';
}

// ── Global State ──────────────────────────────────────────────────────────────
const State = {
  page: 'dashboard',
  clients: [
    { id:genId(), name:'Rahul Sharma',  phone:'9876543210', email:'rahul@example.com',  location:'Mumbai',    budget:'150000', service:'Interior Design',  status:'Qualified',       source:'Missed Call', notes:'Interested in 2BHK redesign', created:'2024-03-01', lastContact:'2024-03-03', payments:[{id:genId(),amount:5000,  date:'2024-03-02',note:'Advance'}],   reviewSent:false,reviewDone:true  },
    { id:genId(), name:'Priya Mehta',   phone:'9845123456', email:'priya@example.com',  location:'Bangalore', budget:'80000',  service:'Home Renovation',  status:'New Lead',        source:'Website',     notes:'Wants kitchen + bathroom',    created:'2024-03-04', lastContact:'2024-03-04', payments:[],                                                                 reviewSent:false,reviewDone:false },
    { id:genId(), name:'Amit Patel',    phone:'9712345678', email:'amit@example.com',   location:'Ahmedabad', budget:'200000', service:'Modular Kitchen',  status:'Converted',       source:'Referral',    notes:'High-value client',           created:'2024-02-15', lastContact:'2024-03-01', payments:[{id:genId(),amount:50000,date:'2024-02-20',note:'50% advance'}],  reviewSent:true, reviewDone:true  },
    { id:genId(), name:'Sunita Rao',    phone:'9654321098', email:'sunita@example.com', location:'Hyderabad', budget:'3000',   service:'Painting',         status:'Not Qualified',   source:'Missed Call', notes:'Budget too low',              created:'2024-03-05', lastContact:'2024-03-05', payments:[],                                                                 reviewSent:false,reviewDone:false },
    { id:genId(), name:'Karan Singh',   phone:'9988776655', email:'karan@example.com',  location:'Delhi',     budget:'120000', service:'Landscaping',      status:'Follow Up Later', source:'Campaign',    notes:'Seasonal project',            created:'2024-02-28', lastContact:'2024-03-02', payments:[],                                                                 reviewSent:false,reviewDone:false },
  ],
  missedCalls: [
    { id:genId(), phone:'9123456789', time: new Date(Date.now()-3600000).toISOString(), responded:true,  converted:false },
    { id:genId(), phone:'9876012345', time: new Date(Date.now()-7200000).toISOString(), responded:false, converted:false },
  ],
  appointments: [
    { id:genId(), clientName:'Deepa Nair',    phone:'9800123456', service:'Electrical', date:todayStr(), time:'10:00', status:'Confirmed', notes:'' },
    { id:genId(), clientName:'Vikram Joshi',  phone:'9755432100', service:'Plumbing',   date:todayStr(), time:'14:30', status:'Confirmed', notes:'' },
  ],
  sentCampaigns:  {},
  sentReminders:  new Set(),
  toasts:         [],
  // UI state
  leadSearch:     '',
  leadFilter:     'All',
  leadViewMode:   'table',
  chatMessages:   [],
  chatStage:      'greeting',
  chatLeadData:   {},
  detailClientId: null,
  detailTab:      'overview',
  showAddLead:    false,
  editLeadId:     null,
  showAddAppt:    false,
  apptFormData:   {},
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type='success') {
  const id = genId();
  State.toasts.push({ id, msg, type });
  renderToasts();
  setTimeout(() => {
    State.toasts = State.toasts.filter(t => t.id !== id);
    renderToasts();
  }, 3500);
}

function renderToasts() {
  const el = document.getElementById('toast-container');
  el.innerHTML = State.toasts.map(t => `
    <div class="toast ${t.type}">
      ${t.type==='success'?svgCheck():t.type==='error'?svgX():svgBell()}
      ${esc(t.msg)}
    </div>
  `).join('');
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const svg = (path, extra='') => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${path}</svg>`;
const svgSm = path => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

const ICONS = {
  dashboard:`<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>`,
  users:`<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  phone:`<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.09 6.09l1.18-.78a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>`,
  calendar:`<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`,
  bell:`<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`,
  star:`<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
  message:`<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`,
  bot:`<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>`,
  plus:`<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
  check:`<polyline points="20 6 9 17 4 12"/>`,
  x:`<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  edit:`<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`,
  trash:`<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`,
  search:`<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
  send:`<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>`,
  trending:`<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>`,
  refresh:`<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>`,
  eye:`<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
  dollar:`<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
  clock:`<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
  campaign:`<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>`,
  settings:`<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 1.41 1.41M4.93 4.93a10 10 0 0 0-1.41 1.41M19.07 19.07a10 10 0 0 1-1.41 1.41M4.93 19.07a10 10 0 0 0 1.41 1.41M22 12h-2M4 12H2M12 22v-2M12 4V2"/>`,
};

const icon    = name => svg(ICONS[name]||ICONS.settings);
const iconSm  = name => svgSm(ICONS[name]||ICONS.settings);
const svgCheck= ()   => svgSm(ICONS.check);
const svgX    = ()   => svgSm(ICONS.x);
const svgBell = ()   => svgSm(ICONS.bell);

// ── HTML escape ───────────────────────────────────────────────────────────────
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ── Status Badge ──────────────────────────────────────────────────────────────
function badgeStatus(status) {
  const cfg = STATUS_CFG[status] || STATUS_CFG['New Lead'];
  return `<span class="badge-status" style="background:${cfg.bg};color:${cfg.color}">${esc(status)}</span>`;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function renderSidebar() {
  const unreplied = State.missedCalls.filter(m => !m.responded).length;
  const nav = [
    { id:'dashboard',    label:'Dashboard',       icon:'dashboard' },
    { id:'leads',        label:'Leads & CRM',      icon:'users' },
    { id:'missed',       label:'Missed Calls',     icon:'phone',    badge: unreplied||null },
    { id:'appointments', label:'Appointments',     icon:'calendar' },
    { id:'reminders',    label:'Reminders',        icon:'bell' },
    { id:'reviews',      label:'Reviews',          icon:'star' },
    { id:'campaigns',    label:'Campaigns',        icon:'campaign' },
    { id:'chatbot',      label:'AI Chatbot',       icon:'bot' },
  ];

  const mainNav = nav.slice(0,2).map(n => navItem(n)).join('');
  const autoNav = nav.slice(2).map(n => navItem(n)).join('');

  document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-logo">
      <h1>CRM<span>Pro</span></h1>
      <p>Business Automation Suite</p>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-label">Main</div>
      ${mainNav}
    </div>
    <div class="sidebar-section">
      <div class="sidebar-label">Automation</div>
      ${autoNav}
    </div>
    <div class="sidebar-footer">
      <div class="label">Quick Add</div>
      <button class="btn btn-primary btn-sm btn-full" onclick="navigate('leads');openAddLead()">
        ${iconSm('plus')} New Lead
      </button>
    </div>
  `;
}

function navItem(n) {
  return `
    <div class="nav-item${State.page===n.id?' active':''}" onclick="navigate('${n.id}')">
      ${icon(n.icon)} <span>${esc(n.label)}</span>
      ${n.badge ? `<span class="badge">${n.badge}</span>` : ''}
    </div>
  `;
}

// ── Topbar ────────────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard:'Dashboard', leads:'Leads & CRM', missed:'Missed Call Auto Response',
  appointments:'Appointment Booking', reminders:'Reminder System',
  reviews:'Review Requests', campaigns:'Follow-up & Reactivation Campaigns', chatbot:'AI Chatbot',
};

function renderTopbar() {
  const unreplied = State.missedCalls.filter(m => !m.responded).length;
  document.getElementById('topbar').innerHTML = `
    <h2>${esc(PAGE_TITLES[State.page]||'')}</h2>
    <div class="search-box">
      ${icon('search')}
      <input type="text" placeholder="Search leads, clients…" oninput="onGlobalSearch(this.value)" value="${esc(State.leadSearch)}">
    </div>
    ${unreplied>0 ? `
      <button class="btn btn-sm" style="background:#FEF2F2;color:#EF4444;border:1px solid #FECACA" onclick="navigate('missed')">
        ${iconSm('phone')} ${unreplied} missed
      </button>
    ` : ''}
    <div class="topbar-avatar" title="Admin">A</div>
  `;
}

// ── Navigate ──────────────────────────────────────────────────────────────────
function navigate(page) {
  State.page = page;
  State.showAddLead = false;
  State.editLeadId  = null;
  State.detailClientId = null;
  render();
}

function onGlobalSearch(val) {
  State.leadSearch = val;
  if (State.page !== 'leads') navigate('leads');
  else renderContent();
}

function openAddLead() {
  State.showAddLead = true;
  renderContent();
}

// ── Main Render ───────────────────────────────────────────────────────────────
function render() {
  renderSidebar();
  renderTopbar();
  renderContent();
}

function renderContent() {
  const el = document.getElementById('content');
  switch (State.page) {
    case 'dashboard':    el.innerHTML = renderDashboard();    break;
    case 'leads':        el.innerHTML = renderLeads();        break;
    case 'missed':       el.innerHTML = renderMissed();       break;
    case 'appointments': el.innerHTML = renderAppointments(); break;
    case 'reminders':    el.innerHTML = renderReminders();    break;
    case 'reviews':      el.innerHTML = renderReviews();      break;
    case 'campaigns':    el.innerHTML = renderCampaigns();    break;
    case 'chatbot':      el.innerHTML = renderChatbot();      initChat(); break;
  }
  renderModals();
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
function renderDashboard() {
  const { clients, appointments, missedCalls } = State;
  const total     = clients.length;
  const qualified = clients.filter(c => c.status==='Qualified').length;
  const converted = clients.filter(c => c.status==='Converted').length;
  const revenue   = clients.reduce((s,c) => s + c.payments.reduce((a,p) => a+p.amount,0), 0);
  const unreplied = missedCalls.filter(m => !m.responded).length;
  const todayAppts= appointments.filter(a => a.date===todayStr());

  const recentActivity = [
    ...clients.slice(-5).map(c => ({ type:'lead',  text:`New lead: ${c.name}`,          time:c.created, color:'#3B82F6' })),
    ...appointments.slice(-3).map(a => ({ type:'appt',  text:`Appointment: ${a.clientName}`,time:a.date,    color:'#10B981' })),
    ...missedCalls.slice(-3).map(m => ({ type:'call',  text:`Missed call: ${m.phone}`,   time:m.time?.split('T')[0]||todayStr(), color:'#EF4444' })),
  ].sort((a,b) => b.time > a.time ? 1 : -1).slice(0,8);

  const statusCounts = Object.keys(STATUS_CFG).map(s => ({ s, count: clients.filter(c=>c.status===s).length })).filter(x=>x.count>0);

  return `
    ${unreplied>0 ? `
      <div class="missed-call-bar">
        ${icon('phone')}
        <div class="info">
          <h4>⚠️ ${unreplied} Unanswered Missed Call${unreplied>1?'s':''}</h4>
          <p>Auto-response has been sent. Review in Missed Calls module.</p>
        </div>
        <button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:#fff" onclick="navigate('missed')">View</button>
      </div>
    ` : ''}

    <div class="stats-grid">
      ${[
        { label:'Total Leads',      value:total,     sub:`+${clients.filter(c=>c.created===todayStr()).length} today`, color:'#3B82F6' },
        { label:'Qualified Leads',  value:qualified, sub:`${total?Math.round(qualified/total*100):0}% qualify rate`,  color:'#10B981' },
        { label:'Converted',        value:converted, sub:`${total?Math.round(converted/total*100):0}% close rate`,    color:'#8B5CF6' },
        { label:'Revenue Collected',value:`₹${(revenue/1000).toFixed(0)}K`, sub:'Total payments', color:'#F59E0B' },
      ].map(s=>`
        <div class="stat-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div class="s-label">${s.label}</div>
            <div style="width:32px;height:32px;border-radius:8px;background:${s.color}18;display:flex;align-items:center;justify-content:center">
              <div style="width:10px;height:10px;border-radius:3px;background:${s.color}"></div>
            </div>
          </div>
          <div class="s-value" style="color:${s.color}">${s.value}</div>
          <div class="s-sub">${s.sub}</div>
        </div>
      `).join('')}
    </div>

    <div class="grid-2" style="margin-bottom:18px">
      <div class="card">
        <div class="card-header">${icon('trending')}<h3>Lead Pipeline</h3></div>
        <div style="padding:16px">
          ${statusCounts.map(({s,count})=>`
            <div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                <span style="font-weight:700;color:${STATUS_CFG[s].color}">${s}</span>
                <span style="font-weight:800">${count}</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width:${total?(count/total*100):0}%;background:${STATUS_CFG[s].color}"></div>
              </div>
            </div>
          `).join('')}
          ${statusCounts.length===0 ? '<p style="font-size:13px;color:#8A9AB5">No leads yet</p>' : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-header">${icon('calendar')}<h3>Today's Appointments (${todayAppts.length})</h3></div>
        ${todayAppts.length===0
          ? '<div class="empty-state"><p>No appointments today</p></div>'
          : todayAppts.map(a=>`
            <div style="padding:12px 16px;border-bottom:1px solid #F4F6FA;display:flex;align-items:center;gap:12px">
              <div style="width:42px;height:42px;border-radius:10px;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#3B82F6;flex-shrink:0">${esc(a.time)}</div>
              <div style="flex:1">
                <p style="font-size:13px;font-weight:700">${esc(a.clientName)}</p>
                <p style="font-size:11px;color:#8A9AB5">${esc(a.service)} · ${esc(a.phone)}</p>
              </div>
              ${badgeStatus(a.status)}
            </div>
          `).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header">${icon('clock')}<h3>Recent Activity</h3></div>
      <div style="padding:12px 16px">
        <div class="timeline">
          ${recentActivity.map(a=>`
            <div class="timeline-item">
              <div class="timeline-dot" style="background:${a.color}1A;color:${a.color}">
                ${svg(ICONS[a.type==='lead'?'users':a.type==='appt'?'calendar':'phone'],'width="12" height="12"')}
              </div>
              <div style="flex:1;padding-top:2px">
                <p style="font-size:13px;font-weight:500">${esc(a.text)}</p>
                <p style="font-size:11px;color:#8A9AB5">${fmtDate(a.time)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ═════════════════════════════════════════════════════════════════════════════
// LEADS
// ═════════════════════════════════════════════════════════════════════════════
function renderLeads() {
  const filtered = getFilteredLeads();
  const vm = State.leadViewMode;

  return `
    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <div class="search-box" style="flex:1;max-width:300px">
        ${icon('search')}
        <input type="text" placeholder="Search leads…" value="${esc(State.leadSearch)}" oninput="onLeadSearch(this.value)">
      </div>
      <select class="form-input" style="width:170px" onchange="onLeadFilter(this.value)">
        <option value="All" ${State.leadFilter==='All'?'selected':''}>All Statuses</option>
        ${Object.keys(STATUS_CFG).map(s=>`<option value="${s}" ${State.leadFilter===s?'selected':''}>${s}</option>`).join('')}
      </select>
      <div class="tabs" style="margin:0;width:auto">
        <div class="tab${vm==='table'?' active':''}" onclick="setLeadView('table')" style="padding:6px 14px">List</div>
        <div class="tab${vm==='pipeline'?' active':''}" onclick="setLeadView('pipeline')" style="padding:6px 14px">Pipeline</div>
      </div>
      <button class="btn btn-primary" onclick="openAddLead()">
        ${iconSm('plus')} Add Lead
      </button>
    </div>

    ${vm==='table' ? renderLeadsTable(filtered) : renderPipeline(filtered)}
  `;
}

function getFilteredLeads() {
  return State.clients.filter(c => {
    const q = State.leadSearch.toLowerCase();
    const matchSearch = !q || [c.name,c.phone,c.email,c.service,c.location].some(f=>(f||'').toLowerCase().includes(q));
    const matchFilter = State.leadFilter==='All' || c.status===State.leadFilter;
    return matchSearch && matchFilter;
  });
}

function onLeadSearch(val) { State.leadSearch = val; renderContent(); }
function onLeadFilter(val) { State.leadFilter = val; renderContent(); }
function setLeadView(v)    { State.leadViewMode = v; renderContent(); }

function renderLeadsTable(clients) {
  return `
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th><th>Phone</th><th>Service</th><th>Budget</th><th>Location</th>
            <th>Status</th><th>Source</th><th>Last Contact</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${clients.length===0
            ? `<tr><td colspan="9" style="text-align:center;padding:36px;color:#8A9AB5">No leads found</td></tr>`
            : clients.map(c=>`
              <tr>
                <td>
                  <div style="font-weight:700">${esc(c.name)}</div>
                  <div style="font-size:11px;color:#8A9AB5">${esc(c.email)}</div>
                </td>
                <td style="font-family:var(--mono);font-size:12px">${esc(c.phone)}</td>
                <td>${esc(c.service)}</td>
                <td style="font-family:var(--mono)">₹${parseInt(c.budget||0).toLocaleString()}</td>
                <td>${esc(c.location)}</td>
                <td>${badgeStatus(c.status)}</td>
                <td><span class="chip" style="background:#F0F4FA;color:#6B7A95">${esc(c.source)}</span></td>
                <td style="font-size:12px;color:#8A9AB5">${fmtDate(c.lastContact)}</td>
                <td>
                  <div style="display:flex;gap:4px">
                    <button class="btn btn-ghost btn-xs" title="View" onclick="viewClient('${c.id}')">${iconSm('eye')}</button>
                    <button class="btn btn-ghost btn-xs" title="Edit" onclick="editClient('${c.id}')">${iconSm('edit')}</button>
                    <button class="btn btn-ghost btn-xs" title="Delete" style="color:#EF4444" onclick="deleteClient('${c.id}')">${iconSm('trash')}</button>
                  </div>
                </td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderPipeline(clients) {
  return `
    <div class="pipeline-cols">
      ${Object.keys(STATUS_CFG).map(col => {
        const items = clients.filter(c => c.status===col);
        const cfg = STATUS_CFG[col];
        return `
          <div class="pipeline-col">
            <div class="pipeline-col-header" style="color:${cfg.color}">
              <span>${esc(col)}</span>
              <span style="background:${cfg.bg};color:${cfg.color};border-radius:20px;padding:1px 8px;font-size:11px">${items.length}</span>
            </div>
            ${items.map(c=>`
              <div class="pipeline-card" onclick="viewClient('${c.id}')">
                <h4>${esc(c.name)}</h4>
                <p>${esc(c.service)}</p>
                <p style="margin-top:3px">₹${parseInt(c.budget||0).toLocaleString()}</p>
              </div>
            `).join('')}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function viewClient(id) { State.detailClientId = id; State.detailTab = 'overview'; renderModals(); }
function editClient(id) { State.editLeadId = id; renderModals(); }

function deleteClient(id) {
  if (!confirm('Delete this lead?')) return;
  State.clients = State.clients.filter(c => c.id!==id);
  State.detailClientId = null;
  showToast('Lead deleted', 'success');
  render();
}

// ── Lead Form Modal ───────────────────────────────────────────────────────────
function getLeadForm() {
  const isEdit = !!State.editLeadId;
  const c = isEdit ? State.clients.find(x=>x.id===State.editLeadId) : null;
  return `
    <div class="modal-overlay" onclick="closeModal(event,this)">
      <div class="modal">
        <div class="modal-title-row">
          <h2>${isEdit?'Edit Lead':'Add New Lead'}</h2>
          <button class="btn btn-ghost btn-sm" onclick="closeLeadForm()">${iconSm('x')}</button>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Full Name *</label><input id="lf-name" class="form-input" placeholder="Rahul Sharma" value="${esc(c?.name||'')}"></div>
          <div class="form-group"><label class="form-label">Phone *</label><input id="lf-phone" class="form-input" placeholder="9876543210" value="${esc(c?.phone||'')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Email</label><input id="lf-email" class="form-input" placeholder="email@example.com" value="${esc(c?.email||'')}"></div>
          <div class="form-group"><label class="form-label">Location</label>
            <select id="lf-location" class="form-input">
              <option value="">Select city</option>
              ${SERVICE_AREA.map(x=>`<option ${c?.location===x?'selected':''}>${esc(x)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Budget (₹)</label><input id="lf-budget" type="number" class="form-input" placeholder="50000" value="${esc(c?.budget||'')}"></div>
          <div class="form-group"><label class="form-label">Service</label>
            <select id="lf-service" class="form-input">
              <option value="">Select service</option>
              ${SERVICES.map(x=>`<option ${c?.service===x?'selected':''}>${esc(x)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Status</label>
            <select id="lf-status" class="form-input">
              ${Object.keys(STATUS_CFG).map(s=>`<option ${c?.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Source</label>
            <select id="lf-source" class="form-input">
              ${SOURCES.map(s=>`<option ${c?.source===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Notes</label><textarea id="lf-notes" class="form-input" rows="3" placeholder="Additional notes…">${esc(c?.notes||'')}</textarea></div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeLeadForm()">Cancel</button>
          <button class="btn btn-primary" onclick="saveLeadForm()">${isEdit?'Update Lead':'Add Lead'}</button>
        </div>
      </div>
    </div>
  `;
}

function closeLeadForm() { State.showAddLead = false; State.editLeadId = null; renderModals(); }

function saveLeadForm() {
  const name  = document.getElementById('lf-name')?.value?.trim();
  const phone = document.getElementById('lf-phone')?.value?.trim();
  if (!name || !phone) { alert('Name and phone are required'); return; }
  const data = {
    name, phone,
    email:       document.getElementById('lf-email')?.value?.trim(),
    location:    document.getElementById('lf-location')?.value,
    budget:      document.getElementById('lf-budget')?.value,
    service:     document.getElementById('lf-service')?.value,
    status:      document.getElementById('lf-status')?.value,
    source:      document.getElementById('lf-source')?.value,
    notes:       document.getElementById('lf-notes')?.value?.trim(),
    lastContact: todayStr(),
  };
  if (State.editLeadId) {
    State.clients = State.clients.map(c => c.id===State.editLeadId ? {...c,...data} : c);
    showToast('Lead updated!', 'success');
  } else {
    const lead = { id:genId(), created:todayStr(), payments:[], reviewSent:false, reviewDone:false, ...data };
    if (lead.status==='New Lead') lead.status = qualify(lead);
    State.clients.push(lead);
    showToast('Lead added! Status: '+lead.status, 'success');
  }
  closeLeadForm();
  render();
}

// ── Client Detail Modal ────────────────────────────────────────────────────────
function getClientDetail() {
  const c = State.clients.find(x=>x.id===State.detailClientId);
  if (!c) return '';
  const tab = State.detailTab;
  const totalPaid = c.payments.reduce((s,p)=>s+p.amount,0);

  return `
    <div class="modal-overlay" onclick="closeModal(event,this)">
      <div class="modal modal-wide">
        <div class="modal-title-row">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:44px;height:44px;border-radius:12px;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#3B82F6">${esc(c.name[0])}</div>
            <div>
              <h2 style="margin-bottom:2px">${esc(c.name)}</h2>
              <div style="display:flex;gap:8px;align-items:center">
                ${badgeStatus(c.status)}
                <span style="font-size:11px;color:#8A9AB5">${esc(c.phone)} · ${esc(c.source)}</span>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" style="color:#EF4444" onclick="deleteClient('${c.id}')">${iconSm('trash')} Delete</button>
            <button class="btn btn-ghost btn-sm" onclick="closeDetail()">${iconSm('x')}</button>
          </div>
        </div>

        <div class="tabs">
          ${['overview','payments','notes'].map(t=>`<div class="tab${tab===t?' active':''}" onclick="setDetailTab('${t}')">${t.charAt(0).toUpperCase()+t.slice(1)}</div>`).join('')}
        </div>

        ${tab==='overview' ? `
          <div class="grid-2">
            ${[['Service',c.service],['Location',c.location],['Budget',`₹${parseInt(c.budget||0).toLocaleString()}`],
               ['Last Contact',fmtDate(c.lastContact)],['Added',fmtDate(c.created)],
               ['Review',c.reviewDone?'✅ Received':c.reviewSent?'⏳ Sent':'Not sent']
              ].map(([k,v])=>`
              <div style="background:#F8FAFD;padding:10px 14px;border-radius:8px">
                <p style="font-size:11px;color:#8A9AB5;font-weight:700;margin-bottom:2px">${k}</p>
                <p style="font-size:13px;font-weight:700">${esc(v)}</p>
              </div>
            `).join('')}
          </div>
          ${!c.reviewSent ? `
            <div style="margin-top:12px">
              <button class="btn btn-orange btn-sm" onclick="sendReviewFromDetail('${c.id}')">
                ${iconSm('star')} Send Review Request
              </button>
            </div>
          ` : ''}
        ` : ''}

        ${tab==='payments' ? `
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
              <div>
                <p style="font-size:11px;color:#8A9AB5">Total collected</p>
                <p style="font-size:24px;font-weight:800;font-family:var(--mono);color:#10B981">₹${totalPaid.toLocaleString()}</p>
              </div>
              <button class="btn btn-primary btn-sm" onclick="showPaymentForm('${c.id}')">
                ${iconSm('plus')} Add Payment
              </button>
            </div>
            <div id="payment-form-slot"></div>
            ${c.payments.map(p=>`
              <div style="display:flex;justify-content:space-between;padding:10px 14px;background:#F8FAFD;border-radius:8px;margin-bottom:6px">
                <span style="font-size:13px;font-weight:500">${esc(p.note||'Payment')}</span>
                <div style="text-align:right">
                  <p style="font-size:13px;font-weight:800;font-family:var(--mono);color:#10B981">₹${p.amount.toLocaleString()}</p>
                  <p style="font-size:11px;color:#8A9AB5">${fmtDate(p.date)}</p>
                </div>
              </div>
            `).join('')}
            ${c.payments.length===0 ? '<p style="font-size:13px;color:#8A9AB5">No payments yet</p>' : ''}
          </div>
        ` : ''}

        ${tab==='notes' ? `
          <textarea class="form-input" rows="7" placeholder="Notes about this client…" oninput="updateClientNotes('${c.id}',this.value)">${esc(c.notes||'')}</textarea>
        ` : ''}
      </div>
    </div>
  `;
}

function closeDetail() { State.detailClientId = null; renderModals(); }
function setDetailTab(t) { State.detailTab = t; renderModals(); }

function sendReviewFromDetail(id) {
  State.clients = State.clients.map(c => c.id===id ? {...c,reviewSent:true} : c);
  showToast('⭐ Review request sent!', 'success');
  renderModals();
}

function updateClientNotes(id, val) {
  State.clients = State.clients.map(c => c.id===id ? {...c,notes:val} : c);
}

function showPaymentForm(clientId) {
  const slot = document.getElementById('payment-form-slot');
  if (!slot) return;
  slot.innerHTML = `
    <div style="background:#F8FAFD;padding:14px;border-radius:10px;margin-bottom:12px">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Amount (₹)</label><input id="pay-amount" type="number" class="form-input" placeholder="5000"></div>
        <div class="form-group"><label class="form-label">Note</label><input id="pay-note" class="form-input" placeholder="Advance / Final"></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-success btn-sm" onclick="savePayment('${clientId}')">Save</button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('payment-form-slot').innerHTML=''">Cancel</button>
      </div>
    </div>
  `;
}

function savePayment(clientId) {
  const amount = parseInt(document.getElementById('pay-amount')?.value)||0;
  const note   = document.getElementById('pay-note')?.value||'Payment';
  if (!amount) { alert('Enter a valid amount'); return; }
  const pay = { id:genId(), amount, date:todayStr(), note };
  State.clients = State.clients.map(c => c.id===clientId ? {...c,payments:[...c.payments,pay]} : c);
  showToast('Payment recorded!', 'success');
  renderModals();
}

// ── Modals Renderer ───────────────────────────────────────────────────────────
function renderModals() {
  const el = document.getElementById('modals');
  let html = '';
  if (State.showAddLead || State.editLeadId) html += getLeadForm();
  if (State.detailClientId) html += getClientDetail();
  // Appointment modal
  if (State.showAddAppt) html += getApptForm();
  el.innerHTML = html;
}

function closeModal(e, overlay) {
  if (e.target === overlay) {
    State.showAddLead = false;
    State.editLeadId  = null;
    State.detailClientId = null;
    State.showAddAppt = false;
    renderModals();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MISSED CALLS
// ═════════════════════════════════════════════════════════════════════════════
function renderMissed() {
  const { missedCalls } = State;
  const MSG = `Hi! Thanks for contacting us. We noticed your call and want to help. Please reply to this message or call back and we'll assist you. 😊`;

  return `
    <div class="card" style="margin-bottom:16px">
      <div style="padding:16px 20px">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:8px">Auto-Response Message</h3>
        <div style="background:#F0FDF4;border:1px solid #A7F3D0;border-radius:10px;padding:12px 16px">
          <p style="font-size:13px;color:#065F46;font-style:italic">"${esc(MSG)}"</p>
        </div>
        <p style="font-size:11px;color:#8A9AB5;margin-top:8px">Automatically sent via SMS to every missed call number.</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        ${icon('phone')}
        <h3>Missed Calls (${missedCalls.length})</h3>
        <button class="btn btn-primary btn-sm" onclick="toggleSimulate()">
          ${iconSm('plus')} Simulate Call
        </button>
      </div>
      <div id="simulate-slot"></div>
      <table class="table">
        <thead><tr><th>Phone</th><th>Time</th><th>Auto-Response</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${missedCalls.map(c=>`
            <tr>
              <td style="font-family:var(--mono);font-weight:700">${esc(c.phone)}</td>
              <td style="font-size:12px;color:#8A9AB5">${new Date(c.time).toLocaleString('en-IN')}</td>
              <td>${c.responded
                ? `<span class="chip" style="background:#ECFDF5;color:#10B981">✓ Sent</span>`
                : `<span class="chip" style="background:#FEF2F2;color:#EF4444">Pending</span>`}</td>
              <td>${c.converted
                ? `<span class="chip" style="background:#F5F3FF;color:#8B5CF6">Converted</span>`
                : `<span class="chip" style="background:#FFFBEB;color:#F59E0B">New</span>`}</td>
              <td>
                <div style="display:flex;gap:4px">
                  ${!c.responded ? `<button class="btn btn-success btn-xs" onclick="respondCall('${c.id}')">${iconSm('send')} Respond</button>` : ''}
                  ${!c.converted ? `<button class="btn btn-primary btn-xs" onclick="convertCall('${c.id}')">${iconSm('plus')} Lead</button>` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function toggleSimulate() {
  const slot = document.getElementById('simulate-slot');
  if (!slot) return;
  if (slot.innerHTML) { slot.innerHTML=''; return; }
  slot.innerHTML = `
    <div style="padding:12px 20px;background:#F8FAFD;border-bottom:1px solid #F0F4FA;display:flex;gap:10px;align-items:center">
      <input id="sim-phone" class="form-input" style="max-width:220px" placeholder="Enter phone number">
      <button class="btn btn-danger btn-sm" onclick="doSimulate()">Simulate Missed Call</button>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('simulate-slot').innerHTML=''">Cancel</button>
    </div>
  `;
}

function doSimulate() {
  const phone = document.getElementById('sim-phone')?.value?.trim();
  if (!phone) return;
  State.missedCalls.unshift({ id:genId(), phone, time:new Date().toISOString(), responded:false, converted:false });
  showToast(`📞 Missed call from ${phone} — Auto-SMS sent!`, 'info');
  render();
}

function respondCall(id) {
  State.missedCalls = State.missedCalls.map(c => c.id===id ? {...c,responded:true} : c);
  showToast('Response sent!', 'success');
  render();
}

function convertCall(id) {
  const call = State.missedCalls.find(c=>c.id===id);
  if (!call) return;
  const lead = { id:genId(), name:'Unknown', phone:call.phone, email:'', location:'', budget:'', service:'', status:'New Lead', source:'Missed Call', notes:'Via missed call', created:todayStr(), lastContact:todayStr(), payments:[], reviewSent:false, reviewDone:false };
  State.clients.push(lead);
  State.missedCalls = State.missedCalls.map(c => c.id===id ? {...c,converted:true} : c);
  showToast('Converted to lead!', 'success');
  render();
}

// ═════════════════════════════════════════════════════════════════════════════
// APPOINTMENTS
// ═════════════════════════════════════════════════════════════════════════════
function renderAppointments() {
  const { appointments } = State;
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const firstDay    = new Date(year,month,1).getDay();
  const todayNum    = now.getDate();

  const apptDays = appointments.map(a => {
    const d = new Date(a.date);
    return (d.getFullYear()===year && d.getMonth()===month) ? d.getDate() : null;
  }).filter(Boolean);

  const todayAppts  = appointments.filter(a => a.date===todayStr());
  const upcomingAppts = appointments.filter(a => a.date>todayStr()).sort((a,b)=>a.date>b.date?1:-1);

  return `
    <div class="grid-2">
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-header">${icon('calendar')}<h3>${now.toLocaleString('en-IN',{month:'long',year:'numeric'})}</h3></div>
          <div style="padding:14px">
            <div class="cal-day-labels">
              ${['S','M','T','W','T','F','S'].map(d=>`<span>${d}</span>`).join('')}
            </div>
            <div class="cal-grid">
              ${Array(firstDay).fill('<div></div>').join('')}
              ${Array.from({length:daysInMonth},(_,i)=>{
                const day = i+1;
                const isToday = day===todayNum;
                const hasAppt = apptDays.includes(day);
                return `<div class="cal-day${isToday?' today':''}${hasAppt?' has-appt':''}">${day}</div>`;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            ${icon('clock')}
            <h3>Today (${todayAppts.length})</h3>
            <button class="btn btn-primary btn-sm" onclick="openApptForm()">${iconSm('plus')} Book</button>
          </div>
          ${todayAppts.length===0
            ? '<div class="empty-state"><p>No appointments today</p></div>'
            : todayAppts.map(a=>`
              <div style="padding:12px 16px;border-bottom:1px solid #F4F6FA">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                  <div>
                    <p style="font-weight:700;font-size:13px">${esc(a.clientName)}</p>
                    <p style="font-size:11px;color:#8A9AB5">${esc(a.time)} · ${esc(a.service)} · ${esc(a.phone)}</p>
                  </div>
                  <select onchange="updateApptStatus('${a.id}',this.value)" class="form-input" style="width:auto;font-size:11px;padding:3px 6px">
                    ${['Confirmed','Completed','No Show','Rescheduled','Cancelled'].map(s=>`<option ${a.status===s?'selected':''}>${s}</option>`).join('')}
                  </select>
                </div>
              </div>
            `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header">${icon('calendar')}<h3>Upcoming (${upcomingAppts.length})</h3></div>
        <div style="max-height:540px;overflow-y:auto">
          ${upcomingAppts.length===0
            ? '<div class="empty-state"><h3>No upcoming appointments</h3><p>Book via the calendar.</p></div>'
            : upcomingAppts.map(a=>`
              <div style="padding:12px 16px;border-bottom:1px solid #F4F6FA">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <p style="font-weight:700;font-size:13px">${esc(a.clientName)}</p>
                    <p style="font-size:11px;color:#8A9AB5">${fmtDate(a.date)} at ${esc(a.time)}</p>
                    <p style="font-size:11px;color:#8A9AB5">${esc(a.service)} · ${esc(a.phone)}</p>
                  </div>
                  ${badgeStatus(a.status)}
                </div>
              </div>
            `).join('')}
        </div>
      </div>
    </div>
  `;
}

function openApptForm() {
  State.showAddAppt = true;
  State.apptFormData = { clientName:'', phone:'', service:'', date:todayStr(), time:'10:00', notes:'' };
  renderModals();
}

function getApptForm() {
  const f = State.apptFormData;
  return `
    <div class="modal-overlay" onclick="closeModal(event,this)">
      <div class="modal">
        <div class="modal-title-row">
          <h2>Book Appointment</h2>
          <button class="btn btn-ghost btn-sm" onclick="closeApptForm()">${iconSm('x')}</button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Client Name *</label>
            <input id="af-name" class="form-input" placeholder="Client name" value="${esc(f.clientName)}" list="af-clients">
            <datalist id="af-clients">${State.clients.map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist>
          </div>
          <div class="form-group"><label class="form-label">Phone *</label><input id="af-phone" class="form-input" placeholder="9876543210" value="${esc(f.phone)}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Date *</label><input id="af-date" type="date" class="form-input" value="${esc(f.date)}"></div>
          <div class="form-group"><label class="form-label">Time *</label><input id="af-time" type="time" class="form-input" value="${esc(f.time)}"></div>
        </div>
        <div class="form-group"><label class="form-label">Service</label>
          <select id="af-service" class="form-input">
            <option value="">Select service</option>
            ${SERVICES.map(s=>`<option ${f.service===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Notes</label><textarea id="af-notes" class="form-input" rows="2" placeholder="Any special requests…">${esc(f.notes)}</textarea></div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeApptForm()">Cancel</button>
          <button class="btn btn-primary" onclick="saveApptForm()">Confirm Booking</button>
        </div>
      </div>
    </div>
  `;
}

function closeApptForm() { State.showAddAppt = false; renderModals(); }

function saveApptForm() {
  const clientName = document.getElementById('af-name')?.value?.trim();
  const phone      = document.getElementById('af-phone')?.value?.trim();
  const date       = document.getElementById('af-date')?.value;
  const time       = document.getElementById('af-time')?.value;
  if (!clientName || !date || !time) { alert('Name, date and time are required'); return; }
  const appt = { id:genId(), clientName, phone, service:document.getElementById('af-service')?.value||'', date, time, notes:document.getElementById('af-notes')?.value||'', status:'Confirmed' };
  State.appointments.push(appt);
  showToast(`Appointment confirmed for ${clientName} on ${fmtDate(date)}!`, 'success');
  closeApptForm();
  render();
}

function updateApptStatus(id, status) {
  State.appointments = State.appointments.map(a => a.id===id ? {...a,status} : a);
  showToast('Status updated to '+status, 'info');
  renderContent();
}

// ═════════════════════════════════════════════════════════════════════════════
// REMINDERS
// ═════════════════════════════════════════════════════════════════════════════
function renderReminders() {
  const { appointments, clients, sentReminders } = State;
  const upcoming = appointments.filter(a => a.date>=todayStr() && a.status==='Confirmed');
  const noShows  = appointments.filter(a => a.status==='No Show' && !sentReminders.has(a.id+'_noshow'));
  const followUps= clients.filter(c => c.status==='Qualified' && !sentReminders.has(c.id+'_followup'));

  return `
    <div class="grid-2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-header" style="background:#FFF7ED">
          ${icon('bell')}
          <h3 style="color:#92400E">Appointment Reminders (${upcoming.length})</h3>
        </div>
        ${upcoming.length===0 ? '<div class="empty-state"><p>No upcoming appointments</p></div>' :
          upcoming.slice(0,8).map(a=>{
            const daysLeft = Math.ceil((new Date(a.date)-new Date())/86400000);
            const s24 = sentReminders.has(a.id+'_24h');
            const s2  = sentReminders.has(a.id+'_2h');
            return `
              <div style="padding:12px 16px;border-bottom:1px solid #F4F6FA">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
                  <div>
                    <p style="font-weight:700;font-size:13px">${esc(a.clientName)}</p>
                    <p style="font-size:11px;color:#8A9AB5">${fmtDate(a.date)} · ${esc(a.time)} · ${esc(a.service)}</p>
                    <span style="font-size:11px;font-weight:700;color:${daysLeft<=1?'#EF4444':'#F59E0B'}">
                      ${daysLeft===0?'Today':daysLeft===1?'Tomorrow':`In ${daysLeft} days`}
                    </span>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
                    <button class="btn btn-sm ${s24?'btn-ghost':'btn-orange'}" ${s24?'disabled':''} onclick="sendReminder('${a.id}','24h','${esc(a.clientName)}')" style="font-size:11px">
                      ${s24?'✓ 24h sent':'24h reminder'}
                    </button>
                    <button class="btn btn-sm btn-ghost" ${s2?'disabled':''} onclick="sendReminder('${a.id}','2h','${esc(a.clientName)}')" style="font-size:11px">
                      ${s2?'✓ 2h sent':'2h reminder'}
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
      </div>

      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-header" style="background:#FEF2F2">
            ${icon('phone')}
            <h3 style="color:#991B1B">No-Show Follow-ups (${noShows.length})</h3>
          </div>
          ${noShows.length===0 ? '<div class="empty-state" style="padding:20px"><p>No no-shows 🎉</p></div>' :
            noShows.map(a=>`
              <div style="padding:12px 16px;border-bottom:1px solid #F4F6FA;display:flex;justify-content:space-between;align-items:center">
                <div>
                  <p style="font-weight:700;font-size:13px">${esc(a.clientName)}</p>
                  <p style="font-size:11px;color:#8A9AB5">Was: ${fmtDate(a.date)} at ${esc(a.time)}</p>
                </div>
                <button class="btn btn-danger btn-sm" onclick="sendReminder('${a.id}','noshow','${esc(a.clientName)}')">${iconSm('send')} Reschedule Msg</button>
              </div>
            `).join('')}
        </div>

        <div class="card">
          <div class="card-header" style="background:#F0FDF4">
            ${icon('refresh')}
            <h3 style="color:#065F46">Post-Service Follow-ups (${followUps.length})</h3>
          </div>
          ${followUps.slice(0,5).map(c=>`
            <div style="padding:12px 16px;border-bottom:1px solid #F4F6FA;display:flex;justify-content:space-between;align-items:center">
              <div>
                <p style="font-weight:700;font-size:13px">${esc(c.name)}</p>
                <p style="font-size:11px;color:#8A9AB5">${esc(c.service)} · ${esc(c.phone)}</p>
              </div>
              <button class="btn btn-success btn-sm" onclick="sendReminder('${c.id}','followup','${esc(c.name)}')">${iconSm('send')} Follow Up</button>
            </div>
          `).join('')}
          ${followUps.length===0 ? '<div class="empty-state" style="padding:20px"><p>All done! 🎉</p></div>' : ''}
        </div>
      </div>
    </div>
  `;
}

function sendReminder(id, type, name) {
  State.sentReminders.add(id+'_'+type);
  showToast(`✅ Reminder sent to ${name}!`, 'success');
  renderContent();
}

// ═════════════════════════════════════════════════════════════════════════════
// REVIEWS
// ═════════════════════════════════════════════════════════════════════════════
function renderReviews() {
  const { clients } = State;
  const eligible = clients.filter(c => c.status==='Converted' || c.payments.length>0);
  const notSent  = eligible.filter(c => !c.reviewSent);
  const sent     = eligible.filter(c => c.reviewSent);
  const done     = eligible.filter(c => c.reviewDone);

  return `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px">
      ${[
        { label:'Eligible for Review', value:eligible.length, color:'#3B82F6' },
        { label:'Requests Sent',       value:sent.length,     color:'#F59E0B' },
        { label:'Reviews Received',    value:done.length,     color:'#10B981' },
      ].map(s=>`
        <div class="stat-card">
          <div class="s-label">${s.label}</div>
          <div class="s-value" style="color:${s.color}">${s.value}</div>
        </div>
      `).join('')}
    </div>

    <div class="card" style="margin-bottom:16px">
      <div style="padding:16px 20px">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:8px">Review Request Template</h3>
        <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:12px 16px">
          <p style="font-size:13px;color:#92400E;font-style:italic">
            "Thank you for choosing us! We hope you're happy with our service. 😊 Please take 1 minute to leave us a review — it means a lot! ⭐ [Google Review Link]"
          </p>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          ${icon('send')}<h3>Pending Requests (${notSent.length})</h3>
          ${notSent.length>0 ? `<button class="btn btn-orange btn-sm" onclick="sendAllReviews()">Send All</button>` : ''}
        </div>
        ${notSent.map(c=>`
          <div style="padding:10px 16px;border-bottom:1px solid #F4F6FA;display:flex;justify-content:space-between;align-items:center">
            <div>
              <p style="font-weight:700;font-size:13px">${esc(c.name)}</p>
              <p style="font-size:11px;color:#8A9AB5">${esc(c.service)} · ${esc(c.phone)}</p>
            </div>
            <button class="btn btn-orange btn-sm" onclick="sendOneReview('${c.id}')">${iconSm('star')} Request</button>
          </div>
        `).join('')}
        ${notSent.length===0 ? '<div class="empty-state"><p>All requests sent! 🎉</p></div>' : ''}
      </div>

      <div class="card">
        <div class="card-header">${icon('star')}<h3>Reviews Received (${done.length})</h3></div>
        ${done.map(c=>`
          <div style="padding:10px 16px;border-bottom:1px solid #F4F6FA;display:flex;justify-content:space-between;align-items:center">
            <div>
              <p style="font-weight:700;font-size:13px">${esc(c.name)}</p>
              <div style="font-size:16px;color:#F59E0B">★★★★★</div>
            </div>
            <span class="chip" style="background:#ECFDF5;color:#10B981">✓ Received</span>
          </div>
        `).join('')}
        ${sent.filter(c=>!c.reviewDone).map(c=>`
          <div style="padding:10px 16px;border-bottom:1px solid #F4F6FA;display:flex;justify-content:space-between;align-items:center">
            <div>
              <p style="font-weight:700;font-size:13px">${esc(c.name)}</p>
              <p style="font-size:11px;color:#8A9AB5">Request sent · Awaiting review</p>
            </div>
            <button class="btn btn-ghost btn-xs" onclick="markReviewDone('${c.id}')">Mark Received</button>
          </div>
        `).join('')}
        ${done.length===0 && sent.filter(c=>!c.reviewDone).length===0 ? '<div class="empty-state"><p>No reviews yet</p></div>' : ''}
      </div>
    </div>
  `;
}

function sendOneReview(id) {
  State.clients = State.clients.map(c => c.id===id ? {...c,reviewSent:true} : c);
  showToast('⭐ Review request sent!', 'success');
  renderContent();
}
function sendAllReviews() {
  const eligible = State.clients.filter(c => (c.status==='Converted'||c.payments.length>0) && !c.reviewSent);
  State.clients = State.clients.map(c => eligible.find(e=>e.id===c.id) ? {...c,reviewSent:true} : c);
  showToast(`Review requests sent to ${eligible.length} clients!`, 'success');
  renderContent();
}
function markReviewDone(id) {
  State.clients = State.clients.map(c => c.id===id ? {...c,reviewDone:true} : c);
  showToast('Review marked as received!', 'success');
  renderContent();
}

// ═════════════════════════════════════════════════════════════════════════════
// CAMPAIGNS
// ═════════════════════════════════════════════════════════════════════════════
const CAMPAIGNS = [
  { id:'followup2',  label:'2-Day Follow-Up',         segment:'No response in 2 days',       color:'#3B82F6', icon:'message',  msg:'Hi {name}! Just checking if you are still interested in our {service} service. We\'d love to help! 😊' },
  { id:'offer7',     label:'7-Day Special Offer',      segment:'Leads older than 7 days',     color:'#F59E0B', icon:'campaign', msg:'Hi {name}! 🎉 Special offer — Get 10% OFF on {service} if you book this week! Limited slots.' },
  { id:'birthday',   label:'Birthday Campaign',        segment:'Birthdays this month',        color:'#EC4899', icon:'star',     msg:'Happy Birthday {name}! 🎂 Enjoy 15% discount on your next service as our birthday gift! 🎁' },
  { id:'diwali',     label:'Diwali Special',           segment:'All clients',                 color:'#F59E0B', icon:'bell',     msg:'Happy Diwali {name}! 🪔 Celebrate with 20% OFF on all services this week!' },
  { id:'reactivate', label:'Reactivation — 30 Days',   segment:'No contact in 30+ days',      color:'#8B5CF6', icon:'refresh', msg:'Hi {name}, it\'s been a while! 👋 Come back and enjoy exclusive offers on {service}. Book now!' },
  { id:'newyr',      label:'New Year Offer',           segment:'All active clients',          color:'#10B981', icon:'trending', msg:'Happy New Year {name}! 🎆 Get 25% OFF on all services in January! Your home deserves the best.' },
];

function getTargets(camp) {
  const { clients } = State;
  if (camp.id==='followup2')  return clients.filter(c=>c.status==='New Lead');
  if (camp.id==='offer7')     return clients.filter(c=>['New Lead','Follow Up Later'].includes(c.status));
  if (camp.id==='reactivate') return clients.filter(c=>c.lastContact<new Date(Date.now()-25*86400000).toISOString().split('T')[0]);
  return clients.filter(c=>c.status!=='Not Qualified');
}

function renderCampaigns() {
  const { sentCampaigns } = State;

  return `
    <div class="grid-2" style="margin-bottom:20px">
      ${CAMPAIGNS.map(c=>{
        const targets = getTargets(c);
        const sent    = sentCampaigns[c.id];
        return `
          <div class="card" style="border-left:4px solid ${c.color}">
            <div style="padding:16px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:36px;height:36px;border-radius:8px;background:${c.color}18;display:flex;align-items:center;justify-content:center;color:${c.color}">
                    ${icon(c.icon)}
                  </div>
                  <div>
                    <h3 style="font-size:13px;font-weight:800">${esc(c.label)}</h3>
                    <p style="font-size:11px;color:#8A9AB5">${esc(c.segment)}</p>
                  </div>
                </div>
                <span style="font-size:12px;font-weight:800;color:${c.color}">${targets.length} recipients</span>
              </div>
              <div style="background:#F8FAFD;border-radius:8px;padding:10px 12px;margin-bottom:10px">
                <p style="font-size:12px;color:#4A5568;font-style:italic;line-height:1.55">${esc(c.msg)}</p>
              </div>
              ${sent
                ? `<div style="background:#ECFDF5;border-radius:6px;padding:7px 10px;font-size:12px;color:#065F46;font-weight:600">✅ Sent to ${sent.count} clients at ${sent.time}</div>`
                : `<button class="btn btn-sm btn-full" style="background:${c.color};color:#fff" onclick="sendCampaign('${c.id}')">
                    ${iconSm('send')} Send Campaign
                  </button>`}
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="card">
      <div class="card-header">${icon('edit')}<h3>Custom Campaign</h3></div>
      <div style="padding:16px">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Target Segment</label>
            <select id="custom-segment" class="form-input" onchange="updateCustomCount()">
              <option value="All">All Leads</option>
              ${Object.keys(STATUS_CFG).map(s=>`<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Recipients</label>
            <input id="custom-count" class="form-input" readonly value="${State.clients.length} clients">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Message (use {name} for personalisation)</label>
          <textarea id="custom-msg" class="form-input" rows="3" placeholder="Hi {name}, we have a special offer just for you…"></textarea>
        </div>
        <button class="btn btn-primary" onclick="sendCustomCampaign()">${iconSm('send')} Send Custom Campaign</button>
      </div>
    </div>
  `;
}

function sendCampaign(id) {
  const camp    = CAMPAIGNS.find(c=>c.id===id);
  const targets = getTargets(camp);
  State.sentCampaigns[id] = { count:targets.length, time:new Date().toLocaleTimeString() };
  showToast(`📨 "${camp.label}" sent to ${targets.length} clients!`, 'success');
  renderContent();
}

function updateCustomCount() {
  const seg   = document.getElementById('custom-segment')?.value;
  const count = seg==='All' ? State.clients.length : State.clients.filter(c=>c.status===seg).length;
  const el    = document.getElementById('custom-count');
  if (el) el.value = count+' clients';
}

function sendCustomCampaign() {
  const msg = document.getElementById('custom-msg')?.value?.trim();
  if (!msg) { alert('Please enter a message'); return; }
  showToast('Custom campaign sent! 🎉', 'success');
  if (document.getElementById('custom-msg')) document.getElementById('custom-msg').value='';
}

// ═════════════════════════════════════════════════════════════════════════════
// AI CHATBOT
// ═════════════════════════════════════════════════════════════════════════════
function renderChatbot() {
  const chatbotLeads = State.clients.filter(c=>c.source==='AI Chatbot').length;

  return `
    <div class="grid-2">
      <div>
        <div class="card">
          <div class="card-header" style="background:linear-gradient(135deg,#1E3A5F,#0F2044)">
            <div style="width:34px;height:34px;border-radius:10px;background:#3B82F6;display:flex;align-items:center;justify-content:center">${icon('bot')}</div>
            <div>
              <h3 style="color:#fff;font-size:14px">AI Assistant</h3>
              <p style="font-size:11px;color:#7A96B5">Online · Automated</p>
            </div>
            <div style="margin-left:auto;display:flex;align-items:center;gap:6px">
              <div style="width:8px;height:8px;border-radius:50%;background:#10B981"></div>
              <span style="font-size:11px;color:#7A96B5">Active</span>
            </div>
          </div>
          <div class="chat-wrap" style="padding:16px">
            <div class="chat-messages" id="chat-messages"></div>
            <div class="chat-input-row">
              <input id="chat-input" type="text" placeholder="Type a message…" onkeydown="if(event.key==='Enter')sendChatMsg()">
              <button class="btn btn-primary btn-sm" onclick="sendChatMsg()">${iconSm('send')}</button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-header">${icon('settings')}<h3>Chatbot Configuration</h3></div>
          <div style="padding:16px">
            ${[
              { label:'Auto Lead Capture',  desc:'Save leads to CRM automatically',   on:true  },
              { label:'24/7 Availability',  desc:'Bot is always online',              on:true  },
              { label:'Human Handoff',      desc:'Transfer to agent when needed',     on:true  },
              { label:'WhatsApp Integration',desc:'Connect to WhatsApp Business',    on:false },
              { label:'Facebook Messenger', desc:'Connect to Facebook page',         on:false },
            ].map(f=>`
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F4F6FA">
                <div>
                  <p style="font-size:13px;font-weight:700">${esc(f.label)}</p>
                  <p style="font-size:11px;color:#8A9AB5">${esc(f.desc)}</p>
                </div>
                <div class="toggle" style="background:${f.on?'#3B82F6':'#D1D5DB'}">
                  <div class="toggle-knob" style="left:${f.on?20:2}px"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header">${icon('trending')}<h3>Chatbot Stats</h3></div>
          <div style="padding:16px">
            ${[
              { label:'Total Conversations', value:'—',          color:'#3B82F6' },
              { label:'Leads Captured',      value:chatbotLeads, color:'#10B981' },
              { label:'Avg Response Time',   value:'<1s',        color:'#F59E0B' },
              { label:'Satisfaction',        value:'—',          color:'#8B5CF6' },
            ].map(s=>`
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F4F6FA">
                <p style="font-size:13px;color:#4A5568">${s.label}</p>
                <p style="font-size:16px;font-weight:800;font-family:var(--mono);color:${s.color}">${s.value}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function initChat() {
  if (State.chatMessages.length===0) {
    State.chatMessages = [{ from:'bot', text:"👋 Hello! Welcome to our service! How can I help you today?", opts:['Get a quote','Book appointment','Track my order','Talk to support'] }];
    State.chatStage = 'greeting';
    State.chatLeadData = {};
  }
  renderChatWindow();
}

function renderChatWindow() {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  el.innerHTML = State.chatMessages.map((m,i) => `
    <div>
      <div class="chat-msg ${m.from}">${esc(m.text)}</div>
      ${m.opts && m.from==='bot' ? `
        <div class="quick-options">
          ${m.opts.map(o=>`<span class="quick-opt" onclick="chatOption('${esc(o)}')">${esc(o)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
  el.scrollTop = el.scrollHeight;
}

function chatOption(opt) {
  processChatInput(opt);
}

function sendChatMsg() {
  const input = document.getElementById('chat-input');
  if (!input || !input.value.trim()) return;
  const val = input.value.trim();
  input.value = '';
  processChatInput(val);
}

function processChatInput(msg) {
  State.chatMessages.push({ from:'user', text:msg });
  renderChatWindow();

  setTimeout(() => {
    const stage = State.chatStage;
    const ld    = State.chatLeadData;
    let reply   = '', opts = null;

    if (stage==='greeting') {
      if (/quote|price|book|service/i.test(msg)) {
        reply = 'Great! Which service are you interested in?';
        opts  = SERVICES.slice(0,6);
        State.chatStage = 'service';
      } else if (/support|help|human/i.test(msg)) {
        reply = 'I\'ll connect you to our team. What\'s your name?';
        State.chatStage = 'name';
      } else {
        reply = 'I can help you get a quote, book an appointment, or answer questions. What would you like?';
        opts  = ['Get a quote','Book appointment','Talk to support'];
      }
    } else if (stage==='service') {
      State.chatLeadData.service = msg;
      reply = `Great choice! ${msg} is one of our top services. 🌟\n\nWhat's your budget range?`;
      opts  = ['Under ₹10,000','₹10,000 – ₹50,000','₹50,000 – ₹1,50,000','Above ₹1,50,000'];
      State.chatStage = 'budget';
    } else if (stage==='budget') {
      const bmap = {'Under ₹10,000':'8000','₹10,000 – ₹50,000':'30000','₹50,000 – ₹1,50,000':'100000','Above ₹1,50,000':'200000'};
      State.chatLeadData.budget = bmap[msg]||'50000';
      reply = 'Which city are you in?';
      opts  = SERVICE_AREA.slice(0,6);
      State.chatStage = 'location';
    } else if (stage==='location') {
      State.chatLeadData.location = msg;
      reply = 'Perfect! What\'s your name?';
      State.chatStage = 'name';
    } else if (stage==='name') {
      State.chatLeadData.name = msg;
      reply = 'And your phone number?';
      State.chatStage = 'phone';
    } else if (stage==='phone') {
      const final = { ...State.chatLeadData, phone:msg };
      const status= qualify(final);
      const lead  = { id:genId(), name:final.name||'Chatbot Lead', phone:msg, email:'', location:final.location||'', budget:final.budget||'0', service:final.service||'', status, source:'AI Chatbot', notes:'Lead captured via chatbot', created:todayStr(), lastContact:todayStr(), payments:[], reviewSent:false, reviewDone:false };
      State.clients.push(lead);
      reply = `🎉 Thank you, ${final.name}!\n\nYour enquiry has been saved.\nStatus: ${status}\n\nOur team will contact you at ${msg} within 24 hours.`;
      opts  = ['Start over','Thanks, goodbye!'];
      State.chatStage = 'done';
      showToast(`New lead captured via chatbot: ${final.name}`, 'success');
      renderSidebar();
    } else if (stage==='done') {
      if (/start|over|again/i.test(msg)) {
        State.chatStage = 'greeting'; State.chatLeadData = {};
        reply = 'Of course! How can I help you today?';
        opts  = ['Get a quote','Book appointment','Talk to support'];
      } else {
        reply = 'Thank you for chatting with us! Our team will be in touch soon. Have a great day! 👋';
      }
    } else {
      reply = 'I\'m not sure I understood that. Can you select one of the options below?';
      opts  = ['Get a quote','Book appointment','Talk to support'];
      State.chatStage = 'greeting';
    }

    State.chatMessages.push({ from:'bot', text:reply, opts });
    renderChatWindow();
  }, 550);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  render();
});
