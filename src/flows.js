const zapi = require('./zapi');
const ia = require('./ia');
const pagamento = require('./pagamento');
const config = require('./config');
const { getSession, updateSession, resetSession, ETAPAS } = require('./storage');

const gdrive = (id) => id ? `https://drive.google.com/uc?export=download&id=${id}` : null;
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
// MENSAGENS
// ============================================================
const MSG_BOAS_VINDAS = () =>
`Olá! 👋 Seja bem-vindo(a) ao *Smart Cursos Unaí* 🎓

Somos referência em Unaí-MG em pré-vestibular, concursos, informática e cursos profissionalizantes!

Para começar, como posso te chamar? 😊`;

const MSG_MENU = (nome) =>
`Olá, *${nome}*! 🎉 Como posso te ajudar?\n\n*1️⃣* 📄 Apostilas para *Concursos*\n*2️⃣* 📚 *Pré-vestibular / ENEM*\n*3️⃣* 💻 Cursos de *Informática*\n*4️⃣* 🌐 Cursos *Online*\n*5️⃣* 🏆 Ver todos os *produtos*\n*6️⃣* 🤖 Tirar uma *dúvida*\n*7️⃣* 👨‍💼 Falar com *atendente*\n\n_Digite o número_ 👇`;

const MSG_PIX = (nome, produto, valor) =>
`✅ Ótima escolha, *${nome}*!\n\n💳 *DADOS PARA PAGAMENTO*\n\n🏷 Produto: *${produto}*\n💰 Valor: *${fmt(valor)}*\n\n📲 *Chave PIX (CNPJ):*\n\`31.852.681/0001-40\`\n\nApós pagar, *envie o comprovante aqui* e libero seu material na hora! ⚡`;

const MSG_AGUARDANDO = () =>
`⏳ Aguardando seu comprovante...\n\nAssim que receber, envio seu material automaticamente! 📄`;

const MSG_VALIDANDO = () => `🔍 Analisando seu comprovante...`;

const MSG_APROVADO = (nome) =>
`✅ *Pagamento confirmado!* Obrigado, *${nome}*! 🎉\n\nEnviando seu material agora... 📦`;

const MSG_REPROVADO_VALOR = (pago, esperado) =>
`⚠️ O valor do comprovante (${fmt(pago)}) não bate com o valor do pedido (${fmt(esperado)}).\n\nVerifique e envie novamente, ou chame um atendente. 👇`;

const MSG_IMAGEM_INVALIDA = () =>
`❓ Não consegui identificar um comprovante PIX nessa imagem.\n\nEnvie o print do comprovante e tente novamente! 📲`;

const MSG_CONFIRMACAO_MANUAL = (nome) =>
`📨 Comprovante recebido! Estamos verificando manualmente.\n\nEm breve um atendente confirma e libera seu material, *${nome}*. ⏱️`;

// ============================================================
// PROCESSADOR PRINCIPAL
// ============================================================
async function processarMensagem(telefone, dados) {
  const session = getSession(telefone);
  const { tipo, conteudo, caption } = dados;

  // Texto recebido
  const txt = tipo === 'texto' ? conteudo.trim() : (caption || '');
  const lower = txt.toLowerCase();

  console.log(`[FLOW] ${telefone} | ${session.etapa} | tipo:${tipo} | "${txt.slice(0, 50)}"`);

  // ---- COMPROVANTE DE PAGAMENTO ----
  if (tipo === 'imagem' && session.etapa === ETAPAS.AGUARDANDO_PAGAMENTO) {
    return processarComprovante(telefone, conteudo, session);
  }

  // ---- COMANDOS DO ATENDENTE (para confirmar pagamentos manualmente) ----
  // Formato: "CONFIRMAR 5538999XXXXX" ou "RECUSAR 5538999XXXXX"
  if (lower.startsWith('confirmar ') || lower.startsWith('recusar ')) {
    return processarComandoAtendente(telefone, txt);
  }

  // ---- PALAVRAS GLOBAIS ----
  if (['menu', 'inicio', 'início', 'voltar', 'home'].includes(lower)) {
    // Se ainda não tem nome, coleta primeiro
    if (!session.nome) {
      updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_NOME });
      return zapi.enviarTexto(telefone, MSG_BOAS_VINDAS());
    }
    updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL });
    return zapi.enviarTexto(telefone, MSG_MENU(session.nome));
  }
  if (['sair', 'encerrar', 'tchau', 'obrigado', 'obrigada'].includes(lower)) {
    await zapi.enviarTexto(telefone,
      `Obrigado, *${session.nome || 'amigo(a)'}*! 😊\nQualquer dúvida é só chamar. Até mais! 👋\n\n_Smart Cursos Unaí — Sua aprovação é nossa missão!_ 🎓`
    );
    return resetSession(telefone);
  }

  // ---- ROTEADOR ----
  switch (session.etapa) {

    case ETAPAS.INICIO: {
      const servico = detectarServico(txt);
      await zapi.enviarTexto(telefone, MSG_BOAS_VINDAS());
      updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_NOME, servico });
      break;
    }

    case ETAPAS.AGUARDANDO_NOME: {
      const nome = formatarNome(txt);
      updateSession(telefone, { nome });
      await rotearServico(telefone, nome, session.servico);
      break;
    }

    case ETAPAS.MENU_PRINCIPAL:
      await processarMenuPrincipal(telefone, txt, session);
      break;

    case ETAPAS.PARACATU_AREAS:
      await processarParacatuAreas(telefone, txt, session);
      break;

    case ETAPAS.PARACATU_CARGOS:
      await processarParacatuCargos(telefone, txt, session);
      break;

    case ETAPAS.PARACATU_CONFIRMAR_COMPRA:
      await processarParacatuCargos(telefone, txt, session);
      break;

    case ETAPAS.INFO_TIPO:
      await processarInfoTipo(telefone, txt, session);
      break;

    case ETAPAS.CONCURSOS_MENU:
      await processarConcursosMenu(telefone, txt, session);
      break;

    case ETAPAS.ONLINE_MENU:
      await processarOnlineMenu(telefone, txt, session);
      break;

    case ETAPAS.PRE_VEST_INTERESSE:
      await processarPreVestInteresse(telefone, txt, session);
      break;

    case ETAPAS.AGUARDANDO_PAGAMENTO:
      // Ainda aguardando — lembra o cliente
      await zapi.enviarTexto(telefone,
        `⏳ Ainda aguardando seu comprovante PIX para *${session.pagamento?.produto}*.\n\nEnvie a foto/print do comprovante aqui! 📲\n\nDigite *cancelar* para voltar ao menu.`
      );
      break;

    case ETAPAS.CONVERSA_LIVRE:
      await processarIA(telefone, txt, session);
      break;

    default:
      resetSession(telefone);
      await zapi.enviarTexto(telefone, MSG_BOAS_VINDAS());
      updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_NOME });
  }
}

// ============================================================
// ROTEADOR POR SERVIÇO (keyword do anúncio)
// ============================================================
async function rotearServico(telefone, nome, servico) {
  switch (servico) {
    case 'paracatu':
    case 'apostilas':
      updateSession(telefone, { etapa: ETAPAS.PARACATU_AREAS });
      await enviarMenuParacatu(telefone, nome);
      break;
    case 'prevestibular':
      updateSession(telefone, { etapa: ETAPAS.PRE_VEST_INTERESSE });
      await enviarApresentacaoPreVest(telefone, nome);
      break;
    case 'informatica':
      updateSession(telefone, { etapa: ETAPAS.INFO_TIPO });
      await enviarMenuInfo(telefone, nome);
      break;
    case 'concursos':
      updateSession(telefone, { etapa: ETAPAS.CONCURSOS_MENU });
      await enviarMenuConcursos(telefone, nome);
      break;
    default:
      updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL });
      await zapi.enviarTexto(telefone, MSG_MENU(nome));
  }
}

// ============================================================
// HANDLERS DE CADA FLUXO
// ============================================================

async function processarMenuPrincipal(telefone, txt, session) {
  const acoes = {
    '1': () => { updateSession(telefone, { etapa: ETAPAS.PARACATU_AREAS }); return enviarMenuParacatu(telefone, session.nome); },
    '2': () => { updateSession(telefone, { etapa: ETAPAS.PRE_VEST_INTERESSE }); return enviarApresentacaoPreVest(telefone, session.nome); },
    '3': () => { updateSession(telefone, { etapa: ETAPAS.INFO_TIPO }); return enviarMenuInfo(telefone, session.nome); },
    '4': () => { updateSession(telefone, { etapa: ETAPAS.ONLINE_MENU }); return enviarMenuOnline(telefone, session.nome); },
    '5': () => zapi.enviarTexto(telefone, `🛒 Veja todos nossos produtos aqui:\n${config.escola.landingPage}\n\nDigite *menu* para voltar! 😊`),
    '6': () => { updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE }); return zapi.enviarTexto(telefone, `🤖 Pode perguntar! Estou aqui para ajudar.\nDigite *menu* a qualquer momento. 😊`); },
    '7': async () => {
      updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE });
      await zapi.enviarTexto(telefone, `👨‍💼 Transferindo para nossa equipe!\n_Atendimento: Seg-Sex 8h-18h | Sáb 8h-12h_ ⏱️`);
      await notificarAtendente(telefone, session.nome, 'Menu principal');
    },
  };
  if (acoes[txt]) return acoes[txt]();
  return zapi.enviarTexto(telefone, `❓ Opção inválida.\n\n${MSG_MENU(session.nome)}`);
}

async function enviarMenuParacatu(telefone, nome) {
  const areas = config.apostilasDigitais.paracatu.areas;
  const linhas = areas.map((a, i) => `*${i+1}️⃣* ${a.emoji} ${a.titulo}`).join('\n');
  await zapi.enviarTexto(telefone,
    `📄 *Apostilas Concurso Paracatu 2026*\n(IBGP | 312 vagas | Prova: 23/08/2026)\n\n💰 *Apostila por cargo: ${fmt(config.apostilasDigitais.precoCargo)}*\n💰 *COMBO todos os cargos: ${fmt(config.apostilasDigitais.precoCombo)}*\n\nEscolha sua área:\n\n${linhas}\n\n*0️⃣* COMBO (todos os cargos)\n*#️⃣* ← Voltar ao menu\n\nDigite o número 👇`
  );
}

async function processarParacatuAreas(telefone, txt, session) {
  if (txt === '0') {
    // COMBO — todos os cargos
    updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_PAGAMENTO, pagamento: { produto: 'Combo Apostilas Paracatu 2026 (todos os cargos)', valor: config.apostilasDigitais.precoCombo, tipo: 'combo_paracatu' } });
    await zapi.enviarTexto(telefone, MSG_PIX(session.nome, 'Combo Paracatu 2026', config.apostilasDigitais.precoCombo));
    await sleep(500);
    return zapi.enviarTexto(telefone, MSG_AGUARDANDO());
  }
  if (txt === '#') {
    updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL });
    return zapi.enviarTexto(telefone, MSG_MENU(session.nome));
  }
  const areas = config.apostilasDigitais.paracatu.areas;
  const area = areas[parseInt(txt) - 1];
  if (!area) return zapi.enviarTexto(telefone, `❓ Opção inválida.\n\nEscolha de 1 a ${areas.length} ou 0 para o COMBO.`);
  updateSession(telefone, { etapa: ETAPAS.PARACATU_CARGOS, areaAtual: area.id });
  const linhas = area.cargos.map((c, i) => `*${i+1}️⃣* ${c.titulo}`).join('\n');
  return zapi.enviarTexto(telefone,
    `${area.emoji} *${area.titulo}*\n\nEscolha o cargo:\n\n${linhas}\n\n*0️⃣* ← Voltar\n\n💰 *${fmt(config.apostilasDigitais.precoCargo)} por cargo*\n💰 *${fmt(config.apostilasDigitais.precoCombo)} COMBO completo*`
  );
}

// ============================================================
// CATÁLOGO DE DETALHES DAS APOSTILAS (para apresentação)
// ============================================================
const DETALHES_APOSTILAS = {
  enfermagem:      { paginas: 189, questoes: 'por capítulo', esp: 'SUS, PNAB, Vigilância em Saúde, PNI, SAE, Diagnósticos NANDA-I, Doenças crônicas e transmissíveis' },
  farmacia:        { paginas: 153, questoes: null,            esp: 'Farmacologia clínica, Assistência farmacêutica, Farmácia hospitalar, Legislação farmacêutica' },
  radiologia:      { paginas: 138, questoes: '~63',          esp: 'Módulo 5: Direitos Humanos, Dir. Constitucional, Dir. Administrativo, Dir. Penal, CTB, ECA, Legislação Paracatu' },
  odontologia:     { paginas: 155, questoes: '~60',          esp: 'Diagnóstico de lesões bucais, Clínica odontológica, Saúde bucal coletiva, Ética profissional' },
  fisioterapia:    { paginas: 208, questoes: 'por capítulo', esp: 'Cinesioterapia, Fisioterapia traumato-ortopédica, Fisioterapia respiratória e cardiovascular, Ética COFFITO' },
  analises:        { paginas: 214, questoes: '~186',          esp: 'Hematologia, Bioquímica clínica, Microbiologia, Parasitologia, Imunologia, Boas práticas laboratoriais' },
  vigilancia:      { paginas: 154, questoes: null,            esp: 'Legislação sanitária, ANVISA, Vigilância de alimentos, Vigilância de serviços de saúde, Epidemiologia' },
  peb:             { paginas: 144, questoes: '~68',          esp: 'Módulo 5: Direitos Humanos, Dir. Constitucional, Dir. Administrativo, Dir. Penal, ECA, Legislação Paracatu' },
  peb_arte:        { paginas: 199, questoes: '~168',          esp: 'Módulo 5: Direitos Humanos, Dir. Constitucional, Dir. Penal, ECA, Estatuto do Idoso, Legislação Paracatu' },
  peb_historia:    { paginas: 154, questoes: null,            esp: 'História do Brasil, História de Minas Gerais e Paracatu, Historiografia, Didática do ensino de história' },
  supervisor:      { paginas: 173, questoes: null,            esp: 'Gestão escolar democrática, Avaliação educacional, LDB/PNE/FUNDEB, Educação inclusiva, Formação de professores' },
  educador_creche: { paginas: 117, questoes: null,            esp: 'Legislação da primeira infância, Desenvolvimento infantil 0-3 anos, Cuidar e educar na creche, O brincar' },
  bibliotecario:   { paginas: 196, questoes: null,            esp: 'Biblioteconomia, Catalogação, Gestão de acervos, Biblioteca escolar' },
  oficial_adm:     { paginas: 264, questoes: null,            esp: 'Administração pública, Direito administrativo, Gestão de documentos, Ética no serviço público' },
  aux_secretaria:  { paginas: 161, questoes: '~230',          esp: 'Administração pública, Redação oficial, Atendimento ao público, Arquivo e protocolo' },
  adm_aux:         { paginas: 194, questoes: '~230',          esp: 'Administração geral, Gestão de processos, Comunicação organizacional, Ética profissional' },
  almoxarifado:    { paginas: 197, questoes: '~230',          esp: 'Gestão de estoques, Almoxarifado e patrimônio, Compras públicas, Licitações' },
  assist_social:   { paginas: 230, questoes: '~430',          esp: 'Fundamentos do Serviço Social, Ética profissional, ECA, Serviço Social no SUS, Políticas sociais' },
  contabilidade:   { paginas: 205, questoes: '~430',          esp: 'Contabilidade geral, Escrituração, Orçamento público (PPA/LDO/LOA), LRF, Custos no setor público' },
  advogado:        { paginas: 135, questoes: '~63',          esp: 'Módulo 5: Dir. Humanos, Dir. Constitucional, Dir. Administrativo, Dir. Penal, CTB, ECA, Legislação Paracatu' },
  gcm:             { paginas: 182, questoes: '~88',          esp: 'Módulo 5: Dir. Humanos, Segurança Pública (CF art.144), Dir. Penal, Estatuto das Guardas, CTB, ECA, Uso da Força' },
  psicologia:      { paginas: 136, questoes: '~63',          esp: 'Módulo 5: Dir. Humanos, Dir. Constitucional, Dir. Administrativo, Dir. Penal, ECA, Legislação Paracatu' },
  vigia:           { paginas: 169, questoes: null,            esp: 'Controle de acesso e rondas, Prevenção de incêndios, Primeiros socorros, Segurança do trabalho, Ética pública' },
  eng_eletrica_1:  { paginas: 152, questoes: null,            esp: 'Eletrotécnica, Instalações elétricas, Normas técnicas ABNT, Manutenção elétrica predial' },
  eng_eletrica_2:  { paginas: 152, questoes: null,            esp: 'Continuação: Instalações elétricas avançadas, Projetos elétricos, Normas de segurança' },
  eng_ambiental:   { paginas: 189, questoes: null,            esp: 'Saneamento ambiental, Gestão ambiental (ISO 14001), Educação ambiental, Ética profissional' },
  motorista:       { paginas: 204, questoes: '~239',          esp: 'CTB completo, Direção defensiva, Veículos especiais, Saúde ocupacional, História de Paracatu, Simulado final' },
};

async function processarParacatuCargos(telefone, txt, session) {
  if (txt === '0') {
    updateSession(telefone, { etapa: ETAPAS.PARACATU_AREAS });
    return enviarMenuParacatu(telefone, session.nome);
  }

  // Confirmação de compra (1 = comprar, 2 = voltar)
  if (session.etapa === ETAPAS.PARACATU_CONFIRMAR_COMPRA) {
    if (txt === '1') {
      const pag = session.pagamento;
      updateSession(telefone, { etapa: ETAPAS.AGUARDANDO_PAGAMENTO });
      await zapi.enviarTexto(telefone, MSG_PIX(session.nome, pag.produto, pag.valor));
      await sleep(500);
      return zapi.enviarTexto(telefone, MSG_AGUARDANDO());
    }
    if (txt === '2') {
      const area = config.apostilasDigitais.paracatu.areas.find(a => a.id === session.areaAtual);
      updateSession(telefone, { etapa: ETAPAS.PARACATU_CARGOS, pagamento: null });
      const linhas = area.cargos.map((c, i) => `*${i+1}️⃣* ${c.titulo}`).join('\n');
      return zapi.enviarTexto(telefone, `${area.emoji} *${area.titulo}*\n\n${linhas}\n\n*0️⃣* ← Voltar`);
    }
    return zapi.enviarTexto(telefone, `Digite *1* para comprar ou *2* para voltar. 👇`);
  }

  const area = config.apostilasDigitais.paracatu.areas.find(a => a.id === session.areaAtual);
  if (!area) return enviarMenuParacatu(telefone, session.nome);
  const cargo = area.cargos[parseInt(txt) - 1];
  if (!cargo) return zapi.enviarTexto(telefone, `❓ Opção inválida. Escolha de 1 a ${area.cargos.length} ou 0 para voltar.`);

  // Busca detalhes da apostila
  const det = DETALHES_APOSTILAS[cargo.id] || { paginas: null, questoes: null, esp: 'Conteúdo conforme edital IBGP' };
  const questoesInfo = det.questoes ? `\n❓ *${det.questoes} questões comentadas*` : '';
  const paginasInfo = det.paginas ? `📄 *${det.paginas} páginas*` : '';

  // Apresenta a apostila com detalhes
  const msgDetalhes =
`📘 *Apostila ${cargo.titulo}*
Concurso Paracatu 2026 — IBGP

${paginasInfo}${questoesInfo}

📦 *Módulos Base (todas as apostilas):*
• Língua Portuguesa (16 tópicos)
• Raciocínio Lógico (13 tópicos)
• Noções de Informática (13 tópicos)
• Conhecimentos Gerais (14 tópicos)

🎯 *Conteúdo Específico — ${cargo.titulo}:*
${det.esp}

💰 *Valor: ${fmt(config.apostilasDigitais.precoCargo)}*
_Acesso imediato via PIX após pagamento_

*1️⃣* Comprar agora — R$19,90
*2️⃣* ← Voltar`;

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

  return zapi.enviarTexto(telefone, msgDetalhes);
}

async function enviarApresentacaoPreVest(telefone, nome) {
  await zapi.enviarTexto(telefone,
    `🎓 *Pré-Vestibular Smart Cursos Unaí*\n\n✅ Aulas presenciais Seg-Sex 19h-22h\n✅ Plataforma + aulas gravadas\n✅ Apostilas trimestrais (~540 questões)\n✅ Sala de estudos 8h-22h\n✅ Professores especializados\n\n💰 A partir de *${fmt(595.90)}/mês* (pontualidade)\n\nQuer conhecer melhor?\n\n*1️⃣* Ver a landing page completa\n*2️⃣* Falar com atendente para se matricular\n*3️⃣* ← Voltar`
  );
}

async function processarPreVestInteresse(telefone, txt, session) {
  if (txt === '1') return zapi.enviarTexto(telefone, `🌐 Veja todos os detalhes aqui:\n${config.escola.landingPage}\n\nDigite *menu* para voltar!`);
  if (txt === '2') { updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE }); await zapi.enviarTexto(telefone, `👨‍💼 Transferindo para matrícula!
Nosso time entra em contato em breve. _Seg-Sex 8h-18h_ ⏱️`); await notificarAtendente(telefone, session.nome, 'Pré-vestibular / Matrícula'); }
  if (txt === '3') { updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL }); return zapi.enviarTexto(telefone, MSG_MENU(session.nome)); }
  return zapi.enviarTexto(telefone, `❓ Opção inválida. Digite 1, 2 ou 3.`);
}

async function enviarMenuInfo(telefone, nome) {
  await zapi.enviarTexto(telefone,
    `💻 *Cursos de Informática — Smart Cursos Unaí*\n\nQual modalidade te interessa?\n\n*1️⃣* 🏫 Presencial (9 meses | 120h)\n   A partir de *9x ${fmt(311.92)}* no cartão\n\n*2️⃣* 🏢 Empresarial Intensivo (3 meses)\n   A partir de *10x ${fmt(99.79)}* no cartão\n\n*3️⃣* 🌐 Online (no seu ritmo)\n   *${fmt(297.90)}* em até 10x\n\n*0️⃣* ← Voltar\n\nDigite o número 👇`
  );
}

async function processarInfoTipo(telefone, txt, session) {
  if (txt === '0') { updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL }); return zapi.enviarTexto(telefone, MSG_MENU(session.nome)); }
  const infos = {
    '1': { titulo: 'Informática Presencial (9 meses)', detalhe: `📋 *Detalhes:*\n• 9 meses | 2x/semana | 1h30/aula\n• Certificado 120h\n• Boleto: 9x ${fmt(349.90)} + matrícula ${fmt(100)} + material ${fmt(100)}\n• Cartão: 9x ${fmt(311.92)} (sem matrícula/material)\n• À vista: ${fmt(2456.37)}` },
    '2': { titulo: 'Informática Empresarial Intensivo (3 meses)', detalhe: `📋 *Detalhes:*\n• Excel, Word, PowerPoint, ferramentas empresariais\n• 3 meses de duração\n• Boleto: 4x ${fmt(262.50)}\n• Cartão: 10x ${fmt(99.79)}\n• À vista: ${fmt(899.90)}` },
    '3': { titulo: 'Informática Online', detalhe: `📋 *Detalhes:*\n• Estude no seu ritmo, de qualquer lugar\n• Acesso à plataforma\n• Cartão: 10x ${fmt(29.79)}\n• À vista: ${fmt(297.90)}` },
  };
  const info = infos[txt];
  if (!info) return zapi.enviarTexto(telefone, `❓ Opção inválida. Digite 1, 2, 3 ou 0.`);
  updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE });
  await zapi.enviarTexto(telefone, `${info.detalhe}\n\n*Quer se matricular?*\nNosso atendente vai te ajudar com a matrícula e condições especiais! 😊`);
  await sleep(400);
  await zapi.enviarTexto(telefone, `👨‍💼 Transferindo para nossa equipe de matrículas!
_Atendimento: Seg-Sex 8h-18h | Sáb 8h-12h_ ⏱️`); await notificarAtendente(telefone, session.nome, 'Informática / Matrícula');
}

async function enviarMenuConcursos(telefone, nome) {
  const outros = config.apostilasDigitais.outrosConcursos;
  const linhas = outros.map((c, i) => `*${i+1}️⃣* ${c.titulo}`).join('\n');
  await zapi.enviarTexto(telefone,
    `🏆 *Apostilas para Concursos Públicos*\n\n${linhas}\n\n*4️⃣* Outros concursos (consultar)\n\n*0️⃣* ← Voltar\n\n💰 *${fmt(config.apostilasDigitais.precoCargo)} por cargo*\nDigite o número 👇`
  );
}

async function processarConcursosMenu(telefone, txt, session) {
  if (txt === '0') { updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL }); return zapi.enviarTexto(telefone, MSG_MENU(session.nome)); }
  if (txt === '4') { updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE }); return zapi.enviarTexto(telefone, `👨‍💼 Qual concurso você está estudando? Me diz que verifico se temos material disponível! 😊`); }
  const outros = config.apostilasDigitais.outrosConcursos;
  const item = outros[parseInt(txt) - 1];
  if (!item) return zapi.enviarTexto(telefone, `❓ Opção inválida.`);
  updateSession(telefone, {
    etapa: ETAPAS.AGUARDANDO_PAGAMENTO,
    pagamento: { produto: `Apostila ${item.titulo}`, valor: config.apostilasDigitais.precoCargo, tipo: 'concurso_outro', driveId: item.driveId }
  });
  await zapi.enviarTexto(telefone, MSG_PIX(session.nome, `Apostila ${item.titulo}`, config.apostilasDigitais.precoCargo));
  await sleep(500);
  return zapi.enviarTexto(telefone, MSG_AGUARDANDO());
}

async function enviarMenuOnline(telefone, nome) {
  const cursos = config.cursosOnline;
  const linhas = cursos.map((c, i) => `*${i+1}️⃣* ${c.titulo} — *${fmt(c.valor)}*`).join('\n');
  await zapi.enviarTexto(telefone,
    `🌐 *Cursos Online — Smart Cursos Unaí*\n\n${linhas}\n\n*0️⃣* ← Voltar\n\nTodos aceitam parcelamento em até 10x no cartão! 💳`
  );
}

async function processarOnlineMenu(telefone, txt, session) {
  if (txt === '0') { updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL }); return zapi.enviarTexto(telefone, MSG_MENU(session.nome)); }
  const curso = config.cursosOnline[parseInt(txt) - 1];
  if (!curso) return zapi.enviarTexto(telefone, `❓ Opção inválida.`);
  updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE });
  await zapi.enviarTexto(telefone,
    `✅ Ótima escolha! *${curso.titulo}* — ${fmt(curso.valor)}\n\nNosso atendente vai finalizar sua matrícula e te dar acesso à plataforma! 😊`
  );
  await zapi.enviarTexto(telefone, `👨‍💼 Transferindo para matrícula!
_Atendimento: Seg-Sex 8h-18h | Sáb 8h-12h_ ⏱️`); await notificarAtendente(telefone, session.nome, 'Curso Online / Matrícula');
}

// ============================================================
// PROCESSAMENTO DO COMPROVANTE PIX
// ============================================================
async function processarComprovante(telefone, imageUrl, session) {
  await zapi.enviarTexto(telefone, MSG_VALIDANDO());

  const pag = session.pagamento;
  const resultado = await pagamento.validarComprovante(imageUrl, pag.valor);

  if (resultado.mensagem === 'ok') {
    // ✅ APROVADO AUTOMATICAMENTE
    await zapi.enviarTexto(telefone, MSG_APROVADO(session.nome));
    await sleep(1000);
    await liberarProduto(telefone, pag, session.nome);
    updateSession(telefone, { etapa: ETAPAS.MENU_PRINCIPAL, pagamento: null });

  } else if (resultado.mensagem === 'valor_incorreto') {
    await zapi.enviarTexto(telefone, MSG_REPROVADO_VALOR(resultado.valor, pag.valor));

  } else if (resultado.mensagem === 'imagem_invalida') {
    await zapi.enviarTexto(telefone, MSG_IMAGEM_INVALIDA());

  } else {
    // Erro na IA ou pagamento não concluído → confirmação manual
    await zapi.enviarTexto(telefone, MSG_CONFIRMACAO_MANUAL(session.nome));
    await zapi.encaminharParaAtendente(telefone, session.nome, pag.produto, imageUrl);
    // Mantém sessão aguardando pagamento (atendente vai confirmar)
  }
}

// ============================================================
// COMANDO DO ATENDENTE (confirmar/recusar manualmente)
// ============================================================
// Pendências aguardando confirmação manual
const pendencias = new Map(); // telefoneCliente → session snapshot

async function processarComandoAtendente(telefoneAtendente, txt) {
  const partes = txt.split(' ');
  const acao = partes[0].toLowerCase();
  const telefoneCliente = partes[1];

  if (!telefoneCliente) return;

  // Busca sessão do cliente
  const { getSession: gs } = require('./storage');
  const sessionCliente = gs(telefoneCliente);

  if (acao === 'confirmar') {
    const pag = sessionCliente.pagamento;
    if (!pag) return zapi.enviarTexto(telefoneAtendente, `⚠️ Sessão de pagamento não encontrada para ${telefoneCliente}`);
    await zapi.enviarTexto(telefoneCliente, MSG_APROVADO(sessionCliente.nome));
    await sleep(800);
    await liberarProduto(telefoneCliente, pag, sessionCliente.nome);
    updateSession(telefoneCliente, { etapa: ETAPAS.MENU_PRINCIPAL, pagamento: null });
    await zapi.enviarTexto(telefoneAtendente, `✅ Material liberado para ${sessionCliente.nome} (${telefoneCliente})`);

  } else if (acao === 'recusar') {
    await zapi.enviarTexto(telefoneCliente,
      `❌ Não conseguimos confirmar seu pagamento.\n\nPor favor, verifique o comprovante e envie novamente, ou entre em contato com nossa equipe. 😊`
    );
    await zapi.enviarTexto(telefoneAtendente, `❌ Pagamento recusado para ${telefoneCliente}`);
  }
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
// LIBERAÇÃO DO PRODUTO APÓS PAGAMENTO
// ============================================================
async function liberarProduto(telefone, pag, nome) {
  const nomeExibir = nome || 'aluno(a)';

  if (pag.tipo === 'cargo_paracatu' && pag.driveId) {
    await zapi.enviarDocumento(
      telefone,
      pag.driveId,
      `SmartCursos_${pag.cargoId || 'apostila'}.pdf`,
      `📄 *${pag.produto}*\n_Smart Cursos Unaí — Bons estudos, ${nomeExibir}!_ 🎓`
    );

  } else if (pag.tipo === 'combo_paracatu') {
    await zapi.enviarTexto(telefone, `📦 Enviando todas as apostilas do COMBO... aguarde! ⏳`);
    for (const area of config.apostilasDigitais.paracatu.areas) {
      for (const cargo of area.cargos) {
        if (cargo.driveId) {
          await zapi.enviarDocumento(telefone, cargo.driveId, `SmartCursos_${cargo.id}.pdf`, `📄 ${cargo.titulo}`);
          await sleep(2000);
        }
      }
    }

  } else if (pag.tipo === 'concurso_outro' && pag.driveId) {
    await zapi.enviarDocumento(
      telefone,
      pag.driveId,
      `SmartCursos_concurso.pdf`,
      `📄 *${pag.produto}*\n_Smart Cursos Unaí — Bons estudos!_ 🎓`
    );
  }

  await sleep(500);
  await zapi.enviarTexto(telefone,
    `🎉 Pronto! Material enviado com sucesso!\n\n💪 Bons estudos, *${nomeExibir}*!\n\n_Ficou com dúvidas? É só chamar!_\nDigite *menu* para ver outros produtos. 😊`
  );
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
  await sleep(400);
  return zapi.enviarTexto(telefone, `_Digite *menu* para ver nossos produtos._ 😊`);
}

// ============================================================
// HELPERS
// ============================================================
function formatarNome(txt) {
  return txt.split(' ').slice(0, 2)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}

module.exports = { processarMensagem };
