const zapi = require('./zapi');
const ia = require('./ia');
const pagamento = require('./pagamento');
const config = require('./config');
const { AREAS_BURITIS, getCargosBuritisPorArea, getDetalhesCarogBuritis } = require('./buritis');
const { agendarRemarketing, cancelarRemarketing } = require('./remarketing');
const { getSession, updateSession, resetSession, ETAPAS } = require('./storage');

const fmt = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================================
// DETECÇÃO DE SERVIÇO
// ============================================================
function detectarServico(texto) {
  const t = texto.toLowerCase();
  for (const [srv, words] of Object.entries(config.keywords)) {
    if (words.some(w => t.includes(w))) return srv;
  }
  return null;
}

function saudacao() {
  const h = parseInt(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function ehNome(txt) {
  const t = txt.trim();
  if (t.split(' ').length > 4) return false;
  if (/\d/.test(t)) return false;
  if (/[?!,]/.test(t)) return false;
  const demanda = ['apostila','concurso','paracatu','buritis','cargo','quero','preciso',
    'informação','informática','curso','enem','vestibular','preço','valor','quanto',
    'como','quando','onde','prf','sedf','enfermagem','gcm','motorista','combo',
    'material','comprar','boa','bom','oi','olá','ola','hey','tudo','bem','dia','tarde','noite'];
  if (demanda.some(p => t.toLowerCase().includes(p))) return false;
  return true;
}

// ============================================================
// CATÁLOGO DE DETALHES — PARACATU
// ============================================================
const DETALHES_PARACATU = {
  enfermagem:      { paginas: 189, questoes: 'por capítulo', esp: 'SUS e bases legais, PNAB, Vigilância em Saúde (ANVISA/SNVS), PNI, SAE, Diagnósticos NANDA-I, Doenças crônicas e transmissíveis' },
  farmacia:        { paginas: 153, questoes: null,           esp: 'Farmacologia clínica, Assistência farmacêutica no SUS, Farmácia hospitalar, Legislação farmacêutica' },
  radiologia:      { paginas: 138, questoes: '~63',         esp: 'Módulo 5: Direitos Humanos, Dir. Constitucional, Dir. Administrativo, Dir. Penal, CTB, ECA, Legislação Municipal Paracatu' },
  odontologia:     { paginas: 155, questoes: '~60',         esp: 'Diagnóstico de lesões bucais, Clínica odontológica, Saúde bucal coletiva, Ética profissional' },
  fisioterapia:    { paginas: 208, questoes: 'por capítulo',esp: 'Cinesioterapia, Fisioterapia traumato-ortopédica, Fisioterapia respiratória e cardiovascular, Legislação e ética (COFFITO)' },
  analises:        { paginas: 214, questoes: '~186',        esp: 'Hematologia, Bioquímica clínica, Microbiologia, Parasitologia, Imunologia, Boas práticas laboratoriais' },
  vigilancia:      { paginas: 154, questoes: null,          esp: 'Legislação sanitária, ANVISA, Vigilância de alimentos, Vigilância de serviços de saúde, Epidemiologia' },
  peb:             { paginas: 144, questoes: '~68',         esp: 'Módulo 5: Direitos Humanos, Dir. Constitucional, Dir. Administrativo, Dir. Penal, ECA, Legislação Paracatu' },
  peb_arte:        { paginas: 199, questoes: '~168',        esp: 'Módulo 5: Direitos Humanos, Dir. Constitucional, Dir. Penal, ECA, Estatuto do Idoso, Legislação Paracatu' },
  peb_historia:    { paginas: 154, questoes: null,          esp: 'História do Brasil, História de Minas Gerais e Paracatu, Historiografia, Didática' },
  supervisor:      { paginas: 173, questoes: null,          esp: 'Gestão escolar democrática, Avaliação educacional, LDB/PNE/FUNDEB, Educação inclusiva, Formação de professores' },
  educador_creche: { paginas: 117, questoes: null,          esp: 'Legislação da primeira infância, Desenvolvimento infantil 0-3 anos, O cuidar e o educar, O brincar' },
  bibliotecario:   { paginas: 196, questoes: null,          esp: 'Biblioteconomia, Catalogação, Gestão de acervos, Biblioteca escolar' },
  oficial_adm:     { paginas: 264, questoes: null,          esp: 'Administração pública, Direito administrativo, Gestão de documentos, Ética no serviço público' },
  aux_secretaria:  { paginas: 161, questoes: '~230',        esp: 'Administração pública, Redação oficial, Atendimento ao público, Arquivo e protocolo' },
  adm_aux:         { paginas: 194, questoes: '~230',        esp: 'Administração geral, Gestão de processos, Comunicação organizacional, Ética profissional' },
  almoxarifado:    { paginas: 197, questoes: '~230',        esp: 'Gestão de estoques, Almoxarifado e patrimônio, Compras públicas, Licitações' },
  assist_social:   { paginas: 230, questoes: '~430',        esp: 'Fundamentos do Serviço Social, Ética profissional, ECA, Serviço Social no SUS, Políticas sociais' },
  contabilidade:   { paginas: 205, questoes: '~430',        esp: 'Contabilidade geral, Escrituração, Orçamento público (PPA/LDO/LOA), LRF, Custos no setor público' },
  advogado:        { paginas: 135, questoes: '~63',         esp: 'Módulo 5: Dir. Humanos, Dir. Constitucional e Administrativo, Dir. Penal, CTB, ECA, Legislação Paracatu' },
  gcm:             { paginas: 182, questoes: '~88',         esp: 'Módulo 5: Segurança Pública (CF art.144), Dir. Penal, Estatuto das Guardas, CTB, ECA, Uso da Força' },
  psicologia:      { paginas: 136, questoes: '~63',         esp: 'Módulo 5: Dir. Humanos, Dir. Constitucional, Dir. Administrativo, Dir. Penal, ECA, Legislação Paracatu' },
  vigia:           { paginas: 169, questoes: null,          esp: 'Controle de acesso, Prevenção de incêndios, Primeiros socorros, Segurança do trabalho (EPI/NR), Ética pública' },
  eng_eletrica_1:  { paginas: 152, questoes: null,          esp: 'Eletrotécnica, Instalações elétricas, Normas técnicas ABNT, Manutenção elétrica predial' },
  eng_eletrica_2:  { paginas: 152, questoes: null,          esp: 'Instalações elétricas avançadas, Projetos elétricos, Normas de segurança elétrica' },
  eng_ambiental:   { paginas: 189, questoes: null,          esp: 'Saneamento ambiental, Gestão ambiental (ISO 14001), Educação ambiental, Ética profissional' },
  motorista:       { paginas: 204, questoes: '~239',        esp: 'CTB completo, Direção defensiva, Veículos especiais, Saúde ocupacional, História de Paracatu, Simulado final' },
};

// ============================================================
// MENSAGENS
// ============================================================
const MSG_BOAS_VINDAS = () => {
  const s = saudacao();
  return `${s}! 👋 Que bom ter você aqui!\n\nEu sou o *JARVIS* 🤖 — assistente virtual da *Smart Cursos Unaí*, pronto pra te ajudar a conquistar sua aprovação! 🏆\n\nAntes de começar, como posso te chamar?`;
};

const MSG_ACOLHIMENTO = (nome, servico) => {
  const msgs = {
    paracatu:      `Prazer, *${nome}*! 😊\n\nEntão você tá de olho no *Concurso de Paracatu 2026*... boa escolha! São *272 vagas* e a prova é em *23 de agosto*.\n\nPreparei um material caprichado pra esse concurso! 📚`,
    buritis:       `Prazer, *${nome}*! 😊\n\nVi que você tem interesse no *Processo Seletivo de Buritis/MG*! Ótima decisão se preparar com antecedência.\n\nTemos apostilas específicas pra cada cargo! 📚`,
    prevestibular: `Prazer, *${nome}*! 😊\n\nInvestir na sua preparação é sempre a melhor decisão! O nosso pré-vestibular tem feito muita diferença pra nossos alunos. 🎓`,
    informatica:   `Prazer, *${nome}*! 😊\n\nInformática hoje é essencial em qualquer carreira — você está no caminho certo! 💻`,
    default:       `Prazer, *${nome}*! 😊\n\nÉ um prazer ter você aqui na Smart Cursos Unaí! Conta comigo pra te ajudar a conquistar seus objetivos. 🎯`
  };
  return msgs[servico] || msgs.default;
};

const MSG_MENU_GERAL = (nome) =>
`Como posso te ajudar, *${nome}*? 😊

*1️⃣* 📄 Apostilas para *Concursos Públicos*
*2️⃣* 🎓 *Pré-vestibular / ENEM*
*3️⃣* 💻 Cursos de *Informática*
*4️⃣* 🌐 Cursos *Online*
*5️⃣* 💬 Tenho uma *dúvida*
*6️⃣* 👤 Falar com *atendente*

_É só digitar o número_ 👇`;

const MSG_MENU_CIDADES = () =>
`Temos apostilas para os seguintes concursos:

*1️⃣* 🏛 *Prefeitura de Paracatu/MG 2026*
   IBGP | 272 vagas | Prova: 23/08/2026

*2️⃣* 🏛 *Prefeitura de Buritis/MG*
   Processo Seletivo — diversos cargos

*0️⃣* ← Voltar

_Qual você procura?_ 👇`;

const MSG_MENU_PARACATU = () =>
`📄 *Apostilas — Concurso Paracatu 2026*

*1️⃣* 🎯 Apostila do *meu cargo*
*2️⃣* 🔥 *COMBO COMPLETO* — R$ 49,90
   _27 apostilas por menos de R$ 2,00 cada!_
*3️⃣* ❓ Não sei meu cargo — me ajuda?

*0️⃣* ← Voltar`;

const MSG_PIX = (produto, valor) =>
`Perfeito! Segue os dados pra pagamento:

🏷 *${produto}*
💰 *Valor: ${fmt(valor)}*

📲 *Chave PIX (CNPJ):*
\`31.852.681/0001-40\`

Assim que pagar, *envie o comprovante aqui* 📸`;

const MSG_AGUARDANDO = () =>
`⏳ Pode pagar com calma! Quando finalizar, é só mandar o *print do comprovante* aqui. 😊`;

const MSG_VALIDANDO = () => `🔍 Verificando seu pagamento...`;
const MSG_APROVADO = (nome) => `✅ *Pagamento confirmado!* Obrigado, *${nome}*! 🎉\n\nProcessando seu pedido agora... 📦`;
const MSG_REPROVADO_VALOR = (pago, esp) => `Hmm, o comprovante mostra *${fmt(pago)}* mas o valor do pedido é *${fmt(esp)}* 🤔\n\nVerifica se foi o valor certo e manda o comprovante novamente, ou chama um atendente! 😊`;
const MSG_IMAGEM_INVALIDA = () => `Não consegui identificar o comprovante nessa imagem 🤔\n\nTenta enviar um *print mais nítido* do comprovante PIX! 📲`;
const MSG_CONFIRMACAO_MANUAL = (nome) => `Recebi! 📨 Vou repassar pra nossa equipe conferir. Em breve você recebe a confirmação, *${nome}*! ⏱️`;
const MSG_ENCERRAMENTO = (nome) => `Foi um prazer, *${nome}*! 😊\n\nQualquer dúvida que surgir, pode chamar!\n\nBons estudos e boa sorte! 🚀🏆\n\n_Smart Cursos Unaí — Sua aprovação é nossa missão!_`;

// ============================================================
// PROCESSADOR PRINCIPAL
// ============================================================
async function processarMensagem(telefone, dados) {
  const session = getSession(telefone);
  const { tipo, conteudo, caption } = dados;
  const txt = tipo === 'texto' ? conteudo.trim() : (caption || '');
  const lower = txt.toLowerCase();

  // Cancela remarketing ao receber mensagem
  cancelarRemarketing(telefone);

  // Comprovante de pagamento
  if (tipo === 'imagem' && session.etapa === ETAPAS.AGUARDANDO_PAGAMENTO) {
    return processarComprovante(telefone, conteudo, session);
  }

  // Comandos do atendente
  if (lower.startsWith('confirmar ') || lower.startsWith('recusar ')) {
    return processarComandoAtendente(telefone, txt);
  }

  // Palavras globais
  if (['menu', 'inicio', 'início', 'voltar', 'home'].includes(lower)) {
    if (!session.nome) {
      resetSession(telefone);
      updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_NOME });
      agendarRemarketing(telefone);
      return zapi.enviarTexto(telefone, MSG_BOAS_VINDAS());
    }
    updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL });
    agendarRemarketing(telefone);
    return zapi.enviarTexto(telefone, MSG_MENU_GERAL(session.nome));
  }

  if (['oi', 'olá', 'ola', 'hey', 'bom dia', 'boa tarde', 'boa noite', 'oii', 'oioi'].includes(lower)) {
    if (session.etapa === ETAPAS.INICIO || !session.nome) {
      resetSession(telefone);
      updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_NOME, servico: detectarServico(txt) });
      agendarRemarketing(telefone);
      return zapi.enviarTexto(telefone, MSG_BOAS_VINDAS());
    }
    // Se já conhece, responde naturalmente
    return zapi.enviarTexto(telefone, `${saudacao()}, *${session.nome}*! 😊 Como posso te ajudar?\n\nDigite *menu* pra ver as opções!`);
  }

  if (['sair', 'encerrar', 'tchau', 'até mais', 'obrigado', 'obrigada', 'vlw', 'valeu', 'ok obrigado'].includes(lower)) {
    cancelarRemarketing(telefone);
    await zapi.enviarTexto(telefone, MSG_ENCERRAMENTO(session.nome || 'amigo(a)'));
    return resetSession(telefone);
  }

  // Switch de etapas
  let resultado;
  switch (session.etapa) {

    case ETAPAS.INICIO:
      await zapi.enviarTexto(telefone, MSG_BOAS_VINDAS());
      updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_NOME, servico: detectarServico(txt) });
      break;

    case ETAPAS.AGUARDANDO_NOME:
      resultado = await processarNome(telefone, txt, session);
      break;

    case ETAPAS.AGUARDANDO_CIDADE:
      resultado = await processarCidade(telefone, txt, session);
      break;

    case ETAPAS.AGUARDANDO_NOME_COM_INTENCAO:
      resultado = await processarNomeComIntencao(telefone, txt, session);
      break;

    case ETAPAS.MENU_PRINCIPAL:
      resultado = await processarMenuPrincipal(telefone, txt, session);
      break;

    case ETAPAS.APOSTILAS_CIDADE:
      resultado = await processarMenuCidades(telefone, txt, session);
      break;

    // PARACATU
    case ETAPAS.PARACATU_AREAS:
    case ETAPAS.COMBO_CONFIRMAR:
      resultado = await processarParacatuAreas(telefone, txt, session);
      break;

    case ETAPAS.PARACATU_SELECIONAR_AREA:
      resultado = await processarSelecionarAreaParacatu(telefone, txt, session);
      break;

    case ETAPAS.PARACATU_CARGOS:
    case ETAPAS.PARACATU_CONFIRMAR_COMPRA:
      resultado = await processarParacatuCargos(telefone, txt, session);
      break;

    // BURITIS
    case ETAPAS.BURITIS_AREAS:
    case ETAPAS.BURITIS_COMBO_CONFIRMAR:
      resultado = await processarBuritisAreas(telefone, txt, session);
      break;

    case ETAPAS.BURITIS_CARGOS:
    case ETAPAS.BURITIS_CONFIRMAR_COMPRA:
      resultado = await processarBuritisCargos(telefone, txt, session);
      break;

    // OUTROS
    case ETAPAS.PRE_VEST_INTERESSE:
      resultado = await processarPreVestInteresse(telefone, txt, session);
      break;

    case ETAPAS.INFO_TIPO:
      resultado = await processarInfoTipo(telefone, txt, session);
      break;

    case ETAPAS.ONLINE_MENU:
      resultado = await processarOnlineMenu(telefone, txt, session);
      break;

    case ETAPAS.AGUARDANDO_PAGAMENTO:
      await zapi.enviarTexto(telefone,
        `Ainda aguardando seu comprovante pra *${session.pagamento?.produto}* 😊\n\nQuando pagar, manda o print aqui! 📲\n\nDigite *menu* pra ver outras opções.`
      );
      break;

    case ETAPAS.CONVERSA_LIVRE:
      resultado = await processarIA(telefone, txt, session);
      break;

    default:
      resetSession(telefone);
      await zapi.enviarTexto(telefone, MSG_BOAS_VINDAS());
      updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_NOME });
  }

  // Agenda remarketing após cada interação
  agendarRemarketing(telefone);
  return resultado;
}

// ============================================================
// COLETA DE NOME E CIDADE
// ============================================================
async function processarNome(telefone, txt, session) {
  const servico = session.servico || detectarServico(txt);

  if (ehNome(txt)) {
    const nome = formatarNome(txt);
    updateSession(telefone, { nome, servico, etapa: ETAPAS.AGUARDANDO_CIDADE });
    return zapi.enviarTexto(telefone,
      `Prazer, *${nome}*! 😊\n\nDe qual cidade você é?`
    );
  } else {
    updateSession(telefone, { nome: null, servico, etapa: ETAPAS.AGUARDANDO_NOME_COM_INTENCAO, intencaoPendente: txt });
    return zapi.enviarTexto(telefone,
      `Pode deixar, já entendi o que você procura! 😊\n\nAntes, como posso te chamar?`
    );
  }
}

async function processarCidade(telefone, txt, session) {
  const cidade = formatarNome(txt);
  updateSession(telefone, { cidade });
  await zapi.enviarTexto(telefone, MSG_ACOLHIMENTO(session.nome, session.servico || 'default'));
  await sleep(700);
  if (session.servico === 'paracatu') {
    updateSession(telefone, { etapa: ETAPAS.PARACATU_AREAS });
    return zapi.enviarTexto(telefone, MSG_MENU_PARACATU());
  }
  if (session.servico === 'buritis') {
    updateSession(telefone, { etapa: ETAPAS.BURITIS_AREAS });
    return enviarMenuBuritis(telefone);
  }
  updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL });
  return zapi.enviarTexto(telefone, MSG_MENU_GERAL(session.nome));
}

async function processarNomeComIntencao(telefone, txt, session) {
  const nome = formatarNome(txt);
  const intencao = session.intencaoPendente || '';
  const servico = session.servico || detectarServico(intencao) || detectarServico(txt);
  updateSession(telefone, { nome, servico, etapa: ETAPAS.AGUARDANDO_CIDADE });
  return zapi.enviarTexto(telefone, `Prazer, *${nome}*! 😊\n\nDe qual cidade você é?`);
}

// ============================================================
// MENU PRINCIPAL
// ============================================================
async function processarMenuPrincipal(telefone, txt, session) {
  const acoes = {
    '1': async () => {
      updateSession(telefone, { etapa: ETAPAS.APOSTILAS_CIDADE });
      return zapi.enviarTexto(telefone, MSG_MENU_CIDADES());
    },
    '2': () => { updateSession(telefone, { etapa: ETAPAS.PRE_VEST_INTERESSE }); return enviarApresentacaoPreVest(telefone, session.nome); },
    '3': () => { updateSession(telefone, { etapa: ETAPAS.INFO_TIPO }); return enviarMenuInfo(telefone, session.nome); },
    '4': () => { updateSession(telefone, { etapa: ETAPAS.ONLINE_MENU }); return enviarMenuOnline(telefone, session.nome); },
    '5': () => { updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE }); return zapi.enviarTexto(telefone, `Claro! Pode perguntar à vontade 😊\n\nDigite *menu* quando quiser voltar.`); },
    '6': async () => {
      updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE });
      await zapi.enviarTexto(telefone, `Claro, *${session.nome}*! Vou avisar nossa equipe. 😊\n\nEm breve alguém entra em contato!\n_Seg-Sex 8h-18h | Sáb 8h-12h_ ⏱️`);
      return notificarAtendente(telefone, session.nome, 'Menu principal');
    },
  };
  if (acoes[txt]) return acoes[txt]();
  return detectarIntencaoERotear(telefone, txt, session);
}

// ============================================================
// SELEÇÃO DE CIDADE/CONCURSO
// ============================================================
async function processarMenuCidades(telefone, txt, session) {
  if (txt === '0') {
    updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL });
    return zapi.enviarTexto(telefone, MSG_MENU_GERAL(session.nome));
  }
  if (txt === '1') {
    updateSession(telefone, { etapa: ETAPAS.PARACATU_AREAS, concursoAtual: 'paracatu' });
    return zapi.enviarTexto(telefone, MSG_MENU_PARACATU());
  }
  if (txt === '2') {
    updateSession(telefone, { etapa: ETAPAS.BURITIS_AREAS, concursoAtual: 'buritis' });
    return enviarMenuBuritis(telefone);
  }
  return zapi.enviarTexto(telefone, `${MSG_MENU_CIDADES()}`);
}

// ============================================================
// PARACATU — FLUXO
// ============================================================
async function processarParacatuAreas(telefone, txt, session) {
  if (session.etapa === ETAPAS.COMBO_CONFIRMAR) {
    if (txt === '1') {
      updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_PAGAMENTO, pagamento: { produto: 'COMBO Completo Paracatu 2026 — 27 apostilas', valor: config.apostilasDigitais.precoCombo, tipo: 'combo_paracatu' } });
      await zapi.enviarTexto(telefone, MSG_PIX('COMBO Completo Paracatu 2026', config.apostilasDigitais.precoCombo));
      await sleep(500);
      return zapi.enviarTexto(telefone, MSG_AGUARDANDO());
    }
    if (txt === '2') { updateSession(telefone, { etapa: ETAPAS.PARACATU_AREAS }); return zapi.enviarTexto(telefone, MSG_MENU_PARACATU()); }
    if (txt === '3') { updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL }); return zapi.enviarTexto(telefone, MSG_MENU_GERAL(session.nome)); }
    return zapi.enviarTexto(telefone, `Digite *1*, *2* ou *3* 👇`);
  }

  if (txt === '1') {
    updateSession(telefone, { etapa: ETAPAS.PARACATU_SELECIONAR_AREA });
    const areas = config.apostilasDigitais.paracatu.areas;
    const linhas = areas.map((a, i) => `*${i+1}️⃣* ${a.emoji} ${a.titulo}`).join('\n');
    return zapi.enviarTexto(telefone, `Qual é a sua área? 👇\n\n${linhas}\n\n*0️⃣* ← Voltar`);
  }
  if (txt === '2') return apresentarComboParacatu(telefone, session.nome);
  if (txt === '3') {
    updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE });
    return zapi.enviarTexto(telefone, `Sem problema! Me conta sua formação ou área de atuação que te indico o cargo certo! 😊`);
  }
  if (txt === '0') { updateSession(telefone, { etapa: ETAPAS.APOSTILAS_CIDADE }); return zapi.enviarTexto(telefone, MSG_MENU_CIDADES()); }
  return zapi.enviarTexto(telefone, MSG_MENU_PARACATU());
}

async function processarSelecionarAreaParacatu(telefone, txt, session) {
  if (txt === '0') { updateSession(telefone, { etapa: ETAPAS.PARACATU_AREAS }); return zapi.enviarTexto(telefone, MSG_MENU_PARACATU()); }
  const areas = config.apostilasDigitais.paracatu.areas;
  const area = areas[parseInt(txt) - 1];
  if (!area) return zapi.enviarTexto(telefone, `Escolha de 1 a ${areas.length} ou *0* pra voltar.`);
  updateSession(telefone, { etapa: ETAPAS.PARACATU_CARGOS, areaAtual: area.id });
  const linhas = area.cargos.map((c, i) => `*${i+1}️⃣* ${c.titulo}`).join('\n');
  return zapi.enviarTexto(telefone,
    `${area.emoji} *${area.titulo}*\n\nQual é o seu cargo? 👇\n\n${linhas}\n\n*0️⃣* ← Voltar\n\n_Dica: o COMBO por R$49,90 cobre todos!_ 😉`
  );
}

async function processarParacatuCargos(telefone, txt, session) {
  if (txt === '0') {
    updateSession(telefone, { etapa: ETAPAS.PARACATU_SELECIONAR_AREA });
    const areas = config.apostilasDigitais.paracatu.areas;
    const linhas = areas.map((a, i) => `*${i+1}️⃣* ${a.emoji} ${a.titulo}`).join('\n');
    return zapi.enviarTexto(telefone, `Qual é a sua área? 👇\n\n${linhas}\n\n*0️⃣* ← Voltar`);
  }
  if (session.etapa === ETAPAS.PARACATU_CONFIRMAR_COMPRA) {
    if (txt === '1') {
      const pag = session.pagamento;
      updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_PAGAMENTO });
      await zapi.enviarTexto(telefone, MSG_PIX(pag.produto, pag.valor));
      await sleep(500);
      return zapi.enviarTexto(telefone, MSG_AGUARDANDO());
    }
    if (txt === '2') return apresentarComboParacatu(telefone, session.nome);
    if (txt === '3') {
      const area = config.apostilasDigitais.paracatu.areas.find(a => a.id === session.areaAtual);
      updateSession(telefone, { etapa: ETAPAS.PARACATU_CARGOS, pagamento: null });
      if (area) {
        const linhas = area.cargos.map((c, i) => `*${i+1}️⃣* ${c.titulo}`).join('\n');
        return zapi.enviarTexto(telefone, `${area.emoji} *${area.titulo}*\n\n${linhas}\n\n*0️⃣* ← Voltar`);
      }
      return zapi.enviarTexto(telefone, MSG_MENU_PARACATU());
    }
    return detectarIntencaoERotear(telefone, txt, session);
  }

  const area = config.apostilasDigitais.paracatu.areas.find(a => a.id === session.areaAtual);
  if (!area) { updateSession(telefone, { etapa: ETAPAS.PARACATU_AREAS }); return zapi.enviarTexto(telefone, MSG_MENU_PARACATU()); }
  const cargo = area.cargos[parseInt(txt) - 1];
  if (!cargo) return zapi.enviarTexto(telefone, `Escolha de 1 a ${area.cargos.length} ou *0* pra voltar.`);

  const det = DETALHES_PARACATU[cargo.id] || { paginas: null, questoes: null, esp: 'Conteúdo conforme edital IBGP' };
  updateSession(telefone, { etapa: ETAPAS.PARACATU_CONFIRMAR_COMPRA, pagamento: { produto: `Apostila ${cargo.titulo} — Paracatu 2026`, valor: config.apostilasDigitais.precoCargo, tipo: 'cargo_paracatu', cargoId: cargo.id, driveId: cargo.driveId } });

  zapi.salvarContato(telefone, session.nome || 'Lead', session.cidade || '', `Paracatu - ${cargo.titulo}`).catch(() => {});

  return zapi.enviarTexto(telefone,
`📘 *Apostila ${cargo.titulo}*
Paracatu 2026 — IBGP

${det.paginas ? `📄 *${det.paginas} páginas*` : ''}${det.questoes ? `\n❓ *${det.questoes} questões comentadas*` : ''}

📦 *Módulos Base:*
• Língua Portuguesa • Raciocínio Lógico
• Informática • Conhecimentos Gerais

🎯 *Específico — ${cargo.titulo}:*
${det.esp}

💰 *R$ 19,90* — PIX, acesso imediato

*1️⃣* ✅ Comprar — R$ 19,90
*2️⃣* 🔥 Ver COMBO (27 apostilas — R$ 49,90)
*3️⃣* 🔄 Escolher outro cargo`
  );
}

async function apresentarComboParacatu(telefone, nome) {
  updateSession(telefone, { etapa: ETAPAS.COMBO_CONFIRMAR });
  await zapi.enviarTexto(telefone, `*${nome}*, deixa eu te mostrar algo que faz muito sentido... 👀`);
  await sleep(1200);
  await zapi.enviarTexto(telefone,
`🔥 *COMBO COMPLETO — Paracatu 2026*

*27 apostilas* em um único pacote:
🏥 7 cargos da Saúde
📚 6 cargos da Educação
🗂 6 cargos Administrativos
⚖ 4 cargos Jurídica/Segurança
⚙ 4 cargos Técnicos

✅ Conteúdo 100% conforme edital IBGP
✅ 4 módulos base + específico em cada
✅ Questões comentadas no estilo da banca`
  );
  await sleep(1800);
  const total = (config.apostilasDigitais.precoCargo * 27).toFixed(2).replace('.', ',');
  const eco = (config.apostilasDigitais.precoCargo * 27 - config.apostilasDigitais.precoCombo).toFixed(2).replace('.', ',');
  await zapi.enviarTexto(telefone,
`💡 *Comparando:*
27 apostilas separadas = *R$ ${total}*
COMBO = *R$ ${fmt(config.apostilasDigitais.precoCombo)}*

Você *economiza R$ ${eco}*! 🎁
_É como levar 25 apostilas de graça_`
  );
  await sleep(1500);
  return zapi.enviarTexto(telefone,
`⚡ Acesso imediato via PIX!
A prova é em *23 de agosto* — quanto antes começar, melhor! ⏰

*1️⃣* ✅ Quero o COMBO — R$ 49,90
*2️⃣* 🔍 Prefiro só o meu cargo
*3️⃣* ← Voltar ao menu`
  );
}

// ============================================================
// BURITIS — FLUXO
// ============================================================
async function enviarMenuBuritis(telefone) {
  const linhas = AREAS_BURITIS.map((a, i) => `*${i+1}️⃣* ${a.emoji} ${a.titulo}`).join('\n');
  return zapi.enviarTexto(telefone,
`📄 *Apostilas — Processo Seletivo Buritis/MG*

Temos apostilas para todos os cargos! 📚

*0️⃣* 🔥 *COMBO COMPLETO — R$ 49,90*
   _Todas as apostilas de uma vez!_

Ou escolha sua área:
${linhas}

*#️⃣* ← Voltar

_Qual você procura?_ 👇`
  );
}

async function processarBuritisAreas(telefone, txt, session) {
  if (session.etapa === ETAPAS.BURITIS_COMBO_CONFIRMAR) {
    if (txt === '1') {
      updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_PAGAMENTO, pagamento: { produto: 'COMBO Completo Buritis/MG — todos os cargos', valor: 49.90, tipo: 'combo_buritis' } });
      await zapi.enviarTexto(telefone, MSG_PIX('COMBO Completo Buritis/MG', 49.90));
      await sleep(500);
      return zapi.enviarTexto(telefone, MSG_AGUARDANDO());
    }
    if (txt === '2') { updateSession(telefone, { etapa: ETAPAS.BURITIS_AREAS }); return enviarMenuBuritis(telefone); }
    if (txt === '3') { updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL }); return zapi.enviarTexto(telefone, MSG_MENU_GERAL(session.nome)); }
    return zapi.enviarTexto(telefone, `Digite *1*, *2* ou *3* 👇`);
  }

  if (txt === '0') return apresentarComboBuritis(telefone, session.nome);
  if (txt === '#') { updateSession(telefone, { etapa: ETAPAS.APOSTILAS_CIDADE }); return zapi.enviarTexto(telefone, MSG_MENU_CIDADES()); }

  const area = AREAS_BURITIS[parseInt(txt) - 1];
  if (!area) return enviarMenuBuritis(telefone);

  updateSession(telefone, { etapa: ETAPAS.BURITIS_CARGOS, areaAtual: area.id });
  const cargos = getCargosBuritisPorArea(area.id);
  const linhas = cargos.map((c, i) => `*${i+1}️⃣* ${c.titulo}`).join('\n');
  return zapi.enviarTexto(telefone,
    `${area.emoji} *${area.titulo}*\n\nQual é o seu cargo? 👇\n\n${linhas}\n\n*0️⃣* ← Voltar`
  );
}

async function processarBuritisCargos(telefone, txt, session) {
  if (txt === '0') {
    updateSession(telefone, { etapa: ETAPAS.BURITIS_AREAS });
    return enviarMenuBuritis(telefone);
  }

  if (session.etapa === ETAPAS.BURITIS_CONFIRMAR_COMPRA) {
    if (txt === '1') {
      const pag = session.pagamento;
      updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_PAGAMENTO });
      await zapi.enviarTexto(telefone, MSG_PIX(pag.produto, pag.valor));
      await sleep(500);
      return zapi.enviarTexto(telefone, MSG_AGUARDANDO());
    }
    if (txt === '2') return apresentarComboBuritis(telefone, session.nome);
    if (txt === '3') {
      const cargos = getCargosBuritisPorArea(session.areaAtual);
      updateSession(telefone, { etapa: ETAPAS.BURITIS_CARGOS, pagamento: null });
      const linhas = cargos.map((c, i) => `*${i+1}️⃣* ${c.titulo}`).join('\n');
      return zapi.enviarTexto(telefone, `Escolha o cargo: 👇\n\n${linhas}\n\n*0️⃣* ← Voltar`);
    }
    return detectarIntencaoERotear(telefone, txt, session);
  }

  const cargos = getCargosBuritisPorArea(session.areaAtual);
  const cargo = cargos[parseInt(txt) - 1];
  if (!cargo) return zapi.enviarTexto(telefone, `Escolha de 1 a ${cargos.length} ou *0* pra voltar.`);

  const det = getDetalhesCarogBuritis(cargo.id);
  updateSession(telefone, { etapa: ETAPAS.BURITIS_CONFIRMAR_COMPRA, pagamento: { produto: `Apostila ${cargo.titulo} — Buritis/MG`, valor: 19.90, tipo: 'cargo_buritis', cargoId: cargo.id } });

  zapi.salvarContato(telefone, session.nome || 'Lead', session.cidade || '', `Buritis - ${cargo.titulo}`).catch(() => {});

  const basico = det.modulosBasicos.slice(0, 4).join(', ');
  const especifico = det.modulosEspecificos.slice(0, 5).join(', ');

  return zapi.enviarTexto(telefone,
`📘 *Apostila ${cargo.titulo}*
Processo Seletivo Buritis/MG

📦 *Módulos Base:*
${basico}

🎯 *Conteúdo Específico:*
${especifico}

💰 *R$ 19,90* — pagamento via PIX

*1️⃣* ✅ Comprar — R$ 19,90
*2️⃣* 🔥 Ver COMBO completo — R$ 49,90
*3️⃣* 🔄 Escolher outro cargo`
  );
}

async function apresentarComboBuritis(telefone, nome) {
  updateSession(telefone, { etapa: ETAPAS.BURITIS_COMBO_CONFIRMAR });
  await zapi.enviarTexto(telefone,
`🔥 *COMBO COMPLETO — Buritis/MG*

Receba *todas as apostilas* do processo seletivo:
🏥 Área da Saúde (35 cargos)
🤝 Assistência Social (20 cargos)
📚 Educação (9 cargos)

✅ Módulos base + conteúdo específico em cada
✅ Questões comentadas
✅ Material organizado por cargo

💰 Separado: mais de R$ 1.200,00
🔥 *COMBO: R$ 49,90*`
  );
  await sleep(1500);
  return zapi.enviarTexto(telefone,
`*1️⃣* ✅ Quero o COMBO — R$ 49,90
*2️⃣* 🔍 Prefiro só o meu cargo — R$ 19,90
*3️⃣* ← Voltar`
  );
}

// ============================================================
// PRÉ-VESTIBULAR
// ============================================================
async function enviarApresentacaoPreVest(telefone, nome) {
  return zapi.enviarTexto(telefone,
`🎓 *Pré-Vestibular Smart Cursos Unaí*

*${nome}*, veja o que está incluído:

✅ Aulas presenciais — Seg a Sex, 19h às 22h
✅ Plataforma digital + aulas gravadas
✅ Apostilas trimestrais (~540 questões)
✅ Sala de estudos — 8h às 22h
✅ Professores especializados

💰 A partir de *R$ 595,90/mês* (até o dia 7)

*1️⃣* Saber mais detalhes
*2️⃣* Quero me matricular
*3️⃣* ← Voltar`
  );
}

async function processarPreVestInteresse(telefone, txt, session) {
  if (txt === '1') return zapi.enviarTexto(telefone, `Veja todos os detalhes aqui 👇\n\n${config.escola.landingPage}\n\nQualquer dúvida pode perguntar! 😊`);
  if (txt === '2') {
    updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE });
    await zapi.enviarTexto(telefone, `Ótimo, *${session.nome}*! 🎉\n\nVou avisar nossa equipe. Alguém entra em contato rapidinho! 😊\n_Seg-Sex 8h-18h | Sáb 8h-12h_`);
    return notificarAtendente(telefone, session.nome, 'Pré-vestibular / Matrícula');
  }
  if (txt === '3') { updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL }); return zapi.enviarTexto(telefone, MSG_MENU_GERAL(session.nome)); }
  return processarIA(telefone, txt, session);
}

// ============================================================
// INFORMÁTICA
// ============================================================
async function enviarMenuInfo(telefone, nome) {
  return zapi.enviarTexto(telefone,
`💻 *Cursos de Informática*

*${nome}*, qual modalidade te interessa?

*1️⃣* 🏫 *Presencial Completo* — 9 meses / 120h
   9x R$ 311,92 no cartão

*2️⃣* 🏢 *Empresarial Intensivo* — 3 meses
   10x R$ 99,79 no cartão

*3️⃣* 🌐 *Online* — no seu ritmo
   R$ 297,90 em até 10x

*0️⃣* ← Voltar`
  );
}

async function processarInfoTipo(telefone, txt, session) {
  if (txt === '0') { updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL }); return zapi.enviarTexto(telefone, MSG_MENU_GERAL(session.nome)); }
  const infos = {
    '1': `🏫 *Informática Presencial*\n9 meses | 2x/sem | 120h\n• Cartão: 9x R$ 311,92\n• Boleto: 9x R$ 349,90 + matrícula/material\n• À vista: R$ 2.456,37`,
    '2': `🏢 *Informática Empresarial*\n3 meses | Excel, Word, PowerPoint\n• Cartão: 10x R$ 99,79\n• À vista: R$ 899,90`,
    '3': `🌐 *Informática Online*\nNo seu ritmo, com certificado\n• Cartão: 10x R$ 29,79\n• À vista: R$ 297,90`,
  };
  if (!infos[txt]) return enviarMenuInfo(telefone, session.nome);
  updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE });
  await zapi.enviarTexto(telefone, `${infos[txt]}\n\nGostou? Posso te conectar com nossa equipe! 😊`);
  await sleep(500);
  await notificarAtendente(telefone, session.nome, `Informática — opção ${txt}`);
}

// ============================================================
// CURSOS ONLINE
// ============================================================
async function enviarMenuOnline(telefone, nome) {
  const cursos = config.cursosOnline;
  const linhas = cursos.map((c, i) => `*${i+1}️⃣* ${c.titulo} — *${fmt(c.valor)}*`).join('\n');
  return zapi.enviarTexto(telefone,
`🌐 *Cursos Online*

${linhas}

*0️⃣* ← Voltar

_Todos com certificado — até 10x no cartão!_ 💳`
  );
}

async function processarOnlineMenu(telefone, txt, session) {
  if (txt === '0') { updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL }); return zapi.enviarTexto(telefone, MSG_MENU_GERAL(session.nome)); }
  const curso = config.cursosOnline[parseInt(txt) - 1];
  if (!curso) return enviarMenuOnline(telefone, session.nome);
  updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE });
  await zapi.enviarTexto(telefone, `Ótima escolha, *${session.nome}*! 🎉\n\n*${curso.titulo}* — ${fmt(curso.valor)}\n\nVou avisar nossa equipe pra te dar acesso! 😊`);
  return notificarAtendente(telefone, session.nome, `Curso Online — ${curso.titulo}`);
}

// ============================================================
// COMPROVANTE DE PAGAMENTO
// ============================================================
async function processarComprovante(telefone, imageUrl, session) {
  await zapi.enviarTexto(telefone, MSG_VALIDANDO());
  const pag = session.pagamento;
  const resultado = await pagamento.validarComprovante(imageUrl, pag.valor);

  if (resultado.mensagem === 'ok') {
    await zapi.enviarTexto(telefone, MSG_APROVADO(session.nome));
    await sleep(800);
    await liberarProduto(telefone, pag, session.nome);
    updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL, pagamento: null });
    cancelarRemarketing(telefone);
  } else if (resultado.mensagem === 'valor_incorreto') {
    await zapi.enviarTexto(telefone, MSG_REPROVADO_VALOR(resultado.valor, pag.valor));
  } else if (resultado.mensagem === 'imagem_invalida') {
    await zapi.enviarTexto(telefone, MSG_IMAGEM_INVALIDA());
  } else {
    await zapi.enviarTexto(telefone, MSG_CONFIRMACAO_MANUAL(session.nome));
    await zapi.encaminharParaAtendente(telefone, session.nome, pag.produto, imageUrl);
  }
}

// ============================================================
// LIBERAÇÃO DO PRODUTO
// ============================================================
async function liberarProduto(telefone, pag, nome) {
  const nomeExibir = nome || 'aluno(a)';

  // BURITIS — entrega manual
  if (pag.tipo === 'cargo_buritis' || pag.tipo === 'combo_buritis') {
    await zapi.enviarTexto(telefone,
      `🎉 *Pedido confirmado, ${nomeExibir}!*\n\nSua apostila de *${pag.produto}* foi registrada com sucesso!\n\n📲 Nossa equipe vai te enviar o material aqui pelo WhatsApp em breve.\n\n_Seg-Sex 8h-18h | Sáb 8h-12h_ ⏱️\n\nQualquer dúvida é só chamar! 😊`
    );
    // Notifica equipe para envio manual
    await notificarAtendente(telefone, nome,
      `⚠️ ENVIO MANUAL NECESSÁRIO\nProduto: ${pag.produto}\nAguardando entrega da apostila de Buritis`
    );
    return;
  }

  // PARACATU — link automático
  if (pag.tipo === 'cargo_paracatu' && pag.driveId) {
    await zapi.enviarDocumento(telefone, pag.driveId, `SmartCursos_${pag.cargoId || 'apostila'}.pdf`,
      `📄 *${pag.produto}*\n_Smart Cursos Unaí — Bons estudos, ${nomeExibir}!_ 🎓`
    );
  } else if (pag.tipo === 'combo_paracatu') {
    await zapi.enviarTexto(telefone, `📦 Enviando todas as apostilas agora... pode levar alguns minutinhos! ⏳`);
    for (const area of config.apostilasDigitais.paracatu.areas) {
      for (const cargo of area.cargos) {
        if (cargo.driveId) {
          await zapi.enviarDocumento(telefone, cargo.driveId, `SmartCursos_${cargo.id}.pdf`, `📄 ${cargo.titulo}`);
          await sleep(2000);
        }
      }
    }
  }

  await sleep(500);
  await zapi.enviarTexto(telefone,
    `🎉 Pronto, *${nomeExibir}*! Tudo enviado!\n\nAgora é hora de estudar com foco — você está no caminho certo! 💪\n\nQualquer dúvida sobre o conteúdo, pode chamar. 😊\n\n_Digite *menu* pra ver outras opções._`
  );
}

// ============================================================
// CONFIRMAÇÃO MANUAL DO ATENDENTE
// ============================================================
async function processarComandoAtendente(telefoneAtendente, txt) {
  const partes = txt.split(' ');
  const acao = partes[0].toLowerCase();
  const telefoneCliente = partes[1];
  if (!telefoneCliente) return;
  const sessionCliente = getSession(telefoneCliente);
  if (acao === 'confirmar') {
    const pag = sessionCliente.pagamento;
    if (!pag) return zapi.enviarTexto(telefoneAtendente, `⚠️ Sessão não encontrada para ${telefoneCliente}`);
    await zapi.enviarTexto(telefoneCliente, MSG_APROVADO(sessionCliente.nome));
    await sleep(800);
    await liberarProduto(telefoneCliente, pag, sessionCliente.nome);
    updateSession(telefoneCliente, { etapa: ETAPAS.MENU_PRINCIPAL, pagamento: null });
    cancelarRemarketing(telefoneCliente);
    return zapi.enviarTexto(telefoneAtendente, `✅ Liberado para ${sessionCliente.nome} (${telefoneCliente})`);
  }
  if (acao === 'recusar') {
    await zapi.enviarTexto(telefoneCliente, `Hmm, não conseguimos confirmar seu pagamento 😔\n\nPode verificar e enviar o comprovante correto? Ou chamar um atendente! 😊`);
    return zapi.enviarTexto(telefoneAtendente, `❌ Recusado para ${telefoneCliente}`);
  }
}

// ============================================================
// DETECÇÃO DE INTENÇÃO — texto livre
// ============================================================
async function detectarIntencaoERotear(telefone, txt, session) {
  const lower = txt.toLowerCase();

  if (/paracatu|ibgp/.test(lower)) {
    updateSession(telefone, { etapa: ETAPAS.PARACATU_AREAS });
    await zapi.enviarTexto(telefone, `Vi que você quer saber sobre Paracatu! 😊\n`);
    await sleep(400);
    return zapi.enviarTexto(telefone, MSG_MENU_PARACATU());
  }
  if (/buritis/.test(lower)) {
    updateSession(telefone, { etapa: ETAPAS.BURITIS_AREAS });
    await zapi.enviarTexto(telefone, `Vi que você quer saber sobre Buritis! 😊\n`);
    await sleep(400);
    return enviarMenuBuritis(telefone);
  }
  if (/apostila|concurso|cargo|material/.test(lower)) {
    updateSession(telefone, { etapa: ETAPAS.APOSTILAS_CIDADE });
    return zapi.enviarTexto(telefone, MSG_MENU_CIDADES());
  }
  if (/enem|vestibular|pré-vestibular/.test(lower)) {
    updateSession(telefone, { etapa: ETAPAS.PRE_VEST_INTERESSE });
    return enviarApresentacaoPreVest(telefone, session.nome || 'amigo(a)');
  }
  if (/informática|informatica|excel|word/.test(lower)) {
    updateSession(telefone, { etapa: ETAPAS.INFO_TIPO });
    return enviarMenuInfo(telefone, session.nome || 'amigo(a)');
  }
  if (/preço|valor|quanto|custa/.test(lower)) {
    return zapi.enviarTexto(telefone,
      `💰 *Nossos preços:*\n\n• Apostila por cargo: *R$ 19,90*\n• COMBO completo: *R$ 49,90*\n• Pré-vestibular: a partir de *R$ 595,90/mês*\n\nQual você tem interesse? 😊`
    );
  }
  return processarIA(telefone, txt, session);
}

// ============================================================
// NOTIFICAÇÃO AO ATENDENTE
// ============================================================
async function notificarAtendente(telefoneCliente, nome, origem) {
  const hora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  const msg =
`🔔 *NOVO LEAD*

👤 *${nome || 'não informado'}*
📱 ${telefoneCliente}
📍 ${origem}
🕐 ${hora}

_Responda diretamente nesse número!_ 👆`;
  await zapi.enviarTexto(config.escola.numeroAtendimento, msg);
}

// ============================================================
// CONVERSA LIVRE COM IA
// ============================================================
async function processarIA(telefone, txt, session) {
  const historico = session.historico || [];
  historico.push({ role: 'user', content: txt });
  const resposta = await ia.responderPergunta(txt, historico);
  historico.push({ role: 'assistant', content: resposta });
  updateSession(telefone, { historico: historico.slice(-16), etapa: ETAPAS.CONVERSA_LIVRE });
  await zapi.enviarTexto(telefone, resposta);
  await sleep(500);
  return zapi.enviarTexto(telefone, `_Digite *menu* pra ver as opções ou continue perguntando!_ 😊`);
}

// ============================================================
// HELPERS
// ============================================================
function formatarNome(txt) {
  return txt.split(' ').slice(0, 2)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}

module.exports = { processarMensagem };
