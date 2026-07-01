const cfg = window.PILLER_CMS_CONFIG;
const client = supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

let session = null;
let editing = null;
let products = [];

const $ = s => document.querySelector(s);

function esc(v) {
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

async function init() {
  const { data } = await client.auth.getSession();
  session = data.session;

  if (!session) renderLogin();
  else await loadProducts();
}

function renderLogin() {
  $("#app").innerHTML = `
    <main>
      <h1>Admin Piller</h1>
      <section class="panel">
        <div class="field">
          <label>E-mail</label>
          <input id="email">
        </div>
        <div class="field">
          <label>Senha</label>
          <input id="password" type="password">
        </div>
        <button class="yellow" onclick="login()">Entrar</button>
      </section>
    </main>
  `;
}

async function login() {
  const { error } = await client.auth.signInWithPassword({
    email: $("#email").value.trim(),
    password: $("#password").value
  });

  if (error) return alert(error.message);
  await init();
}

async function logout() {
  await client.auth.signOut();
  session = null;
  renderLogin();
}

async function loadProducts() {
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("category", "cadeados")
    .order("display_order", { ascending: true });

  if (error) return alert(error.message);
  products = data || [];
  renderAdmin();
}

function renderAdmin() {
  const p = editing;

  $("#app").innerHTML = `
    <main>
      <h1>Admin Cadeados</h1>
      <div class="actions">
        <a class="yellow" href="../cadeados/index.html">Ver Cadeados</a>
        <button onclick="logout()">Sair</button>
      </div>

      <section class="panel">
        <div class="grid">
          <div>
            <h2>${p ? "Editar card" : "Novo card"}</h2>

            <div class="field">
              <label>Nome do produto</label>
              <input id="name" value="${esc(p?.name || "")}">
            </div>

            <div class="field">
              <label>Subtítulo</label>
              <input id="subtitle" value="${esc(p?.subtitle || "")}">
            </div>

            <div class="field">
              <label>Imagem do produto</label>
              <input id="image" type="file" accept="image/*">
            </div>

            <div class="field">
              <label>Texto do botão</label>
              <input id="buttonText" value="${esc(p?.button_text || "SAIBA MAIS!")}">
            </div>

            <div class="field">
              <label>Link do botão</label>
              <input id="buttonUrl" value="${esc(p?.button_url || "#")}">
            </div>

            <div class="field">
              <label>Ordem</label>
              <input id="order" type="number" value="${esc(p?.display_order ?? products.length + 1)}">
            </div>

            <div class="field">
              <label>Status</label>
              <select id="status">
                <option value="draft" ${p?.status === "draft" ? "selected" : ""}>Rascunho</option>
                <option value="published" ${p?.status === "published" ? "selected" : ""}>Publicado</option>
              </select>
            </div>

            <div class="actions">
              <button class="yellow" onclick="saveProduct()">Salvar</button>
              <button onclick="editing=null;renderAdmin()">Novo</button>
            </div>
          </div>

          <div>
            <h2>Cards cadastrados</h2>
            ${products.map(product => `
              <div class="item">
                <div class="preview">
                  ${product.image_url ? `<img src="${product.image_url}">` : ""}
                </div>
                <strong>${esc(product.name)}</strong><br>
                <small>${esc(product.status)} | ordem ${esc(product.display_order)}</small>
                <div class="actions">
                  <button onclick="editProduct('${product.id}')">Editar</button>
                  <button class="danger" onclick="deleteProduct('${product.id}')">Excluir</button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </section>
    </main>
  `;
}

function editProduct(id) {
  editing = products.find(p => p.id === id);
  renderAdmin();
}

async function uploadImage(file) {
  if (!file) return null;

  const ext = file.name.split(".").pop();
  const path = `cadeados/${crypto.randomUUID()}.${ext}`;

  const { error } = await client.storage
    .from("piller-products")
    .upload(path, file, { upsert: false });

  if (error) throw error;

  const { data } = client.storage
    .from("piller-products")
    .getPublicUrl(path);

  return data.publicUrl;
}

async function saveProduct() {
  try {
    const imageFile = $("#image").files[0];
    const imageUrl = imageFile ? await uploadImage(imageFile) : editing?.image_url || null;

    const payload = {
      category: "cadeados",
      name: $("#name").value.trim(),
      subtitle: $("#subtitle").value.trim(),
      image_url: imageUrl,
      button_text: $("#buttonText").value.trim() || "SAIBA MAIS!",
      button_url: $("#buttonUrl").value.trim() || "#",
      display_order: Number($("#order").value || 0),
      status: $("#status").value,
      updated_at: new Date().toISOString()
    };

    if (!payload.name) return alert("Informe o nome.");

    let result;
    if (editing?.id) {
      result = await client.from("products").update(payload).eq("id", editing.id);
    } else {
      result = await client.from("products").insert(payload);
    }

    if (result.error) throw result.error;

    editing = null;
    await loadProducts();
  } catch (e) {
    alert(e.message);
  }
}

async function deleteProduct(id) {
  if (!confirm("Excluir este produto?")) return;

  const { error } = await client
    .from("products")
    .delete()
    .eq("id", id);

  if (error) return alert(error.message);

  await loadProducts();
}

init();
