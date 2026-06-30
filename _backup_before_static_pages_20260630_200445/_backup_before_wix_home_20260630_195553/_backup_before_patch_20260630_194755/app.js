const STORAGE_KEY = 'piller_editavel_mock_v1';
let db = null;
let activeCategory = null;
let currentAdminTab = 'tema';
let layoutMode = false;

const $ = (sel) => document.querySelector(sel);
const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const slug = (v='') => String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
function sanitizeHtml(html='') {
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('script, iframe, object, embed, link, meta').forEach(n => n.remove());
  template.content.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = String(attr.value || '').trim().toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      if ((name === 'href' || name === 'src') && value.startsWith('javascript:')) el.removeAttribute(attr.name);
    });
  });
  return template.innerHTML;
}

async function init() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) db = JSON.parse(stored);
  else {
    const res = await fetch('mock-database.json');
    db = await res.json();
    save();
  }
  activeCategory = db.categories.find(c => c.visible)?.title || 'Todos';
  render();
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
function setTheme(){
  document.documentElement.style.setProperty('--primary', db.config.primaryColor || '#072b61');
  document.documentElement.style.setProperty('--secondary', db.config.secondaryColor || '#f5b51b');
  document.documentElement.style.setProperty('--accent', db.config.accentColor || '#0d4f9a');
}
function render(){ setTheme(); renderPublic(); renderAdmin(); }

function renderPublic(){
  const c = db.config;
  const categories = db.categories.filter(x=>x.visible).sort((a,b)=>a.order-b.order);
  const products = db.products.filter(p=>p.visible && (!activeCategory || activeCategory==='Todos' || p.category===activeCategory)).sort((a,b)=>a.order-b.order);
  document.body.classList.toggle('layout-on', layoutMode);
  $('#app').innerHTML = `
    <header class="topbar">
      <nav class="nav">
        <div class="brand">
          <img class="brand-mark" src="${esc(c.logoImage)}" onerror="this.style.display='none'" />
          <div><div class="brand-title">${esc(c.siteName)}</div><div class="brand-sub">Sistema editável</div></div>
        </div>
        <div class="menu">
          <a href="#inicio">INÍCIO</a>
          <a href="#institucional">INSTITUCIONAL</a>
          <a href="#produtos">PRODUTOS</a>
          <button onclick="openRepresentatives()">REPRESENTANTES</button>
          <a href="#galeria">GALERIA</a>
          <button class="admin-toggle" onclick="toggleAdmin(true)">ADMIN</button>
        </div>
      </nav>
    </header>
    <main>
      <section class="hero" id="inicio">
        <div class="hero-bg" style="background-image:url('${esc(c.backgroundImage)}')"></div>
        <div class="hero-inner">
          <div class="eyebrow">Piller Metal</div>
          <h1>${esc(c.headline)}</h1>
          <p>${esc(c.subheadline)}</p>
        </div>
        <div class="hero-buttons">${renderHeroButtons()}</div>
      </section>
      <section class="section" id="produtos">
        <div class="section-head"><div><h2>Produtos</h2><p class="section-intro">Categorias e cards editáveis pelo painel. Cada Saiba Mais abre popup próprio, sem dependência do Wix.</p></div></div>
        <div class="category-tabs"><button class="tab ${activeCategory==='Todos'?'active':''}" onclick="setCategory('Todos')">Todos</button>${categories.map(cat=>`<button class="tab ${activeCategory===cat.title?'active':''}" onclick="setCategory('${esc(cat.title)}')">${esc(cat.title)}</button>`).join('')}</div>
        <div class="grid">${products.map(renderProductCard).join('')}</div>
      </section>
      <section class="section" id="institucional">
        <div class="section-head"><div><h2>Institucional</h2><p class="section-intro">Blocos editáveis. O campo HTML aceita marcação simples sanitizada.</p></div></div>
        <div class="content-blocks">${db.blocks.filter(b=>b.enabled).sort((a,b)=>a.order-b.order).map(renderBlock).join('')}</div>
      </section>
      <section class="section" id="galeria">
        <div class="section-head"><div><h2>Galeria base</h2><p class="section-intro">Imagens do pacote inicial preservadas como referência visual.</p></div></div>
        <div class="gallery">${Array.from({length:18},(_,i)=>`<img src="assets/screenshots/${String(i).padStart(3,'0')}_${screenshotSuffix(i)}.png" onerror="this.remove()"/>`).join('')}</div>
      </section>
    </main>
    <footer class="footer">${esc(c.footerText)}</footer>
    <div class="modal-backdrop" id="modal"><div class="modal"><button class="modal-close" onclick="closeModal()">×</button><div class="modal-content" id="modalContent"></div></div></div>
    <aside class="admin" id="adminPanel"></aside>
  `;
  attachDrag();
}
function screenshotSuffix(i){ const map=['1782838525','1782838552','1782838563','1782838565','1782838568','1782838571','1782838574','1782838576','1782838579','1782838582','1782838584','1782838587','1782838593','1782838612','1782838658','1782838804','1782838842','1782838909']; return map[i]||'1782838525'; }
function renderHeroButtons(){
  return db.buttons.filter(b=>b.enabled).sort((a,b)=>a.order-b.order).map((b,i)=>`<button class="floating-button ${i%2?'secondary':''}" data-button-id="${esc(b.id)}" style="--x:${Number(b.x)||10};--y:${Number(b.y)||70};--w:${Number(b.width)||160}px" onclick="handleButton('${esc(b.id)}')">${esc(b.label)}</button>`).join('');
}
function renderProductCard(p){
  return `<article class="card"><div class="card-img"><img src="${esc(p.image)}" loading="lazy" onerror="this.src='assets/screenshots/021_1782839081.png'"/></div><div class="card-body"><div class="card-kicker">${esc(p.category)}</div><h3>${esc(p.title)}</h3><p>${esc(p.shortDescription)}</p><div class="card-actions"><button class="btn" onclick="openProduct('${esc(p.id)}')">Saiba Mais</button><button class="btn ghost" onclick="focusAdminProduct('${esc(p.id)}')">Editar</button></div></div></article>`;
}
function renderBlock(b){
  const body = b.type === 'html' ? sanitizeHtml(b.content) : esc(b.content).replace(/\n/g,'<br>');
  return `<div class="block"><h3>${esc(b.title)}</h3><div>${body}</div></div>`;
}
function setCategory(cat){ activeCategory = cat; renderPublic(); }
function openProduct(id){
  const p = db.products.find(x=>x.id===id); if(!p) return;
  $('#modalContent').innerHTML = `<div class="modal-product"><img src="${esc(p.image)}" onerror="this.src='assets/screenshots/021_1782839081.png'"/><div><div class="card-kicker">${esc(p.category)}</div><h3>${esc(p.title)}</h3><p>${esc(p.shortDescription)}</p><ul>${(p.details||[]).map(d=>`<li>${esc(d)}</li>`).join('')}</ul><button class="btn alt" onclick="focusAdminProduct('${esc(p.id)}')">Editar este produto</button></div></div>`;
  $('#modal').classList.add('open');
}
function openRepresentatives(){
  $('#modalContent').innerHTML = `<h3>Representantes</h3><p>Lista editável no mock database.</p><div class="edit-list">${db.representatives.map(r=>`<div class="edit-item"><strong>${esc(r.state)}</strong><br>${esc(r.name)}<br>${esc(r.phone)}<br>${esc(r.email)}</div>`).join('')}</div>`;
  $('#modal').classList.add('open');
}
function closeModal(){ $('#modal')?.classList.remove('open'); }
function handleButton(id){
  if(layoutMode) return;
  const b = db.buttons.find(x=>x.id===id); if(!b) return;
  if(b.targetType==='internal') location.hash = b.target;
  if(b.targetType==='external') window.open(b.target,'_blank','noopener');
  if(b.targetType==='popup') openRepresentatives();
  if(b.targetType==='product') openProduct(b.target);
  if(b.targetType==='whatsapp') window.open(`https://wa.me/${db.config.whatsapp}?text=${encodeURIComponent(b.target)}`,'_blank','noopener');
}
function toggleAdmin(open){ $('#adminPanel').classList.toggle('open', open); }

function renderAdmin(){
  const panel = $('#adminPanel'); if(!panel) return;
  panel.innerHTML = `<div class="admin-header"><h2>Editor Piller</h2><button class="btn ghost" onclick="toggleAdmin(false)">Fechar</button></div><div class="admin-body"><div class="notice">Mock local: alterações ficam neste navegador. Use Exportar JSON para gravar no código depois.</div><div class="admin-tabs">${['tema','produtos','categorias','blocos','botoes','dados'].map(t=>`<button class="admin-tab ${currentAdminTab===t?'active':''}" onclick="setAdminTab('${t}')">${t}</button>`).join('')}</div><div>${renderAdminTab()}</div></div>`;
}
function setAdminTab(tab){ currentAdminTab=tab; renderAdmin(); }
function bind(path, value){
  const parts=path.split('.'); let o=db; while(parts.length>1) o=o[parts.shift()]; o[parts[0]]=value; save(); render(); toggleAdmin(true);
}
function renderAdminTab(){
  if(currentAdminTab==='tema') return renderThemeAdmin();
  if(currentAdminTab==='produtos') return renderProductsAdmin();
  if(currentAdminTab==='categorias') return renderCategoriesAdmin();
  if(currentAdminTab==='blocos') return renderBlocksAdmin();
  if(currentAdminTab==='botoes') return renderButtonsAdmin();
  return renderDataAdmin();
}
function input(label,path,value,type='text') { return `<div class="field"><label>${label}</label><input type="${type}" value="${esc(value)}" onchange="bind('${path}', this.value)"></div>`; }
function textarea(label,path,value){ return `<div class="field"><label>${label}</label><textarea onchange="bind('${path}', this.value)">${esc(value)}</textarea></div>`; }
function renderThemeAdmin(){ const c=db.config; return `${input('Nome do site','config.siteName',c.siteName)}${input('Título principal','config.headline',c.headline)}${textarea('Subtítulo','config.subheadline',c.subheadline)}${input('Cor base','config.primaryColor',c.primaryColor,'color')}${input('Cor secundária','config.secondaryColor',c.secondaryColor,'color')}${input('Cor de destaque','config.accentColor',c.accentColor,'color')}${input('Imagem de fundo URL/caminho','config.backgroundImage',c.backgroundImage)}${input('Logo URL/caminho','config.logoImage',c.logoImage)}${input('WhatsApp com DDI','config.whatsapp',c.whatsapp)}${textarea('Rodapé','config.footerText',c.footerText)}`; }
function renderProductsAdmin(){
  return `<button class="btn alt" onclick="addProduct()">Adicionar produto</button><div class="edit-list" style="margin-top:12px">${db.products.sort((a,b)=>a.order-b.order).map((p,i)=>`<div class="edit-item"><strong>${esc(p.title)}</strong><div class="row"><button class="btn ghost small" onclick="moveProduct('${p.id}',-1)">↑</button><button class="btn ghost small" onclick="moveProduct('${p.id}',1)">↓</button><button class="btn danger small" onclick="deleteProduct('${p.id}')">Excluir</button></div>${productEditor(p)}</div>`).join('')}</div>`;
}
function productEditor(p){
  return `<div class="field"><label>Título</label><input value="${esc(p.title)}" onchange="updateProduct('${p.id}','title',this.value)"></div><div class="field"><label>Categoria</label><select onchange="updateProduct('${p.id}','category',this.value)">${db.categories.map(c=>`<option ${c.title===p.category?'selected':''}>${esc(c.title)}</option>`).join('')}</select></div><div class="field"><label>Imagem</label><input value="${esc(p.image)}" onchange="updateProduct('${p.id}','image',this.value)"></div><div class="field"><label>Resumo</label><textarea onchange="updateProduct('${p.id}','shortDescription',this.value)">${esc(p.shortDescription)}</textarea></div><div class="field"><label>Detalhes do popup, um por linha</label><textarea onchange="updateProductDetails('${p.id}',this.value)">${esc((p.details||[]).join('\n'))}</textarea></div><label><input type="checkbox" ${p.visible?'checked':''} onchange="updateProduct('${p.id}','visible',this.checked)"> Visível</label>`;
}
function updateProduct(id,key,value){ const p=db.products.find(x=>x.id===id); if(!p)return; p[key]=value; if(key==='title') p.id = p.id || slug(value); save(); render(); toggleAdmin(true); }
function updateProductDetails(id,value){ const p=db.products.find(x=>x.id===id); p.details=value.split('\n').filter(Boolean); save(); render(); toggleAdmin(true); }
function addProduct(){ const title='Novo Produto'; db.products.push({id:'novo-produto-'+Date.now(),category:db.categories[0]?.title||'Produtos',title,subtitle:'',image:'assets/screenshots/021_1782839081.png',shortDescription:'Resumo do produto.',details:['Detalhe técnico editável.'],visible:true,order:db.products.length+1}); save(); render(); toggleAdmin(true); }
function deleteProduct(id){ if(confirm('Excluir produto?')){db.products=db.products.filter(p=>p.id!==id); save(); render(); toggleAdmin(true);} }
function moveProduct(id,dir){ const p=db.products.find(x=>x.id===id); if(!p)return; p.order += dir*1.5; db.products.sort((a,b)=>a.order-b.order).forEach((x,i)=>x.order=i+1); save(); render(); toggleAdmin(true); }
function focusAdminProduct(id){ closeModal(); currentAdminTab='produtos'; render(); toggleAdmin(true); setTimeout(()=>{ const panel=$('#adminPanel'); const text=db.products.find(p=>p.id===id)?.title; [...panel.querySelectorAll('.edit-item')].find(el=>el.textContent.includes(text))?.scrollIntoView({behavior:'smooth',block:'center'}); },50); }
function renderCategoriesAdmin(){ return `<button class="btn alt" onclick="addCategory()">Adicionar categoria</button><div class="edit-list" style="margin-top:12px">${db.categories.sort((a,b)=>a.order-b.order).map(c=>`<div class="edit-item"><input value="${esc(c.title)}" onchange="updateCategory('${c.id}','title',this.value)"><div class="row"><button class="btn ghost small" onclick="moveCategory('${c.id}',-1)">↑</button><button class="btn ghost small" onclick="moveCategory('${c.id}',1)">↓</button><button class="btn danger small" onclick="deleteCategory('${c.id}')">Excluir</button></div><label><input type="checkbox" ${c.visible?'checked':''} onchange="updateCategory('${c.id}','visible',this.checked)"> Visível</label></div>`).join('')}</div>`; }
function addCategory(){ const title='Nova Categoria'; db.categories.push({id:'cat-'+Date.now(),title,visible:true,order:db.categories.length+1}); save(); render(); toggleAdmin(true); }
function updateCategory(id,key,value){ const c=db.categories.find(x=>x.id===id); if(!c)return; const old=c.title; c[key]=value; if(key==='title') db.products.filter(p=>p.category===old).forEach(p=>p.category=value); save(); render(); toggleAdmin(true); }
function deleteCategory(id){ if(confirm('Excluir categoria? Produtos não serão apagados.')){db.categories=db.categories.filter(c=>c.id!==id); save(); render(); toggleAdmin(true);} }
function moveCategory(id,dir){ const c=db.categories.find(x=>x.id===id); c.order += dir*1.5; db.categories.sort((a,b)=>a.order-b.order).forEach((x,i)=>x.order=i+1); save(); render(); toggleAdmin(true); }
function renderBlocksAdmin(){ return `<button class="btn alt" onclick="addBlock('text')">Adicionar texto</button> <button class="btn alt" onclick="addBlock('html')">Adicionar HTML</button><div class="edit-list" style="margin-top:12px">${db.blocks.sort((a,b)=>a.order-b.order).map(b=>`<div class="edit-item"><div class="field"><label>Título</label><input value="${esc(b.title)}" onchange="updateBlock('${b.id}','title',this.value)"></div><div class="field"><label>Tipo</label><select onchange="updateBlock('${b.id}','type',this.value)"><option ${b.type==='text'?'selected':''}>text</option><option ${b.type==='html'?'selected':''}>html</option></select></div><div class="field"><label>Conteúdo</label><textarea onchange="updateBlock('${b.id}','content',this.value)">${esc(b.content)}</textarea></div><label><input type="checkbox" ${b.enabled?'checked':''} onchange="updateBlock('${b.id}','enabled',this.checked)"> Ativo</label><button class="btn danger small" onclick="deleteBlock('${b.id}')">Excluir</button></div>`).join('')}</div>`; }
function addBlock(type){ db.blocks.push({id:'block-'+Date.now(),title:type==='html'?'Novo HTML':'Novo Texto',type,content:type==='html'?'<b>HTML editável</b>':'Texto editável',enabled:true,order:db.blocks.length+1}); save(); render(); toggleAdmin(true); }
function updateBlock(id,key,value){ const b=db.blocks.find(x=>x.id===id); b[key]=value; save(); render(); toggleAdmin(true); }
function deleteBlock(id){ db.blocks=db.blocks.filter(b=>b.id!==id); save(); render(); toggleAdmin(true); }
function renderButtonsAdmin(){ return `<button class="btn alt" onclick="addButton()">Adicionar botão</button> <button class="btn ghost" onclick="toggleLayoutMode()">${layoutMode?'Desativar':'Ativar'} arraste</button><div class="edit-list" style="margin-top:12px">${db.buttons.map(b=>`<div class="edit-item"><strong>${esc(b.label)}</strong><div class="field"><label>Texto</label><input value="${esc(b.label)}" onchange="updateButton('${b.id}','label',this.value)"></div><div class="field"><label>Tipo</label><select onchange="updateButton('${b.id}','targetType',this.value)">${['internal','external','popup','product','whatsapp'].map(t=>`<option ${b.targetType===t?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label>Destino</label><input value="${esc(b.target)}" onchange="updateButton('${b.id}','target',this.value)"></div><div class="row"><div class="field"><label>X %</label><input type="number" value="${b.x}" onchange="updateButton('${b.id}','x',Number(this.value))"></div><div class="field"><label>Y %</label><input type="number" value="${b.y}" onchange="updateButton('${b.id}','y',Number(this.value))"></div><div class="field"><label>Largura</label><input type="number" value="${b.width}" onchange="updateButton('${b.id}','width',Number(this.value))"></div></div><label><input type="checkbox" ${b.enabled?'checked':''} onchange="updateButton('${b.id}','enabled',this.checked)"> Ativo</label><button class="btn danger small" onclick="deleteButton('${b.id}')">Excluir</button></div>`).join('')}</div>`; }
function addButton(){ db.buttons.push({id:'btn-'+Date.now(),label:'Novo botão',targetType:'internal',target:'#produtos',x:10,y:80,width:160,enabled:true,order:db.buttons.length+1}); save(); render(); toggleAdmin(true); }
function updateButton(id,key,value){ const b=db.buttons.find(x=>x.id===id); b[key]=value; save(); render(); toggleAdmin(true); }
function deleteButton(id){ db.buttons=db.buttons.filter(b=>b.id!==id); save(); render(); toggleAdmin(true); }
function toggleLayoutMode(){ layoutMode=!layoutMode; render(); toggleAdmin(true); }
function renderDataAdmin(){ return `<button class="btn alt" onclick="exportJson()">Exportar JSON</button> <button class="btn ghost" onclick="resetDb()">Resetar mock</button><div class="field" style="margin-top:14px"><label>Importar JSON</label><textarea id="importJson" placeholder="Cole o JSON exportado"></textarea><button class="btn" onclick="importJson()">Importar</button></div><div class="field"><label>Biblioteca de imagens</label><textarea readonly>${esc((db.imageLibrary||[]).join('\n'))}</textarea></div>`; }
function exportJson(){ const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='mock-database.json'; a.click(); URL.revokeObjectURL(a.href); }
function importJson(){ try{ db=JSON.parse($('#importJson').value); save(); render(); toggleAdmin(true); }catch(e){ alert('JSON inválido'); } }
async function resetDb(){ if(!confirm('Resetar para mock original?')) return; localStorage.removeItem(STORAGE_KEY); const res=await fetch('mock-database.json?'+Date.now()); db=await res.json(); save(); render(); toggleAdmin(true); }
function attachDrag(){
  if(!layoutMode) return;
  document.querySelectorAll('.floating-button').forEach(btn=>{
    btn.onpointerdown = (ev)=>{
      ev.preventDefault(); btn.setPointerCapture(ev.pointerId); btn.classList.add('dragging');
      const hero=document.querySelector('.hero');
      btn.onpointermove = (e)=>{
        const r=hero.getBoundingClientRect();
        const x=Math.max(0,Math.min(85,((e.clientX-r.left)/r.width)*100));
        const y=Math.max(10,Math.min(88,((e.clientY-r.top)/r.height)*100));
        const item=db.buttons.find(b=>b.id===btn.dataset.buttonId); item.x=Math.round(x); item.y=Math.round(y);
        btn.style.setProperty('--x', item.x); btn.style.setProperty('--y', item.y);
      };
      btn.onpointerup = ()=>{ btn.classList.remove('dragging'); btn.onpointermove=null; save(); renderAdmin(); };
    };
  });
}

document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });
init();
