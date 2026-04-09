const zapi = require('./zapi');
const { getSession, updateSession, ETAPAS } = require('./storage');

// ============================================================
// REMARKETING POR INATIVIDADE
// Dispara mensagens após silêncio do lead
// ============================================================

// Intervalos: 30min, 3h, 24h
const INTERVALOS = [
  { minutos: 30,   indice: 0 },
  { minutos: 180,  indice: 1 },
  { minutos: 1440, indice: 2 },
];

// Mensagens de remarketing por contexto
function getMensagemRemarketing(session, indice) {
  const nome = session.nome || 'amigo(a)';
  const etapa = session.etapa;

  // Lead que parou no pagamento — alta intenção de compra
  if (etapa === ETAPAS.AGUARDANDO_PAGAMENTO) {
    const produto = session.pagamento?.produto || 'seu material';
    const msgs = [
      `Oi, *${nome}*! 😊 Ainda estou aqui guardando o seu pedido de *${produto}*.\n\nQualquer problema no pagamento, é só me falar — resolvo rapidinho! 🔧`,
      `*${nome}*, tudo bem? 🙂\n\nNotei que você ainda não enviou o comprovante. Aconteceu alguma coisa?\n\nSe tiver dúvida ou dificuldade, pode chamar à vontade — estou aqui pra ajudar! 💬`,
      `*${nome}*, última lembrança sobre seu pedido de *${produto}* 😊\n\nSe desistiu por algum motivo, tudo bem! Mas se ainda tiver interesse, pode me chamar quando quiser. 🤝`,
    ];
    return msgs[indice] || null;
  }

  // Lead que chegou mas não comprou
  if ([ETAPAS.PARACATU_CONFIRMAR_COMPRA, ETAPAS.PARACATU_CARGOS, ETAPAS.PARACATU_AREAS, ETAPAS.COMBO_CONFIRMAR].includes(etapa)) {
    const msgs = [
      `Oi, *${nome}*! 😊 Vi que você estava vendo nossas apostilas do concurso de Paracatu.\n\nFicou alguma dúvida? Pode me perguntar à vontade! 👇`,
      `*${nome}*, lembrei de você! 🎯\n\nA prova de Paracatu é em *23 de agosto* — cada dia de estudo faz diferença!\n\nQuer dar uma olhada no material? É só *R$19,90* por cargo ou *R$49,90* o combo completo. 💪`,
      `Oi, *${nome}*! Uma última mensagem da minha parte 😊\n\nSe quiser as apostilas de Paracatu, estou aqui! Acesso imediato após o pagamento. 📄\n\nDigite *oi* pra continuar quando quiser!`,
    ];
    return msgs[indice] || null;
  }

  // Lead no menu geral ou no início do fluxo
  if ([ETAPAS.MENU_PRINCIPAL, ETAPAS.CONVERSA_LIVRE].includes(etapa)) {
    const msgs = [
      `Oi, *${nome}*! 😊 Estava por aqui e lembrei de você.\n\nPosso te ajudar com alguma coisa? É só chamar! 👋`,
      `*${nome}*, tudo bem? 🙂\n\nLembrando que temos apostilas e cursos disponíveis. Qualquer dúvida, pode perguntar!\n\nDigite *menu* pra ver tudo. 📋`,
      null, // 3ª mensagem — não incomoda mais
    ];
    return msgs[indice] || null;
  }

  return null;
}

// ============================================================
// AGENDADOR — verifica sessões inativas periodicamente
// ============================================================
const timers = new Map(); // telefone → { timer, indice }

function agendarRemarketing(telefone) {
  cancelarRemarketing(telefone); // cancela qualquer timer anterior

  const { indice } = { indice: 0 };
  programarProximo(telefone, 0);
}

function programarProximo(telefone, indice) {
  if (indice >= INTERVALOS.length) return;

  const { minutos } = INTERVALOS[indice];
  const ms = minutos * 60 * 1000;

  const timer = setTimeout(async () => {
    try {
      const session = getSession(telefone);

      // Não dispara se:
      // - Atendimento humano ativo
      // - Sessão encerrada / sem etapa relevante
      // - Já pagou (aguardando material não enviado manualmente)
      if (session.atendimentoHumano) return;
      if (!session.etapa || session.etapa === ETAPAS.INICIO) return;

      const msg = getMensagemRemarketing(session, indice);
      if (msg) {
        console.log(`[REMARKETING] Disparando mensagem ${indice + 1} para ${telefone}`);
        await zapi.enviarTexto(telefone, msg);
        // Agenda próxima mensagem
        programarProximo(telefone, indice + 1);
      }
    } catch (err) {
      console.error('[REMARKETING] Erro:', err.message);
    }
  }, ms);

  timers.set(telefone, { timer, indice });
}

function cancelarRemarketing(telefone) {
  if (timers.has(telefone)) {
    clearTimeout(timers.get(telefone).timer);
    timers.delete(telefone);
  }
}

module.exports = { agendarRemarketing, cancelarRemarketing };
