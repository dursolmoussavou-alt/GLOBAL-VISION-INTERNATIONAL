const KEY = "gvi_v1_store";
const CFG = window.GVI_CONFIG || {};
const LOGO_SRC = "assets/gvi-logo.jpg";
const STATUSES = ["Réceptionné","En stock","En magasin","Prêt à expédier","En transit","Arrivé à destination","Livré","Récupéré"];
const DEFAULT_TARIFFS = [{destination:"Ghana",price:90}];
let sb = null;
let db = null;
let state = {page:"dashboard",search:"",selected:null,editing:null,filters:{status:"",destination:"",from:"",to:"",minWeight:"",maxWeight:""}};
let toastTimer;

function configured(){ return !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase?.createClient); }
function seed(){return {users:[{id:"u-admin",name:"Administrateur GVI",email:"admin@gvi-international.ma",role:"admin",approved:true,password:"admin123"}],parcels:[],tariffs:[...DEFAULT_TARIFFS],session:null,online:false};}
function localLoad(){try{const x=JSON.parse(localStorage.getItem(KEY));return x&&x.users&&x.parcels?x:seed()}catch{return seed()}}
function saveLocal(){if(!db?.online)localStorage.setItem(KEY,JSON.stringify(db))}
function currentUser(){return db?.user||db?.users?.find(u=>u.id===db.session)||null}
function isAdmin(){return currentUser()?.role==="admin"}
function esc(v){return String(v??"").replace(/[&<>'"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[m]))}
function money(v){return `${Number(v||0).toFixed(2)} DH`}
function dateFmt(v){if(!v)return "—";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString("fr-FR")}
function toast(msg){clearTimeout(toastTimer);let el=document.getElementById("toast");if(!el){el=document.createElement("div");el.id="toast";el.className="toast";document.body.appendChild(el)}el.textContent=msg;el.style.display="block";toastTimer=setTimeout(()=>el.style.display="none",2600)}

function dbStatus(){return db?.online?'<span class="mode-pill online" title="Supabase configuré et accessible">● BASE CONNECTÉE</span>':'<span class="mode-pill local" title="Supabase non configuré ou indisponible">● BASE NON CONNECTÉE</span>'}
function supabaseErrorMessage(error){
  const m=String(error?.message||error||'Erreur inconnue');
  if(/invalid login credentials/i.test(m)) return "Email ou mot de passe incorrect. Vérifiez l’adresse et le mot de passe dans Supabase Authentication.";
  if(/email not confirmed/i.test(m)) return "Adresse e-mail non confirmée. Activez la confirmation automatique du compte ou confirmez l’e-mail dans Supabase.";
  if(/failed to fetch|network|fetch/i.test(m)) return "Supabase est inaccessible. Vérifiez l’URL du projet, la clé publique et votre connexion Internet.";
  return m;
}
async function testConnection(){
  const el=document.getElementById('dbTestResult');
  if(el) el.innerHTML='<span class="muted">Test en cours…</span>';
  if(!configured()){
    if(el) el.innerHTML='<span class="error">🔴 Non configurée : renseignez SUPABASE_URL et SUPABASE_ANON_KEY dans config.js.</span>';
    return;
  }
  try{
    if(!sb) sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session}}=await sb.auth.getSession();
    if(!session){
      if(el) el.innerHTML='<span class="warn-text">🟠 Serveur Supabase joignable, mais aucune session administrateur n’est ouverte.</span>';
      return;
    }
    const {error}=await sb.from('parcels').select('id',{head:true,count:'exact'});
    if(error) throw error;
    if(el) el.innerHTML='<span class="success-text">🟢 Base de données : CONNECTÉE et table parcels accessible.</span>';
  }catch(e){
    console.error(e);
    if(el) el.innerHTML=`<span class="error">🔴 ${esc(supabaseErrorMessage(e))}</span>`;
  }
}
function badge(s){let c="";if(["Livré","Récupéré"].includes(s))c="success";else if(s==="En transit")c="blue";else if(s==="En magasin")c="warn";return `<span class="badge ${c}">${esc(s)}</span>`}

async function init(){
  if(configured()){
    try{
      sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      db={online:true,parcels:[],tariffs:[],user:null,session:null};
      const {data:{session}}=await sb.auth.getSession();
      if(session){await hydrateOnline(session)} else loginView();
      sb.auth.onAuthStateChange(async (_event,session)=>{if(session){setTimeout(()=>hydrateOnline(session),0)}else{db={online:true,parcels:[],tariffs:[],user:null,session:null};loginView()}});
      return;
    }catch(e){console.error(e);toast("Base en ligne indisponible : mode local activé.")}
  }
  db=localLoad(); if(db.session) layout(); else loginView();
}
async function hydrateOnline(session){
  try{
    const {data:profile,error:pe}=await sb.from("profiles").select("id,full_name,role,approved").eq("id",session.user.id).single();
    if(pe)throw pe;
    if(!profile.approved){await sb.auth.signOut({scope:"local"});loginView("Compte en attente d’approbation.");return}
    const [{data:parcels,error:pa},{data:tariffs,error:ta}]=await Promise.all([
      sb.from("parcels").select("*").order("created_at",{ascending:false}),
      sb.from("tariffs").select("*").order("destination")
    ]);
    if(pa)throw pa;if(ta)throw ta;
    db={online:true,parcels:parcels||[],tariffs:tariffs||[],user:{id:profile.id,name:profile.full_name||session.user.email,email:session.user.email,role:profile.role,approved:profile.approved},session:session};
    state.page="dashboard";layout();
  }catch(e){console.error(e);loginView(`Impossible de charger la base en ligne : ${supabaseErrorMessage(e)}`)}
}

function layout(){
 if(!currentUser()){loginView();return}
 document.getElementById("app").innerHTML=`<div class="app-shell">
  <header class="topbar"><div class="topbar-left"><img class="logo-sm" src="${LOGO_SRC}" onerror="this.src='assets/gvi-logo.jpg'"><div class="brand-text"><b>GVI INTERNATIONAL</b><span>Gestion & expédition de colis</span></div></div>
  <div class="topbar-right">${dbStatus()}<button class="btn btn-secondary btn-test-db" onclick="testConnection()">Tester la connexion</button><span class="user-pill">${esc(currentUser().name||currentUser().email)} · ${currentUser().role==='admin'?'Admin':'Collaborateur'}</span><button class="btn btn-secondary" onclick="logout()">Déconnexion</button></div></header>
  <div class="layout"><aside class="sidebar"><div class="nav-title">Menu principal</div><nav class="nav">${[
   ["dashboard","⌂","Tableau de bord"],["parcels","▣","Gestion des colis"],["new","＋","Nouveau colis"],["admin","⚙","Administration"]
  ].map(n=>`<button class="${state.page===n[0]?"active":""}" onclick="go('${n[0]}')"><span>${n[1]}</span>${n[2]}</button>`).join("")}</nav><div class="sidebar-foot">${esc(CFG.COMPANY?.hours||"09H–18H · Lundi à vendredi")}</div></aside>
  <main class="content" id="main"></main></div></div><div id="toast" class="toast" style="display:none"></div>`;
 renderPage();
}
function loginView(msg=""){
 document.getElementById("app").innerHTML=`<div class="login"><div class="login-card"><div class="logo-frame"><img class="logo" src="${LOGO_SRC}" onerror="this.style.display='none';this.parentNode.classList.add('logo-fallback')"><strong>GVI</strong><span>INTERNATIONAL</span></div><h1>Gestion des colis</h1><p class="subtitle">Espace professionnel GVI International</p>
 <form onsubmit="login(event)"><div class="field"><label>Email</label><input id="loginEmail" type="email" placeholder="votre@email.com" required></div><div class="field" style="margin-top:14px"><label>Mot de passe</label><input id="loginPassword" type="password" required></div><button class="btn btn-primary btn-block" style="margin-top:18px">Se connecter</button><div id="loginMsg" class="${msg?'error':''}">${esc(msg)}</div></form>
 ${db?.online?'':'<p class="note" style="margin-top:18px">Mode local de démonstration : <b>admin@gvi-international.ma</b> / <b>admin123</b>.</p>'}
 <div class="db-test card-lite"><div class="db-test-head"><b>État de la base de données</b>${dbStatus()}</div><div id="dbTestResult" class="note">Cliquez sur <b>Tester la connexion</b> pour lancer le diagnostic.</div><button type="button" class="btn btn-secondary" onclick="testConnection()">Tester la connexion</button></div>
 <div class="login-contact"><b>Contacts</b><div>${(CFG.COMPANY?.phones||[]).map(x=>`<span>${esc(x)}</span>`).join("")}</div><small>${esc(CFG.COMPANY?.hours||"")}</small></div></div></div>`;
}
async function login(e){e.preventDefault();const email=document.getElementById("loginEmail").value.trim().toLowerCase(),pw=document.getElementById("loginPassword").value;
 if(db.online){const {error}=await sb.auth.signInWithPassword({email,password:pw});if(error)document.getElementById("loginMsg").innerHTML=`<div class="error">${esc(supabaseErrorMessage(error))}</div>`;return}
 const u=db.users.find(x=>x.email.toLowerCase()===email&&x.password===pw);if(!u){document.getElementById("loginMsg").innerHTML='<div class="error">Email ou mot de passe incorrect.</div>';return}db.session=u.id;saveLocal();state.page="dashboard";layout();
}
async function logout(){if(db.online){await sb.auth.signOut({scope:"local"});return}db.session=null;saveLocal();state={page:"dashboard",search:"",selected:null,editing:null,filters:{}};layout()}
function go(p){if(p==="admin"&&!isAdmin()){toast("Accès administrateur requis.");return}state.page=p;state.selected=null;state.editing=null;renderPage();window.scrollTo({top:0,behavior:"smooth"})}
function renderPage(){const el=document.getElementById("main");if(!el)return;if(state.page==="dashboard")el.innerHTML=dashboard();else if(state.page==="parcels")el.innerHTML=parcels();else if(state.page==="new")el.innerHTML=parcelForm();else if(state.page==="fiche")el.innerHTML=fiche(state.selected);else if(state.page==="admin")el.innerHTML=admin();else el.innerHTML=dashboard()}

function dashboard(){
 const total=db.parcels.length,active=db.parcels.filter(p=>!["Livré","Récupéré"].includes(p.status)).length,delivered=db.parcels.filter(p=>["Livré","Récupéré"].includes(p.status)).length,revenue=db.parcels.reduce((s,p)=>s+Number(p.total||0),0);
 const recent=[...db.parcels].sort((a,b)=>new Date(b.created_at||b.createdAt)-new Date(a.created_at||a.createdAt)).slice(0,7);
 return `<div class="page-head"><div><div class="eyebrow">GVI INTERNATIONAL</div><h2>Tableau de bord</h2><p>Pilotage des opérations colis, en temps réel${db.online?' depuis la base en ligne.':'.'}</p></div><div class="actions"><button class="btn btn-primary" onclick="go('new')">＋ Nouveau colis</button></div></div>
 <div class="grid-cards"><div class="stat"><div class="label">Total colis</div><div class="value">${total}</div><small>enregistrés</small></div><div class="stat"><div class="label">En cours</div><div class="value">${active}</div><small>hors terminés</small></div><div class="stat"><div class="label">Livrés / récupérés</div><div class="value">${delivered}</div><small>terminés</small></div><div class="stat"><div class="label">Montant total</div><div class="value money-value">${money(revenue)}</div><small>prix des colis</small></div></div>
 <div class="two-col"><section class="card"><div class="section-head"><h3>Derniers colis</h3><button class="link-btn" onclick="go('parcels')">Voir tout →</button></div>${recent.length?`<div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Client</th><th>Destination</th><th>Date</th><th>Statut</th></tr></thead><tbody>${recent.map(p=>`<tr onclick="openParcel('${esc(p.id)}')" style="cursor:pointer"><td class="parcel-id">${esc(p.id)}</td><td>${esc(p.client)}</td><td>${esc(p.destination)}</td><td>${dateFmt(p.date)}</td><td>${badge(p.status)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Aucun colis. Créez votre premier colis.</div>`}</section>
 <section class="card"><div class="section-head"><h3>Répartition des statuts</h3></div><div class="mini-list">${STATUSES.map(s=>{const n=db.parcels.filter(p=>p.status===s).length;return `<div class="mini-item"><span>${esc(s)}</span><b>${n}</b></div>`}).join("")}</div></section></div>
 <section class="contact-card"><div><div class="eyebrow">CONTACT GVI</div><h3>Nous contacter</h3><p>${esc(CFG.COMPANY?.hours||"")}</p><div class="phones">${(CFG.COMPANY?.phones||[]).map(x=>`<a href="tel:${x.replace(/\s/g,'')}">${esc(x)}</a>`).join("")}</div></div><a class="tiktok-btn" href="${esc(CFG.TIKTOK_URL||'https://www.tiktok.com/') }" target="_blank" rel="noopener">♪ TikTok</a></section>`;
}

function filteredParcels(){
 const q=state.search.trim().toLowerCase(),f=state.filters||{};
 return db.parcels.filter(p=>{
   const hay=[p.id,p.client,p.tel,p.destination,p.destinataire,p.tel_dest,p.telDest,p.origin,p.status,p.created_by_email,p.createdBy].join(" ").toLowerCase();
   if(q&&!hay.includes(q))return false;
   if(f.status&&p.status!==f.status)return false;
   if(f.destination&&String(p.destination||"").toLowerCase()!==f.destination.toLowerCase())return false;
   if(f.from&&String(p.date)<f.from)return false;if(f.to&&String(p.date)>f.to)return false;
   if(f.minWeight!==""&&Number(p.weight)<Number(f.minWeight))return false;if(f.maxWeight!==""&&Number(p.weight)>Number(f.maxWeight))return false;
   return true;
 }).sort((a,b)=>new Date(b.created_at||b.createdAt)-new Date(a.created_at||a.createdAt));
}
function parcels(){
 const rows=filteredParcels(), destinations=[...new Set(db.parcels.map(p=>p.destination).filter(Boolean))].sort();
 return `<div class="page-head"><div><div class="eyebrow">EXPÉDITION</div><h2>Gestion des colis</h2><p>Recherche avancée, modification, suppression et suivi.</p></div><div class="actions"><button class="btn btn-primary" onclick="go('new')">＋ Nouveau colis</button><button class="btn btn-secondary" onclick="exportCSV()">Exporter CSV</button></div></div>
 <section class="card filter-card"><form onsubmit="applyFilters(event)"><div class="toolbar"><div class="search"><input name="q" value="${esc(state.search)}" placeholder="ID, nom, téléphone, destination, destinataire…"></div><button class="btn btn-primary">Rechercher</button><button type="button" class="btn btn-secondary" onclick="clearFilters()">Réinitialiser</button></div><div class="advanced-filters"><div class="field"><label>Statut</label><select name="status"><option value="">Tous</option>${STATUSES.map(s=>`<option ${state.filters.status===s?'selected':''}>${esc(s)}</option>`).join("")}</select></div><div class="field"><label>Destination</label><select name="destination"><option value="">Toutes</option>${destinations.map(d=>`<option ${state.filters.destination===d?'selected':''}>${esc(d)}</option>`).join("")}</select></div><div class="field"><label>Date début</label><input type="date" name="from" value="${esc(state.filters.from||"")}"></div><div class="field"><label>Date fin</label><input type="date" name="to" value="${esc(state.filters.to||"")}"></div><div class="field"><label>Poids min. (kg)</label><input type="number" step="0.01" name="minWeight" value="${esc(state.filters.minWeight||"")}"></div><div class="field"><label>Poids max. (kg)</label><input type="number" step="0.01" name="maxWeight" value="${esc(state.filters.maxWeight||"")}"></div></div></form></section>
 <section class="card"><div class="result-bar"><b>${rows.length}</b> colis trouvé(s)</div>${rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Client</th><th>Destinataire</th><th>Destination</th><th>Poids</th><th>Total</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${rows.map(p=>`<tr><td class="parcel-id">${esc(p.id)}</td><td>${esc(p.client)}</td><td>${esc(p.destinataire||"—")}</td><td>${esc(p.destination)}</td><td>${Number(p.weight||0).toFixed(2)} kg</td><td>${money(p.total)}</td><td>${badge(p.status)}</td><td class="row-actions"><button class="btn btn-secondary" onclick="openParcel('${esc(p.id)}')">Fiche</button><button class="btn btn-secondary" onclick="editParcel('${esc(p.id)}')">Modifier</button>${isAdmin()?`<button class="btn btn-danger" onclick="deleteParcel('${esc(p.id)}')">Supprimer</button>`:""}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Aucun colis ne correspond aux critères.</div>`}</section>`;
}
function applyFilters(e){e.preventDefault();const o=Object.fromEntries(new FormData(e.target).entries());state.search=o.q||"";state.filters={status:o.status||"",destination:o.destination||"",from:o.from||"",to:o.to||"",minWeight:o.minWeight||"",maxWeight:o.maxWeight||""};renderPage()}
function clearFilters(){state.search="";state.filters={status:"",destination:"",from:"",to:"",minWeight:"",maxWeight:""};renderPage()}

function parcelForm(){
 const p=state.editing?db.parcels.find(x=>x.id===state.editing):null,t=db.tariffs;
 return `<div class="page-head"><div><div class="eyebrow">COLIS</div><h2>${p?'Modifier le colis':'Nouveau colis'}</h2><p>${p?'Mettez à jour les informations sans recréer le colis.':'Enregistrez un colis et générez automatiquement son identifiant et son QR Code.'}</p></div></div><form class="card" onsubmit="saveParcel(event)"><div class="form-grid">
 <div class="field"><label>Nom et prénom client *</label><input name="client" value="${esc(p?.client)}" required></div><div class="field"><label>Téléphone client</label><input name="tel" value="${esc(p?.tel)}"></div><div class="field"><label>Date de réception *</label><input type="date" name="date" value="${p?.date||new Date().toISOString().slice(0,10)}" required></div><div class="field"><label>Provenance</label><input name="origin" value="${esc(p?.origin)}" placeholder="Ville / pays"></div>
 <div class="field"><label>Destination *</label><input name="destination" list="destinations" value="${esc(p?.destination)}" required oninput="autoPrice(this.value)"><datalist id="destinations">${t.map(x=>`<option value="${esc(x.destination)}">${money(x.price)}/kg</option>`).join("")}</datalist></div><div class="field"><label>Destinataire</label><input name="destinataire" value="${esc(p?.destinataire)}"></div><div class="field"><label>Téléphone destinataire</label><input name="telDest" value="${esc(p?.tel_dest??p?.telDest)}"></div><div class="field"><label>Quantité</label><input type="number" min="1" name="qty" value="${p?.qty||1}"></div>
 <div class="field"><label>Type colis</label><input name="type" value="${esc(p?.type)}" placeholder="Carton, sac, valise…"></div><div class="field"><label>Poids (kg) *</label><input id="weight" type="number" step="0.01" min="0" name="weight" value="${p?.weight||''}" required oninput="calcTotal()"></div><div class="field"><label>Prix unitaire (DH/kg) *</label><input id="price" type="number" step="0.01" min="0" name="price" value="${p?.price||''}" required oninput="calcTotal()"></div><div class="field"><label>Prix total (DH)</label><input id="total" name="total" value="${p?.total||0}" readonly></div><div class="field"><label>Valeur déclarée (DH)</label><input type="number" step="0.01" min="0" name="declared" value="${p?.declared||0}"></div><div class="field"><label>Statut</label><select name="status">${STATUSES.map(s=>`<option ${p?.status===s||(!p&&s==='Réceptionné')?'selected':''}>${esc(s)}</option>`).join("")}</select></div><div class="field full"><label>Notes</label><textarea name="notes" rows="3" placeholder="Informations complémentaires">${esc(p?.notes)}</textarea></div>
 </div><div class="actions" style="margin-top:20px"><button type="button" class="btn btn-secondary" onclick="go('parcels')">Annuler</button><button class="btn btn-primary">${p?'Enregistrer les modifications':'Enregistrer le colis'}</button></div></form>`;
}
function autoPrice(destination){const x=db.tariffs.find(t=>String(t.destination).toLowerCase()===destination.trim().toLowerCase());if(x){const el=document.getElementById('price');if(el){el.value=x.price;calcTotal()}}}
function calcTotal(){const w=Number(document.getElementById('weight')?.value||0),p=Number(document.getElementById('price')?.value||0),el=document.getElementById('total');if(el)el.value=(w*p).toFixed(2)}
async function nextId(){
 if(db.online){const {data,error}=await sb.rpc('next_parcel_id');if(!error&&data)return data}
 const prefix=`GVI-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-`;
 const nums=db.parcels.filter(p=>String(p.id).startsWith(prefix)).map(p=>Number(String(p.id).split('-').pop())).filter(Number.isFinite);return prefix+String((nums.length?Math.max(...nums):0)+1).padStart(5,'0');
}
function normalizeParcel(p){return {...p,telDest:p.tel_dest??p.telDest,createdAt:p.created_at??p.createdAt,updatedAt:p.updated_at??p.updatedAt,createdBy:p.created_by_email??p.createdBy}}
async function saveParcel(e){e.preventDefault();const f=Object.fromEntries(new FormData(e.target).entries());const base={client:f.client.trim(),tel:f.tel?.trim()||'',date:f.date,origin:f.origin?.trim()||'',destination:f.destination.trim(),destinataire:f.destinataire?.trim()||'',tel_dest:f.telDest?.trim()||'',qty:Number(f.qty||1),type:f.type?.trim()||'',weight:Number(f.weight||0),price:Number(f.price||0),total:Number(Number(f.weight||0)*Number(f.price||0)),declared:Number(f.declared||0),status:f.status,notes:f.notes?.trim()||'',updated_at:new Date().toISOString()};
 try{
  if(db.online){
    if(state.editing){const {data,error}=await sb.from('parcels').update(base).eq('id',state.editing).select().single();if(error)throw error;replaceParcel(data);toast('Colis modifié avec succès.');openParcel(data.id)}
    else {const id=await nextId();const u=currentUser();const row={...base,id,created_by:u.id,created_by_email:u.email,created_at:new Date().toISOString()};const {data,error}=await sb.from('parcels').insert(row).select().single();if(error)throw error;db.parcels.unshift(data);toast(`Colis ${id} enregistré en ligne.`);openParcel(id)}
  }else{
    if(state.editing){const i=db.parcels.findIndex(p=>p.id===state.editing);db.parcels[i]={...db.parcels[i],...base,telDest:base.tel_dest,updatedAt:base.updated_at};saveLocal();toast('Colis modifié avec succès.');openParcel(state.editing)}
    else {const id=await nextId();const u=currentUser();const row={...base,id,createdBy:u.email,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),telDest:base.tel_dest};db.parcels.push(row);saveLocal();toast(`Colis ${id} enregistré.`);openParcel(id)}
  }
 }catch(err){console.error(err);toast('Erreur lors de l’enregistrement du colis. Vérifiez la connexion et les droits.')} finally {state.editing=null;}
}
function replaceParcel(data){const i=db.parcels.findIndex(p=>p.id===data.id);if(i>=0)db.parcels[i]=data;else db.parcels.unshift(data)}
function openParcel(id){state.selected=id;state.page='fiche';renderPage()}
function editParcel(id){const p=db.parcels.find(x=>x.id===id);if(!p)return;if(!isAdmin()&&db.online&&p.created_by!==currentUser().id){toast('Vous pouvez modifier uniquement vos propres colis.');return}state.editing=id;state.page='new';renderPage()}
async function deleteParcel(id){if(!isAdmin())return;if(!confirm('Supprimer définitivement ce colis ? Cette action est irréversible.'))return;try{if(db.online){const {error}=await sb.from('parcels').delete().eq('id',id);if(error)throw error}db.parcels=db.parcels.filter(p=>p.id!==id);saveLocal();toast('Colis supprimé.');go('parcels')}catch(e){console.error(e);toast('Suppression impossible.')}}
async function changeStatus(id,status){const p=db.parcels.find(x=>x.id===id);if(!p)return;if(!isAdmin()&&db.online&&p.created_by!==currentUser().id){toast('Vous pouvez modifier uniquement vos propres colis.');return}try{if(db.online){const {data,error}=await sb.from('parcels').update({status,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;replaceParcel(data)}else{p.status=status;p.updatedAt=new Date().toISOString();saveLocal()}toast('Statut mis à jour.');renderPage()}catch(e){console.error(e);toast('Mise à jour impossible.')}}

function fiche(id){const raw=db.parcels.find(x=>x.id===id);if(!raw)return '<div class="empty">Colis introuvable.</div>';const p=normalizeParcel(raw),canEdit=isAdmin()||!db.online||p.created_by===currentUser()?.id;
 return `<div class="page-head"><div><div class="eyebrow">SUIVI COLIS</div><h2>Fiche colis</h2><p><span class="parcel-id">${esc(p.id)}</span> · reçu le ${dateFmt(p.date)}</p></div><div class="actions">${canEdit?`<button class="btn btn-secondary" onclick="editParcel('${esc(p.id)}')">Modifier</button>`:''}<button class="btn btn-secondary" onclick="printLabel('${esc(p.id)}')">Imprimer étiquette</button>${isAdmin()?`<button class="btn btn-danger" onclick="deleteParcel('${esc(p.id)}')">Supprimer</button>`:''}</div></div>
 <div class="fiche"><section class="card"><div class="section-head"><h3>Informations du colis</h3>${badge(p.status)}</div><div class="detail-grid">${[["Client",p.client],["TEL client",p.tel],["Date réception",dateFmt(p.date)],["Provenance",p.origin],["Destination",p.destination],["Destinataire",p.destinataire],["TEL destinataire",p.telDest],["Quantité",p.qty],["Type colis",p.type],["Poids",p.weight+' kg'],["Prix/kg",money(p.price)],["Prix total",money(p.total)],["Valeur déclarée",money(p.declared)],["Créé par",p.createdBy]].map(x=>`<div class="detail"><div class="k">${x[0]}</div><div class="v">${esc(x[1]||'—')}</div></div>`).join('')}</div><div class="notes-box"><div class="muted">Notes</div><div>${esc(p.notes||'Aucune note.')}</div></div></section>
 <aside class="card"><h3>QR Code</h3><div id="qrFiche" class="qr-box"></div><p class="note">Le QR contient : nom, numéro, provenance, destination, prix total et poids.</p><div class="status-control"><label class="muted">Statut actuel</label><div style="margin:7px 0 14px">${badge(p.status)}</div>${canEdit?`<select onchange="changeStatus('${esc(p.id)}',this.value)">${STATUSES.map(s=>`<option ${p.status===s?'selected':''}>${esc(s)}</option>`).join('')}</select>`:''}</div></aside></div>
 <section class="card" style="margin-top:18px"><div class="section-head"><h3>Historique des étapes</h3></div><div class="timeline">${STATUSES.map(s=>`<div class="timeline-row"><div class="dot ${p.status===s?'current':''}"></div><div><b>${esc(s)}</b>${p.status===s?'<div class="muted timeline-current">Statut actuel</div>':''}</div></div>`).join('')}</div></section><script>setTimeout(()=>makeQR('qrFiche',parcelPayload(${JSON.stringify(p)})),30)</script>`;
}
function parcelPayload(p){return `GVI INTERNATIONAL\nNom: ${p.client||''}\nNumero: ${p.tel||''}\nProvenance: ${p.origin||''}\nDestination: ${p.destination||''}\nPrix: ${Number(p.total||0).toFixed(2)} DH\nPoids: ${Number(p.weight||0).toFixed(2)} kg`}
function makeQR(id,data){const el=document.getElementById(id);if(!el||!window.QRCode)return;el.innerHTML='';new QRCode(el,{text:data,width:220,height:220,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M})}
function labelHTML(p){return `<div class="label-print"><img src="${LOGO_SRC}" class="label-logo"><div class="label-brand">GVI INTERNATIONAL</div><div class="label-id">${esc(p.id)}</div><div class="label-row"><b>Nom :</b> ${esc(p.client)}</div><div class="label-row"><b>N° :</b> ${esc(p.tel||'—')}</div><div class="label-row"><b>Provenance :</b> ${esc(p.origin||'—')}</div><div class="label-row"><b>Destination :</b> ${esc(p.destination)}</div><div class="label-row"><b>Prix :</b> ${money(p.total)}</div><div class="label-row"><b>Poids :</b> ${esc(p.weight)} kg</div><div class="label-row"><b>Statut :</b> ${esc(p.status)}</div><div class="label-qr"><div id="printQR"></div></div></div>`}
function printLabel(id){const raw=db.parcels.find(x=>x.id===id);if(!raw)return;const p=normalizeParcel(raw),w=window.open('','_blank','width=500,height=700');if(!w)return;const logoUrl=new URL(LOGO_SRC,window.location.href).href;const html=labelHTML(p).replaceAll(LOGO_SRC,logoUrl);w.document.write(`<html><head><title>Étiquette ${esc(p.id)}</title><style>body{margin:0;font-family:Arial}.label-print{width:90mm;padding:8mm}.label-print img{width:38mm;display:block;margin:auto}.label-brand{text-align:center;font-weight:800;margin:2mm}.label-id{font-size:22px;font-weight:900;text-align:center}.label-row{font-size:11px;margin:3px 0}.label-qr{display:flex;justify-content:center;margin:6mm 0}</style></head><body>${html}<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script><script>new QRCode(document.getElementById('printQR'),{text:${JSON.stringify(parcelPayload(p))},width:220,height:220});setTimeout(()=>window.print(),500)<\/script></body></html>`);w.document.close()}

function admin(){if(!isAdmin())return '<div class="empty">Accès administrateur requis.</div>';return `<div class="page-head"><div><div class="eyebrow">ADMINISTRATION</div><h2>Administration</h2><p>Tarifs, collaborateurs et maintenance de la plateforme.</p></div></div><div class="two-col"><section class="card"><div class="section-head"><h3>Collaborateurs</h3><span class="mode-pill ${db.online?'online':'local'}">${db.online?'Comptes Supabase':'Comptes locaux'}</span></div>${db.online?`<p class="note">Les comptes de connexion sont gérés par Supabase Auth. Les rôles et l’approbation sont gérés dans la table <b>profiles</b>. Pour créer un nouveau collaborateur, créez son compte dans Supabase Auth puis mettez son profil à jour.</p><button class="btn btn-secondary" onclick="window.open('https://supabase.com/dashboard','_blank')">Ouvrir Supabase</button>`:`<div class="actions" style="margin-bottom:15px"><button class="btn btn-primary" onclick="openUserModal()">＋ Ajouter un collaborateur</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Actions</th></tr></thead><tbody>${db.users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.role==='admin'?'Administrateur':'Collaborateur'}</td><td>${u.id!=='u-admin'?`<button class="btn btn-danger" onclick="deleteUser('${esc(u.id)}')">Supprimer</button>`:'Compte principal'}</td></tr>`).join('')}</tbody></table></div>`}</section>
 <section class="card"><div class="section-head"><h3>Tarifs par destination</h3><button class="btn btn-primary" onclick="addTariff()">＋ Ajouter</button></div><div class="mini-list">${db.tariffs.map((t,i)=>`<div class="mini-item"><span><b>${esc(t.destination)}</b><br><small class="muted">${money(t.price)}/kg</small></span><button class="btn btn-danger" onclick="deleteTariff('${esc(t.id??i)}',${i})">Supprimer</button></div>`).join('')||'<div class="empty">Aucun tarif.</div>'}</div></section></div>
 <section class="card" style="margin-top:18px"><div class="section-head"><h3>Données & maintenance</h3></div><p class="note">${db.online?'Les données sont stockées dans PostgreSQL via Supabase. Les politiques RLS contrôlent les droits d’accès.':'Les données de cette démonstration sont stockées dans ce navigateur.'}</p><div class="actions"><button class="btn btn-secondary" onclick="backupJSON()">Sauvegarder JSON</button><button class="btn btn-secondary" onclick="exportCSV()">Exporter CSV</button>${!db.online?'<button class="btn btn-danger" onclick="resetDemo()">Réinitialiser le local</button>':''}</div></section>
 <section class="contact-card"><div><div class="eyebrow">CONTACT</div><h3>GVI International</h3><p>${esc(CFG.COMPANY?.hours||'')}</p><div class="phones">${(CFG.COMPANY?.phones||[]).map(x=>`<a href="tel:${x.replace(/\s/g,'')}">${esc(x)}</a>`).join('')}</div></div><a class="tiktok-btn" href="${esc(CFG.TIKTOK_URL||'https://www.tiktok.com/') }" target="_blank" rel="noopener">♪ TikTok</a></section>`}
async function addTariff(){const destination=prompt('Destination :');if(!destination)return;const price=Number(prompt('Prix en DH/kg :'));if(!Number.isFinite(price)||price<0)return toast('Prix invalide.');try{if(db.online){const {data,error}=await sb.from('tariffs').insert({destination:destination.trim(),price}).select().single();if(error)throw error;db.tariffs.push(data)}else{db.tariffs.push({destination:destination.trim(),price});saveLocal()}renderPage();toast('Tarif ajouté.')}catch(e){toast('Impossible d’ajouter ce tarif.')}}
async function deleteTariff(id,index){if(!confirm('Supprimer ce tarif ?'))return;try{if(db.online){const {error}=await sb.from('tariffs').delete().eq('id',id);if(error)throw error;db.tariffs=db.tariffs.filter(t=>String(t.id)!==String(id))}else{db.tariffs.splice(index,1);saveLocal()}renderPage()}catch(e){toast('Impossible de supprimer ce tarif.')}}
function openUserModal(){showModal(`<div class="modal-head"><h3>Ajouter un collaborateur local</h3><button class="btn btn-secondary" onclick="closeModal()">Fermer</button></div><form onsubmit="addUser(event)"><div class="form-grid"><div class="field"><label>Nom complet</label><input name="name" required></div><div class="field"><label>Email</label><input name="email" type="email" required></div><div class="field"><label>Mot de passe</label><input name="password" type="password" minlength="6" required></div><div class="field"><label>Rôle</label><select name="role"><option value="collaborator">Collaborateur</option><option value="admin">Administrateur</option></select></div></div><button class="btn btn-primary" style="margin-top:18px">Créer</button></form>`)}
function addUser(e){e.preventDefault();const o=Object.fromEntries(new FormData(e.target).entries());if(db.users.some(u=>u.email.toLowerCase()===o.email.toLowerCase()))return toast('Cet email existe déjà.');o.id='u-'+Date.now();o.approved=true;db.users.push(o);saveLocal();closeModal();renderPage();toast('Utilisateur local créé.')}
function deleteUser(id){if(!confirm('Supprimer ce collaborateur ?'))return;db.users=db.users.filter(u=>u.id!==id);saveLocal();renderPage();toast('Collaborateur supprimé.')}
function showModal(html){const d=document.createElement('div');d.id='modal';d.className='modal';d.innerHTML=`<div>${html}</div>`;document.body.appendChild(d)}
function closeModal(){document.getElementById('modal')?.remove()}
function exportCSV(){const cols=['id','client','tel','date','origin','destination','destinataire','tel_dest','qty','type','weight','price','total','declared','status','created_by_email'];const csv=[cols.join(';'),...db.parcels.map(p=>cols.map(c=>`"${String(p[c]??p[{tel_dest:'telDest',created_by_email:'createdBy'}[c]]??'').replaceAll('"','""')}"`).join(';'))].join('\n');downloadBlob('\ufeff'+csv,'gvi-colis.csv','text/csv;charset=utf-8');toast('Export CSV terminé.')}
function backupJSON(){downloadBlob(JSON.stringify({parcels:db.parcels,tariffs:db.tariffs},null,2),'gvi-sauvegarde.json','application/json')}
function downloadBlob(data,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function resetDemo(){if(!confirm('Effacer tous les colis et restaurer le compte administrateur de démonstration ?'))return;localStorage.removeItem(KEY);db=seed();state={page:'dashboard',search:'',selected:null,editing:null,filters:{}};layout();toast('Données locales réinitialisées.')}

init();
