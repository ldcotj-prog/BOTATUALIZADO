const zapi = require('./zapi');
const ia = require('./ia');
const pagamento = require('./pagamento');
const config = require('./config');
const { getSession, updateSession, resetSession, ETAPAS } = require('./storage');

const fmt = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================================
// DETECÇÃO DE SERVIÇO (keyword do anúncio)
// ============================================================
function detectarServico(texto) {
  const t = texto.toLowerCase();
  for (const [srv, words] of Object.entries(config.keywords)) {
    if (words.some(w => t.includes(w))) return srv;
  }
  return null;
}

// ============================================================
// SAUDAÇÃO PERSONALIZADA POR HORÁRIO
// ============================================================
function saudacao() {
  const h = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false });
  const hora = parseInt(h);
  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ============================================================
// CATÁLOGO DE DETALHES DAS APOSTILAS
// ============================================================
const DETALHES_APOSTILAS = {
  enfermagem:      { paginas: 189, questoes: 'por capítulo', esp: 'SUS e bases legais, PNAB, Vigilância em Saúde (ANVISA/SNVS), Imunizações (PNI), SAE, Diagnósticos NANDA-I, Doenças crônicas e transmissíveis, Ciclos de vida' },
  farmacia:        { paginas: 153, questoes: null,           esp: 'Farmacologia clínica, Assistência farmacêutica no SUS, Farmácia hospitalar, Legislação farmacêutica, Controle de medicamentos' },
  radiologia:      { paginas: 138, questoes: '~63',         esp: 'Módulo 5: Direitos Humanos, Direito Constitucional, Direito Administrativo, Direito Penal, CTB, ECA, Estatuto das Guardas, Legislação Municipal Paracatu' },
  odontologia:     { paginas: 155, questoes: '~60',         esp: 'Diagnóstico de lesões bucais, Clínica odontológica, Saúde bucal coletiva, Ética profissional' },
  fisioterapia:    { paginas: 208, questoes: 'por capítulo',esp: 'Fundamentos da Fisioterapia (COFFITO), Cinesioterapia, Fisioterapia traumato-ortopédica, Fisioterapia respiratória e cardiovascular, Legislação e ética' },
  analises:        { paginas: 214, questoes: '~186',        esp: 'Hematologia, Bioquímica clínica, Microbiologia, Parasitologia, Imunologia, Boas práticas laboratoriais' },
  vigilancia:      { paginas: 154, questoes: null,          esp: 'Legislação sanitária, ANVISA, Vigilância de alimentos, Vigilância de serviços de saúde, Epidemiologia aplicada' },
  peb:             { paginas: 144, questoes: '~68',         esp: 'Módulo 5: Direitos Humanos, Direito Constitucional, Direito Administrativo, Direito Penal, ECA, Estatuto do Idoso, Legislação Municipal Paracatu' },
  peb_arte:        { paginas: 199, questoes: '~168',        esp: 'Módulo 5: Direitos Humanos, Direito Constitucional, Direito Penal, ECA, Estatuto do Idoso, Legislação Municipal Paracatu' },
  peb_historia:    { paginas: 154, questoes: null,          esp: 'História do Brasil, História de Minas Gerais e Paracatu, Historiografia, Didática do ensino de história' },
  supervisor:      { paginas: 173, questoes: null,          esp: 'Gestão escolar democrática, Avaliação educacional, LDB/PNE/FUNDEB, Educação inclusiva, Formação continuada de professores, Relação escola-família' },
  educador_creche: { paginas: 117, questoes: null,          esp: 'Legislação da primeira infância, Desenvolvimento infantil 0-3 anos, O cuidar e o educar na creche, O brincar e as linguagens da criança' },
  bibliotecario:   { paginas: 196, questoes: null,          esp: 'Biblioteconomia, Catalogação, Gestão de acervos, Biblioteca escolar' },
  oficial_adm:     { paginas: 264, questoes: null,          esp: 'Administração pública, Direito administrativo, Gestão de documentos, Ética no serviço público — a apostila mais completa do concurso!' },
  aux_secretaria:  { paginas: 161, questoes: '~230',        esp: 'Administração pública, Redação oficial, Atendimento ao público, Relações humanas, Arquivo e protocolo' },
  adm_aux:         { paginas: 194, questoes: '~230',        esp: 'Administração geral, Gestão de processos, Comunicação organizacional, Ética profissional' },
  almoxarifado:    { paginas: 197, questoes: '~230',        esp: 'Gestão de estoques, Almoxarifado e patrimônio, Compras públicas, Licitações' },
  assist_social:   { paginas: 230, questoes: '~430',        esp: 'Fundamentos do Serviço Social, Ética profissional, ECA, Serviço Social no SUS, Políticas sociais e seguridade social' },
  contabilidade:   { paginas: 205, questoes: '~430',        esp: 'Contabilidade geral, Escrituração e demonstrações financeiras, Orçamento público (PPA/LDO/LOA), LRF, Contabilidade de custos' },
  advogado:        { paginas: 135, questoes: '~63',         esp: 'Módulo 5: Direitos Humanos, Direito Constitucional e Administrativo, Direito Penal geral e crimes, CTB, ECA, Legislação Municipal Paracatu' },
  gcm:             { paginas: 182, questoes: '~88',         esp: 'Módulo 5: Segurança Pública (CF art.144), Direito Penal, Estatuto Geral das Guardas Municipais, CTB, ECA, Estatuto do Idoso, Uso da Força, Legislação Paracatu' },
  psicologia:      { paginas: 136, questoes: '~63',         esp: 'Módulo 5: Direitos Humanos, Direito Constitucional, Direito Administrativo, Direito Penal, ECA, Legislação Municipal Paracatu' },
  vigia:           { paginas: 169, questoes: null,          esp: 'Controle de acesso e rondas, Prevenção de incêndios, Primeiros socorros, Segurança do trabalho (EPI/NR), Ética no serviço público (LIMPE)' },
  eng_eletrica_1:  { paginas: 152, questoes: null,          esp: 'Eletrotécnica, Instalações elétricas, Normas técnicas ABNT, Manutenção elétrica predial' },
  eng_eletrica_2:  { paginas: 152, questoes: null,          esp: 'Instalações elétricas avançadas, Projetos elétricos, Normas de segurança elétrica' },
  eng_ambiental:   { paginas: 189, questoes: null,          esp: 'Saneamento ambiental (água/esgoto/resíduos), Gestão ambiental e ISO 14001, Educação ambiental, Ética profissional' },
  motorista:       { paginas: 204, questoes: '~239',        esp: 'CTB completo e crimes de trânsito, Direção defensiva, Veículos especiais, Saúde ocupacional para motoristas, História de Paracatu, Simulado final com gabarito' },
};

// ============================================================
// MENSAGENS — COPY DE ALTA CONVERSÃO
// ============================================================

const MSG_BOAS_VINDAS = () => {
  const s = saudacao();
  return `${s}! 👋 Que bom ter você aqui!

Eu sou o *JARVIS* 🤖 — assistente virtual da *Smart Cursos Unaí*, pronto pra te ajudar a conquistar sua aprovação! 🏆

Antes de começar, como posso te chamar?`;
};

const MSG_ACOLHIMENTO = (nome, servico) => {
  const msgs = {
    paracatu: `Que nome bonito, *${nome}*! 😊\n\nEntão você tá de olho no *Concurso de Paracatu 2026*... boa escolha! São *272 vagas* e a prova tá chegando em *23 de agosto*.\n\nA gente preparou um material caprichado pra esse concurso. Me diz: você já sabe qual cargo vai disputar? 👇`,
    prevestibular: `Prazer, *${nome}*! 😊\n\nVi que você tem interesse no nosso *Pré-vestibular*. Boa decisão investir na sua preparação!\n\nMe conta um pouco: você tá se preparando pro *ENEM*, pra algum vestibular específico, ou os dois? 👇`,
    informatica: `Oi, *${nome}*! Que bom falar com você 😊\n\nInformática hoje é praticamente *obrigatória* em qualquer carreira. Você tá no lugar certo!\n\nMe diz: você tá buscando o curso pra uso pessoal, pro trabalho, ou pra um concurso específico? 👇`,
    default: `Prazer, *${nome}*! 😊\n\nSeja bem-vindo(a) à *Smart Cursos Unaí* — somos referência em Unaí-MG em preparação para concursos, pré-vestibular e cursos profissionalizantes.\n\nO que te trouxe até aqui hoje? Posso te ajudar com alguma coisa específica? 👇`
  };
  return msgs[servico] || msgs.default;
};

const MSG_MENU_PARACATU = () =>
`Perfeito! Preparei tudo certinho pra você 📋

O que você prefere?

*1️⃣* 🎯 Quero a apostila do *meu cargo específico*
*2️⃣* 🔥 Ver o *COMBO COMPLETO* _(todas as apostilas por R$ 49,90)_
*3️⃣* ❓ Ainda não sei meu cargo — me ajuda?

_É só digitar o número_ 👇`;

const MSG_MENU_GERAL = (nome) =>
`*${nome}*, o que posso fazer por você hoje? 😊

*1️⃣* 📄 Apostilas — *Concurso Paracatu 2026*
*2️⃣* 🎓 *Pré-vestibular / ENEM*
*3️⃣* 💻 Cursos de *Informática*
*4️⃣* 🌐 Cursos *Online e Profissionalizantes*
*5️⃣* 🏆 Ver *todos os produtos*
*6️⃣* 💬 Tenho uma *dúvida*
*7️⃣* 👤 Quero falar com uma *pessoa*

_Digite o número_ 👇`;

const MSG_PIX = (nome, produto, valor) =>
`Ótima escolha, *${nome}*! 🎉

Segue os dados pra pagamento:

🏷 *${produto}*
💰 *Valor: ${fmt(valor)}*

📲 *Chave PIX (CNPJ):*
\`31.852.681/0001-40\`

Assim que você pagar, é só *enviar o comprovante aqui* que eu libero seu material na hora! ⚡

_Qualquer dúvida, pode perguntar_ 😊`;

const MSG_AGUARDANDO = () =>
`⏳ Pode pagar com calma que estou aqui esperando!

Quando terminar, é só mandar o *print ou foto do comprovante* por aqui. 📲`;

const MSG_VALIDANDO = () => `🔍 Deixa eu verificar seu pagamento...`;

const MSG_APROVADO = (nome) =>
`✅ *Pagamento confirmado!*

Obrigado pela confiança, *${nome}*! 🙏

Agora deixa eu te enviar seu material... 📦`;

const MSG_REPROVADO_VALOR = (pago, esperado) =>
`Hmm, percebi uma diferença no valor... 🤔

O comprovante mostra *${fmt(pago)}*, mas o valor do pedido é *${fmt(esperado)}*.

Pode ter acontecido algum engano no valor digitado. Me envia o comprovante correto ou chama um atendente que a gente resolve rapidinho! 😊`;

const MSG_IMAGEM_INVALIDA = () =>
`Não consegui identificar um comprovante PIX nessa imagem 🤔

Pode tentar enviar um *print mais nítido* do comprovante? Às vezes a foto fica com baixa resolução e não consigo ler os dados. 📲`;

const MSG_CONFIRMACAO_MANUAL = (nome) =>
`Recebi seu comprovante! 📨

Vou passar pra nossa equipe conferir rapidinho. Em breve você recebe a confirmação, *${nome}*! ⏱️

Geralmente leva só alguns minutinhos 😊`;

const MSG_ENCERRAMENTO = (nome) =>
`Foi um prazer te atender, *${nome}*! 😊

Qualquer dúvida que surgir, pode chamar a qualquer momento — estou sempre por aqui!

Bons estudos e boa sorte na prova! Você vai arrasar! 🚀🏆

_Smart Cursos Unaí — Sua aprovação é nossa missão!_`;

// ============================================================
// PROCESSADOR PRINCIPAL
// ============================================================
async function processarMensagem(telefone, dados) {
  const session = getSession(telefone);
  const { tipo, conteudo, caption } = dados;
  const txt = tipo === 'texto' ? conteudo.trim() : (caption || '');
  const lower = txt.toLowerCase();

  console.log(`[FLOW] ${telefone} | ${session.etapa} | tipo:${tipo} | "${txt.slice(0, 60)}"`);

  // Comprovante de pagamento
  if (tipo === 'imagem' && session.etapa === ETAPAS.AGUARDANDO_PAGAMENTO) {
    return processarComprovante(telefone, conteudo, session);
  }

  // Comandos do atendente
  if (lower.startsWith('confirmar ') || lower.startsWith('recusar ')) {
    return processarComandoAtendente(telefone, txt);
  }

  // Palavras globais
  if (['menu', 'inicio', 'início', 'voltar', 'home', 'oi', 'olá', 'ola', 'hey'].includes(lower)) {
    if (!session.nome) {
      resetSession(telefone);
      updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_NOME, servico: null });
      return zapi.enviarTexto(telefone, MSG_BOAS_VINDAS());
    }
    updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL });
    return zapi.enviarTexto(telefone, MSG_MENU_GERAL(session.nome));
  }

  if (['sair', 'encerrar', 'tchau', 'até mais', 'obrigado', 'obrigada', 'vlw', 'valeu'].includes(lower)) {
    await zapi.enviarTexto(telefone, MSG_ENCERRAMENTO(session.nome || 'amigo(a)'));
    return resetSession(telefone);
  }

  switch (session.etapa) {

    case ETAPAS.INICIO:
      await zapi.enviarTexto(telefone, MSG_BOAS_VINDAS());
      return updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_NOME, servico: detectarServico(txt) });

    case ETAPAS.AGUARDANDO_NOME: {
      const nome = formatarNome(txt);
      const servico = session.servico || detectarServico(txt);
      updateSession(telefone, { nome, servico });
      await zapi.enviarTexto(telefone, MSG_ACOLHIMENTO(nome, servico));
      await sleep(800);
      if (servico === 'paracatu') {
        updateSession(telefone, { etapa: ETAPAS.PARACATU_AREAS });
        return zapi.enviarTexto(telefone, MSG_MENU_PARACATU());
      }
      updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL });
      return zapi.enviarTexto(telefone, MSG_MENU_GERAL(nome));
    }

    case ETAPAS.MENU_PRINCIPAL:
      return processarMenuPrincipal(telefone, txt, session);

    case ETAPAS.PARACATU_AREAS:
    case ETAPAS.COMBO_CONFIRMAR:
      return processarParacatuAreas(telefone, txt, session);

    case ETAPAS.PARACATU_CARGOS:
    case ETAPAS.PARACATU_CONFIRMAR_COMPRA:
      return processarParacatuCargos(telefone, txt, session);

    case ETAPAS.INFO_TIPO:
      return processarInfoTipo(telefone, txt, session);

    case ETAPAS.CONCURSOS_MENU:
      return processarConcursosMenu(telefone, txt, session);

    case ETAPAS.ONLINE_MENU:
      return processarOnlineMenu(telefone, txt, session);

    case ETAPAS.PRE_VEST_INTERESSE:
      return processarPreVestInteresse(telefone, txt, session);

    case ETAPAS.MATRICULA_MENU:
      return processarMatricula(telefone, txt, session);

    case ETAPAS.AGUARDANDO_PAGAMENTO:
      await zapi.enviarTexto(telefone,
        `Ainda aguardando seu comprovante pra *${session.pagamento?.produto}* 😊\n\nQuando pagar, manda o print aqui que libero na hora! 📲\n\nDigite *menu* se quiser ver outras opções.`
      );
      break;

    case ETAPAS.CONVERSA_LIVRE:
      return processarIA(telefone, txt, session);

    default:
      resetSession(telefone);
      await zapi.enviarTexto(telefone, MSG_BOAS_VINDAS());
      return updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_NOME });
  }
}

// ============================================================
// MENU PRINCIPAL
// ============================================================
async function processarMenuPrincipal(telefone, txt, session) {
  const acoes = {
    '1': async () => {
      updateSession(telefone, { etapa: ETAPAS.PARACATU_AREAS });
      await zapi.enviarTexto(telefone, `Perfeito! Deixa eu te mostrar o que preparamos 👇\n`);
      await sleep(600);
      return zapi.enviarTexto(telefone, MSG_MENU_PARACATU());
    },
    '2': () => { updateSession(telefone, { etapa: ETAPAS.PRE_VEST_INTERESSE }); return enviarApresentacaoPreVest(telefone, session.nome); },
    '3': () => { updateSession(telefone, { etapa: ETAPAS.INFO_TIPO }); return enviarMenuInfo(telefone, session.nome); },
    '4': () => { updateSession(telefone, { etapa: ETAPAS.ONLINE_MENU }); return enviarMenuOnline(telefone, session.nome); },
    '5': () => zapi.enviarTexto(telefone, `Aqui você encontra tudo que temos disponível 👇\n\n${config.escola.landingPage}\n\nQualquer dúvida é só chamar! 😊`),
    '6': () => { updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE }); return zapi.enviarTexto(telefone, `Claro! Pode perguntar à vontade, estou aqui pra ajudar! 😊\n\n_Digite *menu* quando quiser voltar às opções._`); },
    '7': async () => {
      updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE });
      await zapi.enviarTexto(telefone, `Claro, *${session.nome}*! Vou avisar nossa equipe agora. 😊\n\nEm breve alguém entra em contato com você!\n_Atendimento: Seg-Sex 8h-18h | Sáb 8h-12h_ ⏱️`);
      return notificarAtendente(telefone, session.nome, 'Menu principal');
    },
  };
  if (acoes[txt]) return acoes[txt]();
  return processarIA(telefone, txt, session);
}

// ============================================================
// FLUXO PARACATU — MENU PRINCIPAL
// ============================================================
async function enviarMenuParacatu(telefone, nome) {
  return zapi.enviarTexto(telefone, MSG_MENU_PARACATU());
}

async function processarParacatuAreas(telefone, txt, session) {
  // COMBO
  if (txt === '0' || txt === '2' && session.etapa !== ETAPAS.COMBO_CONFIRMAR) {
    return apresentarCombo(telefone, session.nome);
  }

  // Dentro do fluxo de confirmação do combo
  if (session.etapa === ETAPAS.COMBO_CONFIRMAR) {
    if (txt === '1') {
      updateSession(telefone, {
        etapa: ETAPAS.AGUARDANDO_PAGAMENTO,
        pagamento: { produto: 'COMBO Completo Paracatu 2026 — 27 apostilas', valor: config.apostilasDigitais.precoCombo, tipo: 'combo_paracatu' }
      });
      await zapi.enviarTexto(telefone, MSG_PIX(session.nome, 'COMBO Completo Paracatu 2026', config.apostilasDigitais.precoCombo));
      await sleep(600);
      return zapi.enviarTexto(telefone, MSG_AGUARDANDO());
    }
    if (txt === '2') {
      updateSession(telefone, { etapa: ETAPAS.PARACATU_AREAS });
      return zapi.enviarTexto(telefone, MSG_MENU_PARACATU());
    }
    if (txt === '3') {
      updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL });
      return zapi.enviarTexto(telefone, MSG_MENU_GERAL(session.nome));
    }
    return zapi.enviarTexto(telefone, `Digite *1*, *2* ou *3* 👇`);
  }

  // Ainda não sei meu cargo
  if (txt === '3') {
    updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE });
    return zapi.enviarTexto(telefone,
      `Sem problema, fico feliz em ajudar! 😊\n\nMe conta um pouco sobre você: qual é a sua formação ou área de atuação? Assim consigo te indicar o cargo mais adequado pra você nesse concurso! 👇`
    );
  }

  // Escolha de apostila por cargo
  if (txt === '1') {
    updateSession(telefone, { etapa: ETAPAS.PARACATU_AREAS });
    const areas = config.apostilasDigitais.paracatu.areas;
    const linhas = areas.map((a, i) => `*${i+1}️⃣* ${a.emoji} ${a.titulo}`).join('\n');
    return zapi.enviarTexto(telefone,
      `Ótimo! Qual é a sua área? 👇\n\n${linhas}\n\n*0️⃣* ← Voltar`
    );
  }

  // Seleção de área
  const areas = config.apostilasDigitais.paracatu.areas;
  const area = areas[parseInt(txt) - 1];
  if (!area) return zapi.enviarTexto(telefone, `Hmm, não encontrei essa opção 🤔\n\n${MSG_MENU_PARACATU()}`);
  updateSession(telefone, { etapa: ETAPAS.PARACATU_CARGOS, areaAtual: area.id });
  const linhas = area.cargos.map((c, i) => `*${i+1}️⃣* ${c.titulo}`).join('\n');
  return zapi.enviarTexto(telefone,
    `${area.emoji} *${area.titulo}*\n\nQual é o seu cargo? 👇\n\n${linhas}\n\n*0️⃣* ← Voltar\n\n_Dica: se ainda não decidiu, o COMBO por R$49,90 vale muito mais! 😉_`
  );
}

// ============================================================
// APRESENTAÇÃO DO COMBO — GATILHOS MENTAIS
// ============================================================
async function apresentarCombo(telefone, nome) {
  updateSession(telefone, { etapa: ETAPAS.COMBO_CONFIRMAR });

  await zapi.enviarTexto(telefone,
    `*${nome}*, deixa eu te mostrar algo que faz muito sentido... 👀`
  );
  await sleep(1500);

  await zapi.enviarTexto(telefone,
`🔥 *COMBO COMPLETO — Paracatu 2026*

Imagina ter acesso a *TODAS as apostilas* do concurso de uma vez só:

🏥 7 apostilas da Área da Saúde
📚 6 apostilas da Área da Educação
🗂 6 apostilas da Área Administrativa
⚖ 4 apostilas de Jurídica e Segurança
⚙ 4 apostilas da Área Técnica

*Total: 27 apostilas completas* 📦`
  );
  await sleep(2000);

  await zapi.enviarTexto(telefone,
`E o melhor: cada apostila vem com *tudo certinho pra prova*:

✅ Conteúdo 100% baseado no Edital IBGP
✅ 4 módulos base em TODAS: Língua Portuguesa, Raciocínio Lógico, Informática e Conhecimentos Gerais
✅ Conteúdo específico do cargo
✅ Questões comentadas no estilo da banca
✅ Linguagem clara e objetiva — sem enrolação`
  );
  await sleep(2000);

  const total = (config.apostilasDigitais.precoCargo * 27).toFixed(2).replace('.', ',');
  const economia = (config.apostilasDigitais.precoCargo * 27 - config.apostilasDigitais.precoCombo).toFixed(2).replace('.', ',');

  await zapi.enviarTexto(telefone,
`💡 *Agora o que realmente importa:*

Se você fosse comprar cada uma separado:
27 × R$ 19,90 = *R$ ${total}*

No *COMBO* você paga apenas:
🔥 *R$ 49,90*

Isso é *R$ ${economia} de economia!*
É como levar *25 apostilas de graça* 🎁

E se você mudar de ideia sobre o cargo antes da prova? Com o COMBO você já tem tudo coberto! 🧠`
  );
  await sleep(2000);

  return zapi.enviarTexto(telefone,
`⚡ *Pagamento via PIX e acesso imediato!*

Todos os links chegam aqui no WhatsApp em segundos, logo após a confirmação do pagamento.

A prova é em *23 de agosto* — quanto antes você começar a estudar, maior a vantagem! ⏰

*1️⃣* ✅ Quero o COMBO — *R$ 49,90*
*2️⃣* 🔍 Prefiro só o meu cargo — R$ 19,90
*3️⃣* 💬 Tenho uma dúvida antes`
  );
}

// ============================================================
// APOSTILA POR CARGO — APRESENTAÇÃO COM DETALHES
// ============================================================
async function processarParacatuCargos(telefone, txt, session) {
  if (txt === '0') {
    updateSession(telefone, { etapa: ETAPAS.PARACATU_AREAS });
    const areas = config.apostilasDigitais.paracatu.areas;
    const linhas = areas.map((a, i) => `*${i+1}️⃣* ${a.emoji} ${a.titulo}`).join('\n');
    return zapi.enviarTexto(telefone, `Qual é a sua área? 👇\n\n${linhas}\n\n*0️⃣* ← Voltar`);
  }

  if (session.etapa === ETAPAS.PARACATU_CONFIRMAR_COMPRA) {
    if (txt === '1') {
      const pag = session.pagamento;
      updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_PAGAMENTO });
      await zapi.enviarTexto(telefone, MSG_PIX(session.nome, pag.produto, pag.valor));
      await sleep(600);
      return zapi.enviarTexto(telefone, MSG_AGUARDANDO());
    }
    if (txt === '2') {
      return apresentarCombo(telefone, session.nome);
    }
    if (txt === '3') {
      const area = config.apostilasDigitais.paracatu.areas.find(a => a.id === session.areaAtual);
      updateSession(telefone, { etapa: ETAPAS.PARACATU_CARGOS, pagamento: null });
      const linhas = area ? area.cargos.map((c, i) => `*${i+1}️⃣* ${c.titulo}`).join('\n') : '';
      return zapi.enviarTexto(telefone, `Claro! Escolha o cargo: 👇\n\n${linhas}\n\n*0️⃣* ← Voltar`);
    }
    return processarIA(telefone, txt, session);
  }

  const area = config.apostilasDigitais.paracatu.areas.find(a => a.id === session.areaAtual);
  if (!area) return enviarMenuParacatu(telefone, session.nome);
  const cargo = area.cargos[parseInt(txt) - 1];
  if (!cargo) return zapi.enviarTexto(telefone, `Hmm, não encontrei essa opção 🤔\n\nEscolha de 1 a ${area.cargos.length} ou *0* pra voltar.`);

  const det = DETALHES_APOSTILAS[cargo.id] || { paginas: null, questoes: null, esp: 'Conteúdo conforme edital IBGP' };
  const questoesInfo = det.questoes ? `❓ *${det.questoes} questões comentadas*\n` : '';
  const paginasInfo = det.paginas ? `📄 *${det.paginas} páginas de conteúdo*\n` : '';

  updateSession(telefone, {
    etapa: ETAPAS.PARACATU_CONFIRMAR_COMPRA,
    pagamento: {
      produto: `Apostila ${cargo.titulo} — Paracatu 2026`,
      valor: config.apostilasDigitais.precoCargo,
      tipo: 'cargo_paracatu',
      cargoId: cargo.id,
      driveId: cargo.driveId
    }
  });

  return zapi.enviarTexto(telefone,
`📘 *Apostila ${cargo.titulo}*
Concurso Paracatu 2026 — IBGP

${paginasInfo}${questoesInfo}
📦 *Módulos Base incluídos:*
• Língua Portuguesa (16 tópicos)
• Raciocínio Lógico (13 tópicos)
• Noções de Informática (13 tópicos)
• Conhecimentos Gerais (14 tópicos)

🎯 *Conteúdo Específico do seu cargo:*
${det.esp}

💰 *R$ 19,90* — Acesso imediato via PIX

*1️⃣* ✅ Quero essa apostila
*2️⃣* 🔥 Ver o COMBO completo _(27 apostilas por R$ 49,90)_
*3️⃣* 🔄 Escolher outro cargo`
  );
}

// ============================================================
// PRÉ-VESTIBULAR
// ============================================================
async function enviarApresentacaoPreVest(telefone, nome) {
  return zapi.enviarTexto(telefone,
`🎓 *Pré-Vestibular Smart Cursos Unaí*

*${nome}*, olha o que você tem acesso sendo nosso aluno:

✅ Aulas presenciais — Seg a Sex, 19h às 22h
✅ Plataforma digital + aulas gravadas
✅ Apostilas trimestrais (~540 questões cada)
✅ Sala de estudos aberta das 8h às 22h
✅ Professores especializados por disciplina
✅ Suporte pedagógico individualizado

💰 A partir de *R$ 595,90/mês* _(pagando até o dia 7)_

*1️⃣* Quero conhecer melhor
*2️⃣* Quero me matricular
*3️⃣* ← Voltar`
  );
}

async function processarPreVestInteresse(telefone, txt, session) {
  if (txt === '1') return zapi.enviarTexto(telefone, `Aqui você encontra todos os detalhes, grade curricular e nosso corpo docente 👇\n\n${config.escola.landingPage}\n\nQualquer dúvida pode perguntar! 😊`);
  if (txt === '2') {
    updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE });
    await zapi.enviarTexto(telefone, `Que ótimo, *${session.nome}*! 🎉\n\nVou avisar nossa equipe que você quer se matricular. Alguém entra em contato rapidinho pra fechar tudo! 😊\n\n_Seg-Sex 8h-18h | Sáb 8h-12h_`);
    return notificarAtendente(telefone, session.nome, 'Pré-vestibular / Matrícula');
  }
  if (txt === '3') {
    updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL });
    return zapi.enviarTexto(telefone, MSG_MENU_GERAL(session.nome));
  }
  return processarIA(telefone, txt, session);
}

// ============================================================
// INFORMÁTICA
// ============================================================
async function enviarMenuInfo(telefone, nome) {
  return zapi.enviarTexto(telefone,
`💻 *Cursos de Informática — Smart Cursos Unaí*

*${nome}*, temos 3 opções pra você:

*1️⃣* 🏫 *Presencial Completo* — 9 meses / 120h
   Perfeito pra quem quer uma formação completa
   A partir de *9x R$ 311,92* no cartão

*2️⃣* 🏢 *Empresarial Intensivo* — 3 meses
   Excel, Word, PowerPoint — foco no mercado
   A partir de *10x R$ 99,79* no cartão

*3️⃣* 🌐 *Online* — no seu ritmo, onde quiser
   Acesso imediato à plataforma
   *R$ 297,90* em até 10x

*0️⃣* ← Voltar

_Qual faz mais sentido pra você?_ 👇`
  );
}

async function processarInfoTipo(telefone, txt, session) {
  if (txt === '0') {
    updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL });
    return zapi.enviarTexto(telefone, MSG_MENU_GERAL(session.nome));
  }
  const infos = {
    '1': { titulo: 'Informática Presencial — 9 meses', detalhe: `🏫 *Informática Presencial Completa*\n\n📋 9 meses | 2x/semana | 1h30 por aula\n🏆 Certificado de 120 horas\n\n📚 Conteúdo:\nInformática básica ao avançado, Windows, Word, Excel, PowerPoint, Internet, Hardware e Software\n\n💰 *Investimento:*\n• Cartão: 9x R$ 311,92 _(sem matrícula e material!)_\n• Boleto: 9x R$ 349,90 + matrícula R$100 + material R$100\n• À vista: R$ 2.456,37` },
    '2': { titulo: 'Informática Empresarial — 3 meses', detalhe: `🏢 *Informática Empresarial Intensivo*\n\n📋 3 meses de duração\n🎯 Foco total em ferramentas do mercado de trabalho\n\n📚 Conteúdo:\nExcel avançado, Word profissional, PowerPoint, ferramentas empresariais\n\n💰 *Investimento:*\n• Cartão: 10x R$ 99,79\n• Boleto: 4x R$ 262,50\n• À vista: R$ 899,90` },
    '3': { titulo: 'Informática Online', detalhe: `🌐 *Informática Online*\n\n📋 Estude no seu ritmo, de qualquer lugar\n📱 Acesso pelo celular ou computador\n🎓 Certificado digital\n\n💰 *Investimento:*\n• Cartão: 10x R$ 29,79\n• À vista: R$ 297,90` },
  };
  const info = infos[txt];
  if (!info) return enviarMenuInfo(telefone, session.nome);

  updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE });
  await zapi.enviarTexto(telefone, `${info.detalhe}\n\nGostou? Posso te conectar com nossa equipe pra fechar a matrícula! 😊\n\n*1* - Sim, quero me matricular!\n*2* - Tenho uma dúvida`);
}

// ============================================================
// CONCURSOS
// ============================================================
async function processarConcursosMenu(telefone, txt, session) {
  if (txt === '0') {
    updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL });
    return zapi.enviarTexto(telefone, MSG_MENU_GERAL(session.nome));
  }
  const outros = config.apostilasDigitais.outrosConcursos;
  const item = outros[parseInt(txt) - 1];
  if (!item) return zapi.enviarTexto(telefone, `Hmm, não encontrei essa opção 🤔`);
  updateSession(telefone, {
    etapa: ETAPAS.AGUARDANDO_PAGAMENTO,
    pagamento: { produto: `Apostila ${item.titulo}`, valor: config.apostilasDigitais.precoCargo, tipo: 'concurso_outro', driveId: item.driveId }
  });
  await zapi.enviarTexto(telefone, MSG_PIX(session.nome, `Apostila ${item.titulo}`, config.apostilasDigitais.precoCargo));
  await sleep(600);
  return zapi.enviarTexto(telefone, MSG_AGUARDANDO());
}

// ============================================================
// CURSOS ONLINE
// ============================================================
async function enviarMenuOnline(telefone, nome) {
  const cursos = config.cursosOnline;
  const linhas = cursos.map((c, i) => `*${i+1}️⃣* ${c.titulo} — *${fmt(c.valor)}*`).join('\n');
  return zapi.enviarTexto(telefone,
`🌐 *Cursos Online — Smart Cursos Unaí*

*${nome}*, invista no seu crescimento! 📈

${linhas}

*0️⃣* ← Voltar

_Todos com certificado e parcelamento em até 10x no cartão!_ 💳`
  );
}

async function processarOnlineMenu(telefone, txt, session) {
  if (txt === '0') {
    updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL });
    return zapi.enviarTexto(telefone, MSG_MENU_GERAL(session.nome));
  }
  const curso = config.cursosOnline[parseInt(txt) - 1];
  if (!curso) return enviarMenuOnline(telefone, session.nome);
  updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE });
  await zapi.enviarTexto(telefone, `Ótima escolha, *${session.nome}*! 🎉\n\n*${curso.titulo}* — ${fmt(curso.valor)}\n\nVou avisar nossa equipe pra entrar em contato e finalizar seu acesso! 😊`);
  return notificarAtendente(telefone, session.nome, `Curso Online — ${curso.titulo}`);
}

// ============================================================
// MATRÍCULA
// ============================================================
async function processarMatricula(telefone, txt, session) {
  const cursos = ['Concurso Paracatu 2026', 'ENEM / Pré-vestibular', 'Curso de Informática', 'Outros Concursos'];
  const curso = cursos[parseInt(txt) - 1];
  if (!curso) return zapi.enviarTexto(telefone, `Pode me dizer qual curso você tem interesse? 😊`);
  updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE });
  await zapi.enviarTexto(telefone, `Anotei! *${session.nome}* tem interesse em *${curso}* 📋\n\nNossa equipe vai entrar em contato em breve pra fechar tudo! 😊`);
  return notificarAtendente(telefone, session.nome, `Matrícula — ${curso}`);
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
    await sleep(1000);
    await liberarProduto(telefone, pag, session.nome);
    updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL, pagamento: null });
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
// CONFIRMAÇÃO MANUAL DO ATENDENTE
// ============================================================
async function processarComandoAtendente(telefoneAtendente, txt) {
  const partes = txt.split(' ');
  const acao = partes[0].toLowerCase();
  const telefoneCliente = partes[1];
  if (!telefoneCliente) return;

  const { getSession: gs } = require('./storage');
  const sessionCliente = gs(telefoneCliente);

  if (acao === 'confirmar') {
    const pag = sessionCliente.pagamento;
    if (!pag) return zapi.enviarTexto(telefoneAtendente, `⚠️ Sessão de pagamento não encontrada para ${telefoneCliente}`);
    await zapi.enviarTexto(telefoneCliente, MSG_APROVADO(sessionCliente.nome));
    await sleep(800);
    await liberarProduto(telefoneCliente, pag, sessionCliente.nome);
    updateSession(telefoneCliente, { etapa: ETAPAS.MENU_PRINCIPAL, pagamento: null });
    return zapi.enviarTexto(telefoneAtendente, `✅ Material liberado para ${sessionCliente.nome} (${telefoneCliente})`);
  }
  if (acao === 'recusar') {
    await zapi.enviarTexto(telefoneCliente, `Hmm, não conseguimos confirmar seu pagamento 😔\n\nPode verificar e enviar o comprovante correto? Ou chamar um atendente que a gente resolve! 😊`);
    return zapi.enviarTexto(telefoneAtendente, `❌ Pagamento recusado para ${telefoneCliente}`);
  }
}

// ============================================================
// LIBERAÇÃO DO PRODUTO
// ============================================================
async function liberarProduto(telefone, pag, nome) {
  const nomeExibir = nome || 'aluno(a)';

  if (pag.tipo === 'cargo_paracatu' && pag.driveId) {
    await zapi.enviarDocumento(telefone, pag.driveId, `SmartCursos_${pag.cargoId || 'apostila'}.pdf`,
      `📄 *${pag.produto}*\n_Smart Cursos Unaí — Bons estudos, ${nomeExibir}!_ 🎓`
    );
  } else if (pag.tipo === 'combo_paracatu') {
    await zapi.enviarTexto(telefone, `📦 Enviando todas as apostilas agora... pode demorar alguns minutinhos, são muitas! 😄⏳`);
    for (const area of config.apostilasDigitais.paracatu.areas) {
      for (const cargo of area.cargos) {
        if (cargo.driveId) {
          await zapi.enviarDocumento(telefone, cargo.driveId, `SmartCursos_${cargo.id}.pdf`, `📄 ${cargo.titulo}`);
          await sleep(2000);
        }
      }
    }
  } else if (pag.tipo === 'concurso_outro' && pag.driveId) {
    await zapi.enviarDocumento(telefone, pag.driveId, `SmartCursos_concurso.pdf`,
      `📄 *${pag.produto}*\n_Smart Cursos Unaí — Bons estudos!_ 🎓`
    );
  }

  await sleep(800);
  await zapi.enviarTexto(telefone,
    `🎉 Pronto, *${nomeExibir}*! Tudo enviado!\n\nAgora é hora de estudar com dedicação — você está no caminho certo! 💪\n\nQualquer dúvida sobre o conteúdo ou qualquer outra coisa, pode chamar aqui. Estou sempre por aqui! 😊\n\n_Digite *menu* pra ver outras opções._`
  );
}

// ============================================================
// NOTIFICAÇÃO AO ATENDENTE
// ============================================================
async function notificarAtendente(telefoneCliente, nome, origem) {
  const hora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  const msg =
`🔔 *NOVO LEAD AGUARDANDO ATENDIMENTO*

👤 Nome: *${nome || 'não informado'}*
📱 Número: ${telefoneCliente}
📍 Origem: ${origem}
🕐 Horário: ${hora}

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
  updateSession(telefone, { historico: historico.slice(-16) });
  await zapi.enviarTexto(telefone, resposta);
  await sleep(500);
  return zapi.enviarTexto(telefone, `_Se precisar de mais alguma coisa, é só falar! Digite *menu* pra ver as opções._ 😊`);
}

// ============================================================
// HELPERS
// ============================================================
function formatarNome(txt) {
  return txt.split(' ').slice(0, 2)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}

module.exports = { processarMensagem };
