/* ==========================================================================
   Catálogo (index.html)
   Busca rápida, filtros, ordenação, filtros na URL e faixa de destaques.
   ========================================================================== */
(function () {
  "use strict";

  /* ---- Opções de ordenação (a chave é o value do <select id="ordem">) ---- */
  const dataEmMs = (iso) => new Date(iso).getTime() || 0;
  const ORDENACOES = {
    recentes: (a, b) => dataEmMs(b.criadoEm) - dataEmMs(a.criadoEm),
    "menor-preco": (a, b) => a.preco - b.preco,
    "maior-preco": (a, b) => b.preco - a.preco,
    "maior-area": (a, b) => b.area - a.area,
  };

  const FILTROS_PADRAO = {
    finalidade: "",
    tipo: "",
    cidade: "",
    precoMin: null,
    precoMax: null,
    quartos: 0,
    favoritos: false,
    ordem: "recentes",
  };

  const ehChave = (objeto, chave) => chave != null && Object.prototype.hasOwnProperty.call(objeto, chave);
  const ordenarTexto = (a, b) => a.localeCompare(b, "pt-BR");

  const CIDADES = [...new Set(IMOVEIS.map((i) => i.cidade))].sort(ordenarTexto);
  const TIPOS_DISPONIVEIS = [...new Set(IMOVEIS.map((i) => i.tipo))].sort((a, b) =>
    ordenarTexto(rotuloTipo(a), rotuloTipo(b))
  );

  const $ = (id) => document.getElementById(id);
  const el = {
    form: $("filtros"),
    tipo: $("f-tipo"),
    cidade: $("f-cidade"),
    precoMin: $("f-min"),
    precoMax: $("f-max"),
    erroPreco: $("erro-preco"),
    favoritos: $("f-favoritos"),
    ordem: $("ordem"),
    contagem: $("contagem"),
    lista: $("lista-imoveis"),
    vazio: $("estado-vazio"),
    vazioTitulo: $("vazio-titulo"),
    vazioTexto: $("vazio-texto"),
    chips: $("filtros-ativos"),
    abrirFiltros: $("abrir-filtros"),
    contadorFiltros: $("contador-filtros"),
    verResultados: $("ver-resultados"),
    tituloResultados: $("titulo-resultados"),
    secaoResultados: $("resultados"),
    buscaRapida: $("busca-rapida"),
    brCidade: $("br-cidade"),
    brTipo: $("br-tipo"),
    secaoDestaques: $("destaques"),
    destaques: $("lista-destaques"),
    destaquesAnterior: $("destaques-anterior"),
    destaquesProximo: $("destaques-proximo"),
  };

  let filtros = lerFiltrosDaURL();
  let temporizadorPreco;

  /* ======================================================================
     Filtros <-> URL
     ====================================================================== */
  function lerFiltrosDaURL() {
    const p = new URLSearchParams(window.location.search);
    const f = { ...FILTROS_PADRAO };

    if (ehChave(FINALIDADES, p.get("finalidade"))) f.finalidade = p.get("finalidade");
    if (TIPOS_DISPONIVEIS.includes(p.get("tipo"))) f.tipo = p.get("tipo");
    if (CIDADES.includes(p.get("cidade"))) f.cidade = p.get("cidade");
    f.precoMin = lerNumero(p.get("min"));
    f.precoMax = lerNumero(p.get("max"));
    const quartos = Number(p.get("quartos"));
    if ([1, 2, 3, 4].includes(quartos)) f.quartos = quartos;
    f.favoritos = p.get("favoritos") === "1";
    if (ehChave(ORDENACOES, p.get("ordem"))) f.ordem = p.get("ordem");
    return f;
  }

  function filtrosParaQuery(f) {
    const p = new URLSearchParams();
    if (f.finalidade) p.set("finalidade", f.finalidade);
    if (f.tipo) p.set("tipo", f.tipo);
    if (f.cidade) p.set("cidade", f.cidade);
    if (f.precoMin != null) p.set("min", f.precoMin);
    if (f.precoMax != null) p.set("max", f.precoMax);
    if (f.quartos) p.set("quartos", f.quartos);
    if (f.favoritos) p.set("favoritos", "1");
    if (f.ordem !== FILTROS_PADRAO.ordem) p.set("ordem", f.ordem);
    return p.toString();
  }

  /** Espelha os filtros na barra de endereço, para o link poder ser compartilhado. */
  function sincronizarURL() {
    const query = filtrosParaQuery(filtros);
    salvarUltimaBusca(query);
    try {
      const url = new URL(window.location.href);
      url.search = query;
      window.history.replaceState(null, "", url.href);
    } catch {
      /* alguns navegadores restringem o histórico em file:// — os filtros seguem funcionando */
    }
  }

  /* ======================================================================
     Formulário <-> estado
     ====================================================================== */
  function preencherOpcoes() {
    const opcoesTipo = TIPOS_DISPONIVEIS.map((t) => `<option value="${escaparHTML(t)}">${escaparHTML(rotuloTipo(t))}</option>`).join("");
    const opcoesCidade = CIDADES.map((c) => `<option value="${escaparHTML(c)}">${escaparHTML(c)}</option>`).join("");
    [el.tipo, el.brTipo].forEach((select) => select.insertAdjacentHTML("beforeend", opcoesTipo));
    [el.cidade, el.brCidade].forEach((select) => select.insertAdjacentHTML("beforeend", opcoesCidade));

    document.querySelectorAll("[data-total-imoveis]").forEach((n) => (n.textContent = IMOVEIS.length));
    document.querySelectorAll("[data-total-cidades]").forEach((n) => (n.textContent = CIDADES.length));
  }

  function marcarRadio(form, nome, valor) {
    const radio = form.querySelector(`input[name="${nome}"][value="${valor}"]`);
    if (radio) radio.checked = true;
  }

  function preencherFormulario() {
    marcarRadio(el.form, "finalidade", filtros.finalidade);
    el.tipo.value = filtros.tipo;
    el.cidade.value = filtros.cidade;
    el.precoMin.value = filtros.precoMin != null ? formatarNumero(filtros.precoMin) : "";
    el.precoMax.value = filtros.precoMax != null ? formatarNumero(filtros.precoMax) : "";
    marcarRadio(el.form, "quartos", filtros.quartos);
    el.favoritos.checked = filtros.favoritos;
    el.ordem.value = filtros.ordem;

    // A busca rápida do topo acompanha os filtros
    marcarRadio(el.buscaRapida, "br-finalidade", filtros.finalidade || "venda");
    el.brCidade.value = filtros.cidade;
    el.brTipo.value = filtros.tipo;
  }

  function lerFormulario() {
    const dados = new FormData(el.form);
    filtros.finalidade = dados.get("finalidade") || "";
    filtros.tipo = el.tipo.value;
    filtros.cidade = el.cidade.value;
    filtros.precoMin = lerNumero(el.precoMin.value);
    filtros.precoMax = lerNumero(el.precoMax.value);
    filtros.quartos = Number(dados.get("quartos")) || 0;
    filtros.favoritos = el.favoritos.checked;
  }

  /* ======================================================================
     Filtragem e renderização
     ====================================================================== */
  function filtrarImoveis(lista, f) {
    const favoritos = f.favoritos ? lerFavoritos() : null;
    return lista.filter(
      (i) =>
        (!f.finalidade || i.finalidade === f.finalidade) &&
        (!f.tipo || i.tipo === f.tipo) &&
        (!f.cidade || i.cidade === f.cidade) &&
        (f.precoMin == null || i.preco >= f.precoMin) &&
        (f.precoMax == null || i.preco <= f.precoMax) &&
        (!f.quartos || i.quartos >= f.quartos) &&
        (!favoritos || favoritos.includes(String(i.id)))
    );
  }

  function textoContagem(total) {
    if (total === 0) return "Nenhum imóvel encontrado";
    return total === 1 ? "1 imóvel encontrado" : `${total} imóveis encontrados`;
  }

  function renderizar() {
    const resultado = filtrarImoveis(IMOVEIS, filtros).sort(ORDENACOES[filtros.ordem]);

    // Faixa de preço invertida
    const faixaInvalida = filtros.precoMin != null && filtros.precoMax != null && filtros.precoMin > filtros.precoMax;
    el.erroPreco.hidden = !faixaInvalida;
    [el.precoMin, el.precoMax].forEach((campo) => {
      if (faixaInvalida) campo.setAttribute("aria-invalid", "true");
      else campo.removeAttribute("aria-invalid");
    });

    el.contagem.textContent = textoContagem(resultado.length);
    el.lista.innerHTML = resultado.map((imovel) => `<li>${criarCardImovel(imovel)}</li>`).join("");
    el.lista.hidden = resultado.length === 0;
    el.vazio.hidden = resultado.length > 0;
    if (!resultado.length) atualizarEstadoVazio();

    el.verResultados.textContent = resultado.length
      ? `Ver ${resultado.length} ${plural(resultado.length, "imóvel", "imóveis")}`
      : "Fechar filtros";

    renderizarFiltrosAtivos();
    sincronizarURL();
  }

  function atualizarEstadoVazio() {
    const semFavoritos = filtros.favoritos && lerFavoritos().length === 0;
    el.vazioTitulo.textContent = semFavoritos ? "Você ainda não salvou nenhum favorito" : "Nenhum imóvel com esses filtros";
    el.vazioTexto.textContent = semFavoritos
      ? "Toque no coração de qualquer imóvel para guardá-lo aqui. Seus favoritos ficam salvos neste navegador."
      : "Tente ampliar a faixa de preço, escolher outra cidade ou remover alguns filtros para ver mais opções.";
  }

  /* ---- Etiquetas "filtro ativo ×" acima da lista ---- */
  function listarFiltrosAtivos() {
    const ativos = [];
    if (filtros.finalidade) ativos.push({ chave: "finalidade", rotulo: filtros.finalidade === "venda" ? "Comprar" : "Alugar" });
    if (filtros.tipo) ativos.push({ chave: "tipo", rotulo: rotuloTipo(filtros.tipo) });
    if (filtros.cidade) ativos.push({ chave: "cidade", rotulo: filtros.cidade });
    if (filtros.precoMin != null) ativos.push({ chave: "precoMin", rotulo: `A partir de ${formatarMoeda(filtros.precoMin)}` });
    if (filtros.precoMax != null) ativos.push({ chave: "precoMax", rotulo: `Até ${formatarMoeda(filtros.precoMax)}` });
    if (filtros.quartos) ativos.push({ chave: "quartos", rotulo: `${filtros.quartos}+ ${plural(filtros.quartos, "quarto", "quartos")}` });
    if (filtros.favoritos) ativos.push({ chave: "favoritos", rotulo: "Só favoritos" });
    return ativos;
  }

  function renderizarFiltrosAtivos() {
    const ativos = listarFiltrosAtivos();
    el.chips.hidden = ativos.length === 0;
    el.chips.innerHTML =
      ativos
        .map(
          (a) => `<li><button type="button" class="chip-ativo" data-remover="${a.chave}">
            ${escaparHTML(a.rotulo)}${icone("fechar")}<span class="sr-only"> (remover filtro)</span></button></li>`
        )
        .join("") +
      (ativos.length > 1 ? '<li><button type="button" class="botao-link" data-limpar-filtros>Limpar tudo</button></li>' : "");

    el.contadorFiltros.hidden = ativos.length === 0;
    el.contadorFiltros.innerHTML = `${ativos.length}<span class="sr-only"> ${plural(ativos.length, "filtro ativo", "filtros ativos")}</span>`;
  }

  function removerFiltro(chave, indiceBotao) {
    filtros[chave] = FILTROS_PADRAO[chave];
    preencherFormulario();
    renderizar();

    // O foco vai para a etiqueta seguinte (ou para o título, se não sobrou nenhuma)
    const botoes = el.chips.querySelectorAll("button");
    const proximo = botoes[Math.min(indiceBotao, botoes.length - 1)];
    (proximo || el.tituloResultados).focus();
  }

  function limparFiltros(origem) {
    filtros = { ...FILTROS_PADRAO, ordem: filtros.ordem };
    preencherFormulario();
    renderizar();
    // Se o botão clicado sumiu da tela, leva o foco para o título da lista
    if (origem && !document.body.contains(origem)) el.tituloResultados.focus();
    else if (origem && el.vazio.contains(origem)) el.tituloResultados.focus();
  }

  /* ======================================================================
     Painel de filtros no celular
     ====================================================================== */
  function painelAberto() {
    return el.abrirFiltros.getAttribute("aria-expanded") === "true";
  }

  function alternarPainel(abrir) {
    el.abrirFiltros.setAttribute("aria-expanded", String(abrir));
    el.form.classList.toggle("filtros--aberto", abrir);
  }

  function irParaResultados() {
    el.secaoResultados.scrollIntoView({ behavior: reduzirMovimento() ? "auto" : "smooth", block: "start" });
    el.tituloResultados.focus({ preventScroll: true });
  }

  /* ======================================================================
     Destaques (carrossel com rolagem nativa)
     ====================================================================== */
  function renderizarDestaques() {
    const destaques = IMOVEIS.filter((i) => i.destaque).sort(ORDENACOES.recentes);
    if (!destaques.length) {
      el.secaoDestaques.hidden = true;
      return;
    }
    el.destaques.innerHTML = destaques.map((imovel) => `<li>${criarCardImovel(imovel)}</li>`).join("");
    atualizarSetasDestaques();
  }

  function atualizarSetasDestaques() {
    const trilho = el.destaques;
    const fim = trilho.scrollWidth - trilho.clientWidth - 2;
    const semRolagem = fim <= 0;
    el.destaquesAnterior.setAttribute("aria-disabled", String(semRolagem || trilho.scrollLeft <= 2));
    el.destaquesProximo.setAttribute("aria-disabled", String(semRolagem || trilho.scrollLeft >= fim));
    el.destaquesAnterior.parentElement.hidden = semRolagem;
  }

  function moverDestaques(direcao) {
    const item = el.destaques.querySelector("li");
    const passo = item ? item.getBoundingClientRect().width + 24 : el.destaques.clientWidth * 0.8;
    el.destaques.scrollBy({ left: passo * direcao, behavior: reduzirMovimento() ? "auto" : "smooth" });
  }

  /* ======================================================================
     Eventos
     ====================================================================== */
  function ligarEventos() {
    // Qualquer mudança no painel aplica os filtros na hora
    el.form.addEventListener("change", (e) => {
      if (e.target === el.precoMin || e.target === el.precoMax) return; // tratados no "input"
      lerFormulario();
      renderizar();
    });

    // Preço: máscara de milhar e espera a pessoa terminar de digitar
    [el.precoMin, el.precoMax].forEach((campo) => {
      campo.addEventListener("input", () => {
        aplicarMascaraMilhar(campo);
        clearTimeout(temporizadorPreco);
        temporizadorPreco = setTimeout(() => {
          lerFormulario();
          renderizar();
        }, 400);
      });
    });

    el.form.addEventListener("submit", (e) => {
      e.preventDefault();
      lerFormulario();
      renderizar();
    });

    el.ordem.addEventListener("change", () => {
      filtros.ordem = el.ordem.value;
      renderizar();
    });

    // Busca rápida do topo
    el.buscaRapida.addEventListener("submit", (e) => {
      e.preventDefault();
      filtros.finalidade = new FormData(el.buscaRapida).get("br-finalidade") || "";
      filtros.cidade = el.brCidade.value;
      filtros.tipo = el.brTipo.value;
      preencherFormulario();
      renderizar();
      irParaResultados();
    });

    // Botões "Limpar filtros" e etiquetas de filtro ativo
    document.addEventListener("click", (e) => {
      const limpar = e.target.closest("[data-limpar-filtros]");
      if (limpar) {
        limparFiltros(limpar);
        return;
      }
      const remover = e.target.closest("[data-remover]");
      if (remover) {
        const indice = [...el.chips.querySelectorAll("button")].indexOf(remover);
        removerFiltro(remover.dataset.remover, indice);
      }
    });

    // Painel de filtros (celular)
    el.abrirFiltros.addEventListener("click", () => alternarPainel(!painelAberto()));
    el.verResultados.addEventListener("click", () => {
      alternarPainel(false);
      el.abrirFiltros.focus({ preventScroll: true });
      el.abrirFiltros.scrollIntoView({ behavior: reduzirMovimento() ? "auto" : "smooth", block: "start" });
    });
    el.form.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && painelAberto()) {
        alternarPainel(false);
        el.abrirFiltros.focus();
      }
    });

    // Com "Só favoritos" ligado, desfavoritar tira o card da lista
    document.addEventListener("favoritos:alterados", () => {
      if (!filtros.favoritos) return;
      const focoNaLista = el.lista.contains(document.activeElement);
      renderizar();
      if (focoNaLista) el.tituloResultados.focus({ preventScroll: true });
    });

    // Setas do carrossel de destaques
    el.destaquesAnterior.addEventListener("click", () => moverDestaques(-1));
    el.destaquesProximo.addEventListener("click", () => moverDestaques(1));
    el.destaques.addEventListener("scroll", atualizarSetasDestaques, { passive: true });
    window.addEventListener("resize", atualizarSetasDestaques);
  }

  /* ---- Início ---- */
  preencherOpcoes();
  preencherFormulario();
  renderizarDestaques();
  renderizar();
  ligarEventos();
})();
