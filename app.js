const KEY="gvi_v1_store";
let qrQueue=[];
function loadQR(){
 if(window.QRCode){qrQueue.splice(0).forEach(fn=>fn());return}
 if(document.getElementById("qr-script"))return;
 const sc=document.createElement("script");sc.id="qr-script";sc.src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
 sc.onload=()=>qrQueue.splice(0).forEach(fn=>fn());
 sc.onerror=()=>toast("Le QR Code n'a pas pu être chargé. Vérifiez la connexion internet.");
 document.head.appendChild(sc);
}
function runQR(fn){if(window.QRCode)fn();else{qrQueue.push(fn);loadQR()}}
loadQR();
const STATUSES=["Réceptionné","En stock","En magasin","Prêt à expédier","En transit","Arrivé à destination","Livré","Récupéré"];
const DEMO_TARIFFS=[{destination:"Ghana",price:90}];

function seed(){
  const raw=localStorage.getItem(KEY);
  if(raw) return JSON.parse(raw);
  const data={users:[{id:"u-admin",name:"Administrateur GVI",email:"admin@gvi-international.ma",role:"admin",password:"admin123"}],parcels:[],tariffs:DEMO_TARIFFS,session:null};
  localStorage.setItem(KEY,JSON.stringify(data)); return data;
}
let db=seed();
let state={page:"dashboard",search:"",selected:null,editing:null,modal:null};
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function money(v){return new Intl.NumberFormat("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0))+" DH"}
function dateFmt(v){if(!v)return "—"; const d=new Date(v); return isNaN(d)?"—":d.toLocaleDateString("fr-FR")}
function idNext(){const d=new Date(), y=String(d.getFullYear()).slice(-2),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0"); const prefix=`GVI-${y}${m}${day}-`; const nums=db.parcels.map(p=>p.id?.startsWith(prefix)?Number(p.id.slice(-5)):0); return prefix+String(Math.max(0,...nums)+1).padStart(5,"0")}
function toast(msg){const el=document.createElement("div");el.className="toast";el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2400)}
function currentUser(){return db.users.find(u=>u.id===db.session)||null}
function badge(status){let c=["Livré","Récupéré"].includes(status)?"success":["En transit","Arrivé à destination"].includes(status)?"blue":["En magasin","Prêt à expédier"].includes(status)?"warn":status==="Annulé"?"danger":"";return `<span class="badge ${c}">${esc(status)}</span>`}
function layout(){
  if(!currentUser()) return loginView();
  const u=currentUser();
  const nav=[
    ["dashboard","▦","Tableau de bord"],
    ["parcels","▤","Gestion colis"],
    ["new","＋","Nouveau colis"],
    ...(u.role==="admin"?[["admin","⚙","Administration"]]:[])
  ];
  document.getElementById("app").innerHTML=`<div class="app-shell">
    <header class="topbar"><div class="topbar-left"><img class="logo-sm" src="assets/gvi-logo.jpeg"></div>
    <div class="topbar-right"><span class="user-pill">${esc(u.name)} · ${u.role==="admin"?"Administrateur":"Collaborateur"}</span><button class="btn btn-secondary" onclick="logout()">Déconnexion</button></div></header>
    <div class="layout"><aside class="sidebar"><div class="nav-title">Menu</div><nav class="nav">${nav.map(n=>`<button class="${state.page===n[0]?"active":""}" onclick="go('${n[0]}')"><span>${n[1]}</span>${n[2]}</button>`).join("")}</nav><div class="sidebar-foot">GVI International<br>Gestion sécurisée des colis</div></aside>
    <main class="content" id="main"></main></div></div>`;
  renderPage();
}
function loginView(){
  document.getElementById("app").innerHTML=`<div class="login"><div class="login-card">
    <img class="logo" src="assets/gvi-logo.jpeg"><h1>Gestion des colis</h1><p class="subtitle">Espace sécurisé GVI International</p>
    <form onsubmit="login(event)"><div class="field"><label>Email</label><input id="loginEmail" type="email" placeholder="votre@email.com" required></div>
    <div class="field" style="margin-top:14px"><label>Mot de passe</label><input id="loginPassword" type="password" required></div>
    <button class="btn btn-primary btn-block" style="margin-top:18px">Se connecter</button><div id="loginMsg"></div></form>
    <p class="note" style="margin-top:18px">Mode de démonstration local : <b>admin@gvi-international.ma</b> / <b>admin123</b>. Pour une mise en production, branchez l’authentification et la base sur Supabase ou un autre backend sécurisé.</p>
  </div></div>`;
}
function login(e){e.preventDefault();const email=document.getElementById("loginEmail").value.trim().toLowerCase(),pw=document.getElementById("loginPassword").value;const u=db.users.find(x=>x.email.toLowerCase()===email&&x.password===pw);if(!u){document.getElementById("loginMsg").innerHTML=`<div class="error">Email ou mot de passe incorrect.</div>`;return}db.session=u.id;save();state.page="dashboard";layout()}
function logout(){db.session=null;save();state={page:"dashboard",search:"",selected:null,editing:null,modal:null};layout()}
function go(p){state.page=p;state.selected=null;state.editing=null;renderPage();window.scrollTo({top:0,behavior:"smooth"})}
function renderPage(){const el=document.getElementById("main");if(!el)return; if(state.page==="dashboard")el.innerHTML=dashboard(); else if(state.page==="parcels")el.innerHTML=parcels(); else if(state.page==="new")el.innerHTML=parcelForm(); else if(state.page==="fiche")el.innerHTML=fiche(state.selected); else if(state.page==="admin")el.innerHTML=admin(); else el.innerHTML=dashboard()}
function dashboard(){
 const total=db.parcels.length, active=db.parcels.filter(p=>!["Livré","Récupéré"].includes(p.status)).length, delivered=db.parcels.filter(p=>["Livré","Récupéré"].includes(p.status)).length, revenue=db.parcels.reduce((s,p)=>s+Number(p.total||0),0);
 const recent=[...db.parcels].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,7);
 return `<div class="page-head"><div><h2>Tableau de bord</h2><p>Vue générale de l’activité GVI International.</p></div><div class="actions"><button class="btn btn-primary" onclick="go('new')">＋ Nouveau colis</button></div></div>
 <div class="grid-cards"><div class="stat"><div class="label">Total colis</div><div class="value">${total}</div><small>enregistrés</small></div><div class="stat"><div class="label">En cours</div><div class="value">${active}</div><small>hors livrés/récupérés</small></div><div class="stat"><div class="label">Livrés / récupérés</div><div class="value">${delivered}</div><small>terminés</small></div><div class="stat"><div class="label">Chiffre enregistré</div><div class="value" style="font-size:22px">${money(revenue)}</div><small>prix total des colis</small></div></div>
 <div class="two-col"><section class="card"><h3>Derniers colis</h3>${recent.length?`<div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Client</th><th>Destination</th><th>Date</th><th>Statut</th></tr></thead><tbody>${recent.map(p=>`<tr onclick="openParcel('${p.id}')" style="cursor:pointer"><td class="parcel-id">${esc(p.id)}</td><td>${esc(p.client)}</td><td>${esc(p.destination)}</td><td>${dateFmt(p.date)}</td><td>${badge(p.status)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Aucun colis. Créez votre premier colis.</div>`}</section>
 <section class="card"><h3>Répartition des statuts</h3><div class="mini-list">${STATUSES.map(s=>{const n=db.parcels.filter(p=>p.status===s).length;return `<div class="mini-item"><span>${esc(s)}</span><b>${n}</b></div>`}).join("")}</div></section></div>`;
}
function parcels(){
 const q=state.search.toLowerCase();let rows=db.parcels.filter(p=>[p.id,p.client,p.tel,p.destination,p.destinataire,p.status].join(" ").toLowerCase().includes(q)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
 return `<div class="page-head"><div><h2>Gestion des colis</h2><p>Rechercher, consulter, modifier le statut et imprimer les étiquettes.</p></div><div class="actions"><button class="btn btn-primary" onclick="go('new')">＋ Nouveau colis</button><button class="btn btn-secondary" onclick="exportCSV()">Exporter CSV</button></div></div>
 <section class="card"><div class="toolbar"><div class="search"><input value="${esc(state.search)}" oninput="state.search=this.value;renderPage()" placeholder="Rechercher par ID, client, téléphone, destination…"></div><button class="btn btn-secondary" onclick="state.search='';renderPage()">Effacer</button></div>
 ${rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Client</th><th>Destinataire</th><th>Destination</th><th>Poids</th><th>Total</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${rows.map(p=>`<tr><td class="parcel-id">${esc(p.id)}</td><td>${esc(p.client)}</td><td>${esc(p.destinataire)}</td><td>${esc(p.destination)}</td><td>${money(p.weight).replace(" DH","")} kg</td><td>${money(p.total)}</td><td>${badge(p.status)}</td><td><button class="btn btn-secondary" onclick="openParcel('${p.id}')">Fiche</button> <button class="btn btn-secondary" onclick="editParcel('${p.id}')">Modifier</button> ${currentUser().role==="admin"?`<button class="btn btn-danger" onclick="deleteParcel('${p.id}')">Supprimer</button>`:""}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Aucun colis trouvé.</div>`}</section>`;
}
function parcelForm(){
 const p=state.editing?db.parcels.find(x=>x.id===state.editing):null; const t=db.tariffs;
 return `<div class="page-head"><div><h2>${p?"Modifier le colis":"Nouveau colis"}</h2><p>${p?"Modification des informations du colis.":"Enregistrez un colis et générez automatiquement son identifiant et son QR Code."}</p></div></div>
 <form class="card" onsubmit="saveParcel(event)">
 <div class="form-grid">
  <div class="field"><label>Nom et prénom client *</label><input name="client" value="${esc(p?.client)}" required></div>
  <div class="field"><label>Téléphone client</label><input name="tel" value="${esc(p?.tel)}"></div>
  <div class="field"><label>Date de réception *</label><input type="date" name="date" value="${p?.date||new Date().toISOString().slice(0,10)}" required></div>
  <div class="field"><label>Provenance</label><input name="origin" value="${esc(p?.origin)}" placeholder="Ville / pays"></div>
  <div class="field"><label>Destination *</label><input name="destination" list="destinations" value="${esc(p?.destination)}" required oninput="autoPrice(this.value)"><datalist id="destinations">${t.map(x=>`<option value="${esc(x.destination)}">${money(x.price)}/kg</option>`).join("")}</datalist></div>
  <div class="field"><label>Destinataire *</label><input name="destinataire" value="${esc(p?.destinataire)}" required></div>
  <div class="field"><label>Téléphone destinataire</label><input name="telDest" value="${esc(p?.telDest)}"></div>
  <div class="field"><label>Quantité</label><input type="number" min="1" name="qty" value="${p?.qty||1}"></div>
  <div class="field"><label>Type colis</label><input name="type" value="${esc(p?.type)}" placeholder="Carton, sac, valise…"></div>
  <div class="field"><label>Poids (kg) *</label><input id="weight" type="number" step="0.01" min="0" name="weight" value="${p?.weight||""}" required oninput="calcTotal()"></div>
  <div class="field"><label>Prix unitaire (DH/kg) *</label><input id="price" type="number" step="0.01" min="0" name="price" value="${p?.price||""}" required oninput="calcTotal()"></div>
  <div class="field"><label>Prix total (DH)</label><input id="total" name="total" value="${p?.total||0}" readonly></div>
  <div class="field"><label>Valeur déclarée (DH)</label><input type="number" step="0.01" min="0" name="declared" value="${p?.declared||0}"></div>
  <div class="field"><label>Statut</label><select name="status">${STATUSES.map(s=>`<option ${p?.status===s||( !p && s==="Réceptionné")?"selected":""}>${esc(s)}</option>`).join("")}</select></div>
  <div class="field full"><label>Notes</label><textarea name="notes" rows="3" placeholder="Informations complémentaires">${esc(p?.notes)}</textarea></div>
 </div>
 <div class="actions" style="margin-top:20px"><button type="button" class="btn btn-secondary" onclick="go('parcels')">Annuler</button><button class="btn btn-primary">${p?"Enregistrer les modifications":"Enregistrer le colis"}</button></div>
 </form>`;
}
function autoPrice(destination){const x=db.tariffs.find(t=>t.destination.toLowerCase()===destination.trim().toLowerCase());if(x){document.getElementById("price").value=x.price;calcTotal()}}
function calcTotal(){const w=Number(document.getElementById("weight")?.value||0),p=Number(document.getElementById("price")?.value||0);const el=document.getElementById("total");if(el)el.value=(w*p).toFixed(2)}
function saveParcel(e){e.preventDefault();const f=new FormData(e.target), obj=Object.fromEntries(f.entries());obj.qty=Number(obj.qty||1);obj.weight=Number(obj.weight||0);obj.price=Number(obj.price||0);obj.total=Number(obj.weight*obj.price);obj.declared=Number(obj.declared||0);if(state.editing){const i=db.parcels.findIndex(p=>p.id===state.editing);db.parcels[i]={...db.parcels[i],...obj,updatedAt:new Date().toISOString()};toast("Colis modifié avec succès.");openParcel(state.editing)}else{obj.id=idNext();obj.createdAt=new Date().toISOString();obj.updatedAt=obj.createdAt;obj.createdBy=currentUser().email;db.parcels.push(obj);save();toast(`Colis ${obj.id} enregistré.`);openParcel(obj.id)}save()}
function openParcel(id){state.selected=id;state.page="fiche";renderPage()}
function editParcel(id){state.editing=id;state.page="new";renderPage()}
function deleteParcel(id){if(currentUser().role!=="admin")return;if(!confirm("Supprimer définitivement ce colis ?"))return;db.parcels=db.parcels.filter(p=>p.id!==id);save();toast("Colis supprimé.");go("parcels")}
function fiche(id){
 const p=db.parcels.find(x=>x.id===id);if(!p)return `<div class="empty">Colis introuvable.</div>`;
 return `<div class="page-head"><div><h2>Fiche colis</h2><p><span class="parcel-id">${esc(p.id)}</span> · enregistré le ${dateFmt(p.createdAt)}</p></div><div class="actions"><button class="btn btn-secondary" onclick="editParcel('${p.id}')">Modifier</button><button class="btn btn-secondary" onclick="printLabel('${p.id}')">Imprimer étiquette</button></div></div>
 <div class="fiche"><section class="card"><h3>Informations du colis</h3><div class="detail-grid">${[
 ["Client",p.client],["TEL client",p.tel],["Date réception",dateFmt(p.date)],["Provenance",p.origin],["Destination",p.destination],["Destinataire",p.destinataire],["TEL destinataire",p.telDest],["Quantité",p.qty],["Type colis",p.type],["Poids",p.weight+" kg"],["Prix/kg",money(p.price)],["Prix total",money(p.total)],["Valeur déclarée",money(p.declared)],["Créé par",p.createdBy]
 ].map(x=>`<div class="detail"><div class="k">${x[0]}</div><div class="v">${esc(x[1]||"—")}</div></div>`).join("")}</div><div style="margin-top:18px"><div class="muted" style="font-size:12px">Notes</div><div style="margin-top:6px">${esc(p.notes||"Aucune note.")}</div></div></section>
 <aside class="card"><h3>QR Code</h3><div id="qrFiche" class="qr-box"></div><p class="note">Le QR Code contient les informations essentielles du colis, pas uniquement l’identifiant.</p><div style="margin-top:14px"><label class="muted" style="font-size:12px">Statut actuel</label><div style="margin:7px 0 14px">${badge(p.status)}</div><select style="width:100%;padding:12px;border:1px solid var(--line);border-radius:12px" onchange="changeStatus('${p.id}',this.value)">${STATUSES.map(s=>`<option ${p.status===s?"selected":""}>${esc(s)}</option>`).join("")}</select></div></aside></div>
 <section class="card" style="margin-top:18px"><h3>Suivi du statut</h3><div class="timeline">${STATUSES.map(s=>`<div class="timeline-row"><div class="dot ${p.status===s?"current":""}"></div><div><b>${esc(s)}</b>${p.status===s?`<div class="muted" style="font-size:12px;margin-top:3px">Statut actuel</div>`:""}</div></div>`).join("")}</div></section>
 <div class="print-only">${labelHTML(p)}</div>
 <script>setTimeout(()=>makeQR("qrFiche", parcelPayload(${JSON.stringify(p)})),50)</script>`;
}
function parcelPayload(p){return JSON.stringify({system:"GVI International",id:p.id,client:p.client,tel:p.tel,date_reception:p.date,provenance:p.origin,destination:p.destination,destinataire:p.destinataire,tel_destinataire:p.telDest,quantite:p.qty,type_colis:p.type,poids_kg:p.weight,prix_unitaire_dh_kg:p.price,prix_total_dh:p.total,valeur_declaree_dh:p.declared,statut:p.status})}
function makeQR(id,data){runQR(()=>{const el=document.getElementById(id);if(!el)return;el.innerHTML="";new QRCode(el,{text:data,width:220,height:220,colorDark:"#000000",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M})})}

function changeStatus(id,status){const p=db.parcels.find(x=>x.id===id);if(!p)return;p.status=status;p.updatedAt=new Date().toISOString();save();toast("Statut mis à jour.");renderPage()}
function labelHTML(p){return `<div class="label-print"><img src="assets/gvi-logo.jpeg"><div class="label-id">${esc(p.id)}</div><div class="label-row"><b>Client :</b> ${esc(p.client)}</div><div class="label-row"><b>Destinataire :</b> ${esc(p.destinataire)}</div><div class="label-row"><b>Destination :</b> ${esc(p.destination)}</div><div class="label-row"><b>Poids :</b> ${esc(p.weight)} kg</div><div class="label-row"><b>Statut :</b> ${esc(p.status)}</div><div class="label-qr"><div id="printQR"></div></div><div class="label-row mono">${esc(p.id)}</div></div>`}
function printLabel(id){const p=db.parcels.find(x=>x.id===id);if(!p)return;const w=window.open("","_blank","width=500,height=700");w.document.write(`<html><head><title>Étiquette ${esc(p.id)}</title><style>body{margin:0;font-family:Arial}.label-print{width:90mm;padding:8mm}.label-print img{width:36mm}.label-id{font-size:22px;font-weight:900}.label-row{font-size:11px;margin:3px 0}.label-qr{display:flex;justify-content:center;margin:6mm 0}</style></head><body>${labelHTML(p)}<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script><script>new QRCode(document.getElementById("printQR"),{text:${JSON.stringify(parcelPayload(p))},width:220,height:220});setTimeout(()=>window.print(),500)<\/script></body></html>`);w.document.close()}
function admin(){
 if(currentUser().role!=="admin")return `<div class="empty">Accès administrateur requis.</div>`;
 return `<div class="page-head"><div><h2>Administration</h2><p>Gestion des collaborateurs, des tarifs et des données.</p></div></div>
 <div class="two-col"><section class="card"><h3>Collaborateurs</h3><div class="actions" style="margin-bottom:15px"><button class="btn btn-primary" onclick="openUserModal()">＋ Ajouter un collaborateur</button></div>
 <div class="table-wrap"><table class="table"><thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Actions</th></tr></thead><tbody>${db.users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.role==="admin"?"Administrateur":"Collaborateur"}</td><td>${u.id!=="u-admin"?`<button class="btn btn-danger" onclick="deleteUser('${u.id}')">Supprimer</button>`:"Compte principal"}</td></tr>`).join("")}</tbody></table></div></section>
 <section class="card"><h3>Tarifs par destination</h3><div class="actions" style="margin-bottom:15px"><button class="btn btn-primary" onclick="addTariff()">＋ Ajouter un tarif</button></div><div class="mini-list">${db.tariffs.map((t,i)=>`<div class="mini-item"><span><b>${esc(t.destination)}</b><br><small class="muted">${money(t.price)}/kg</small></span><button class="btn btn-danger" onclick="deleteTariff(${i})">Supprimer</button></div>`).join("")||`<div class="empty">Aucun tarif configuré.</div>`}</div></section></div>
 <section class="card" style="margin-top:18px"><h3>Zone de maintenance</h3><p class="note">Le bouton ci-dessous exporte les données actuellement enregistrées dans ce navigateur. Pour une vraie utilisation multi-utilisateur en ligne, le projet doit être relié à une base de données et une authentification côté serveur.</p><div class="actions"><button class="btn btn-secondary" onclick="backupJSON()">Sauvegarder les données</button><button class="btn btn-danger" onclick="resetDemo()">Réinitialiser les données locales</button></div></section>`;
}
function openUserModal(){showModal(`<div class="modal-head"><h3>Ajouter un collaborateur</h3><button class="btn btn-secondary" onclick="closeModal()">Fermer</button></div><form onsubmit="addUser(event)"><div class="form-grid"><div class="field"><label>Nom complet</label><input name="name" required></div><div class="field"><label>Email</label><input name="email" type="email" required></div><div class="field"><label>Mot de passe temporaire</label><input name="password" type="password" minlength="6" required></div><div class="field"><label>Rôle</label><select name="role"><option value="collaborator">Collaborateur</option><option value="admin">Administrateur</option></select></div></div><button class="btn btn-primary" style="margin-top:18px">Créer</button></form>`)}
function addUser(e){e.preventDefault();const o=Object.fromEntries(new FormData(e.target).entries());if(db.users.some(u=>u.email.toLowerCase()===o.email.toLowerCase()))return toast("Cet email existe déjà.");o.id="u-"+Date.now();db.users.push(o);save();closeModal();renderPage();toast("Utilisateur créé.")}
function deleteUser(id){if(!confirm("Supprimer ce collaborateur ?"))return;db.users=db.users.filter(u=>u.id!==id);save();renderPage();toast("Collaborateur supprimé.")}
function addTariff(){const destination=prompt("Destination :");if(!destination)return;const price=Number(prompt("Prix en DH/kg :"));if(!Number.isFinite(price)||price<0)return toast("Prix invalide.");db.tariffs.push({destination,price});save();renderPage()}
function deleteTariff(i){db.tariffs.splice(i,1);save();renderPage()}
function showModal(html){const d=document.createElement("div");d.id="modal";d.className="modal-backdrop";d.innerHTML=`<div class="modal">${html}</div>`;document.body.appendChild(d)}
function closeModal(){document.getElementById("modal")?.remove()}
function exportCSV(){
 const cols=["id","client","tel","date","origin","destination","destinataire","telDest","qty","type","weight","price","total","declared","status","createdBy"];
 const csv=[cols.join(";"),...db.parcels.map(p=>cols.map(c=>`"${String(p[c]??"").replaceAll('"','""')}"`).join(";"))].join("\n");
 downloadBlob("\ufeff"+csv,"gvi-colis.csv","text/csv;charset=utf-8");toast("Export CSV terminé.")
}
function backupJSON(){downloadBlob(JSON.stringify({parcels:db.parcels,tariffs:db.tariffs},null,2),"gvi-sauvegarde.json","application/json");}
function downloadBlob(data,name,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function resetDemo(){if(!confirm("Effacer tous les colis et restaurer le compte administrateur de démonstration ?"))return;localStorage.removeItem(KEY);db=seed();layout();toast("Données locales réinitialisées.")}
layout();
