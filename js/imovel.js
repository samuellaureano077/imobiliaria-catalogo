/* ==========================================================================
   Página do imóvel (imovel.html?id=X)
   Galeria, informações, simulador de financiamento, contato e semelhantes.
   ========================================================================== */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const idDaURL = new URLSearchParams(window.location.search).get("id");
  const imovel = idDaURL ? buscarImovel(idDaURL.trim()) : null;

  configurarTrilha();

  if (!imovel) {
    mostrarNaoEncontrado();
    return;
  }

  atualizarMetadados();
  preencherCabecalho();
  montarGaleria();
  preencherInformacoes();
  if (imovel.finalidade === "venda") montarSimulador();
  montarContato();
  montarSemelhantes();
  $("imovel").hidden = false;

  /* ======================================================================
     Trilha de navegação: volta para a busca anterior, com os filtros
     ====================================================================== */
  function configurarTrilha() {
    const query = lerUltimaBusca() || buscaDoReferenciador();
    const link = $("trilha-busca");
    link.href = `index.html${query ? `?${query}` : ""}#resultados`;
    link.textContent = query ? "Resultados da busca" : "Todos os imóveis";
  }

  function buscaDoReferenciador() {
    try {
      const anterior = new URL(document.referrer);
      return /(^|\/)(index\.html)?$/.test(anterior.pathname) ? anterior.search.slice(1) : "";
    } catch {
      return "";
    }
  }

  /* ======================================================================
     Título da aba e metadados
     ====================================================================== */
  function atualizarMetadados() {
    const finalidade = imovel.finalidade === "venda" ? "à venda" : "para alugar";
    const resumo = `${rotuloTipo(imovel.tipo)} ${finalidade} · ${imovel.bairro}, ${imovel.cidade} · ${formatarPreco(imovel)}`;

    document.title = `${imovel.titulo} | ${CONFIG.nome}`;
    definirMeta('meta[name="description"]', `${resumo}. ${imovel.descricao.split(". ")[0]}.`);
    definirMeta('meta[property="og:title"]', document.title);
    definirMeta('meta[property="og:description"]', resumo);
    definirMeta('meta[property="og:image"]', urlFoto(imovel.fotos[0], 1200, 630));
  }

  function definirMeta(seletor, valor) {
    const meta = document.querySelector(seletor);
    if (meta) meta.setAttribute("content", valor);
  }

  /* ======================================================================
     Cabeçalho: selos, título, local e preço
     ====================================================================== */
  function preencherCabecalho() {
    $("imovel-selos").innerHTML = `
      <span class="selo selo--${escaparHTML(imovel.finalidade)}">${escaparHTML(rotuloFinalidade(imovel.finalidade))}</span>
      <span class="selo selo--neutro">${escaparHTML(rotuloTipo(imovel.tipo))}</span>
      ${imovel.destaque ? `<span class="selo selo--destaque">${icone("estrela")}Destaque</span>` : ""}`;
    $("imovel-titulo").textContent = imovel.titulo;
    $("imovel-local").textContent = `${imovel.bairro}, ${imovel.cidade}`;
    $("trilha-atual").textContent = imovel.titulo;

    $("imovel-preco-rotulo").textContent = imovel.finalidade === "venda" ? "Valor de venda" : "Aluguel mensal";
    $("imovel-preco").innerHTML = precoHTML(imovel);

    const custos = [];
    if (imovel.condominio) custos.push(["Condomínio", `${formatarMoeda(imovel.condominio)}/mês`]);
    if (imovel.iptu) custos.push(["IPTU", `${formatarMoeda(imovel.iptu)}/ano`]);
    if (imovel.finalidade === "aluguel" && (imovel.condominio || imovel.iptu)) {
      const totalMensal = imovel.preco + (imovel.condominio || 0) + (imovel.iptu || 0) / 12;
      custos.push(["Total mensal estimado", formatarMoeda(Math.round(totalMensal))]);
    }
    if (imovel.finalidade === "venda" && imovel.area) {
      custos.push(["Valor por m²", formatarMoeda(Math.round(imovel.preco / imovel.area))]);
    }
    $("imovel-custos").innerHTML = custos.map(([termo, valor]) => `<div><dt>${termo}</dt><dd>${valor}</dd></div>`).join("");

    // Corações desta página apontam para este imóvel
    document.querySelectorAll("[data-favoritar]").forEach((botao) => {
      botao.dataset.favorito = String(imovel.id);
    });
    sincronizarBotoesFavorito();

    document.querySelectorAll("[data-compartilhar]").forEach((botao) => botao.addEventListener("click", compartilhar));

    // O "Fale conosco" do topo já leva o imóvel na mensagem
    const cta = $("cabecalho-cta");
    if (cta) cta.href = linkWhatsApp(mensagemPadrao());
  }

  function mensagemPadrao() {
    return `Olá! Tenho interesse no imóvel "${imovel.titulo}" (código ${codigoImovel(imovel.id)}). Gostaria de mais informações e de agendar uma visita.`;
  }

  async function compartilhar() {
    const endereco = window.location.href;
    const publicado = window.location.protocol.startsWith("http");
    if (navigator.share && publicado) {
      try {
        await navigator.share({ title: imovel.titulo, text: `${imovel.titulo} · ${formatarPreco(imovel)}`, url: endereco });
      } catch {
        /* a pessoa fechou a janela de compartilhar */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(endereco);
      mostrarAviso("Link do imóvel copiado.");
    } catch {
      mostrarAviso("Não foi possível copiar. Copie o endereço na barra do navegador.");
    }
  }

  /* ======================================================================
     Galeria
     ====================================================================== */
  function montarGaleria() {
    const fotos = imovel.fotos;
    const total = fotos.length;
    const galeria = $("galeria");
    const foto = $("galeria-foto");
    const miniaturas = $("galeria-miniaturas");
    const contador = $("galeria-contador");
    const anuncio = $("galeria-anuncio");
    let atual = 0;

    miniaturas.innerHTML = fotos
      .map(
        (url, i) => `<li><button type="button" class="galeria__miniatura" data-indice="${i}"
          aria-label="Ver foto ${i + 1} de ${total}"${i === 0 ? ' aria-current="true"' : ""}>
          <img src="${urlFoto(url, 240, 160)}" alt="" width="240" height="160" loading="lazy" decoding="async"></button></li>`
      )
      .join("");

    function mostrar(indice, { focarMiniatura = false, anunciar = true } = {}) {
      atual = (indice + total) % total;
      foto.classList.add("galeria__foto--trocando");
      foto.src = urlFoto(fotos[atual], 1200, 800);
      foto.alt = `${imovel.titulo}: foto ${atual + 1} de ${total}`;
      contador.textContent = `${atual + 1} / ${total}`;
      if (anunciar) anuncio.textContent = `Foto ${atual + 1} de ${total}`;

      miniaturas.querySelectorAll("button").forEach((botao, i) => {
        if (i === atual) {
          botao.setAttribute("aria-current", "true");
          revelarMiniatura(botao.parentElement);
          if (focarMiniatura) botao.focus({ preventScroll: true });
        } else {
          botao.removeAttribute("aria-current");
        }
      });
    }

    // Rola só a faixa de miniaturas (nunca a página) até a foto ativa
    function revelarMiniatura(item) {
      const comportamento = reduzirMovimento() ? "auto" : "smooth";
      const inicio = item.offsetLeft;
      const fim = inicio + item.offsetWidth;
      if (inicio < miniaturas.scrollLeft) {
        miniaturas.scrollTo({ left: inicio - 8, behavior: comportamento });
      } else if (fim > miniaturas.scrollLeft + miniaturas.clientWidth) {
        miniaturas.scrollTo({ left: fim - miniaturas.clientWidth + 8, behavior: comportamento });
      }
    }

    foto.addEventListener("load", () => foto.classList.remove("galeria__foto--trocando"));
    foto.addEventListener("error", () => foto.classList.remove("galeria__foto--trocando"));

    miniaturas.addEventListener("click", (e) => {
      const botao = e.target.closest("[data-indice]");
      if (botao) mostrar(Number(botao.dataset.indice));
    });
    $("galeria-anterior").addEventListener("click", () => mostrar(atual - 1));
    $("galeria-proxima").addEventListener("click", () => mostrar(atual + 1));

    // Setas do teclado: funcionam com o foco na galeria ou em nenhum campo
    document.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const alvo = e.target;
      const naGaleria = galeria.contains(alvo);
      const semFoco = alvo === document.body || alvo === document.documentElement || alvo === document;
      if (!naGaleria && !semFoco) return;
      e.preventDefault();
      const focarMiniatura = naGaleria && alvo.classList.contains("galeria__miniatura");
      mostrar(atual + (e.key === "ArrowRight" ? 1 : -1), { focarMiniatura });
    });

    // Arrastar para o lado no celular
    let inicioToque = null;
    foto.parentElement.addEventListener("touchstart", (e) => {
      inicioToque = e.touches.length === 1 ? e.touches[0].clientX : null;
    }, { passive: true });
    foto.parentElement.addEventListener("touchend", (e) => {
      if (inicioToque === null) return;
      const distancia = e.changedTouches[0].clientX - inicioToque;
      if (Math.abs(distancia) > 50) mostrar(atual + (distancia < 0 ? 1 : -1));
      inicioToque = null;
    }, { passive: true });

    if (total < 2) galeria.classList.add("galeria--unica");
    mostrar(0, { anunciar: false });
  }

  /* ======================================================================
     Informações, descrição e características
     ====================================================================== */
  function preencherInformacoes() {
    const fatos = [
      { icone: "area", valor: `${formatarNumero(imovel.area)} m²`, rotulo: imovel.tipo === "terreno" ? "Área do terreno" : "Área útil" },
      imovel.quartos > 0 && { icone: "cama", valor: imovel.quartos, rotulo: plural(imovel.quartos, "Quarto", "Quartos") },
      imovel.banheiros > 0 && { icone: "banheira", valor: imovel.banheiros, rotulo: plural(imovel.banheiros, "Banheiro", "Banheiros") },
      imovel.vagas > 0 && { icone: "carro", valor: imovel.vagas, rotulo: plural(imovel.vagas, "Vaga", "Vagas") },
    ].filter(Boolean);

    $("imovel-fatos").innerHTML = fatos
      .map((f) => `<li class="fato">${icone(f.icone)}<span class="fato__valor">${f.valor}</span><span class="fato__rotulo">${f.rotulo}</span></li>`)
      .join("");

    const publicado = formatarData(imovel.criadoEm);
    $("imovel-publicado").innerHTML = `${icone("calendario")}<span>${publicado ? `Anunciado em ${publicado} · ` : ""}Código ${codigoImovel(imovel.id)}</span>`;

    $("imovel-descricao").textContent = imovel.descricao;
    $("imovel-caracteristicas").innerHTML = (imovel.caracteristicas || [])
      .map((c) => `<li>${icone("check")}<span>${escaparHTML(c)}</span></li>`)
      .join("");
  }

  /* ======================================================================
     Simulador de financiamento (tabela Price)
     ====================================================================== */

  /** Parcela fixa: PMT = PV · i / (1 − (1 + i)^−n). Com juros zero, PV / n. */
  function parcelaPrice(valorFinanciado, taxaMensal, meses) {
    if (taxaMensal === 0) return valorFinanciado / meses;
    return (valorFinanciado * taxaMensal) / (1 - Math.pow(1 + taxaMensal, -meses));
  }

  function montarSimulador() {
    const campos = { entrada: $("sim-entrada"), prazo: $("sim-prazo"), taxa: $("sim-taxa") };
    const saida = {
      parcela: $("sim-parcela"),
      financiado: $("sim-financiado"),
      meses: $("sim-meses"),
      total: $("sim-total"),
      juros: $("sim-juros"),
      custo: $("sim-custo"),
    };
    const ENTRADA_PADRAO = 0.2; // 20%

    $("simulador").hidden = false;
    $("sim-valor").textContent = formatarMoeda(imovel.preco);
    campos.entrada.value = formatarNumero(Math.round(imovel.preco * ENTRADA_PADRAO));

    function atualizarDicaEntrada() {
      const entrada = lerNumero(campos.entrada.value);
      const dica = $("sim-entrada-dica");
      if (entrada == null || entrada >= imovel.preco) {
        dica.textContent = "Valor pago à vista, antes do financiamento";
        return;
      }
      const percentual = (entrada / imovel.preco) * 100;
      dica.textContent = `${percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do valor do imóvel`;
    }

    function validar() {
      const entrada = lerNumero(campos.entrada.value);
      const anos = Number(campos.prazo.value);
      const textoTaxa = campos.taxa.value.replace("%", "").replace(",", ".").trim();
      const taxa = textoTaxa === "" ? NaN : Number(textoTaxa);
      const erros = {};

      if (entrada == null) erros.entrada = "Informe o valor da entrada (pode ser 0).";
      else if (entrada >= imovel.preco) erros.entrada = "A entrada precisa ser menor que o valor do imóvel.";
      if (campos.prazo.value.trim() === "" || !Number.isInteger(anos) || anos < 1 || anos > 35) {
        erros.prazo = "Informe um prazo inteiro entre 1 e 35 anos.";
      }
      if (!Number.isFinite(taxa) || taxa < 0 || taxa > 30) erros.taxa = "Informe uma taxa entre 0 e 30% ao ano.";

      return { entrada, anos, taxa, erros };
    }

    function exibirErros(erros) {
      Object.entries(campos).forEach(([nome, campo]) => {
        const mensagem = erros[nome];
        const caixa = $(`sim-${nome}-erro`);
        caixa.textContent = mensagem || "";
        caixa.hidden = !mensagem;
        if (mensagem) campo.setAttribute("aria-invalid", "true");
        else campo.removeAttribute("aria-invalid");
      });
    }

    function calcular({ focarErro = false, anunciar = true } = {}) {
      const { entrada, anos, taxa, erros } = validar();
      exibirErros(erros);

      const nomesComErro = Object.keys(erros);
      if (nomesComErro.length) {
        Object.values(saida).forEach((campo) => (campo.textContent = "—"));
        if (focarErro) campos[nomesComErro[0]].focus();
        if (anunciar) $("sim-anuncio").textContent = "Corrija os campos destacados para ver a simulação.";
        return;
      }

      const financiado = imovel.preco - entrada;
      const meses = anos * 12;
      const taxaMensal = Math.pow(1 + taxa / 100, 1 / 12) - 1; // taxa anual efetiva → mensal equivalente
      const parcela = parcelaPrice(financiado, taxaMensal, meses);
      const totalParcelas = parcela * meses;

      saida.parcela.textContent = formatarMoeda(parcela, true);
      saida.financiado.textContent = formatarMoeda(financiado);
      saida.meses.textContent = `${meses} meses`;
      saida.total.textContent = formatarMoeda(totalParcelas, true);
      saida.juros.textContent = formatarMoeda(totalParcelas - financiado, true);
      saida.custo.textContent = formatarMoeda(entrada + totalParcelas, true);

      if (anunciar) {
        $("sim-anuncio").textContent = `Parcela estimada de ${formatarMoeda(parcela, true)} por mês, em ${meses} meses.`;
      }
    }

    campos.entrada.addEventListener("input", () => {
      aplicarMascaraMilhar(campos.entrada);
      atualizarDicaEntrada();
    });
    $("form-simulador").addEventListener("change", () => calcular());
    $("form-simulador").addEventListener("submit", (e) => {
      e.preventDefault();
      calcular({ focarErro: true });
    });

    atualizarDicaEntrada();
    calcular({ anunciar: false });
  }

  /* ======================================================================
     Contato pelo WhatsApp
     ====================================================================== */
  function montarContato() {
    const form = $("form-contato");
    const campos = { nome: $("contato-nome"), telefone: $("contato-telefone"), mensagem: $("contato-mensagem") };

    campos.mensagem.value = mensagemPadrao();
    campos.telefone.addEventListener("input", () => aplicarMascaraTelefone(campos.telefone));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nome = campos.nome.value.trim();
      const telefone = campos.telefone.value.trim();
      const mensagem = campos.mensagem.value.trim();
      const digitos = telefone.replace(/\D/g, "").length;

      const erros = {};
      if (nome.length < 2) erros.nome = "Informe seu nome.";
      if (digitos < 10 || digitos > 11) erros.telefone = "Informe um telefone com DDD, como (11) 98765-4321.";
      if (!mensagem) erros.mensagem = "Escreva uma mensagem para o corretor.";

      Object.entries(campos).forEach(([chave, campo]) => {
        const caixa = $(`contato-${chave}-erro`);
        caixa.textContent = erros[chave] || "";
        caixa.hidden = !erros[chave];
        if (erros[chave]) campo.setAttribute("aria-invalid", "true");
        else campo.removeAttribute("aria-invalid");
      });

      const primeiroErro = Object.keys(erros)[0];
      if (primeiroErro) {
        campos[primeiroErro].focus();
        return;
      }

      const linhas = [mensagem, "", `Nome: ${nome}`, `Telefone: ${telefone}`];
      if (window.location.protocol.startsWith("http")) linhas.push(`Anúncio: ${window.location.href}`);
      abrirWhatsApp(linhas.join("\n"));
    });
  }

  /* ======================================================================
     Imóveis semelhantes: mesmo tipo ou mesma cidade (até 3)
     ====================================================================== */
  function montarSemelhantes() {
    const pontuar = (outro) =>
      (outro.tipo === imovel.tipo ? 2 : 0) +
      (outro.cidade === imovel.cidade ? 1.5 : 0) +
      (outro.finalidade === imovel.finalidade ? 1 : 0) -
      Math.min(Math.abs(outro.preco - imovel.preco) / imovel.preco, 1) * 0.5;

    const semelhantes = IMOVEIS.filter((outro) => outro.id !== imovel.id && (outro.tipo === imovel.tipo || outro.cidade === imovel.cidade))
      .sort((a, b) => pontuar(b) - pontuar(a))
      .slice(0, 3);

    if (!semelhantes.length) return;
    $("lista-semelhantes").innerHTML = semelhantes.map((outro) => `<li>${criarCardImovel(outro)}</li>`).join("");
    $("semelhantes").hidden = false;
  }

  /* ======================================================================
     Imóvel não encontrado (id inexistente ou ausente)
     ====================================================================== */
  function mostrarNaoEncontrado() {
    document.title = `Imóvel não encontrado | ${CONFIG.nome}`;
    $("trilha-atual").textContent = "Imóvel não encontrado";
    $("imovel").remove(); // garante um único <h1> na página

    const bloco = document.createElement("section");
    bloco.className = "nao-encontrado";
    bloco.setAttribute("aria-labelledby", "titulo-nao-encontrado");
    bloco.innerHTML = `
      <svg class="ilustracao" viewBox="0 0 160 120" aria-hidden="true" focusable="false">
        <ellipse class="ilustracao__sombra" cx="80" cy="110" rx="62" ry="6"/>
        <path class="ilustracao__parede" d="M30 62 70 30l40 32v44H30z"/>
        <path class="ilustracao__traco" d="M22 66 70 26l48 40M30 62v44h80V62"/>
        <rect class="ilustracao__porta" x="60" y="76" width="20" height="30" rx="2"/>
        <circle class="ilustracao__lupa" cx="116" cy="72" r="17"/>
        <path class="ilustracao__cabo" d="m128.5 84.5 14 14"/>
      </svg>
      <h1 class="nao-encontrado__titulo" id="titulo-nao-encontrado">Imóvel não encontrado</h1>
      <p class="nao-encontrado__texto">O anúncio que você procura pode ter sido vendido, alugado ou retirado do ar. Que tal ver as outras opções disponíveis?</p>
      <a class="botao botao--primario" href="${escaparHTML($("trilha-busca").getAttribute("href"))}">Voltar para o catálogo</a>`;
    $("semelhantes").before(bloco);

    // Sugere os destaques para a visita não terminar aqui
    const sugestoes = IMOVEIS.filter((i) => i.destaque).slice(0, 3);
    if (sugestoes.length) {
      $("titulo-semelhantes").textContent = "Talvez você goste destes";
      $("lista-semelhantes").innerHTML = sugestoes.map((i) => `<li>${criarCardImovel(i)}</li>`).join("");
      $("semelhantes").hidden = false;
    }
  }
})();
