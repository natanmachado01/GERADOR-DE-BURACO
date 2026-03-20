let cartasDB = null;
let baralhoConstrucao = [];
let missaoAtual = null;

const btnFundar = document.getElementById('btn-fundar');
const btnGerar = document.getElementById('btn-gerar');
const btnLimpar = document.getElementById('btn-limpar');
const displayFundacao = document.getElementById('display-fundacao');
const secaoDetalhes = document.getElementById('secao-detalhes'); // Nova seção
const grid = document.getElementById('grid');

const CENTRO_X = 500;
const CENTRO_Y = 300;
const TAMANHO_CARTA = 160;

window.onload = async () => {
    try {
        const response = await fetch('cartas-db.json');
        cartasDB = await response.json();
    } catch (erro) {
        alert("Erro ao carregar cartas-db.json.");
    }
};

function rolar1D6() { return Math.floor(Math.random() * 6) + 1; }

function embaralhar(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ==========================================
// 1. FUNDAR BURACO
// ==========================================
btnFundar.addEventListener('click', () => {
    if (!cartasDB) return;

    const efeito = cartasDB.fundacao.efeitos.find(e => e.roll === rolar1D6());
    missaoAtual = cartasDB.fundacao.missoes.find(m => m.roll === rolar1D6());

    document.getElementById('efeito-nome').innerText = efeito.nome;
    document.getElementById('efeito-desc').innerText = efeito.descricao;
    document.getElementById('missao-nome').innerText = missaoAtual.nome;
    document.getElementById('missao-desc').innerText = missaoAtual.descricao;

    displayFundacao.classList.remove('hidden');

    btnGerar.disabled = false;
    btnFundar.disabled = true;
});

// ==========================================
// 2. GERAR MASMORRA
// ==========================================
btnGerar.addEventListener('click', () => {
    const numCartas = parseInt(document.getElementById('tamanho-buraco').value);
    const diff = document.getElementById('dificuldade-encontro').value;

    const composicao = { 'armadilha': 4, 'encontro': 8, 'infortunio': 4, 'objetivo': 2, 'saida': 2, 'segredo': 3, 'tesouro': 4, 'vazio': 8 };
    baralhoConstrucao = [];
    for (const [tipo, qtd] of Object.entries(composicao)) {
        for (let i = 0; i < qtd; i++) baralhoConstrucao.push(tipo);
    }
    embaralhar(baralhoConstrucao);

    grid.innerHTML = '';
    let posicoesOcupadas = new Set();
    let coordenadasDisponiveis = [[0, 0]];

    // 2.1 - Cria a Entrada (Passando um objeto falso de carta para a descrição funcionar)
    const dadosEntrada = {
        nome: "Entrada do Buraco",
        subtitulo: "Ponto de Partida",
        descricao: "A Entrada define o ponto de partida da exploração do grupo, funcionando também como uma rota de fuga."
    };
    adicionarCartaMesa('ENTRADA', dadosEntrada, true, 'cruzamento', 0, 0);
    posicoesOcupadas.add("0,0");

    // 2.2 - Gera o resto do mapa
    for (let i = 0; i < numCartas; i++) {
        if (baralhoConstrucao.length === 0) break;
        
        const tipoSacado = baralhoConstrucao.pop();
        const cartaResolvida = resolverCarta(tipoSacado, diff);
        const formato = cartasDB.construcao.formatos_conexao[Math.floor(Math.random() * cartasDB.construcao.formatos_conexao.length)];

        let baseIndex = Math.floor(Math.random() * coordenadasDisponiveis.length);
        let coordBase = coordenadasDisponiveis[baseIndex];
        
        let direcoes = [[0, -1], [0, 1], [1, 0], [-1, 0]];
        embaralhar(direcoes);
        
        let novaPos = null;
        for (let dir of direcoes) {
            let nx = coordBase[0] + dir[0];
            let ny = coordBase[1] + dir[1];
            if (!posicoesOcupadas.has(`${nx},${ny}`)) {
                novaPos = [nx, ny];
                break;
            }
        }

        if (novaPos) {
            posicoesOcupadas.add(`${novaPos[0]},${novaPos[1]}`);
            coordenadasDisponiveis.push(novaPos);
            // Agora passamos o objeto inteiro (cartaResolvida) para a função!
            adicionarCartaMesa(tipoSacado, cartaResolvida, false, formato.id, novaPos[0], novaPos[1]);
        }
    }

    btnGerar.disabled = true;
});

function resolverCarta(tipo, dificuldade) {
    const dado = rolar1D6();
    if (tipo === 'vazio') return cartasDB.construcao.vazio;
    if (tipo === 'objetivo') return cartasDB.construcao.objetivo[missaoAtual.id].find(i => dado >= i.min_roll && dado <= i.max_roll);
    if (tipo === 'encontro') return cartasDB.construcao[`encontro_${dificuldade}`].find(i => i.roll === dado);
    
    return cartasDB.construcao[tipo].find(i => (i.roll && i.roll === dado) || (i.min_roll && dado >= i.min_roll && dado <= i.max_roll));
}

// ==========================================
// 3. CRIAR CARTA NA TELA, ARRASTO E CLIQUE
// ==========================================
function adicionarCartaMesa(tipo, cartaResolvida, isEntrada, formato, gridX, gridY) {
    const carta = document.createElement('div');
    carta.classList.add('carta-mesa');
    if (isEntrada) carta.classList.add('entrada');

    let pixelX = CENTRO_X + (gridX * TAMANHO_CARTA);
    let pixelY = CENTRO_Y + (gridY * TAMANHO_CARTA);
    
    carta.style.left = `${pixelX}px`;
    carta.style.top = `${pixelY}px`;

    // O nome agora vem de cartaResolvida.nome
    carta.innerHTML = `
        <span class="carta-tipo-label">${tipo}</span>
        <span class="carta-nome-label">${cartaResolvida.nome || "Vazio"}</span>
        <span class="carta-formato-label">[ ${formato.toUpperCase()} ]</span>
    `;

    // SISTEMA DE ARRASTO VS CLIQUE
    carta.onmousedown = function(e) {
        let hasDragged = false;
        let startX = e.clientX;
        let startY = e.clientY;
        let initialLeft = parseInt(carta.style.left) || 0;
        let initialTop = parseInt(carta.style.top) || 0;
        carta.style.zIndex = 1000;

        document.onmousemove = function(e) {
            // Se o mouse se mover mais de 5 pixels, é considerado "Arrastar" e não "Clicar"
            if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) {
                hasDragged = true;
            }
            if (hasDragged) {
                carta.style.left = `${initialLeft + (e.clientX - startX)}px`;
                carta.style.top = `${initialTop + (e.clientY - startY)}px`;
            }
        };

        document.onmouseup = function() {
            // Limpa os eventos de movimento do mouse ao soltar o clique
            document.onmousemove = null;
            document.onmouseup = null;
            carta.style.zIndex = isEntrada ? 2 : 1;
            
            // SE NÃO FOI ARRASTADA, ENTÃO FOI UM CLIQUE DE LEITURA!
            if (!hasDragged) {
                exibirDetalhesDaCarta(carta, tipo, cartaResolvida);
            }
        };
    };
    
    // Evita o bug nativo do HTML de arrastar texto
    carta.ondragstart = () => false;

    grid.appendChild(carta);
}

// Função para jogar os dados da carta na barra lateral
function exibirDetalhesDaCarta(elementoVisual, tipo, dados) {
    // Tira o brilho de todas as cartas e coloca na que acabou de ser clicada
    document.querySelectorAll('.carta-mesa').forEach(c => c.classList.remove('selecionada'));
    elementoVisual.classList.add('selecionada');

    // Preenche o painel lateral com os dados escondidos
    document.getElementById('detalhe-tipo').innerText = tipo.toUpperCase();
    document.getElementById('detalhe-nome').innerText = dados.nome || "Vazio";
    document.getElementById('detalhe-subtitulo').innerText = dados.subtitulo || "";
    document.getElementById('detalhe-desc').innerText = dados.descricao || "Um espaço vazio sem riscos ou recompensas para o grupo.";

    // Mostra a seção de detalhes
    secaoDetalhes.classList.remove('hidden');
}

// ==========================================
// LIMPAR MESA
// ==========================================
btnLimpar.addEventListener('click', () => {
    btnFundar.disabled = false;
    btnGerar.disabled = true;
    displayFundacao.classList.add('hidden');
    secaoDetalhes.classList.add('hidden'); // Esconde a seção de detalhes também
    missaoAtual = null;
    grid.innerHTML = `<div class="empty-state"><p>Clique em "Fundar Buraco" para iniciar.</p></div>`;
});