const STORE_KEY = "piller_produtos_identico_v2";
const DATA_URL = "./produtos-data.json";

let db;
let activeCategory = "Todos";
let adminUnlocked = false;
let logoClicks = 0;
let adminTab = "comum";
let editingId = null;

const $ = s => document.querySelector(s);

function esc(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function uid(){
  return "p_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function load(){
  const local = localStorage.getItem(STORE_KEY);
  if(local){
    db = JSON.parse(local);
  }else{
    db = await fetch(DATA_URL).then(r=>r.json());
  }
  normalize();
  render();
}

function normalize(){
  db.theme ||= {};
  db.products ||= [];
  db.backups ||= [];
  db.products = db.products.map(p => ({
    id:p.id || uid(),
    layout:p.layout || "cadeado",
    name:p.name || "Produto",
    category:p.category || "Produtos",
    subtitle:p.subtitle || "",
    extraSubtitle:p.extraSubtitle || "",
    mainImage:p.mainImage || "",
    lineLogo:p.lineLogo || "",
    technicalImage:p.technicalImage || "",
    details:Array.isArray(p.details) ? p.details : [],
    variants:Array.isArray(p.variants) ? p.variants : []
  }));
}

function backup(reason){
  db.backups ||= [];
  db.backups.unshift({
    id:uid(),
    reason,
    date:new Date().toISOString(),
    products:structuredClone(db.products),
    theme:structuredClone(db.theme)
  });
  db.backups = db.backups.slice(0,20);
}

function save(reason="alteração"){
  backup(reason);
  localStorage.setItem(STORE_KEY, JSON.stringify(db,null,2));
}

function categories(){
  return ["Todos", ...new Set(db.products.map(p=>p.category).filter(Boolean))];
}

function products(){
  return db.products.filter(p => activeCategory === "Todos" || p.category === activeCategory);
}

function render(){
  document.documentElement.style.setProperty("--yellow", db.theme.yellow || "#ffc400");

  $("#app").innerHTML = `
    <div class="app-shell">
      <header class="header">
        <div class="header-inner">
          <div class="logo" onclick="secretLogoClick()">
            ${db.theme.logo ? `<img src="${esc(db.theme.logo)}">` : esc(db.theme.brand || "Piller")}
          </div>
          <nav class="nav">
            <a href="../index.html">Início</a>
            <a href="../institucional/index.html">Institucional</a>
            <a href="../produtos/index.html">Produtos</a>
            <a href="../representantes/index.html">Representantes</a>
          </nav>
        </div>
      </header>

      <main class="catalog">
        <h1 class="catalog-title">Produtos</h1>
        <p class="catalog-subtitle">Linha de produtos Piller. Clique em um produto para abrir a tela técnica no padrão visual da página oficial.</p>

        <div class="category-row">
          ${categories().map(c => `
            <button class="category-button ${c===activeCategory?"active":""}" onclick="setCategory('${esc(c)}')">${esc(c)}</button>
          `).join("")}
        </div>

        <section class="product-grid">
          ${products().map(renderCard).join("")}
        </section>
      </main>
    </div>

    <div class="modal" id="modal">
      <button class="close" onclick="closeModal()"></button>
      <div id="modalContent"></div>
    </div>

    ${renderAdmin()}
  `;
}

function renderCard(p){
  return `
    <article class="product-card" onclick="openProduct('${esc(p.id)}')">
      <div class="product-image">
        ${p.mainImage ? `<img src="${esc(p.mainImage)}">` : `<div class="no-image"></div>`}
      </div>
      <div class="product-info">
        <div class="kicker">${esc(p.category)}</div>
        <h2>${esc(p.name)}</h2>
        <p>${esc(p.subtitle || p.extraSubtitle || "Clique para ver detalhes técnicos.")}</p>
        <button class="btn" onclick="event.stopPropagation();openProduct('${esc(p.id)}')">Saiba Mais</button>
      </div>
    </article>
  `;
}

function setCategory(c){
  activeCategory = c;
  render();
}

function openProduct(id){
  const p = db.products.find(x=>x.id===id);
  if(!p) return;

  if(p.layout === "perfil" && p.variants.length){
    openPerfilChoice(p);
    return;
  }

  openCadeado(p);
}

function openCadeado(p){
  $("#modalContent").innerHTML = `
    <section class="cadeado-screen">
      <div class="cadeado-left">
        <div class="cadeado-text">
          <h1>${esc(p.name)}</h1>
          <h2>${esc(p.subtitle)}</h2>
          ${p.details.map(d=>`<p>${esc(d)}</p>`).join("")}
        </div>
      </div>

      <div class="cadeado-right">
        <div class="circle-img logo-circle">
          ${p.lineLogo ? `<img src="${esc(p.lineLogo)}">` : `<span style="color:#000;font-weight:900">LINHA</span>`}
        </div>
        <div class="circle-img main-circle">
          ${p.mainImage ? `<img src="${esc(p.mainImage)}">` : ""}
        </div>
        <div class="circle-img tech-circle">
          ${p.technicalImage ? `<img src="${esc(p.technicalImage)}">` : ""}
        </div>
      </div>
    </section>
  `;
  $("#modal").classList.add("open");
}

function openPerfilChoice(p){
  $("#modalContent").innerHTML = `
    <section class="perfil-screen">
      <div class="perfil-box">
        <div class="perfil-image">
          <div class="perfil-image-inner">
            ${p.mainImage ? `<img src="${esc(p.mainImage)}">` : `<div class="no-image"></div>`}
          </div>
        </div>

        <div class="perfil-info">
          <div class="kicker">Linha Perfil</div>
          <h1>${esc(p.name)}</h1>
          <h2>${esc(p.subtitle)}</h2>
          <h3>${esc(p.extraSubtitle)}</h3>
          <div class="yellow-line"></div>
          <div class="kicker">Escolha a medida</div>
          <div class="option-row">
            ${p.variants.map(v=>`
              <button class="option-button" onclick="openVariant('${esc(p.id)}','${esc(v.id)}')">${esc(v.label)}</button>
            `).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
  $("#modal").classList.add("open");
}

function openVariant(pid, vid){
  const p = db.products.find(x=>x.id===pid);
  const v = p.variants.find(x=>x.id===vid);
  $("#modalContent").innerHTML = `
    <section class="detail-panel">
      <div class="detail-card">
        <h1>${esc(v.title || p.name)}</h1>
        <h2>${esc(v.subtitle || p.subtitle)} ${esc(v.extraSubtitle || p.extraSubtitle)}</h2>
        ${v.mainImage ? `<img src="${esc(v.mainImage)}" style="max-height:330px;margin:0 auto 28px;object-fit:contain">` : ""}
        <ul>${(v.details||[]).map(d=>`<li>${esc(d)}</li>`).join("")}</ul>
      </div>
    </section>
  `;
}

function closeModal(){
  $("#modal").classList.remove("open");
}

function secretLogoClick(){
  logoClicks++;
  setTimeout(()=>logoClicks=0,1800);
  if(logoClicks >= 5){
    logoClicks = 0;
    const pass = prompt("Senha do painel:");
    if(pass === (db.adminPassword || "piller123")){
      adminUnlocked = true;
      render();
      $("#admin").classList.add("open");
    }else{
      alert("Senha incorreta.");
    }
  }
}

function renderAdmin(){
  return `
    <aside class="admin ${adminUnlocked ? "" : "hidden"}" id="admin">
      <div class="admin-box">
        <div class="admin-head">
          <strong>Painel Admin — Produtos</strong>
          <button onclick="closeAdmin()">Fechar</button>
        </div>

        <div class="admin-body">
          <div class="tabs">
            <button class="${adminTab==="comum"?"active":""}" onclick="setAdminTab('comum')">Comum</button>
            <button class="${adminTab==="avancado"?"active":""}" onclick="setAdminTab('avancado')">Avançado</button>
            <button class="${adminTab==="backups"?"active":""}" onclick="setAdminTab('backups')">Backups</button>
          </div>

          ${adminTab==="comum" ? renderCommonAdmin() : ""}
          ${adminTab==="avancado" ? renderAdvancedAdmin() : ""}
          ${adminTab==="backups" ? renderBackupAdmin() : ""}
        </div>
      </div>
    </aside>
  `;
}

function setAdminTab(tab){
  adminTab = tab;
  render();
  $("#admin").classList.add("open");
}

function closeAdmin(){
  $("#admin").classList.remove("open");
}

function renderCommonAdmin(){
  const p = editingId ? db.products.find(x=>x.id===editingId) : null;
  return `
    <div class="admin-grid">
      <div>
        <h3>${p ? "Editar produto" : "Novo produto"}</h3>

        <div class="field"><label>Nome</label><input id="name" value="${esc(p?.name || "")}"></div>
        <div class="field"><label>Categoria</label><input id="category" value="${esc(p?.category || "")}"></div>
        <div class="field"><label>Subtítulo</label><input id="subtitle" value="${esc(p?.subtitle || "")}"></div>
        <div class="field"><label>Subtítulo extra</label><input id="extraSubtitle" value="${esc(p?.extraSubtitle || "")}"></div>
        <div class="field"><label>Imagem principal</label><input type="file" id="mainImageFile" accept="image/*"></div>
        <div class="field"><label>Detalhes — um por linha</label><textarea id="details">${esc((p?.details||[]).join("\n"))}</textarea></div>

        <div class="admin-actions">
          <button class="yellow" onclick="saveProduct()">Salvar com backup</button>
          <button onclick="newProduct()">Novo baseado no layout</button>
        </div>
      </div>

      <div>
        <h3>Produtos</h3>
        <div class="product-list">
          ${db.products.map(x=>`
            <div class="product-admin-item">
              <strong>${esc(x.name)}</strong><br>
              <small>${esc(x.category)} — ${esc(x.layout)}</small>
              <div class="admin-actions">
                <button onclick="editProduct('${esc(x.id)}')">Editar</button>
                <button class="danger" onclick="deleteProduct('${esc(x.id)}')">Excluir</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderAdvancedAdmin(){
  const p = editingId ? db.products.find(x=>x.id===editingId) : null;
  return `
    <h3>Opções avançadas</h3>

    <div class="field">
      <label>Tipo de layout</label>
      <select id="layout">
        <option value="cadeado" ${p?.layout==="cadeado"?"selected":""}>Cadeado — tela amarela/preta</option>
        <option value="perfil" ${p?.layout==="perfil"?"selected":""}>Perfil — escolha de medida</option>
      </select>
    </div>

    <div class="field"><label>Logo da linha</label><input type="file" id="lineLogoFile" accept="image/*"></div>
    <div class="field"><label>Imagem técnica</label><input type="file" id="technicalImageFile" accept="image/*"></div>

    <div class="field">
      <label>Variantes/opções em JSON</label>
      <textarea id="variants">${esc(JSON.stringify(p?.variants || [], null, 2))}</textarea>
    </div>

    <div class="field">
      <label>JSON completo do banco</label>
      <textarea id="fullJson">${esc(JSON.stringify(db, null, 2))}</textarea>
    </div>

    <div class="admin-actions">
      <button class="yellow" onclick="saveAdvanced()">Salvar avançado</button>
      <button onclick="applyFullJson()">Aplicar JSON completo</button>
      <button onclick="exportJson()">Exportar JSON</button>
    </div>
  `;
}

function renderBackupAdmin(){
  return `
    <h3>Backups locais</h3>
    <div class="product-list">
      ${(db.backups||[]).map(b=>`
        <div class="product-admin-item">
          <strong>${esc(b.reason)}</strong><br>
          <small>${esc(new Date(b.date).toLocaleString())}</small>
          <div class="admin-actions">
            <button onclick="restoreBackup('${esc(b.id)}')">Restaurar</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function fileToBase64(input){
  const file = input?.files?.[0];
  if(!file) return Promise.resolve("");
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function newProduct(){
  editingId = null;
  adminTab = "comum";
  render();
  $("#admin").classList.add("open");
}

function editProduct(id){
  editingId = id;
  adminTab = "comum";
  render();
  $("#admin").classList.add("open");
}

async function saveProduct(){
  const old = editingId ? db.products.find(x=>x.id===editingId) : null;
  const image = await fileToBase64($("#mainImageFile"));

  const product = {
    id: old?.id || uid(),
    layout: old?.layout || "cadeado",
    name: $("#name").value.trim(),
    category: $("#category").value.trim(),
    subtitle: $("#subtitle").value.trim(),
    extraSubtitle: $("#extraSubtitle").value.trim(),
    mainImage: image || old?.mainImage || "",
    lineLogo: old?.lineLogo || "",
    technicalImage: old?.technicalImage || "",
    details: $("#details").value.split("\n").map(x=>x.trim()).filter(Boolean),
    variants: old?.variants || []
  };

  if(!product.name){
    alert("Informe o nome.");
    return;
  }

  const i = db.products.findIndex(x=>x.id===product.id);
  if(i >= 0) db.products[i] = product;
  else db.products.push(product);

  editingId = product.id;
  save("Salvar produto: " + product.name);
  localStorage.setItem(STORE_KEY, JSON.stringify(db,null,2));
  render();
  $("#admin").classList.add("open");
}

async function saveAdvanced(){
  if(!editingId){
    alert("Selecione um produto primeiro.");
    return;
  }

  const p = db.products.find(x=>x.id===editingId);
  p.layout = $("#layout").value;

  const logo = await fileToBase64($("#lineLogoFile"));
  const tech = await fileToBase64($("#technicalImageFile"));
  if(logo) p.lineLogo = logo;
  if(tech) p.technicalImage = tech;

  try{
    p.variants = JSON.parse($("#variants").value || "[]");
  }catch{
    alert("JSON de variantes inválido.");
    return;
  }

  save("Salvar avançado: " + p.name);
  localStorage.setItem(STORE_KEY, JSON.stringify(db,null,2));
  render();
  $("#admin").classList.add("open");
}

function deleteProduct(id){
  const p = db.products.find(x=>x.id===id);
  if(!confirm("Excluir produto '" + p.name + "'? Um backup será criado antes.")) return;
  save("Antes de excluir: " + p.name);
  db.products = db.products.filter(x=>x.id!==id);
  localStorage.setItem(STORE_KEY, JSON.stringify(db,null,2));
  render();
  $("#admin").classList.add("open");
}

function restoreBackup(id){
  const b = db.backups.find(x=>x.id===id);
  if(!b) return;
  if(!confirm("Restaurar este backup?")) return;
  db.products = structuredClone(b.products);
  db.theme = structuredClone(b.theme);
  localStorage.setItem(STORE_KEY, JSON.stringify(db,null,2));
  render();
  $("#admin").classList.add("open");
}

function applyFullJson(){
  try{
    const next = JSON.parse($("#fullJson").value);
    if(!confirm("Aplicar JSON completo? Um backup será criado antes.")) return;
    save("Antes de aplicar JSON completo");
    db = next;
    normalize();
    localStorage.setItem(STORE_KEY, JSON.stringify(db,null,2));
    render();
    $("#admin").classList.add("open");
  }catch{
    alert("JSON inválido.");
  }
}

function exportJson(){
  const blob = new Blob([JSON.stringify(db,null,2)],{type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "produtos-data.json";
  a.click();
}

load();
