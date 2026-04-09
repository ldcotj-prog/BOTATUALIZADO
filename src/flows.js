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
    '7': () => { updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE }); return zapi.enviarTexto(telefone, `👨‍💼 Transferindo para nossa equipe!\n_Atendimento: Seg-Sex 8h-18h | Sáb 8h-12h_ ⏱️`); },
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

async function processarParacatuCargos(telefone, txt, session) {
  if (txt === '0') {
    updateSession(telefone, { etapa: ETAPAS.PARACATU_AREAS });
    return enviarMenuParacatu(telefone, session.nome);
  }
  const area = config.apostilasDigitais.paracatu.areas.find(a => a.id === session.areaAtual);
  if (!area) return enviarMenuParacatu(telefone, session.nome);
  const cargo = area.cargos[parseInt(txt) - 1];
  if (!cargo) return zapi.enviarTexto(telefone, `❓ Opção inválida. Escolha de 1 a ${area.cargos.length} ou 0 para voltar.`);

  updateSession(telefone, {
    etapa: ETAPAS.AGUARDANDO_PAGAMENTO,
    pagamento: { produto: `Apostila ${cargo.titulo} — Paracatu 2026`, valor: config.apostilasDigitais.precoCargo, tipo: 'cargo_paracatu', cargoId: cargo.id, driveId: cargo.driveId }
  });
  await zapi.enviarTexto(telefone, MSG_PIX(session.nome, `Apostila ${cargo.titulo}`, config.apostilasDigitais.precoCargo));
  await sleep(500);
  return zapi.enviarTexto(telefone, MSG_AGUARDANDO());
}

async function enviarApresentacaoPreVest(telefone, nome) {
  await zapi.enviarTexto(telefone,
    `🎓 *Pré-Vestibular Smart Cursos Unaí*\n\n✅ Aulas presenciais Seg-Sex 19h-22h\n✅ Plataforma + aulas gravadas\n✅ Apostilas trimestrais (~540 questões)\n✅ Sala de estudos 8h-22h\n✅ Professores especializados\n\n💰 A partir de *${fmt(595.90)}/mês* (pontualidade)\n\nQuer conhecer melhor?\n\n*1️⃣* Ver a landing page completa\n*2️⃣* Falar com atendente para se matricular\n*3️⃣* ← Voltar`
  );
}

async function processarPreVestInteresse(telefone, txt, session) {
  if (txt === '1') return zapi.enviarTexto(telefone, `🌐 Veja todos os detalhes aqui:\n${config.escola.landingPage}\n\nDigite *menu* para voltar!`);
  if (txt === '2') { updateSession(telefone, { etapa: ETAPAS.CONVERSA_LIVRE }); return zapi.enviarTexto(telefone, `👨‍💼 Transferindo para matrícula!\nNosso time entra em contato em breve. _Seg-Sex 8h-18h_ ⏱️`); }
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
  return zapi.enviarTexto(telefone, `👨‍💼 Transferindo para nossa equipe de matrículas!\n_Atendimento: Seg-Sex 8h-18h | Sáb 8h-12h_ ⏱️`);
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
  return zapi.enviarTexto(telefone, `👨‍💼 Transferindo para matrícula!\n_Atendimento: Seg-Sex 8h-18h | Sáb 8h-12h_ ⏱️`);
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
