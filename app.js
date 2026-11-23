const CHAVE_TEMA = "biblioteca:tema";
const CHAVE_LISTA = "biblioteca:leitura";
const CHAVE_FAVORITOS = "biblioteca-favoritos";
const CHAVE_HISTORICO = "biblioteca:historico-pesquisas";

function escaparXml(texto) {
    return texto.replace(/[<>&'"]/g, (caracter) => ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        "\"": "&quot;"
    })[caracter]);
}

function criarCapaFallback(titulo, autor) {
    const linhas = [];
    let linha = "";

    titulo.split(/\s+/).forEach((palavra) => {
        if (linha && `${linha} ${palavra}`.length > 16) {
            linhas.push(linha);
            linha = palavra;
        } else {
            linha = linha ? `${linha} ${palavra}` : palavra;
        }
    });
    if (linha) {
        linhas.push(linha);
    }

    const tituloSvg = linhas.slice(0, 4)
        .map((texto, indice) => `<tspan x="30" dy="${indice === 0 ? 0 : 34}">${escaparXml(texto)}</tspan>`)
        .join("");
    const autorSvg = escaparXml(autor);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="380" viewBox="0 0 280 380"><rect width="280" height="380" fill="#1f4e5f"/><rect x="16" y="16" width="248" height="348" fill="none" stroke="#e0b875" stroke-width="2"/><circle cx="228" cy="72" r="44" fill="#e0b875" opacity=".16"/><text x="30" y="58" fill="#e0b875" font-family="Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="2">BIBLIOTECA DO BAIRRO</text><text x="30" y="172" fill="#ffffff" font-family="Georgia, serif" font-size="26" font-weight="700">${tituloSvg}</text><line x1="30" y1="300" x2="95" y2="300" stroke="#e0b875" stroke-width="3"/><text x="30" y="330" fill="#e8efec" font-family="Arial, sans-serif" font-size="13">${autorSvg}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function definirCapa(imagem, titulo, autor, url) {
    const fallback = criarCapaFallback(titulo, autor);
    imagem.alt = `Capa de ${titulo}`;
    imagem.decoding = "async";
    imagem.addEventListener("error", () => {
        imagem.src = fallback;
    }, { once: true });
    imagem.src = url || fallback;
}

// Tema claro/escuro
const preferenciaSistema = window.matchMedia("(prefers-color-scheme: dark)");
const botoesTema = document.querySelectorAll("[data-tema-botao]");
const botoesSistema = document.querySelectorAll("[data-seguir-sistema]");
let temaManual = false;

function aplicarTema(escuro) {
    document.body.classList.toggle("escuro", escuro);
    botoesTema.forEach((botao) => {
        botao.setAttribute("aria-pressed", String(escuro));
        botao.textContent = escuro ? "Tema claro" : "Tema escuro";
    });
}

try {
    const temaGuardado = localStorage.getItem(CHAVE_TEMA);
    temaManual = temaGuardado === "claro" || temaGuardado === "escuro";
    aplicarTema(temaManual ? temaGuardado === "escuro" : preferenciaSistema.matches);
} catch (erro) {
    console.error("Não foi possível ler o tema guardado.", erro);
    aplicarTema(preferenciaSistema.matches);
}

botoesTema.forEach((botao) => {
    botao.addEventListener("click", () => {
        const escuro = !document.body.classList.contains("escuro");
        temaManual = true;
        aplicarTema(escuro);
        try {
            localStorage.setItem(CHAVE_TEMA, escuro ? "escuro" : "claro");
        } catch (erro) {
            console.error("Não foi possível guardar o tema.", erro);
        }
    });
});

botoesSistema.forEach((botao) => {
    botao.addEventListener("click", () => {
        temaManual = false;
        aplicarTema(preferenciaSistema.matches);
        try {
            localStorage.removeItem(CHAVE_TEMA);
        } catch (erro) {
            console.error("Não foi possível remover a preferência de tema.", erro);
        }
    });
});

preferenciaSistema.addEventListener("change", (evento) => {
    if (!temaManual) {
        aplicarTema(evento.matches);
    }
});

// Destaques, eventos, pesquisa e sugestões da página inicial
const livroDestaque = document.querySelector("#livro-destaque");

if (livroDestaque) {
    const tituloDestaque = document.querySelector("#titulo-destaque");
    const estadoDestaque = document.querySelector("#estado-destaque");
    const capaDestaque = livroDestaque.querySelector(".capa");
    const verMaisDestaque = document.querySelector("#ver-mais-destaque");

    tituloDestaque.textContent = "Memorial do Convento";
    definirCapa(capaDestaque, tituloDestaque.textContent, "José Saramago", capaDestaque.dataset.capaUrl);
    verMaisDestaque.href = "/catalogo?autor=Jose%20Saramago";
    const estadosLivro = {
        disponivel: "Disponível",
        emprestado: "Emprestado"
    };
    estadoDestaque.textContent = `Estado: ${estadosLivro[livroDestaque.dataset.estado] || livroDestaque.dataset.estado}`;

    document.querySelectorAll(".cartao.livro:not(#livro-destaque) .capa").forEach((imagem) => {
        const livro = imagem.closest(".livro");
        const titulo = livro.querySelector("h3").textContent;
        const autor = livro.querySelector("p").textContent;
        definirCapa(imagem, titulo, autor, imagem.dataset.capaUrl);
    });

    document.querySelectorAll(".livro[data-estado='emprestado']").forEach((livro) => {
        const botaoReservar = livro.querySelector(".reservar");
        if (!botaoReservar) {
            return;
        }

        const partesData = (livro.dataset.devolucao || "").split("-");
        const dataDevolucao = partesData.length === 3
            ? `${partesData[2]}/${partesData[1]}/${partesData[0]}`
            : "data a confirmar";
        botaoReservar.textContent = `Disponível a ${dataDevolucao}`;
        botaoReservar.disabled = true;
    });
}

document.querySelectorAll(".reservar:not(:disabled)").forEach((botao) => {
    botao.addEventListener("click", () => {
        botao.textContent = "Reservado";
        botao.disabled = true;
    });
});

const campoPesquisaLocal = document.querySelector("#campo-pesquisa-local");
const textoPesquisa = document.querySelector("#texto-pesquisa");

if (campoPesquisaLocal && textoPesquisa) {
    campoPesquisaLocal.addEventListener("input", (evento) => {
        textoPesquisa.textContent = evento.target.value;
    });
}

const campoSugestao = document.querySelector("#sugestao");
const contadorSugestao = document.querySelector("#contador-sugestao");

if (campoSugestao && contadorSugestao) {
    campoSugestao.addEventListener("input", (evento) => {
        const tamanho = evento.target.value.length;
        contadorSugestao.textContent = `${tamanho} / 200`;
        contadorSugestao.classList.toggle("excesso", tamanho > 180);
    });
}

// Menu e tecla Escape
const botaoMenu = document.querySelector("#botao-menu");
const navegacao = document.querySelector("#navegacao-principal");

if (botaoMenu && navegacao) {
    botaoMenu.addEventListener("click", () => {
        const aberta = navegacao.classList.toggle("aberta");
        botaoMenu.setAttribute("aria-expanded", String(aberta));
    });
}

document.addEventListener("keydown", (evento) => {
    if (evento.key !== "Escape") {
        return;
    }

    if (navegacao && navegacao.classList.contains("aberta")) {
        navegacao.classList.remove("aberta");
        botaoMenu.setAttribute("aria-expanded", "false");
    }

    if (campoPesquisaLocal) {
        campoPesquisaLocal.value = "";
        campoPesquisaLocal.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (campoPesquisaCatalogo) {
        campoPesquisaCatalogo.value = "";
        campoPesquisaCatalogo.dispatchEvent(new Event("input", { bubbles: true }));
    }
});

// Progresso de leitura e cor de destaque
const barraLeitura = document.querySelector("#barra-leitura");
const barraProgresso = document.querySelector("#progresso");
const textoProgresso = document.querySelector("#texto-progresso");
const seletorCor = document.querySelector("#cor-destaque");
const folhaDinamica = document.createElement("style");
let progressoAtual = barraLeitura ? `${barraLeitura.value}%` : "0%";
let corAtual = seletorCor ? seletorCor.value : "";

if ((barraLeitura && barraProgresso && textoProgresso) || seletorCor) {
    document.head.append(folhaDinamica);
}

function atualizarVariaveisDinamicas() {
    const variaveis = [];
    if (barraLeitura) {
        variaveis.push(`--progresso-leitura: ${progressoAtual};`);
    }
    if (seletorCor) {
        variaveis.push(`--cor-destaque: ${corAtual};`);
    }
    const declaracoes = variaveis.join(" ");
    folhaDinamica.textContent = `body { ${declaracoes} } body.escuro { ${declaracoes} }`;
}

if (barraLeitura && barraProgresso && textoProgresso) {
    barraLeitura.addEventListener("input", (evento) => {
        const valor = Number(evento.target.value);
        progressoAtual = `${valor}%`;
        atualizarVariaveisDinamicas();
        barraProgresso.classList.toggle("completo", valor === 100);
        textoProgresso.textContent = `${valor}% lido`;
    });
}

if (seletorCor) {
    seletorCor.addEventListener("input", (evento) => {
        corAtual = evento.target.value;
        atualizarVariaveisDinamicas();
    });
}

// Lista de leitura
const formularioLeitura = document.querySelector("#formulario-leitura");
const campoLivro = document.querySelector("#novo-livro");
const listaLeitura = document.querySelector("#lista-leitura");
const resumoLeitura = document.querySelector("#resumo-leitura");
const mensagemLeitura = document.querySelector("#mensagem-leitura");
let leitura = [];

function atualizarResumoLeitura() {
    const lidos = leitura.filter((livro) => livro.lido).length;
    resumoLeitura.textContent = leitura.length === 0
        ? "A lista está vazia."
        : `${leitura.length} ${leitura.length === 1 ? "livro" : "livros"} · ${lidos} ${lidos === 1 ? "lido" : "lidos"}`;
}

function guardarListaLeitura() {
    try {
        localStorage.setItem(CHAVE_LISTA, JSON.stringify(leitura));
        return true;
    } catch (erro) {
        console.error("Não foi possível guardar a lista de leitura.", erro);
        mensagemLeitura.textContent = "Não foi possível guardar a lista neste navegador.";
        return false;
    }
}

function criarBotaoLista(texto, acao, rotulo, desativado = false) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao botao-secundario botao-pequeno";
    botao.textContent = texto;
    botao.dataset.acao = acao;
    botao.setAttribute("aria-label", rotulo);
    botao.disabled = desativado;
    return botao;
}

function desenharListaLeitura() {
    listaLeitura.replaceChildren();

    if (leitura.length === 0) {
        const vazio = document.createElement("li");
        vazio.className = "vazio";
        vazio.textContent = "Adiciona um livro para começar.";
        listaLeitura.append(vazio);
        atualizarResumoLeitura();
        return;
    }

    leitura.forEach((livro, indice) => {
        const item = document.createElement("li");
        item.dataset.indice = String(indice);

        const titulo = document.createElement("span");
        titulo.className = "titulo-lista";
        titulo.textContent = livro.titulo;
        if (livro.lido) {
            titulo.classList.add("lido");
        }

        const acoes = document.createElement("div");
        acoes.className = "acoes-item";
        acoes.append(
            criarBotaoLista(
                livro.lido ? "Marcar por ler" : "Marcar lido",
                "alternar-lido",
                `${livro.lido ? "Marcar" : "Marcar"} ${livro.titulo} ${livro.lido ? "por ler" : "como lido"}`
            ),
            criarBotaoLista("↑", "subir", `Mover ${livro.titulo} para cima`, indice === 0),
            criarBotaoLista("↓", "descer", `Mover ${livro.titulo} para baixo`, indice === leitura.length - 1),
            criarBotaoLista("Remover", "remover", `Remover ${livro.titulo}`)
        );

        item.append(titulo, acoes);
        listaLeitura.append(item);
    });

    atualizarResumoLeitura();
}

function atualizarIndicesLista() {
    [...listaLeitura.children].forEach((item, indice) => {
        item.dataset.indice = String(indice);
        const botoes = item.querySelectorAll("button[data-acao]");
        botoes[1].disabled = indice === 0;
        botoes[2].disabled = indice === leitura.length - 1;
    });
    atualizarResumoLeitura();
}

if (formularioLeitura && campoLivro && listaLeitura && resumoLeitura && mensagemLeitura) {
    try {
        const guardada = JSON.parse(localStorage.getItem(CHAVE_LISTA) || "[]");
        if (Array.isArray(guardada)) {
            leitura = guardada
                .filter((livro) => livro && typeof livro.titulo === "string" && livro.titulo.trim())
                .map((livro) => ({ titulo: livro.titulo.trim(), lido: livro.lido === true }));
        }
    } catch (erro) {
        console.error("Não foi possível ler a lista guardada.", erro);
        mensagemLeitura.textContent = "A lista guardada não pôde ser lida.";
    }

    formularioLeitura.addEventListener("submit", (evento) => {
        evento.preventDefault();
        const titulo = campoLivro.value.trim();
        if (!titulo) {
            return;
        }

        leitura.push({ titulo, lido: false });
        campoLivro.value = "";
        mensagemLeitura.textContent = "Livro adicionado.";
        guardarListaLeitura();
        desenharListaLeitura();
    });

    listaLeitura.addEventListener("click", (evento) => {
        const botao = evento.target.closest("button[data-acao]");
        if (!botao || !listaLeitura.contains(botao)) {
            return;
        }

        const item = botao.closest("li[data-indice]");
        if (!item) {
            return;
        }

        const indice = Number(item.dataset.indice);
        const acao = botao.dataset.acao;

        if (acao === "alternar-lido") {
            leitura[indice].lido = !leitura[indice].lido;
        } else if (acao === "subir" && indice > 0) {
            [leitura[indice - 1], leitura[indice]] = [leitura[indice], leitura[indice - 1]];
        } else if (acao === "descer" && indice < leitura.length - 1) {
            [leitura[indice], leitura[indice + 1]] = [leitura[indice + 1], leitura[indice]];
        } else if (acao === "remover") {
            leitura.splice(indice, 1);
            item.remove();
            mensagemLeitura.textContent = "";
            guardarListaLeitura();
            if (leitura.length === 0) {
                desenharListaLeitura();
            } else {
                atualizarIndicesLista();
            }
            return;
        } else {
            return;
        }

        mensagemLeitura.textContent = "";
        guardarListaLeitura();
        desenharListaLeitura();
    });

    document.querySelector("#limpar-lista").addEventListener("click", () => {
        leitura = [];
        mensagemLeitura.textContent = "Lista limpa.";
        guardarListaLeitura();
        desenharListaLeitura();
    });

    desenharListaLeitura();
}

// Inscrição no clube
const formularioClube = document.querySelector("#formulario-clube");
const nomeClube = document.querySelector("#clube-nome");
const mensagemClube = document.querySelector("#mensagem-clube");

if (formularioClube && nomeClube && mensagemClube) {
    nomeClube.addEventListener("input", () => {
        const partes = nomeClube.value.trim().split(/\s+/);
        nomeClube.setCustomValidity(
            partes.length >= 2 && partes[0] && partes[1]
                ? ""
                : "Escreve pelo menos o nome e o apelido."
        );
    });

    formularioClube.addEventListener("submit", (evento) => {
        evento.preventDefault();
        const dados = new FormData(formularioClube);
        const nomeCompleto = String(dados.get("nome") || "").trim();
        const primeiroNome = nomeCompleto.split(/\s+/)[0];
        const clube = String(dados.get("clube") || "");

        mensagemClube.textContent = `Obrigado, ${primeiroNome}! Inscrição no clube ${clube}.`;
        formularioClube.reset();
        nomeClube.setCustomValidity("");
        nomeClube.focus();
    });
}

// Catálogo, filtros, favoritos e histórico de pesquisas
const listaLivros = document.querySelector("#lista-livros");
const campoPesquisaCatalogo = document.querySelector("#campo-pesquisa");

if (listaLivros && campoPesquisaCatalogo) {
    const formularioPesquisa = document.querySelector("#formulario-pesquisa");
    const modeloLivro = document.querySelector("#modelo-livro");
    const resumoCatalogo = document.querySelector("#resumo-catalogo");
    const livroMaisAntigo = document.querySelector("#livro-mais-antigo");
    const mensagemCatalogo = document.querySelector("#mensagem-catalogo");
    const botaoDisponiveis = document.querySelector("#alternar-disponiveis");
    const listaPesquisas = document.querySelector("#lista-pesquisas");
    const botaoLimparPesquisas = document.querySelector("#limpar-pesquisas");
    const formularioInscricao = document.querySelector("#formulario-inscricao");
    const mensagemInscricao = document.querySelector("#mensagem-inscricao");
    let livros = [];
    let mostrarApenasDisponiveis = false;
    let favoritos = [];
    let historico = [];

    function lerListaGuardada(chave) {
        try {
            const valor = JSON.parse(localStorage.getItem(chave) || "[]");
            return Array.isArray(valor) ? valor : [];
        } catch (erro) {
            console.error(`Não foi possível ler ${chave}.`, erro);
            mensagemCatalogo.textContent = "Não foi possível ler os dados guardados neste navegador.";
            mensagemCatalogo.dataset.tipo = "acao";
            return [];
        }
    }

    favoritos = lerListaGuardada(CHAVE_FAVORITOS)
        .filter((titulo) => typeof titulo === "string");
    historico = lerListaGuardada(CHAVE_HISTORICO)
        .filter((termo) => typeof termo === "string" && termo.trim())
        .slice(0, 5);

    function filtrarLivros() {
        const termo = campoPesquisaCatalogo.value.trim().toLocaleLowerCase("pt");
        let visiveis = 0;

        [...listaLivros.children].forEach((item) => {
            const livro = livros[Number(item.dataset.indice)];
            const texto = `${livro.titulo} ${livro.autor}`.toLocaleLowerCase("pt");
            const corresponde = texto.includes(termo) &&
                (!mostrarApenasDisponiveis || livro.estado === "disponivel");
            item.hidden = !corresponde;
            if (corresponde) {
                visiveis++;
            }
        });

        resumoCatalogo.textContent = `${livros.length} ${livros.length === 1 ? "livro" : "livros"} no catálogo · ${visiveis} ${visiveis === 1 ? "resultado" : "resultados"}`;
        if (visiveis === 0) {
            mensagemCatalogo.textContent = "Não foram encontrados livros com esses critérios.";
        } else if (mensagemCatalogo.dataset.tipo !== "acao") {
            mensagemCatalogo.textContent = "";
        }
    }

    function atualizarBotaoFavorito(livro, item) {
        const botao = item.querySelector(".guardar-livro");
        const guardado = favoritos.includes(livro.titulo);
        botao.textContent = guardado ? "Guardado" : "Guardar";
        botao.setAttribute("aria-pressed", String(guardado));
    }

    function desenharLivro(livro, indice) {
        const item = modeloLivro.content.firstElementChild.cloneNode(true);
        item.dataset.indice = String(indice);
        item.dataset.estado = livro.estado;
        item.classList.toggle("emprestado", livro.estado === "emprestado");
        definirCapa(item.querySelector(".livro-capa"), livro.titulo, livro.autor, livro.capa);
        item.querySelector(".livro-titulo").textContent = livro.titulo;
        item.querySelector(".livro-autor").textContent = livro.autor;
        item.querySelector(".livro-ano").textContent = String(livro.ano);
        item.querySelector(".aviso-emprestado").hidden = livro.estado !== "emprestado";

        const botaoEmprestar = item.querySelector(".emprestar-livro");
        botaoEmprestar.disabled = livro.estado === "emprestado";
        botaoEmprestar.textContent = livro.estado === "emprestado" ? "Emprestado" : "Emprestar";
        atualizarBotaoFavorito(livro, item);
        listaLivros.append(item);
    }

    function atualizarHistorico() {
        listaPesquisas.replaceChildren();
        historico.forEach((termo) => {
            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "chip";
            botao.textContent = termo;
            botao.dataset.termo = termo;
            listaPesquisas.append(botao);
        });
    }

    function guardarHistorico() {
        try {
            localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
            return true;
        } catch (erro) {
            console.error("Não foi possível guardar o histórico de pesquisas.", erro);
            mensagemCatalogo.textContent = "Não foi possível guardar o histórico neste navegador.";
            mensagemCatalogo.dataset.tipo = "acao";
            return false;
        }
    }

    campoPesquisaCatalogo.addEventListener("input", filtrarLivros);

    formularioPesquisa.addEventListener("submit", (evento) => {
        evento.preventDefault();
        const termo = campoPesquisaCatalogo.value.trim();
        if (!termo) {
            return;
        }

        historico = [termo, ...historico.filter((anterior) =>
            anterior.toLocaleLowerCase("pt") !== termo.toLocaleLowerCase("pt")
        )].slice(0, 5);
        atualizarHistorico();
        if (guardarHistorico()) {
            mensagemCatalogo.dataset.tipo = "";
        }
        filtrarLivros();
    });

    listaPesquisas.addEventListener("click", (evento) => {
        const botao = evento.target.closest("button[data-termo]");
        if (!botao) {
            return;
        }

        campoPesquisaCatalogo.value = botao.dataset.termo;
        campoPesquisaCatalogo.dispatchEvent(new Event("input", { bubbles: true }));
    });

    botaoLimparPesquisas.addEventListener("click", () => {
        historico = [];
        atualizarHistorico();
        try {
            localStorage.removeItem(CHAVE_HISTORICO);
            mensagemCatalogo.textContent = "Histórico limpo.";
            mensagemCatalogo.dataset.tipo = "acao";
        } catch (erro) {
            console.error("Não foi possível limpar o histórico.", erro);
            mensagemCatalogo.textContent = "Não foi possível limpar o histórico neste navegador.";
            mensagemCatalogo.dataset.tipo = "acao";
        }
    });

    botaoDisponiveis.addEventListener("click", () => {
        mostrarApenasDisponiveis = !mostrarApenasDisponiveis;
        botaoDisponiveis.setAttribute("aria-pressed", String(mostrarApenasDisponiveis));
        mensagemCatalogo.dataset.tipo = "";
        filtrarLivros();
    });

    listaLivros.addEventListener("click", (evento) => {
        const botao = evento.target.closest("button[data-acao]");
        if (!botao) {
            return;
        }

        const item = botao.closest("li[data-indice]");
        if (!item) {
            return;
        }

        const livro = livros[Number(item.dataset.indice)];
        if (botao.dataset.acao === "guardar") {
            favoritos = favoritos.includes(livro.titulo)
                ? favoritos.filter((titulo) => titulo !== livro.titulo)
                : [...favoritos, livro.titulo];
            atualizarBotaoFavorito(livro, item);
            try {
                localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(favoritos));
            } catch (erro) {
                console.error("Não foi possível guardar os favoritos.", erro);
                mensagemCatalogo.textContent = "Não foi possível guardar os favoritos neste navegador.";
                mensagemCatalogo.dataset.tipo = "acao";
            }
        } else if (botao.dataset.acao === "emprestar" && livro.estado === "disponivel") {
            livro.estado = "emprestado";
            item.dataset.estado = livro.estado;
            item.classList.add("emprestado");
            item.querySelector(".aviso-emprestado").hidden = false;
            botao.disabled = true;
            botao.textContent = "Emprestado";
            mensagemCatalogo.textContent = `“${livro.titulo}” foi emprestado.`;
            mensagemCatalogo.dataset.tipo = "acao";
        }

        filtrarLivros();
    });

    formularioInscricao.addEventListener("submit", (evento) => {
        evento.preventDefault();
        const dados = new FormData(formularioInscricao);
        const nome = String(dados.get("nome") || "").trim();
        mensagemInscricao.textContent = `Obrigado pela inscrição, ${nome}!`;
        formularioInscricao.reset();
    });

    atualizarHistorico();
    const autorInicial = new URLSearchParams(window.location.search).get("autor");
    if (autorInicial) {
        campoPesquisaCatalogo.value = autorInicial;
    }

    fetch("livros.json")
        .then((resposta) => {
            if (!resposta.ok) {
                throw new Error(`O servidor respondeu com o estado ${resposta.status}.`);
            }
            return resposta.json();
        })
        .then((dados) => {
            if (!Array.isArray(dados) || !dados.every((livro) =>
                typeof livro.titulo === "string" &&
                typeof livro.autor === "string" &&
                Number.isInteger(livro.ano) &&
                typeof livro.capa === "string" &&
                typeof livro.disponivel === "boolean"
            )) {
                throw new Error("O ficheiro não contém uma lista válida de livros.");
            }

            livros = dados.map((livro) => ({
                titulo: livro.titulo,
                autor: livro.autor,
                ano: livro.ano,
                capa: livro.capa,
                estado: livro.disponivel ? "disponivel" : "emprestado"
            }));

            listaLivros.replaceChildren();
            livros.forEach(desenharLivro);
            if (livros.length > 0) {
                const maisAntigo = livros.reduce((antigo, livro) =>
                    livro.ano < antigo.ano ? livro : antigo
                );
                livroMaisAntigo.textContent = `Livro mais antigo: ${maisAntigo.titulo} (${maisAntigo.ano})`;
            }

            mensagemCatalogo.dataset.tipo = "";
            filtrarLivros();
        })
        .catch((erro) => {
            console.error("Não foi possível carregar o catálogo.", erro);
            mensagemCatalogo.textContent = `Não foi possível carregar o catálogo. ${erro.message}`;
            mensagemCatalogo.dataset.tipo = "acao";
            resumoCatalogo.textContent = "Catálogo indisponível.";
        });
}
