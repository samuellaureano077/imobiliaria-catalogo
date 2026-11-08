# Morada Nova Imóveis — catálogo de imóveis

Site de imobiliária com catálogo filtrável, página de detalhes, favoritos, simulador de financiamento e contato pelo WhatsApp, feito com HTML, CSS e JavaScript puros.

![Preview](preview.png)

> Tire um print da página inicial aberta no navegador e salve na raiz do projeto com o nome `preview.png` para a imagem aparecer aqui.

A Morada Nova é uma imobiliária fictícia, criada para portfólio. Nomes, endereços, telefone e CRECI são de exemplo, e as fotos são imagens de exemplo do [Unsplash](https://unsplash.com), de uso gratuito ([licença](https://unsplash.com/license)).

---

## Funcionalidades

**Catálogo (`index.html`)**

- Busca rápida no topo: Comprar ou Alugar, cidade e tipo de imóvel.
- Filtros por finalidade, tipo, cidade, faixa de preço, número mínimo de quartos (1+ a 4+) e "só favoritos", com botão "Limpar filtros".
- Ordenação por mais recentes, menor preço, maior preço e maior área.
- **Filtros na URL:** cada mudança atualiza o endereço da página (`?finalidade=venda&cidade=Campinas...`). Dá para copiar o link e mandar para alguém, que vai abrir a mesma busca.
- Etiquetas com os filtros ativos, que podem ser removidas uma a uma.
- Contador de resultados anunciado para leitores de tela.
- Faixa "Imóveis em destaque" com rolagem lateral e setas.
- Estado vazio com orientação e atalho para limpar os filtros.
- Seções "Sobre a imobiliária" e "Anuncie seu imóvel" (que abre o WhatsApp com a mensagem pronta).
- No celular, os filtros ficam recolhidos atrás do botão **Filtros**.

**Página do imóvel (`imovel.html?id=1`)**

- Trilha de navegação que volta para a busca anterior com os mesmos filtros.
- Galeria com foto principal e miniaturas; setas na tela, setas ← → do teclado e gesto de arrastar no celular.
- Preço, condomínio, IPTU, total mensal estimado (aluguel) e valor do m² (venda).
- Principais informações com ícones, descrição e lista de características.
- **Simulador de financiamento** (só em imóveis à venda): entrada (20% por padrão), prazo e taxa de juros anual (10,5% por padrão). Calcula a parcela pela tabela Price, o total pago e os juros, com validação dos campos.
- Formulário de contato (nome, telefone e mensagem já preenchida com o título e o código do imóvel) que abre o WhatsApp.
- Botões de favoritar e compartilhar.
- Até 3 imóveis semelhantes (mesmo tipo ou mesma cidade).
- Página amigável de "Imóvel não encontrado" quando o `id` não existe.

**Em todo o site**

- Favoritos guardados no navegador (`localStorage`), com contador no cabeçalho.
- Layout pensado primeiro para o celular: sem rolagem lateral a partir de 360 px e bem aproveitado em 1440 px.
- Acessibilidade: landmarks semânticos, um único `h1` por página, textos alternativos, rótulo em todos os campos, foco visível, contraste AA, `aria-pressed` nos corações, `aria-live` nos resultados e respeito à preferência por menos movimento (`prefers-reduced-motion`).
- SEO: `lang="pt-BR"`, título e descrição em cada página, tags Open Graph, e o título da aba muda para o nome do imóvel.

## Tecnologias

- HTML5 semântico
- CSS3 (custom properties, Grid, Flexbox, `scroll-snap`, `clamp()`), sem frameworks
- JavaScript puro (ES2020), sem bibliotecas e sem etapa de build
- Google Fonts: DM Serif Display (títulos) e DM Sans (textos)
- Ícones em SVG escritos direto no código

## Como rodar

Não precisa instalar nada.

1. Baixe ou clone o repositório.
2. Dê dois cliques no arquivo `index.html`.

Se preferir um servidor local (é o jeito mais parecido com o site publicado):

```bash
npx serve .
```

e abra o endereço que aparecer no terminal (normalmente `http://localhost:3000`).

> Alguns navegadores limitam o armazenamento quando a página é aberta direto do disco (`file://`). Se os favoritos não passarem de uma página para outra, use o `npx serve .` ou o GitHub Pages.

## Estrutura

```
imobiliaria-catalogo/
├── index.html        catálogo
├── imovel.html       página de detalhes (lê o ?id= da URL)
├── css/
│   └── style.css     estilos e variáveis de cor/fonte
└── js/
    ├── data.js       lista de imóveis
    ├── utils.js      configurações, formatação, favoritos, WhatsApp e card
    ├── catalogo.js   filtros, ordenação e destaques
    └── imovel.js     galeria, simulador, contato e semelhantes
```

## Como personalizar

### Nome, contato e WhatsApp

Abra `js/utils.js`. Logo no começo está o objeto `CONFIG`:

```js
const CONFIG = {
  nome: "Morada Nova Imóveis",
  whatsapp: "5511900000000", // troque pelo seu número (DDI + DDD + número)
  endereco: "Rua dos Ipês Amarelos, 845 · Vila Serena, Campinas/SP",
  horario: "Seg. a sex., das 9h às 18h · Sáb., das 9h às 13h",
  creci: "CRECI 00000-J",
  prefixoCodigo: "MN", // código exibido nos anúncios: MN-001, MN-002…
};
```

- `whatsapp`: só números, com 55 (Brasil) + DDD + número. Ex.: `5519987654321`. O telefone do rodapé é gerado a partir dele.
- Esses valores aparecem no rodapé, nas mensagens do WhatsApp e no título da página do imóvel.

O nome também está escrito no logotipo (cabeçalho e rodapé) e nas tags `<title>` e `<meta>` dos dois arquivos HTML. Use o "Localizar e substituir" do seu editor para trocar "Morada Nova" em todos os arquivos de uma vez.

### Cores e fontes

Tudo fica no começo de `css/style.css`, dentro de `:root`:

```css
--cor-primaria: #0f2a44;   /* azul-marinho */
--cor-acento: #b5541f;     /* terracota */
--cor-fundo: #f6f3ef;      /* cinza quente */
--fonte-titulo: "DM Serif Display", Georgia, serif;
--fonte-texto: "DM Sans", system-ui, sans-serif;
```

Se mudar a cor primária ou de acento, ajuste também os canais RGB logo abaixo (`--rgb-primaria`, `--rgb-acento`), usados nas transparências. Para trocar as fontes, altere o link do Google Fonts no `<head>` dos dois HTML e as variáveis `--fonte-*`.

O ícone da aba (favicon) é um SVG dentro da tag `<link rel="icon">` de cada HTML; as cores dele ficam ali (`%230f2a44` é o mesmo que `#0f2a44`).

### Adicionar um imóvel

Abra `js/data.js`, copie um dos blocos `{ ... }`, cole no fim da lista (antes do `];`) e ajuste os campos:

```js
{
  id: 15,                                   // número único, nunca repetido
  titulo: "Casa com piscina perto do parque",
  tipo: "casa",                             // "casa" | "apartamento" | "terreno" | "sala"
  finalidade: "venda",                      // "venda" | "aluguel"
  cidade: "Campinas",                       // aparece sozinha no filtro de cidades
  bairro: "Vila Serena",
  preco: 950000,                            // venda: valor total; aluguel: valor mensal. Só números
  condominio: 450,                          // mensal (opcional: apague a linha se não tiver)
  iptu: 2800,                               // anual (opcional)
  area: 230,                                // em m²
  quartos: 3,                               // use 0 em terrenos e salas
  banheiros: 2,
  vagas: 2,
  descricao: "Duas ou três frases contando o que o imóvel tem de melhor.",
  caracteristicas: ["Piscina", "Varanda gourmet", "Portaria 24h"],
  fotos: [                                  // 4 ou 5 fotos; a primeira é a capa
    "img/casa-15-fachada.jpg",
    "img/casa-15-sala.jpg",
    "img/casa-15-cozinha.jpg",
    "img/casa-15-quarto.jpg",
  ],
  destaque: false,                          // true = aparece em "Imóveis em destaque"
  criadoEm: "2026-11-04",                   // data do anúncio (AAAA-MM-DD)
},
```

Dicas:

- As fotos podem ser endereços da internet ou arquivos do projeto (crie uma pasta `img/`). Prefira imagens na proporção 3:2 com pelo menos 1200 px de largura.
- Para criar um tipo novo (ex.: "chácara"), use `tipo: "chacara"` no imóvel e acrescente `chacara: "Chácara"` no objeto `TIPOS` em `js/utils.js`.
- Cuidado com a vírgula entre um bloco e outro: é o erro mais comum. Se o site ficar vazio, abra o console do navegador (F12) para ver a linha do problema.

## Como publicar grátis no GitHub Pages

1. Crie uma conta em [github.com](https://github.com), se ainda não tiver.
2. Clique em **New repository**, dê o nome `imobiliaria-catalogo`, deixe como **Public** e crie.
3. Envie os arquivos: na página do repositório, clique em **Add file → Upload files**, arraste todo o conteúdo da pasta (mantendo as pastas `css` e `js`) e clique em **Commit changes**.
   Se preferir o terminal:
   ```bash
   git init
   git add .
   git commit -m "Primeira versão do catálogo"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/imobiliaria-catalogo.git
   git push -u origin main
   ```
4. No repositório, vá em **Settings → Pages**.
5. Em **Build and deployment**, escolha **Deploy from a branch**, selecione a branch `main` e a pasta `/ (root)`, e clique em **Save**.
6. Em um ou dois minutos o site estará em `https://SEU-USUARIO.github.io/imobiliaria-catalogo/`.

Depois de publicar, troque a imagem das tags `og:image` pelo endereço de um print do seu site, para o link ficar bonito quando for compartilhado no WhatsApp e nas redes sociais.

## Ideias para evoluir

1. **Mapa dos imóveis:** adicione `latitude` e `longitude` em cada imóvel e mostre a localização aproximada com [Leaflet](https://leafletjs.com) + OpenStreetMap, tanto na página de detalhes quanto numa visão "lista + mapa" no catálogo.
2. **Painel administrativo:** uma tela protegida por login para cadastrar, editar e arquivar imóveis com upload de fotos, sem precisar mexer no `data.js`.
3. **Backend com banco de dados:** mover os imóveis para uma API (Node.js + Express, ou um serviço como Firebase ou Supabase), com paginação, busca por texto e filtros feitos no servidor.
4. **Comparador de imóveis:** permitir marcar até 3 imóveis e ver as características lado a lado numa tabela (preço, área, quartos, custo mensal, valor do m²).
5. **Agendamento de visitas e alertas:** um calendário com os horários livres do corretor e um cadastro de alerta por e-mail para avisar quando entrar um imóvel que combine com a busca salva.

---

Feito com HTML, CSS e JavaScript puros. Sinta-se à vontade para usar como base dos seus projetos.
