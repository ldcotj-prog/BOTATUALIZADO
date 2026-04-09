const sessions = new Map();

const ETAPAS = {
  INICIO:                'inicio',
  AGUARDANDO_NOME:       'aguardando_nome',
  MENU_PRINCIPAL:        'menu_principal',
  // Apostilas Paracatu
  PARACATU_AREAS:        'paracatu_areas',
  PARACATU_CARGOS:       'paracatu_cargos',
  PARACATU_COMBO:        'paracatu_combo',         // escolheu combo, aguardando pagamento
  PARACATU_CARGO_PAG:    'paracatu_cargo_pag',     // escolheu cargo, aguardando pagamento
  // Pré-vestibular
  PRE_VEST_INTERESSE:    'pre_vest_interesse',
  // Informática
  INFO_TIPO:             'info_tipo',
  // Concursos
  CONCURSOS_MENU:        'concursos_menu',
  // Cursos online
  ONLINE_MENU:           'online_menu',
  // Confirmação antes do pagamento
  COMBO_CONFIRMAR:           'combo_confirmar',
  PARACATU_CONFIRMAR_COMPRA: 'paracatu_confirmar_compra',
  // Pagamento
  AGUARDANDO_PAGAMENTO:  'aguardando_pagamento',
  // Conversa livre
  CONVERSA_LIVRE:        'conversa_livre',
};

function getSession(telefone) {
  if (!sessions.has(telefone)) {
    sessions.set(telefone, {
      etapa: ETAPAS.INICIO,
      nome: null,
      servico: null,          // serviço detectado pelo anúncio
      areaAtual: null,
      pagamento: null,        // { produto, valor, arquivos: [] }
      historico: [],
      ultimaMensagem: Date.now()
    });
  }
  return sessions.get(telefone);
}

function updateSession(telefone, dados) {
  const s = getSession(telefone);
  Object.assign(s, dados, { ultimaMensagem: Date.now() });
  sessions.set(telefone, s);
}

function resetSession(telefone) { sessions.delete(telefone); }

// Limpa sessões inativas há mais de 3h
setInterval(() => {
  const limite = Date.now() - 10800000;
  for (const [tel, s] of sessions.entries()) {
    if (s.ultimaMensagem < limite) sessions.delete(tel);
  }
}, 1800000);

module.exports = { getSession, updateSession, resetSession, ETAPAS };
