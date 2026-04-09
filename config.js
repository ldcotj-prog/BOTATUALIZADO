require('dotenv').config();

const gdrive = (id) => id ? `https://drive.google.com/uc?export=download&id=${id}` : null;

const config = {
  zapi: {
    instanceId: process.env.ZAPI_INSTANCE_ID,
    token: process.env.ZAPI_TOKEN,
    clientToken: process.env.ZAPI_CLIENT_TOKEN,
    baseUrl: () => `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}`
  },
  openai:     { apiKey: process.env.OPENAI_API_KEY },
  server:     { port: process.env.PORT || 3000 },
  escola: {
    nome: 'Smart Cursos Unaí',
    cnpj: '31.852.681/0001-40',
    endereco: 'Rua Nossa Senhora do Carmo, 45, 1º andar, Centro, Unaí-MG',
    pixChave: '31.852.681/0001-40',
    pixTipo: 'CNPJ',
    numeroAtendimento: process.env.NUMERO_ATENDIMENTO || '5538999313182',
    landingPage: process.env.LANDING_URL || 'https://bot-production-1561.up.railway.app/produtos',
  },

  // ============================================================
  // KEYWORDS — links dos anúncios Meta Ads
  // wa.me/5538999313182?text=PARACATU etc.
  // ============================================================
  keywords: {
    paracatu:    ['paracatu', 'ibgp', 'concurso paracatu'],
    prevestibular:['enem', 'vestibular', 'pre-vestibular', 'pré-vestibular', 'pre vestibular'],
    informatica: ['informatica', 'informática', 'excel', 'word', 'computacao'],
    apostilas:   ['apostila', 'apostilas', 'material', 'pdf'],
    concursos:   ['prf', 'sedf', 'inss', 'pmmg', 'pcmg', 'concurso', 'concursos', 'bancarios', 'bancários'],
    matricula:   ['matricula', 'matrícula', 'quero me matricular'],
  },

  // ============================================================
  // PRODUTOS — APOSTILAS DIGITAIS
  // ============================================================
  apostilasDigitais: {
    pix: '31.852.681/0001-40',
    precoCargo: 19.90,
    precoCombo: 49.90,
    paracatu: {
      areas: [
        { id: 'saude', emoji: '🏥', titulo: 'Área da Saúde', cargos: [
          { id: 'enfermagem',      titulo: 'Enfermagem',                   driveId: '11WOBOciw_BI97Q06gecjAGw2zf5PSaUP' },
          { id: 'farmacia',        titulo: 'Farmácia',                     driveId: '1BARdFb1Shn67GgbY2UQb2J2YnOSaTdKH' },
          { id: 'radiologia',      titulo: 'Radiologia',                   driveId: '14T3hfv_nN31yftXHOO01ckqtpApftjlS' },
          { id: 'odontologia',     titulo: 'Odontologia',                  driveId: '1t5bgQ8KO42iF8uHq_tAAYoAnyIUjGDOd' },
          { id: 'fisioterapia',    titulo: 'Fisioterapia',                 driveId: '17TPGOpHmlFDQ60EOV2tgi84P4iHPaeMo' },
          { id: 'analises',        titulo: 'Técnico em Análises Clínicas', driveId: '1ebLoNgQV1oj5n-U8FntI7BwUDTh-BD3v' },
          { id: 'vigilancia',      titulo: 'Vigilância Sanitária',         driveId: '1cW4p_i14mpndi1tG4BKdyltt1wJsxwD1' },
        ]},
        { id: 'educacao', emoji: '📚', titulo: 'Área da Educação', cargos: [
          { id: 'peb',             titulo: 'PEB (Professor Ed. Básica)',   driveId: '1E_o-V90wpR7n2IEaDoOKwUfDWHj8XtE9' },
          { id: 'peb_arte',        titulo: 'PEB Arte',                     driveId: '1qJPU4g0SY8CrW8NnGsLLOXEYfJt22CDU' },
          { id: 'peb_historia',    titulo: 'PEB História',                 driveId: '1n6o94UX-O6JByb3Z-cZFdNfW0Cz8bw3t' },
          { id: 'supervisor',      titulo: 'Supervisor Escolar',           driveId: '1V0_kUF9j-Sg30PAKCKVjMIUIuA3MYuSn' },
          { id: 'educador_creche', titulo: 'Educador de Creche',           driveId: '1oUtYuq0zC9u7JT7FZOucGdY9Up3Iytie' },
          { id: 'bibliotecario',   titulo: 'Bibliotecário',                driveId: '18rI6YD0DCkN1pFck5cUQHNqi-HvD5Rn9' },
        ]},
        { id: 'administrativa', emoji: '🗂', titulo: 'Área Administrativa', cargos: [
          { id: 'oficial_adm',     titulo: 'Oficial Administrativo',       driveId: '1_l4E0WBtUVRDNK-7fJ0FSgeZvhHjMDXm' },
          { id: 'aux_secretaria',  titulo: 'Auxiliar de Secretaria',       driveId: '16V9biF2pt8wi6_WF2Pm-z0wd7k5QUr-t' },
          { id: 'adm_aux',         titulo: 'Administração / Aux. Adm.',    driveId: '1b472UpWf_atmsvGNZx1TW_hTSij4tUs3' },
          { id: 'almoxarifado',    titulo: 'Almoxarifado',                 driveId: '1Y5ukBkkFRKgDIuO_1L80Cf2wwIgESSL4' },
          { id: 'assist_social',   titulo: 'Assistente Social',            driveId: '1FEBX-QOXOTFa0HjYlaLr67tIpb8XOFwS' },
          { id: 'contabilidade',   titulo: 'Contabilidade',                driveId: '1sgvfIFMceGQcdr2UB5ZXdGm8d9s8-DSn' },
        ]},
        { id: 'juridica', emoji: '⚖', titulo: 'Jurídica / Segurança', cargos: [
          { id: 'advogado',        titulo: 'Advogado',                     driveId: '16pY7zg2WAkbEizMNE9sNcAV4kS8ntlWh' },
          { id: 'gcm',             titulo: 'GCM (Guarda Civil Municipal)', driveId: '16mafamGWMgnkknq93HLGaKIUjMu3-uYQ' },
          { id: 'psicologia',      titulo: 'Psicologia',                  driveId: '1pEDCbigbYlXzaxfNcLpc7dV_fZ5_DAmF' },
          { id: 'vigia',           titulo: 'Vigia',                        driveId: '1TgUBmun-TwEnSFj2kdbTnYFLadXEG0b-' },
        ]},
        { id: 'tecnica', emoji: '⚙', titulo: 'Área Técnica', cargos: [
          { id: 'eng_eletrica_1',  titulo: 'Engenharia Elétrica vol.1',   driveId: '1dGoopWYwiSxcTCakC0xEtV4w_a3qKBy6' },
          { id: 'eng_eletrica_2',  titulo: 'Engenharia Elétrica vol.2',   driveId: '1m_pP7UFGGo9LrDCb4yAuEKKF0IP3YmOW' },
          { id: 'eng_ambiental',   titulo: 'Engenheiro Ambiental',         driveId: '1K3KR5tKryLmYhIwMKIIXVz9-YbLMGjyA' },
          { id: 'motorista',       titulo: 'Motorista',                    driveId: '18EFNToV5gZ2yBzBXHN5pNQvaSpP7vGJF' },
        ]},
      ]
    },
    outrosConcursos: [
      { id: 'prf',       titulo: 'PRF 2026',       driveId: '1lR--gP1MKgi5v0pzGy8W3VNnkpN9jWGO' },
      { id: 'sedf',      titulo: 'SEDF 2026',      driveId: '1lzGv2VZRWoiiCf12YB22mVU1TvoOzrJt' },
      { id: 'bancarios', titulo: 'Bancários 2026', driveId: '126YV7gawSuU0dw8pREa2T4X_1etPJQIj' },
    ]
  },

  // ============================================================
  // PRODUTOS — PRÉ-VESTIBULAR
  // ============================================================
  preVestibular: {
    mensalidadePadrao: 745.00,
    mensalidadePontualidade: 595.90,
    horario: 'Segunda a sexta, 19h às 22h',
    descricao: 'Aulas presenciais + plataforma + aulas gravadas + apostilas trimestrais + sala de estudos',
  },

  // ============================================================
  // PRODUTOS — INFORMÁTICA
  // ============================================================
  informatica: {
    presencial: {
      titulo: 'Informática Presencial',
      duracao: '9 meses | 2x/semana | 1h30 por aula | 120h',
      boleto: { parcelas: 9, valor: 349.90, matricula: 100, material: 100 },
      cartao: { parcelas: 9, valor: 311.92, matricula: 0, material: 0 },
      avista: 2456.37,
    },
    empresarial: {
      titulo: 'Informática Empresarial (Intensivo)',
      duracao: '3 meses | Excel, Word, PowerPoint, ferramentas empresariais',
      boleto: { parcelas: 4, valor: 262.50 },
      cartao: { parcelas: 10, valor: 99.79 },
      avista: 899.90,
    },
    online: {
      titulo: 'Informática Online',
      descricao: 'Estude no seu ritmo, de qualquer lugar',
      cartao: { parcelas: 10, valor: 29.79 },
      avista: 297.90,
    }
  },

  // ============================================================
  // PRODUTOS — CURSOS ONLINE
  // ============================================================
  cursosOnline: [
    { id: 'ia',         titulo: 'IA para Negócios',                valor: 397.90 },
    { id: 'aux_adm',    titulo: 'Auxiliar Administrativo Online',  valor: 397.90 },
    { id: 'gestao',     titulo: 'Gestão Empresarial Completo',     valor: 297.90 },
    { id: 'quimica',    titulo: 'Química para Vestibulares + Simulados', valor: 197.90 },
  ],

  // ============================================================
  // PRODUTOS — LOW TICKET
  // ============================================================
  lowTicket: [
    { id: 'caderno_enem',  titulo: 'Caderno ENEM (teoria + 540 questões + 3 redações)', valor: 39.90 },
    { id: 'questoes_enem', titulo: '200 Questões ENEM comentadas',                      valor: 29.90 },
  ],
};

// Helper para montar lista plana de todos os cargos de Paracatu
config.getCargoParacatu = function(cargoId) {
  for (const area of config.apostilasDigitais.paracatu.areas) {
    const cargo = area.cargos.find(c => c.id === cargoId);
    if (cargo) return { ...cargo, pdfUrl: gdrive(cargo.driveId) };
  }
  return null;
};

module.exports = config;
