/* ==========================================================================
   Utilidades compartilhadas pelas duas páginas
   (formatação, favoritos, WhatsApp, ícones e o card de imóvel)
   ========================================================================== */

/* ---- Dados da imobiliária: troque aqui ------------------------------------ */
const CONFIG = {
  nome: "Morada Nova Imóveis",
  whatsapp: "5511900000000", // troque pelo seu número (DDI + DDD + número)
  endereco: "Rua dos Ipês Amarelos, 845 · Vila Serena, Campinas/SP",
  horario: "Seg. a sex., das 9h às 18h · Sáb., das 9h às 13h",
  creci: "CRECI 00000-J",
  prefixoCodigo: "MN", // código exibido nos anúncios: MN-001, MN-002…
};

/* Rótulos exibidos para os valores usados em data.js */
const TIPOS = {
  casa: "Casa",
  apartamento: "Apartamento",
  terreno: "Terreno",
  sala: "Sala comercial",
};

const FINALIDADES = {
  venda: "Venda",
  aluguel: "Aluguel",
};

const CHAVE_FAVORITOS = "moradaNova:favoritos";
const CHAVE_ULTIMA_BUSCA = "moradaNova:ultimaBusca";

/* ---- Formatação ----------------------------------------------------------- */
const moedaSemCentavos = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const moedaComCentavos = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numeroBR = new Intl.NumberFormat("pt-BR");
const dataBR = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC", // evita que "2026-10-28" vire 27/10 no fuso do Brasil
});

/** Valores inteiros saem sem centavos (R$ 890.000); quebrados, com (R$ 4.503,12). */
function formatarMoeda(valor, comCentavos) {
  const usarCentavos = comCentavos === undefined ? !Number.isInteger(valor) : comCentavos;
  return (usarCentavos ? moedaComCentavos : moedaSemCentavos).format(valor);
}

function formatarNumero(valor) {
  return numeroBR.format(valor);
}

function formatarData(iso) {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "" : dataBR.format(data);
}

/** Preço em texto puro: "R$ 2.300/mês" no aluguel. */
function formatarPreco(imovel) {
  return formatarMoeda(imovel.preco) + (imovel.finalidade === "aluguel" ? "/mês" : "");
}

/** Preço em HTML, com o "/mês" estilizado e lido como "por mês". */
function precoHTML(imovel) {
  const valor = formatarMoeda(imovel.preco);
  if (imovel.finalidade !== "aluguel") return valor;
  return `${valor}<span class="preco__sufixo" aria-hidden="true">/mês</span><span class="sr-only"> por mês</span>`;
}

/** "(11) 90000-0000" a partir do número do WhatsApp. */
function telefoneFormatado(numero = CONFIG.whatsapp) {
  const d = String(numero).replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

function plural(quantidade, singular, pluralTexto) {
  return quantidade === 1 ? singular : pluralTexto;
}

function rotuloTipo(tipo) {
  return TIPOS[tipo] || String(tipo).charAt(0).toUpperCase() + String(tipo).slice(1);
}

function rotuloFinalidade(finalidade) {
  return FINALIDADES[finalidade] || finalidade;
}

function codigoImovel(id) {
  return `${CONFIG.prefixoCodigo}-${String(id).padStart(3, "0")}`;
}

function escaparHTML(texto) {
  const mapa = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(texto).replace(/[&<>"']/g, (c) => mapa[c]);
}

/** Lê só os dígitos de um texto ("500.000" → 500000). Vazio → null. */
function lerNumero(texto) {
  const digitos = String(texto ?? "").replace(/\D/g, "");
  return digitos ? Number(digitos) : null;
}

/** Formata o campo com separador de milhar enquanto a pessoa digita. */
function aplicarMascaraMilhar(campo) {
  const posicao = campo.selectionStart ?? campo.value.length;
  const digitosAntes = campo.value.slice(0, posicao).replace(/\D/g, "").length;
  const digitos = campo.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);
  campo.value = digitos ? formatarNumero(Number(digitos)) : "";

  // Devolve o cursor para depois do mesmo dígito em que ele estava
  let novaPosicao = 0;
  let contados = 0;
  while (novaPosicao < campo.value.length && contados < digitosAntes) {
    if (/\d/.test(campo.value[novaPosicao])) contados++;
    novaPosicao++;
  }
  if (document.activeElement === campo) campo.setSelectionRange(novaPosicao, novaPosicao);
}

/** Máscara de telefone brasileiro: (11) 98765-4321 */
function aplicarMascaraTelefone(campo) {
  const d = campo.value.replace(/\D/g, "").slice(0, 11);
  let valor = d;
  if (d.length > 10) valor = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  else if (d.length > 6) valor = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  else if (d.length > 2) valor = `(${d.slice(0, 2)}) ${d.slice(2)}`;
  else if (d.length > 0) valor = `(${d}`;
  campo.value = valor;
}

/** Ajusta o tamanho de uma foto do Unsplash (outras URLs voltam intactas). */
function urlFoto(url, largura, altura) {
  const texto = String(url);
  if (!texto.startsWith("https://images.unsplash.com/")) return texto;
  const endereco = new URL(texto);
  endereco.searchParams.set("w", largura);
  endereco.searchParams.set("h", altura);
  return endereco.toString();
}

function buscarImovel(id) {
  return IMOVEIS.find((imovel) => String(imovel.id) === String(id)) || null;
}

function reduzirMovimento() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ---- WhatsApp ------------------------------------------------------------- */
function linkWhatsApp(mensagem) {
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensagem)}`;
}

function abrirWhatsApp(mensagem) {
  const url = linkWhatsApp(mensagem);
  const janela = window.open(url, "_blank");
  if (janela) janela.opener = null;
  else window.location.href = url; // bloqueador de pop-up: abre na mesma aba
}

/* ---- Armazenamento (com plano B quando o navegador bloqueia) -------------- */
function obterArmazenamento(tipo) {
  try {
    const armazenamento = window[tipo];
    const teste = "__morada_teste__";
    armazenamento.setItem(teste, teste);
    armazenamento.removeItem(teste);
    return armazenamento;
  } catch {
    return null;
  }
}

const armazenamentoLocal = obterArmazenamento("localStorage");
const armazenamentoSessao = obterArmazenamento("sessionStorage");
let favoritosEmMemoria = [];

/* ---- Favoritos ------------------------------------------------------------ */
function lerFavoritos() {
  if (!armazenamentoLocal) return favoritosEmMemoria.slice();
  try {
    const salvo = JSON.parse(armazenamentoLocal.getItem(CHAVE_FAVORITOS) || "[]");
    return Array.isArray(salvo) ? salvo.map(String) : [];
  } catch {
    return [];
  }
}

function salvarFavoritos(ids) {
  favoritosEmMemoria = ids.slice();
  if (!armazenamentoLocal) return;
  try {
    armazenamentoLocal.setItem(CHAVE_FAVORITOS, JSON.stringify(ids));
  } catch {
    /* sem espaço ou bloqueado: segue só na memória */
  }
}

function ehFavorito(id) {
  return lerFavoritos().includes(String(id));
}

/** Marca/desmarca e devolve o novo estado (true = é favorito). */
function alternarFavorito(id) {
  const chave = String(id);
  const favoritos = lerFavoritos();
  const indice = favoritos.indexOf(chave);
  if (indice === -1) favoritos.push(chave);
  else favoritos.splice(indice, 1);
  salvarFavoritos(favoritos);

  const favorito = indice === -1;
  sincronizarBotoesFavorito();
  document.dispatchEvent(new CustomEvent("favoritos:alterados", { detail: { id: chave, favorito } }));
  return favorito;
}

/** Atualiza todos os botões de coração da página e o contador do cabeçalho. */
function sincronizarBotoesFavorito() {
  const favoritos = lerFavoritos();
  document.querySelectorAll("[data-favorito]").forEach((botao) => {
    const ativo = favoritos.includes(botao.dataset.favorito);
    botao.setAttribute("aria-pressed", String(ativo));
    botao.title = ativo ? "Remover dos favoritos" : "Salvar nos favoritos";
  });
  document.querySelectorAll("[data-contador-favoritos]").forEach((contador) => {
    contador.textContent = favoritos.length;
    contador.hidden = favoritos.length === 0;
  });
}

function botaoFavoritoHTML(imovel, classeExtra = "") {
  const ativo = ehFavorito(imovel.id);
  return `<button type="button" class="botao-favorito ${classeExtra}" data-favorito="${escaparHTML(imovel.id)}"
    aria-pressed="${ativo}" aria-label="Favoritar: ${escaparHTML(imovel.titulo)}"
    title="${ativo ? "Remover dos favoritos" : "Salvar nos favoritos"}">${icone("coracao")}</button>`;
}

/* ---- Última busca do catálogo (para o "voltar" da página do imóvel) ------- */
function salvarUltimaBusca(query) {
  if (!armazenamentoSessao) return;
  try {
    armazenamentoSessao.setItem(CHAVE_ULTIMA_BUSCA, query);
  } catch {
    /* ignora */
  }
}

function lerUltimaBusca() {
  if (!armazenamentoSessao) return "";
  try {
    return armazenamentoSessao.getItem(CHAVE_ULTIMA_BUSCA) || "";
  } catch {
    return "";
  }
}

/* ---- Ícones (SVG em linha, desenhados com stroke = currentColor) ---------- */
const ICONES = {
  cama: '<path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 15h18M3 18v2M21 18v2"/><path d="M5.5 10V7a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v3M12 6v4"/>',
  banheira: '<path d="M3 12h18v2.5a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 14.5z"/><path d="M6 12V6.5a2 2 0 0 1 4 0"/><path d="m7 19-1 2M17 19l1 2"/>',
  carro: '<path d="M5 16H3.5v-3.2l1.8-4.5A2 2 0 0 1 7.2 7h9.6a2 2 0 0 1 1.9 1.3l1.8 4.5V16H19"/><path d="M9 16h6M4 12h16"/><circle cx="7" cy="16.5" r="2"/><circle cx="17" cy="16.5" r="2"/>',
  area: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><path d="m4 4 5.5 5.5M20 20l-5.5-5.5"/>',
  coracao: '<path d="M12 20.3s-7.4-4.5-9.2-9.3C1.6 7.8 3.6 4.5 7 4.5c2.1 0 3.6 1.2 5 3.1 1.4-1.9 2.9-3.1 5-3.1 3.4 0 5.4 3.3 4.2 6.5-1.8 4.8-9.2 9.3-9.2 9.3z"/>',
  pin: '<path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  estrela: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  "seta-esquerda": '<path d="m15 18-6-6 6-6"/>',
  "seta-direita": '<path d="m9 18 6-6-6-6"/>',
  conversa: '<path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.6l-4.6 1.4 1.4-4.4A8.5 8.5 0 1 1 20.5 11.5z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/>',
  compartilhar: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 13.2 7.6 4.1M15.8 6.7l-7.6 4.1"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
};

function icone(nome, classe = "") {
  return `<svg class="icone ${classe}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONES[nome] || ""}</svg>`;
}

/* ---- Card de imóvel (usado no catálogo, nos destaques e nos semelhantes) -- */
function criarCardImovel(imovel) {
  const titulo = escaparHTML(imovel.titulo);
  const capa = imovel.fotos[0];
  const fatos = [
    imovel.quartos > 0 && { icone: "cama", valor: imovel.quartos, rotulo: plural(imovel.quartos, "quarto", "quartos") },
    imovel.banheiros > 0 && { icone: "banheira", valor: imovel.banheiros, rotulo: plural(imovel.banheiros, "banheiro", "banheiros") },
    imovel.vagas > 0 && { icone: "carro", valor: imovel.vagas, rotulo: plural(imovel.vagas, "vaga", "vagas") },
    { icone: "area", valor: `${formatarNumero(imovel.area)} m²`, rotulo: "de área" },
  ].filter(Boolean);

  return `
    <article class="card">
      <div class="card__corpo">
        <p class="card__tipo">${escaparHTML(rotuloTipo(imovel.tipo))}</p>
        <h3 class="card__titulo"><a class="card__link" href="imovel.html?id=${encodeURIComponent(imovel.id)}">${titulo}</a></h3>
        <p class="card__local">${icone("pin")}<span>${escaparHTML(imovel.bairro)}, ${escaparHTML(imovel.cidade)}</span></p>
        <ul class="card__fatos">
          ${fatos
            .map((f) => `<li title="${f.valor} ${f.rotulo}">${icone(f.icone)}<span>${f.valor}</span><span class="sr-only"> ${f.rotulo}</span></li>`)
            .join("")}
        </ul>
      </div>
      <div class="card__rodape">
        <p class="card__preco">${precoHTML(imovel)}</p>
        <span class="card__ver" aria-hidden="true">Ver detalhes ${icone("seta-direita")}</span>
      </div>
      <div class="card__midia">
        <img src="${urlFoto(capa, 640, 480)}"
          srcset="${urlFoto(capa, 480, 360)} 480w, ${urlFoto(capa, 800, 600)} 800w"
          sizes="(min-width: 1280px) 300px, (min-width: 640px) 45vw, 90vw"
          alt="Foto de capa: ${titulo}" loading="lazy" decoding="async" width="640" height="480">
        <div class="card__selos">
          <span class="selo selo--${escaparHTML(imovel.finalidade)}">${escaparHTML(rotuloFinalidade(imovel.finalidade))}</span>
          ${imovel.destaque ? `<span class="selo selo--destaque">${icone("estrela")}Destaque</span>` : ""}
        </div>
        ${botaoFavoritoHTML(imovel, "card__favorito")}
      </div>
    </article>`;
}

/* ---- Aviso flutuante ("Imóvel salvo nos favoritos") ----------------------- */
let temporizadorAviso;

function mostrarAviso(texto) {
  let aviso = document.getElementById("aviso");
  if (!aviso) {
    aviso = document.createElement("div");
    aviso.id = "aviso";
    aviso.className = "aviso";
    aviso.setAttribute("role", "status");
    document.body.appendChild(aviso);
  }
  aviso.textContent = texto;
  aviso.classList.add("aviso--visivel");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.remove("aviso--visivel"), 2800);
}

/* ---- Itens comuns às duas páginas ----------------------------------------- */
function aplicarConfig() {
  const valores = { ...CONFIG, telefone: telefoneFormatado() };

  document.querySelectorAll("[data-config]").forEach((el) => {
    const valor = valores[el.dataset.config];
    if (valor) el.textContent = valor;
  });
  document.querySelectorAll("[data-telefone]").forEach((link) => {
    link.href = `tel:+${CONFIG.whatsapp}`;
  });
  document.querySelectorAll("[data-whatsapp]").forEach((link) => {
    link.href = linkWhatsApp(link.dataset.whatsapp || `Olá! Vim pelo site da ${CONFIG.nome}.`);
  });
  document.querySelectorAll("[data-ano]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

function iniciarMenu() {
  const botao = document.querySelector(".cabecalho__menu");
  const nav = document.getElementById("menu-principal");
  if (!botao || !nav) return;

  const definir = (aberto) => {
    botao.setAttribute("aria-expanded", String(aberto));
    nav.classList.toggle("nav--aberta", aberto);
  };

  botao.addEventListener("click", () => definir(botao.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) definir(false);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".cabecalho")) definir(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("nav--aberta")) {
      definir(false);
      botao.focus();
    }
  });
}

/* Clique em qualquer coração da página (cards, detalhe, destaques) */
document.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-favorito]");
  if (!botao) return;
  evento.preventDefault();
  const agoraFavorito = alternarFavorito(botao.dataset.favorito);

  if (agoraFavorito && !reduzirMovimento()) {
    botao.classList.remove("pulsar");
    void botao.offsetWidth; // reinicia a animação
    botao.classList.add("pulsar");
  }
  mostrarAviso(agoraFavorito ? "Imóvel salvo nos seus favoritos." : "Imóvel removido dos favoritos.");
});

/* Mantém os favoritos em dia se outra aba alterar a lista */
window.addEventListener("storage", (evento) => {
  if (evento.key !== CHAVE_FAVORITOS) return;
  sincronizarBotoesFavorito();
  document.dispatchEvent(new CustomEvent("favoritos:alterados", { detail: {} }));
});

aplicarConfig();
iniciarMenu();
sincronizarBotoesFavorito();
