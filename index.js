require('dotenv').config();
const express = require('express');
const path = require('path');
const config = require('./config');
const { processarMensagem } = require('./flows');
const { updateSession, getSession, ETAPAS } = require('./storage');

const app = express();
app.use(express.json());

// ============================================================
// LANDING PAGE
// ============================================================
app.get('/', (req, res) => res.redirect('/produtos'));
app.get('/produtos', (req, res) => res.sendFile(path.join(__dirname, 'landing.html')));
app.get('/health', (req, res) => res.json({ ok: true, status: 'JARVIS — Smart Cursos Unaí rodando!' }));

// ============================================================
// WEBHOOK — recebe mensagens do Z-API
// ============================================================
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    if (!body) return res.status(200).json({ ok: true });

    // LOG COMPLETO para debug (remover depois)
    console.log(`[WEBHOOK] fromMe:${body.fromMe} | isStatus:${body.isStatusReply} | phone:${body.phone} | type:${body.type}`);

    if (body.isStatusReply) return res.status(200).json({ ok: true });

    const telefone = body.phone;
    if (!telefone) return res.status(200).json({ ok: true });

    // ── MENSAGEM ENVIADA PELO ATENDENTE ──────────────────────────
    // Z-API pode enviar fromMe como true, "true", 1 ou campo separado
    const isFromMe = body.fromMe === true
      || body.fromMe === 'true'
      || body.fromMe === 1
      || body.isFromMe === true
      || body.participant === '' // mensagem enviada pelo próprio número
      || body.type === 'SendMessage';

    if (isFromMe) {
      const texto = body.text?.message || body.message || '';
      console.log(`[HUMANO] Mensagem enviada para ${telefone}: "${texto.slice(0, 50)}"`);

      // Comando para reativar o bot
      if (texto.toUpperCase().startsWith('BOT ON ')) {
        const numeroAlvo = texto.split(' ')[2]?.trim();
        if (numeroAlvo) {
          updateSession(numeroAlvo, { atendimentoHumano: false });
          console.log(`[HUMANO] ✅ Bot reativado para ${numeroAlvo}`);
        }
        return res.status(200).json({ ok: true });
      }

      // Pausa o bot para esse número
      updateSession(telefone, { atendimentoHumano: true });
      console.log(`[HUMANO] 🤝 Bot PAUSADO para ${telefone}`);
      return res.status(200).json({ ok: true });
    }

    // ── MENSAGEM RECEBIDA DO CLIENTE ─────────────────────────────
    const session = getSession(telefone);
    if (session.atendimentoHumano) {
      console.log(`[HUMANO] 🔕 Bot pausado — ignorando mensagem de ${telefone}`);
      return res.status(200).json({ ok: true });
    }

    const dados = extrairDados(body);
    if (!dados) return res.status(200).json({ ok: true });

    console.log(`\n📩 [${new Date().toLocaleTimeString('pt-BR')}] De: ${telefone} | tipo: ${dados.tipo} | "${(dados.conteudo || '').slice(0,40)}"`);

    processarMensagem(telefone, dados).catch(err => {
      console.error('[ERROR]', err);
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[WEBHOOK ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// EXTRAIR DADOS DA MENSAGEM Z-API
// ============================================================
function extrairDados(body) {
  if (body.text?.message) return { tipo: 'texto', conteudo: body.text.message };
  if (body.image) {
    const url = body.image.imageUrl || body.image.url || body.image.link
      || body.image.downloadUrl || body.image.mediaUrl || body.image.base64 || '';
    return { tipo: 'imagem', conteudo: url, caption: body.image.caption || '' };
  }
  if (body.document) return { tipo: 'documento', conteudo: body.document.documentUrl, caption: body.document.caption || '' };
  if (body.audio) return { tipo: 'texto', conteudo: '[áudio]' };
  return null;
}

// ============================================================
// INICIA SERVIDOR
// ============================================================
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log('\n================================================');
  console.log('🤖 JARVIS — Smart Cursos Unaí');
  console.log('================================================');
  console.log(`🚀 Porta: ${PORT}`);
  console.log(`📡 Webhook: http://localhost:${PORT}/webhook`);
  console.log(`🌐 Landing: http://localhost:${PORT}/produtos`);
  console.log('================================================');
  console.log('💡 Para reativar o bot: envie "BOT ON 5538NUMERO"');
  console.log('================================================\n');
});
