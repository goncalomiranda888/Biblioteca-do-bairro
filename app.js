// Mantém a página inicial independente do código do catálogo.
console.log("Bem-vindo à Biblioteca do Bairro!");
const anosDeAbertura = new Date().getFullYear() - 1987;
console.log(`A biblioteca abriu há ${anosDeAbertura} anos.`);

const listaLivros = document.querySelector("#lista-livros");

if (listaLivros) {
    const tituloCatalogo = document.querySelector("#titulo-catalogo");
    const livroMaisAntigo = document.querySelector("#livro-mais-antigo");
    const mensagemCatalogo = document.querySelector("#mensagem-catalogo");
    const pesquisaLivros = document.querySelector("#pesquisa-livros");
    const botaoDisponiveis = document.querySelector("#alternar-disponiveis");
    const botaoTema = document.querySelector("#alternar-tema");
    const formularioInscricao = document.querySelector("#formulario-inscricao");
    const mensagemInscricao = document.querySelector("#mensagem-inscricao");
    const chaveFavoritos = "biblioteca-favoritos";
    let catalogo = [];
    let mostrarApenasDisponiveis = false;
    let favoritos = JSON.parse(localStorage.getItem(chaveFavoritos) || "[]");

    function atualizarResumo() {
        const disponiveis = catalogo.filter((livro) => livro.disponivel).length;
        tituloCatalogo.textContent = `${catalogo.length} livros, ${disponiveis} disponíveis`;
    }

    function atualizarLista() {
        const termo = pesquisaLivros.value.trim().toLocaleLowerCase("pt");
        const livrosFiltrados = catalogo.filter((livro) => {
            const correspondePesquisa = `${livro.titulo} ${livro.autor}`
                .toLocaleLowerCase("pt")
                .includes(termo);
            return correspondePesquisa && (!mostrarApenasDisponiveis || livro.disponivel);
        });

        listaLivros.replaceChildren();
        mensagemCatalogo.className = "mensagem";

        livrosFiltrados.forEach((livro) => {
            const item = document.createElement("li");
            item.className = livro.disponivel ? "livro" : "livro indisponivel";

            const detalhes = document.createElement("div");
            const titulo = document.createElement("p");
            titulo.className = "livro-titulo";
            titulo.textContent = `${livro.titulo} — ${livro.autor} (${livro.ano})`;
            detalhes.append(titulo);

            const estado = document.createElement("p");
            estado.className = "estado-livro";
            estado.textContent = livro.disponivel ? "Disponível" : "Emprestado";
            detalhes.append(estado);

            const acoes = document.createElement("div");
            acoes.className = "livro-acoes";

            const botaoFavorito = document.createElement("button");
            botaoFavorito.className = "botao botao-secundario";
            botaoFavorito.type = "button";
            botaoFavorito.textContent = favoritos.includes(livro.titulo) ? "Guardado" : "Guardar";
            botaoFavorito.setAttribute("aria-pressed", String(favoritos.includes(livro.titulo)));
            botaoFavorito.addEventListener("click", () => alternarFavorito(livro.titulo));
            acoes.append(botaoFavorito);

            if (livro.disponivel) {
                const botaoEmprestimo = document.createElement("button");
                botaoEmprestimo.className = "botao";
                botaoEmprestimo.type = "button";
                botaoEmprestimo.textContent = "Emprestar";
                botaoEmprestimo.addEventListener("click", () => emprestar(livro.titulo));
                acoes.append(botaoEmprestimo);
            }

            item.append(detalhes, acoes);
            listaLivros.append(item);
        });

        if (livrosFiltrados.length === 0) {
            mensagemCatalogo.textContent = "Não foram encontrados livros com esses critérios.";
        } else {
            mensagemCatalogo.textContent = "";
        }
    }

    function mostrarLivros() {
        atualizarResumo();
        atualizarLista();
    }

    function emprestar(titulo) {
        const livro = catalogo.find((item) => item.titulo.toLocaleLowerCase("pt") === titulo.toLocaleLowerCase("pt"));

        if (!livro) {
            mensagemCatalogo.textContent = `Não foi encontrado o livro "${titulo}".`;
            mensagemCatalogo.className = "mensagem erro";
            return false;
        }

        if (!livro.disponivel) {
            mensagemCatalogo.textContent = `"${livro.titulo}" já está emprestado.`;
            mensagemCatalogo.className = "mensagem erro";
            return false;
        }

        livro.disponivel = false;
        mostrarLivros();
        mensagemCatalogo.textContent = `"${livro.titulo}" foi emprestado.`;
        mensagemCatalogo.className = "mensagem sucesso";
        return true;
    }

    function alternarFavorito(titulo) {
        favoritos = favoritos.includes(titulo)
            ? favoritos.filter((favorito) => favorito !== titulo)
            : [...favoritos, titulo];
        localStorage.setItem(chaveFavoritos, JSON.stringify(favoritos));
        atualizarLista();
    }

    function aplicarTema(escuro) {
        document.body.classList.toggle("modo-escuro", escuro);
        botaoTema.setAttribute("aria-pressed", String(escuro));
        botaoTema.textContent = escuro ? "Modo claro" : "Modo escuro";
    }

    pesquisaLivros.addEventListener("input", atualizarLista);
    botaoDisponiveis.addEventListener("click", () => {
        mostrarApenasDisponiveis = !mostrarApenasDisponiveis;
        botaoDisponiveis.setAttribute("aria-pressed", String(mostrarApenasDisponiveis));
        atualizarLista();
    });

    botaoTema.addEventListener("click", () => {
        const escuro = !document.body.classList.contains("modo-escuro");
        localStorage.setItem("biblioteca-modo-escuro", String(escuro));
        aplicarTema(escuro);
    });
    aplicarTema(localStorage.getItem("biblioteca-modo-escuro") === "true");

    formularioInscricao.addEventListener("submit", (evento) => {
        evento.preventDefault();
        mensagemInscricao.className = "mensagem erro";

        if (!formularioInscricao.checkValidity()) {
            mensagemInscricao.textContent = "Verifica o nome e introduz um e-mail válido.";
            formularioInscricao.reportValidity();
            return;
        }

        const nome = new FormData(formularioInscricao).get("nome").toString().trim();
        mensagemInscricao.className = "mensagem sucesso";
        mensagemInscricao.textContent = `Obrigado pela inscrição, ${nome}!`;
        formularioInscricao.reset();
    });

    fetch("livros.json")
        .then((resposta) => {
            if (!resposta.ok) {
                throw new Error(`O servidor respondeu com o estado ${resposta.status}.`);
            }
            return resposta.json();
        })
        .then((livros) => {
            if (!Array.isArray(livros) || !livros.every((livro) =>
                typeof livro.titulo === "string" &&
                typeof livro.autor === "string" &&
                Number.isInteger(livro.ano) &&
                typeof livro.disponivel === "boolean"
            )) {
                throw new Error("O ficheiro não contém uma lista válida de livros.");
            }

            catalogo = livros;
            const maisAntigo = catalogo.reduce((antigo, livro) =>
                livro.ano < antigo.ano ? livro : antigo
            );
            livroMaisAntigo.textContent = `Livro mais antigo: ${maisAntigo.titulo} (${maisAntigo.ano})`;
            mostrarLivros();
        })
        .catch((erro) => {
            mensagemCatalogo.textContent = `Não foi possível carregar o catálogo. ${erro.message}`;
            mensagemCatalogo.className = "mensagem erro";
            tituloCatalogo.textContent = "Catálogo indisponível";
        });
}
