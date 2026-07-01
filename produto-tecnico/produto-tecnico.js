const KEY = "piller_produto_tecnico_v1";
const PASSWORD = "piller123";

let clicks = 0;

let data = JSON.parse(localStorage.getItem(KEY) || "null") || {
  name: "Cadeado 20mm",
  subtitle: "Nível de segurança - 01",
  mainImage: "",
  lineLogo: "",
  technicalImage: "",
  details: [
    "Atende a norma ABNT 15271.",
    "Matéria-Prima: Zamac 5 - Chave e gancho em aço abnt 1010/1020",
    "Molas de aço inoxidável.",
    "PINOS DE SEGREDO E CONTRA PINOS EM LATÃO.",
    "Acabamento: E-COALT LATONADO.",
    "LUBRIFICAR QUANDO NECESSÁRIO COM ÓLEO MINERAL. NÃO UTILIZAR GRAFITE EM PÓ.",
    "Garantia de 5 anos para defeitos de fabricação."
  ],
  backups: []
};

const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");

function render(){
  document.getElementById("app").innerHTML = `
    <div class="logo-hotspot" onclick="secretClick()">Piller</div>
    <button class="close" onclick="location.href='../produtos/index.html'"></button>

    <section class="cadeado-screen">
      <div class="cadeado-left">
        <div class="cadeado-text">
          <h1>${esc(data.name)}</h1>
          <h2>${esc(data.subtitle)}</h2>
          ${data.details.map(x => `<p>${esc(x)}</p>`).join("")}
        </div>
      </div>

      <div class="cadeado-right">
        <div class="circle-img logo-circle">${data.lineLogo ? `<img src="${data.lineLogo}">` : `<b style="color:#000">LINHA</b>`}</div>
        <div class="circle-img main-circle">${data.mainImage ? `<img src="${data.mainImage}">` : ""}</div>
        <div class="circle-img tech-circle">${data.technicalImage ? `<img src="${data.technicalImage}">` : ""}</div>
      </div>
    </section>

    <aside class="admin" id="admin">
      <div class="admin-box">
        <div class="admin-head">
          <strong>Admin Produto Técnico</strong>
          <button onclick="closeAdmin()">Fechar</button>
        </div>
        <div class="admin-body">
          <div class="field"><label>Nome</label><input id="name" value="${esc(data.name)}"></div>
          <div class="field"><label>Subtítulo</label><input id="subtitle" value="${esc(data.subtitle)}"></div>
          <div class="field"><label>Imagem principal</label><input id="mainImage" type="file" accept="image/*"></div>
          <div class="field"><label>Logo da linha</label><input id="lineLogo" type="file" accept="image/*"></div>
          <div class="field"><label>Imagem técnica</label><input id="technicalImage" type="file" accept="image/*"></div>
          <div class="field"><label>Detalhes — um por linha</label><textarea id="details">${esc(data.details.join("\n"))}</textarea></div>

          <div class="actions">
            <button class="yellow" onclick="saveAdmin()">Salvar com backup</button>
            <button onclick="exportJson()">Exportar JSON</button>
            <button onclick="restoreLast()">Restaurar último backup</button>
          </div>
        </div>
      </div>
    </aside>
  `;
}

function secretClick(){
  clicks++;
  setTimeout(() => clicks = 0, 1800);

  if(clicks >= 5){
    clicks = 0;
    const pass = prompt("Senha do admin:");
    if(pass === PASSWORD){
      $("#admin").classList.add("open");
    } else {
      alert("Senha incorreta.");
    }
  }
}

function closeAdmin(){
  $("#admin").classList.remove("open");
}

function fileToBase64(input){
  const file = input.files?.[0];
  if(!file) return Promise.resolve("");
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function saveAdmin(){
  data.backups ||= [];
  data.backups.unshift({
    date: new Date().toISOString(),
    snapshot: JSON.parse(JSON.stringify(data))
  });
  data.backups = data.backups.slice(0, 10);

  const mainImage = await fileToBase64($("#mainImage"));
  const lineLogo = await fileToBase64($("#lineLogo"));
  const technicalImage = await fileToBase64($("#technicalImage"));

  data.name = $("#name").value.trim();
  data.subtitle = $("#subtitle").value.trim();
  data.details = $("#details").value.split("\n").map(x=>x.trim()).filter(Boolean);

  if(mainImage) data.mainImage = mainImage;
  if(lineLogo) data.lineLogo = lineLogo;
  if(technicalImage) data.technicalImage = technicalImage;

  localStorage.setItem(KEY, JSON.stringify(data));
  render();
  alert("Salvo. A página principal já refletiu a alteração neste navegador.");
}

function restoreLast(){
  const last = data.backups?.[0];
  if(!last) return alert("Sem backup.");
  if(!confirm("Restaurar último backup?")) return;
  data = last.snapshot;
  localStorage.setItem(KEY, JSON.stringify(data));
  render();
}

function exportJson(){
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "produto-tecnico.json";
  a.click();
}

render();
