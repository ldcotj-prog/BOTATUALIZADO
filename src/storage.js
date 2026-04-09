const sessions = new Map();

const ETAPAS = {
  INICIO:                       'inicio',
  AGUARDANDO_NOME:              'aguardando_nome',
  AGUARDANDO_CIDADE:            'aguardando_cidade',
  AGUARDANDO_NOME_COM_INTENCAO: 'aguardando_nome_com_intencao',
  MENU_PRINCIPAL:               'menu_principal',

  // Seleção de concurso/cidade
  APOSTILAS_CIDADE:             'apostilas_cidade',

  // Paracatu
  PARACATU_AREAS:               'paracatu_areas',
  PARACATU_SELECIONAR_AREA:     'paracatu_selecionar_area',
  PARACATU_CARGOS:              'paracatu_cargos',
  PARACATU_CONFIRMAR_COMPRA:    'paracatu_confirmar_compra',
  COMBO_CONFIRMAR:              'combo_confirmar',

  // Buritis
  BURITIS_AREAS:                'buritis_areas',
  BURITIS_CARGOS:               'buritis_cargos',
  BURITIS_CONFIRMAR_COMPRA:     'buritis_confirmar_compra',
  BURITIS_COMBO_CONFIRMAR:      'buritis_combo_confirmar',

  // Outros
  PRE_VEST_INTERESSE:           'pre_vest_interesse',
  INFO_TIPO:                    'info_tipo',
  CONCURSOS_MENU:               'concursos_menu',
  ONLINE_MENU:                  'online_menu',
  MATRICULA_MENU:               'matricula_menu',
  AGUARDANDO_PAGAMENTO:         'aguardando_pagamento',
  CONVERSA_LIVRE:               'conversa_livre',
};

function getSession(telefone) {
  if (!sessions.has(telefone)) {
    sessions.set(telefone, {
      etapa: ETAPAS.INICIO,
      nome: null,
      cidade: null,
      servico: null,
      areaAtual: null,
      concursoAtual: null,   // 'paracatu' | 'buritis'
      intencaoPendente: null,
      pagamento: null,
      atendimentoHumano: false,
      remarketingIndice: 0,
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

// Limpa sessões inativas há mais de 48h
setInterval(() => {
  const limite = Date.now() - 172800000;
  for (const [tel, s] of sessions.entries()) {
    if (s.ultimaMensagem < limite) sessions.delete(tel);
  }
}, 3600000);

module.exports = { getSession, updateSession, resetSession, ETAPAS };
