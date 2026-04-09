// ============================================================
// CATÁLOGO COMPLETO — PROCESSO SELETIVO BURITIS/MG
// Entrega: MANUAL via WhatsApp pela equipe
// ============================================================

const MODULOS_BASICOS = {
  BASICO_GERAL: ['Língua Portuguesa', 'Matemática e Raciocínio Lógico', 'Informática Básica', 'Atualidades', 'Questões comentadas'],
  BASICO_SAUDE: ['Língua Portuguesa', 'Matemática e Raciocínio Lógico', 'Informática Básica', 'Noções de SUS e saúde pública', 'Questões comentadas'],
  BASICO_EDUCACAO: ['Língua Portuguesa', 'Didática básica', 'Legislação educacional', 'Informática aplicada à educação', 'Questões comentadas'],
  BASICO_SOCIAL: ['Língua Portuguesa', 'Matemática e Raciocínio Lógico', 'Informática Básica', 'Políticas públicas e assistência social', 'Questões comentadas'],
  BASICO_OPERACIONAL: ['Língua Portuguesa', 'Matemática básica', 'Noções de atendimento', 'Noções de organização e segurança', 'Questões comentadas'],
};

const MODULOS_ESPECIFICOS = {
  ACS: ['Atribuições do ACS', 'Atenção Primária à Saúde', 'Territorialização e cadastramento', 'Visita domiciliar', 'Promoção e prevenção em saúde', 'Saúde da criança, mulher e idoso', 'Vacinação', 'Vigilância em saúde', 'Ética e trabalho em equipe'],
  ACE: ['Atribuições do ACE', 'Vigilância epidemiológica', 'Controle vetorial', 'Endemias e doenças transmissíveis', 'Identificação e eliminação de focos', 'Saneamento ambiental', 'Ética e segurança'],
  ASB: ['Atribuições do ASB', 'Biossegurança em odontologia', 'Instrumentais odontológicos', 'Apoio clínico', 'Esterilização e desinfecção', 'Educação em saúde bucal'],
  TSB: ['Atribuições do TSB', 'Biossegurança', 'Prevenção em saúde bucal', 'Procedimentos auxiliares', 'Materiais odontológicos'],
  DENTISTA: ['Odontologia em saúde pública', 'Diagnóstico e planejamento', 'Dentística, periodontia e endodontia', 'Cirurgia oral básica', 'Urgências odontológicas', 'Atuação no SUS'],
  ENFERMEIRO: ['Processo de trabalho em enfermagem', 'Atenção primária e ESF', 'Saúde da mulher e criança', 'Imunização', 'Urgência e emergência', 'Vigilância em saúde', 'Ética profissional'],
  TEC_ENFERMAGEM: ['Fundamentos de enfermagem', 'Sinais vitais', 'Administração de medicamentos', 'Curativos e procedimentos', 'Biossegurança', 'Urgência e primeiros socorros', 'Ética profissional'],
  RECEPCIONISTA_SAUDE: ['Atendimento ao público', 'Rotinas administrativas', 'Agendamento e documentos', 'Comunicação interpessoal', 'Ética no atendimento', 'Noções de serviço público'],
  ARTESAO: ['Práticas artesanais', 'Atividades socioeducativas', 'Criatividade e coordenação de oficinas', 'Acompanhamento de grupos'],
  PEDAGOGO: ['Fundamentos da pedagogia', 'Planejamento educacional', 'Avaliação da aprendizagem', 'Inclusão e diversidade', 'Práticas pedagógicas'],
  PSICOLOGO: ['Fundamentos da psicologia', 'Avaliação psicológica', 'Psicologia social', 'Saúde mental', 'Políticas públicas', 'Ética profissional'],
  ASSISTENTE_SOCIAL: ['Fundamentos do Serviço Social', 'Política de assistência social', 'SUAS e proteção social', 'Direitos sociais', 'Trabalho com famílias', 'Ética profissional'],
  FISIOTERAPEUTA: ['Fundamentos da fisioterapia', 'Avaliação funcional', 'Reabilitação física', 'Saúde coletiva', 'Fisioterapia neurofuncional', 'Ética profissional'],
  NUTRICIONISTA: ['Fundamentos de nutrição', 'Nutrição clínica', 'Nutrição em saúde pública', 'Avaliação nutricional', 'Educação alimentar'],
  EDUCADOR_FISICO: ['Fundamentos da educação física', 'Atividade física e saúde', 'Promoção da saúde', 'Práticas corporais'],
  FARMACEUTICO: ['Assistência farmacêutica', 'Farmacologia básica', 'Dispensação de medicamentos', 'Controle de estoque', 'Boas práticas', 'Atuação no SUS'],
  IMOBILIZACAO: ['Fundamentos de ortopedia', 'Técnicas de imobilização', 'Atendimento inicial', 'Segurança do paciente'],
  ANALISE_CLINICA: ['Noções de laboratório', 'Coleta e acondicionamento', 'Biossegurança', 'Organização laboratorial', 'Rotinas técnicas'],
  DIGITADOR: ['Digitação e produtividade', 'Informática aplicada', 'Organização de dados', 'Rotina administrativa'],
  TERAPEUTA_OCUPACIONAL: ['Fundamentos da terapia ocupacional', 'Avaliação funcional', 'Intervenções terapêuticas', 'Trabalho com TEA e TDAH', 'Acompanhamento interdisciplinar'],
  PSICOPEDAGOGO: ['Fundamentos da psicopedagogia', 'Dificuldades de aprendizagem', 'Avaliação psicopedagógica', 'TEA, TDAH e aprendizagem'],
  FONOAUDIOLOGO: ['Fundamentos da fonoaudiologia', 'Linguagem e comunicação', 'Avaliação fonoaudiológica', 'Trabalho com TEA e TDAH'],
  AUX_COORDENACAO: ['Rotinas administrativas', 'Organização de projetos', 'Atendimento e suporte', 'Comunicação institucional'],
  ADVOGADO: ['Direito Constitucional', 'Direito Administrativo', 'Direito Civil e Processual', 'Direitos sociais', 'Atuação jurídica no setor público'],
  AUX_COZINHA_LIMPEZA: ['Noções de higiene', 'Organização de ambientes', 'Limpeza e conservação', 'Noções básicas de cozinha', 'Segurança no trabalho'],
  CARGA_DESCARGA: ['Organização de materiais', 'Movimentação e armazenamento', 'Noções de segurança', 'Rotina operacional'],
  AGENTE_SOCIAL: ['Atendimento social', 'Acompanhamento de famílias', 'Programas sociais', 'Ética e atendimento humanizado'],
  ATENDENTE_PROJETO: ['Atendimento ao público', 'Organização de rotinas', 'Noções de projetos sociais', 'Comunicação e recepção'],
  COZINHEIRA: ['Higiene e manipulação de alimentos', 'Preparo básico de refeições', 'Organização da cozinha', 'Boas práticas'],
  CUIDADOR_SOCIAL: ['Rotina do cuidador social', 'Cuidados com crianças e adolescentes', 'Noções do ECA', 'Primeiros socorros', 'Acolhimento e proteção'],
  EDUCADOR_SOCIAL: ['Educação social', 'Trabalho com grupos', 'Atividades socioeducativas', 'Acompanhamento de vulnerabilidades'],
  VISITADOR_CADUNICO: ['Cadastro Único', 'Entrevista social', 'Visitas domiciliares', 'Políticas sociais'],
  HORTICULTOR: ['Noções de horticultura', 'Plantio e cultivo', 'Manutenção de hortas', 'Ferramentas e organização'],
  INSTRUTOR_ARTESANATO: ['Técnicas artesanais', 'Planejamento de oficinas', 'Acompanhamento de grupos', 'Didática aplicada ao artesanato'],
  MOTORISTA: ['Legislação de trânsito', 'Direção defensiva', 'Primeiros socorros', 'Mecânica básica', 'Segurança e responsabilidade'],
  ORIENTADOR_OFICINAS: ['Planejamento de oficinas', 'Atividades socioeducativas', 'Condução de grupos', 'Acompanhamento social'],
  PADEIRO: ['Panificação básica', 'Manipulação de alimentos', 'Higiene e boas práticas', 'Organização da produção'],
  ASSISTENTE_SALA: ['Apoio escolar', 'Organização da sala', 'Acompanhamento de alunos', 'Noções pedagógicas'],
  PROFESSOR_AEE: ['Educação inclusiva', 'Atendimento Educacional Especializado', 'Deficiências e adaptações', 'Planejamento inclusivo'],
  SECRETARIO_ESCOLAR: ['Rotinas da secretaria escolar', 'Documentação escolar', 'Organização administrativa', 'Legislação educacional'],
  PROFESSOR_INGLES: ['Didática do inglês', 'Leitura e interpretação', 'Gramática da língua inglesa', 'Planejamento de aulas'],
  PROFESSOR_PORTUGUES: ['Gramática', 'Interpretação de texto', 'Produção textual', 'Didática da língua portuguesa'],
  PROFESSOR_EDF: ['Fundamentos da educação física escolar', 'Didática e planejamento', 'Esporte e movimento', 'Saúde e práticas corporais'],
  MONITOR_ED_INFANTIL: ['Desenvolvimento infantil', 'Rotina da educação infantil', 'Cuidados com crianças', 'Apoio pedagógico básico'],
};

const CARGOS_BURITIS = [
  // SAÚDE
  { id: 'acs_cana',     titulo: 'ACS ESF VI Canaã',              area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'ACS' },
  { id: 'acs_veredas',  titulo: 'ACS ESF VII Veredas',           area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'ACS' },
  { id: 'acs_serrabonita',titulo:'ACS Serra Bonita',             area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'ACS' },
  { id: 'acs_vilarosa', titulo: 'ACS Vila Rosa e Região',        area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'ACS' },
  { id: 'acs_palmeira', titulo: 'ACS Vila Palmeira e Região',    area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'ACS' },
  { id: 'acs_barriguda',titulo: 'ACS Barriguda II e Região',     area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'ACS' },
  { id: 'acs_serrana',  titulo: 'ACS Vila Serrana',              area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'ACS' },
  { id: 'acs_coopago',  titulo: 'ACS Coopago e Região',          area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'ACS' },
  { id: 'ace',          titulo: 'Agente de Combate às Endemias', area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'ACE' },
  { id: 'asb',          titulo: 'Auxiliar em Saúde Bucal',       area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'ASB' },
  { id: 'tsb',          titulo: 'Técnico em Saúde Bucal',        area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'TSB' },
  { id: 'dentista',     titulo: 'Dentista',                      area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'DENTISTA' },
  { id: 'enfermeiro',   titulo: 'Enfermeiro',                    area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'ENFERMEIRO' },
  { id: 'tec_enf',      titulo: 'Técnico em Enfermagem',         area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'TEC_ENFERMAGEM' },
  { id: 'recepcionista',titulo: 'Recepcionista',                 area: 'saude',    basico: 'BASICO_GERAL',      especifico: 'RECEPCIONISTA_SAUDE' },
  { id: 'artesao_caps', titulo: 'Artesão CAPS',                  area: 'saude',    basico: 'BASICO_GERAL',      especifico: 'ARTESAO' },
  { id: 'ass_caps',     titulo: 'Assistente Social CAPS',        area: 'saude',    basico: 'BASICO_SOCIAL',     especifico: 'ASSISTENTE_SOCIAL' },
  { id: 'tec_enf_caps', titulo: 'Técnico em Enfermagem CAPS',    area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'TEC_ENFERMAGEM' },
  { id: 'pedagogo_caps',titulo: 'Pedagogo CAPS',                 area: 'saude',    basico: 'BASICO_EDUCACAO',   especifico: 'PEDAGOGO' },
  { id: 'psi_caps',     titulo: 'Psicólogo CAPS',                area: 'saude',    basico: 'BASICO_GERAL',      especifico: 'PSICOLOGO' },
  { id: 'ass_emulti',   titulo: 'Assistente Social E-Multi',     area: 'saude',    basico: 'BASICO_SOCIAL',     especifico: 'ASSISTENTE_SOCIAL' },
  { id: 'fisio_emulti', titulo: 'Fisioterapeuta E-Multi',        area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'FISIOTERAPEUTA' },
  { id: 'psi_emulti',   titulo: 'Psicólogo E-Multi',             area: 'saude',    basico: 'BASICO_GERAL',      especifico: 'PSICOLOGO' },
  { id: 'nutri_emulti', titulo: 'Nutricionista E-Multi',         area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'NUTRICIONISTA' },
  { id: 'edf_emulti',   titulo: 'Educador Físico E-Multi',       area: 'saude',    basico: 'BASICO_GERAL',      especifico: 'EDUCADOR_FISICO' },
  { id: 'farm_emulti',  titulo: 'Farmacêutico E-Multi',          area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'FARMACEUTICO' },
  { id: 'tec_imob',     titulo: 'Técnico em Imobilização Ortopédica', area: 'saude', basico: 'BASICO_SAUDE',    especifico: 'IMOBILIZACAO' },
  { id: 'aux_analise',  titulo: 'Auxiliar de Análise Clínica',   area: 'saude',    basico: 'BASICO_SAUDE',      especifico: 'ANALISE_CLINICA' },
  { id: 'digitador',    titulo: 'Digitador',                     area: 'saude',    basico: 'BASICO_GERAL',      especifico: 'DIGITADOR' },
  { id: 'psi_autismo',  titulo: 'Psicólogo — Centro Autismo e TDAH', area: 'saude', basico: 'BASICO_GERAL',    especifico: 'PSICOLOGO' },
  { id: 'to_autismo',   titulo: 'Terapeuta Ocupacional — Autismo e TDAH', area: 'saude', basico: 'BASICO_SAUDE', especifico: 'TERAPEUTA_OCUPACIONAL' },
  { id: 'fisio_autismo',titulo: 'Fisioterapeuta — Autismo e TDAH', area: 'saude',  basico: 'BASICO_SAUDE',      especifico: 'FISIOTERAPEUTA' },
  { id: 'psico_auto',   titulo: 'Psicopedagogo — Autismo e TDAH', area: 'saude',   basico: 'BASICO_EDUCACAO',   especifico: 'PSICOPEDAGOGO' },
  { id: 'nutri_autismo',titulo: 'Nutricionista — Autismo e TDAH', area: 'saude',   basico: 'BASICO_SAUDE',      especifico: 'NUTRICIONISTA' },
  { id: 'fono_autismo', titulo: 'Fonoaudiólogo — Autismo e TDAH', area: 'saude',   basico: 'BASICO_SAUDE',      especifico: 'FONOAUDIOLOGO' },

  // ASSISTÊNCIA SOCIAL
  { id: 'aux_coord',    titulo: 'Auxiliar de Coordenação SEMAS', area: 'social',   basico: 'BASICO_SOCIAL',     especifico: 'AUX_COORDENACAO' },
  { id: 'adv_semas',    titulo: 'Advogado SEMAS',                area: 'social',   basico: 'BASICO_GERAL',      especifico: 'ADVOGADO' },
  { id: 'ass_semas',    titulo: 'Assistente Social SEMAS',       area: 'social',   basico: 'BASICO_SOCIAL',     especifico: 'ASSISTENTE_SOCIAL' },
  { id: 'nutri_semas',  titulo: 'Nutricionista SEMAS',           area: 'social',   basico: 'BASICO_SOCIAL',     especifico: 'NUTRICIONISTA' },
  { id: 'ped_semas',    titulo: 'Pedagogo SEMAS',                area: 'social',   basico: 'BASICO_SOCIAL',     especifico: 'PEDAGOGO' },
  { id: 'psi_semas',    titulo: 'Psicólogo SEMAS',               area: 'social',   basico: 'BASICO_SOCIAL',     especifico: 'PSICOLOGO' },
  { id: 'aux_coz',      titulo: 'Auxiliar de Cozinha e Limpeza', area: 'social',   basico: 'BASICO_OPERACIONAL', especifico: 'AUX_COZINHA_LIMPEZA' },
  { id: 'carga_desc',   titulo: 'Auxiliar de Carga e Descarga',  area: 'social',   basico: 'BASICO_OPERACIONAL', especifico: 'CARGA_DESCARGA' },
  { id: 'agente_social',titulo: 'Agente Social',                 area: 'social',   basico: 'BASICO_SOCIAL',     especifico: 'AGENTE_SOCIAL' },
  { id: 'atend_proj',   titulo: 'Atendente de Projeto',          area: 'social',   basico: 'BASICO_GERAL',      especifico: 'ATENDENTE_PROJETO' },
  { id: 'cozinheira',   titulo: 'Cozinheira',                    area: 'social',   basico: 'BASICO_OPERACIONAL', especifico: 'COZINHEIRA' },
  { id: 'cuid_diurno',  titulo: 'Cuidador Social Diurno',        area: 'social',   basico: 'BASICO_SOCIAL',     especifico: 'CUIDADOR_SOCIAL' },
  { id: 'cuid_noturno', titulo: 'Cuidador Social Noturno',       area: 'social',   basico: 'BASICO_SOCIAL',     especifico: 'CUIDADOR_SOCIAL' },
  { id: 'educ_social',  titulo: 'Educador Social',               area: 'social',   basico: 'BASICO_SOCIAL',     especifico: 'EDUCADOR_SOCIAL' },
  { id: 'visitador',    titulo: 'Visitador do Cadastro Único',   area: 'social',   basico: 'BASICO_SOCIAL',     especifico: 'VISITADOR_CADUNICO' },
  { id: 'horticultor',  titulo: 'Horticultor',                   area: 'social',   basico: 'BASICO_OPERACIONAL', especifico: 'HORTICULTOR' },
  { id: 'instr_artes',  titulo: 'Instrutor de Artesanato',       area: 'social',   basico: 'BASICO_SOCIAL',     especifico: 'INSTRUTOR_ARTESANATO' },
  { id: 'motorista',    titulo: 'Motorista',                     area: 'social',   basico: 'BASICO_OPERACIONAL', especifico: 'MOTORISTA' },
  { id: 'orient_ofic',  titulo: 'Orientador de Oficinas Socioeducativas', area: 'social', basico: 'BASICO_SOCIAL', especifico: 'ORIENTADOR_OFICINAS' },
  { id: 'padeiro',      titulo: 'Padeiro',                       area: 'social',   basico: 'BASICO_OPERACIONAL', especifico: 'PADEIRO' },

  // EDUCAÇÃO
  { id: 'assist_sala',  titulo: 'Assistente de Sala de Aula',    area: 'educacao', basico: 'BASICO_EDUCACAO',   especifico: 'ASSISTENTE_SALA' },
  { id: 'prof_aee',     titulo: 'Professor de AEE',              area: 'educacao', basico: 'BASICO_EDUCACAO',   especifico: 'PROFESSOR_AEE' },
  { id: 'sec_escolar',  titulo: 'Secretário Escolar',            area: 'educacao', basico: 'BASICO_EDUCACAO',   especifico: 'SECRETARIO_ESCOLAR' },
  { id: 'educ_soc_edu', titulo: 'Educador Social — Educação',    area: 'educacao', basico: 'BASICO_EDUCACAO',   especifico: 'EDUCADOR_SOCIAL' },
  { id: 'prof_ingles',  titulo: 'Professor PII Inglês',          area: 'educacao', basico: 'BASICO_EDUCACAO',   especifico: 'PROFESSOR_INGLES' },
  { id: 'prof_port',    titulo: 'Professor PII Português',       area: 'educacao', basico: 'BASICO_EDUCACAO',   especifico: 'PROFESSOR_PORTUGUES' },
  { id: 'prof_edf_pii', titulo: 'Professor PII Educação Física', area: 'educacao', basico: 'BASICO_EDUCACAO',   especifico: 'PROFESSOR_EDF' },
  { id: 'prof_edf_pi',  titulo: 'Professor PI Educação Física',  area: 'educacao', basico: 'BASICO_EDUCACAO',   especifico: 'PROFESSOR_EDF' },
  { id: 'monitor_inf',  titulo: 'Monitor de Educação Infantil',  area: 'educacao', basico: 'BASICO_EDUCACAO',   especifico: 'MONITOR_ED_INFANTIL' },
];

const AREAS_BURITIS = [
  { id: 'saude',    emoji: '🏥', titulo: 'Área da Saúde' },
  { id: 'social',   emoji: '🤝', titulo: 'Assistência Social' },
  { id: 'educacao', emoji: '📚', titulo: 'Área da Educação' },
];

function getCargosBuritisPorArea(areaId) {
  return CARGOS_BURITIS.filter(c => c.area === areaId);
}

function getDetalhesCarogBuritis(cargoId) {
  const cargo = CARGOS_BURITIS.find(c => c.id === cargoId);
  if (!cargo) return null;
  return {
    ...cargo,
    modulosBasicos: MODULOS_BASICOS[cargo.basico] || [],
    modulosEspecificos: MODULOS_ESPECIFICOS[cargo.especifico] || [],
  };
}

module.exports = {
  CARGOS_BURITIS,
  AREAS_BURITIS,
  getCargosBuritisPorArea,
  getDetalhesCarogBuritis,
};
