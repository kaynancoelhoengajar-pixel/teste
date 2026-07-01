(function () {
  const category = "cadeados";

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function card(product) {
    return `
      <article class="piller-dynamic-card">
        <div class="piller-dynamic-card-image">
          ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}">` : ""}
        </div>
        <div class="piller-dynamic-card-body">
          <h3>${product.name || ""}</h3>
          <p>${product.subtitle || ""}</p>
          <a href="${product.button_url || "#"}">${product.button_text || "SAIBA MAIS!"}</a>
        </div>
      </article>
    `;
  }

  async function init() {
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");

    const cfg = window.PILLER_CMS_CONFIG;
    const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

    const { data, error } = await client
      .from("products")
      .select("*")
      .eq("category", category)
      .eq("status", "published")
      .order("display_order", { ascending: true });

    if (error || !data || !data.length) return;

    const style = document.createElement("style");
    style.textContent = `
      .piller-dynamic-section{
        width:min(980px,100%);
        margin:40px auto 80px;
        padding:0 20px;
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:28px;
      }
      .piller-dynamic-card{
        background:#000;
        border:2px solid #ffcc00;
        border-radius:22px;
        overflow:hidden;
        text-align:center;
      }
      .piller-dynamic-card-image{
        height:250px;
        background:#ffcc00;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:24px;
      }
      .piller-dynamic-card-image img{
        width:100%;
        height:100%;
        object-fit:contain;
      }
      .piller-dynamic-card-body{
        padding:20px;
      }
      .piller-dynamic-card-body h3{
        color:#fff;
        font:700 24px Arial,sans-serif;
        margin:0 0 10px;
      }
      .piller-dynamic-card-body p{
        color:#ddd;
        font:400 14px Arial,sans-serif;
        margin:0 0 16px;
      }
      .piller-dynamic-card-body a{
        display:inline-block;
        background:#ffcc00;
        color:#000;
        border-radius:999px;
        padding:10px 16px;
        font:700 13px Arial,sans-serif;
        text-decoration:none;
      }
      @media(max-width:800px){
        .piller-dynamic-section{grid-template-columns:1fr;}
      }
    `;
    document.head.appendChild(style);

    const section = document.createElement("section");
    section.className = "piller-dynamic-section";
    section.innerHTML = data.map(card).join("");

    document.body.appendChild(section);
  }

  init();
})();
