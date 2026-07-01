const DATA_URL = "./produtos-data.json";
const STORE_KEY = "piller_produtos_editaveis_v1";

let db = null;
let activeCategory = "Todos";
let editingId = null;

const $ = (selector) => document.querySelector(selector);

function uid() {
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeProduct(p) {
  return {
    id: p.id || uid(),
    name: p.name || "Produto sem nome",
    category: p.category || "Produtos",
    subtitle: p.subtitle || "",
    image: p.image || "",
    background: p.background || db.theme.primary,
    description: p.description || "",
    details: Array.isArray(p.details) ? p.details : [],
    variants: Array.isArray(p.variants) ? p.variants : []
  };
}

async function loadData() {
  const local = localStorage.getItem(STORE_KEY);

  if (local) {
    db = JSON.parse(local);
  } else {
    const res = await fetch(DATA_URL);
    db = await res.json();
  }

  db.theme = db.theme || {};
  db.products = (db.products || []).map(normalizeProduct);

  applyTheme();
  render();
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(db, null, 2));
}

function applyTheme() {
  document.documentElement.style.setProperty("--primary", db.theme.primary || "#ffc400");
  document.documentElement.style.setProperty("--bg", db.theme.background || "#050505");
  document.documentElement.style.setProperty("--text", db.theme.text || "#ffffff");
  document.documentElement.style.setProperty("--card", db.theme.cardBackground || "#111111");
}

function categories() {
  return ["Todos", ...new Set(db.products.map(p => p.category).filter(Boolean))];
}

function visibleProducts() {
  return db.products.filter(p => activeCategory === "Todos" || p.category === activeCategory);
}

function render() {
  applyTheme();

  $("#app").innerHTML = `
    <header class="topbar">
      <div class="nav">
        <div class="brand">${esc(db.theme.brand || "Piller")}</div>
        <div class="menu">
          <a href="../index.html">Início</a>
          <a href="../produtos/index.html">Produtos</a>
          <button class="active" onclick="openAdmin()">Admin Produtos</button>
        </div>
      </div>
    </header>

    <section class="hero">
      <h1>${esc(db.theme.heroTitle || "Produtos")}</h1>
      <p>${esc(db.theme.heroSubtitle || "")}</p>
    </section>

    <section class="filters">
      ${categories().map(cat => `
        <button class="filter ${cat === activeCategory ? "active" : ""}" onclick="setCategory('${esc(cat)}')">
          ${esc(cat)}
        </button>
      `).join("")}
    </section>

    <main class="grid">
      ${visibleProducts().map(renderCard).join("")}
    </main>

    <div class="modal-backdrop" id="modal">
      <button class="close" onclick="closeModal()">×</button>
      <div id="modalContent"></div>
    </div>

    ${renderAdmin()}
  `;
}

function renderCard(p) {
  return `
    <article class="card">
      <div class="card-image" style="background:${esc(p.background)}">
        ${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}">` : `<div class="placeholder"></div>`}
      </div>
      <div class="card-body">
        <div class="kicker">${esc(p.category)}</div>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.subtitle || p.description)}</p>
        <div class="card-actions">
          <button class="btn primary" onclick="openProduct('${esc(p.id)}')">Saiba Mais</button>
          <button class="btn" onclick="editProduct('${esc(p.id)}')">Editar</button>
        </div>
      </div>
    </article>
  `;
}

function setCategory(cat) {
  activeCategory = cat;
  render();
}

function openProduct(id) {
  const product = db.products.find(p => p.id === id);
  if (!product) return;

  if (product.variants && product.variants.length) {
    openVariantChoice(product);
  } else {
    openDetails(product, null);
  }
}

function openVariantChoice(product) {
  $("#modalContent").innerHTML = `
    <section class="variant-screen">
      <div class="variant-box">
        <div class="variant-image">
          ${product.image ? `<img src="${esc(product.image)}" alt="${esc(product.name)}">` : `<div class="placeholder"></div>`}
        </div>
        <div class="variant-info">
          <div class="kicker">${esc(product.category)}</div>
          <h2>${esc(product.name)}</h2>
          <h3>${esc(product.subtitle)}</h3>
          <div class="variant-line"></div>
          <div class="kicker">Escolha a medida</div>
          <div class="variant-options">
            ${product.variants.map(v => `
              <button onclick="openDetailsByVariant('${esc(product.id)}','${esc(v.id)}')">
                ${esc(v.label)}
              </button>
            `).join("")}
          </div>
        </div>
      </div>
    </section>
  `;

  $("#modal").classList.add("open");
}

function openDetailsByVariant(productId, variantId) {
  const product = db.products.find(p => p.id === productId);
  const variant = product?.variants?.find(v => v.id === variantId);
  if (!product || !variant) return;
  openDetails(product, variant);
}

function openDetails(product, variant) {
  const data = variant || product;
  const image = data.image || product.image;
  const details = data.details || product.details || [];

  $("#modalContent").innerHTML = `
    <section class="detail-screen">
      <div class="detail-left" style="background:${esc(product.background || db.theme.primary)}">
        <div class="detail-content">
          <h2>${esc(data.title || product.name)}</h2>
          <h3>${esc(data.subtitle || product.subtitle)}</h3>
          <p><strong>${esc(data.description || product.description)}</strong></p>
          <ul>
            ${details.map(item => `<li>${esc(item)}</li>`).join("")}
          </ul>
        </div>
      </div>

      <div class="detail-right">
        ${image ? `<img class="detail-main-image" src="${esc(image)}" alt="${esc(data.title || product.name)}">` : `<div class="detail-main-image"></div>`}
      </div>
    </section>
  `;

  $("#modal").classList.add("open");
}

function closeModal() {
  $("#modal").classList.remove("open");
}

function renderAdmin() {
  return `
    <aside class="admin" id="admin">
      <div class="admin-head">
        <strong>Painel de Produtos</strong>
        <button onclick="closeAdmin()">Fechar</button>
      </div>

      <div class="admin-body">
        <h3>Tema</h3>

        <div class="field">
          <label>Título</label>
          <input id="themeHeroTitle" value="${esc(db.theme.heroTitle || "")}">
        </div>

        <div class="field">
          <label>Subtítulo</label>
          <textarea id="themeHeroSubtitle">${esc(db.theme.heroSubtitle || "")}</textarea>
        </div>

        <div class="field">
          <label>Cor principal</label>
          <input id="themePrimary" type="color" value="${esc(db.theme.primary || "#ffc400")}">
        </div>

        <button class="btn primary" onclick="saveTheme()">Salvar tema</button>

        <hr>

        <h3>${editingId ? "Editar produto" : "Cadastrar produto"}</h3>

        <div class="field">
          <label>Nome</label>
          <input id="pName">
        </div>

        <div class="field">
          <label>Categoria</label>
          <input id="pCategory">
        </div>

        <div class="field">
          <label>Subtítulo</label>
          <input id="pSubtitle">
        </div>

        <div class="field">
          <label>Descrição curta</label>
          <textarea id="pDescription"></textarea>
        </div>

        <div class="field">
          <label>Foto principal</label>
          <input id="pImageFile" type="file" accept="image/*">
        </div>

        <div class="field">
          <label>Ou URL/Base64 da foto</label>
          <textarea id="pImage"></textarea>
        </div>

        <div class="field">
          <label>Cor/fundo do produto</label>
          <input id="pBackground" type="color" value="#ffc400">
        </div>

        <div class="field">
          <label>Detalhes técnicos — 1 por linha</label>
          <textarea id="pDetails"></textarea>
        </div>

        <div class="field">
          <label>Opções/medidas em JSON</label>
          <textarea id="pVariants" placeholder='[{"id":"20mm","label":"20 mm","title":"Produto 20mm","details":["Texto"]}]'></textarea>
        </div>

        <div class="admin-actions">
          <button onclick="saveProduct()">Salvar produto</button>
          <button onclick="resetForm()">Novo</button>
          <button onclick="exportJson()">Exportar JSON</button>
          <button onclick="importJson()">Importar JSON</button>
        </div>

        <hr>

        <h3>Produtos cadastrados</h3>
        <div class="admin-list">
          ${db.products.map(p => `
            <div class="admin-item">
              <strong>${esc(p.name)}</strong><br>
              <small>${esc(p.category)}</small>
              <div class="admin-actions">
                <button onclick="editProduct('${esc(p.id)}')">Editar</button>
                <button onclick="deleteProduct('${esc(p.id)}')">Excluir</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </aside>
  `;
}

function openAdmin() {
  $("#admin").classList.add("open");
}

function closeAdmin() {
  $("#admin").classList.remove("open");
}

function saveTheme() {
  db.theme.heroTitle = $("#themeHeroTitle").value;
  db.theme.heroSubtitle = $("#themeHeroSubtitle").value;
  db.theme.primary = $("#themePrimary").value;
  save();
  render();
  openAdmin();
}

function resetForm() {
  editingId = null;
  render();
  openAdmin();
}

function editProduct(id) {
  editingId = id;
  render();
  openAdmin();

  const p = db.products.find(x => x.id === id);
  if (!p) return;

  $("#pName").value = p.name || "";
  $("#pCategory").value = p.category || "";
  $("#pSubtitle").value = p.subtitle || "";
  $("#pDescription").value = p.description || "";
  $("#pImage").value = p.image || "";
  $("#pBackground").value = p.background || db.theme.primary || "#ffc400";
  $("#pDetails").value = (p.details || []).join("\n");
  $("#pVariants").value = JSON.stringify(p.variants || [], null, 2);
}

async function fileToBase64(input) {
  const file = input.files?.[0];
  if (!file) return "";

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function saveProduct() {
  let variants = [];

  try {
    const raw = $("#pVariants").value.trim();
    variants = raw ? JSON.parse(raw) : [];
  } catch {
    alert("JSON das opções/medidas está inválido.");
    return;
  }

  const uploadedImage = await fileToBase64($("#pImageFile"));
  const image = uploadedImage || $("#pImage").value.trim();

  const product = normalizeProduct({
    id: editingId || uid(),
    name: $("#pName").value.trim(),
    category: $("#pCategory").value.trim(),
    subtitle: $("#pSubtitle").value.trim(),
    description: $("#pDescription").value.trim(),
    image,
    background: $("#pBackground").value,
    details: $("#pDetails").value.split("\n").map(x => x.trim()).filter(Boolean),
    variants
  });

  if (!product.name) {
    alert("Informe o nome do produto.");
    return;
  }

  const index = db.products.findIndex(p => p.id === product.id);

  if (index >= 0) {
    db.products[index] = product;
  } else {
    db.products.push(product);
  }

  editingId = null;
  save();
  render();
  openAdmin();
}

function deleteProduct(id) {
  if (!confirm("Excluir produto?")) return;
  db.products = db.products.filter(p => p.id !== id);
  save();
  render();
  openAdmin();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "produtos-data.json";
  a.click();
}

function importJson() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";

  input.onchange = () => {
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      try {
        db = JSON.parse(reader.result);
        db.products = (db.products || []).map(normalizeProduct);
        save();
        render();
        openAdmin();
      } catch {
        alert("JSON inválido.");
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

loadData();
