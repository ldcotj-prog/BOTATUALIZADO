require('dotenv').config();
const express = require('express');
const path = require('path');
const config = require('./config');
const { processarMensagem } = require('./flows');

const app = express();
app.use(express.json());

// ============================================================
// LANDING PAGE
// ============================================================
app.get('/', (req, res) => res.redirect('/produtos'));
app.get('/produtos', (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'));
});
app.get('/health', (req, res) => res.json({ ok: true, status: 'Bot Smart Cursos Unaí rodando!' }));

// ============================================================
// WEBHOOK — recebe mensagens do Z-API
// ============================================================
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Ignora mensagens enviadas pelo próprio bot
    if (!body || body.fromMe || body.isStatusReply) {
      return res.status(200).json({ ok: true });
    }

    const telefone = body.phone;
    const dados = extrairDados(body);

    if (!telefone || !dados) return res.status(200).json({ ok: true });

    console.log(`\n📩 [${new Date().toLocaleTimeString('pt-BR')}] De: ${telefone} | tipo: ${dados.tipo}`);

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
  // Texto
  if (body.text?.message) return { tipo: 'texto', conteudo: body.text.message };

  // Imagem (comprovante PIX)
  if (body.image) {
    console.log('[IMAGE DEBUG]', JSON.stringify(body.image));
    const url = body.image.imageUrl
      || body.image.url
      || body.image.link
      || body.image.downloadUrl
      || body.image.base64
      || body.image.mediaUrl
      || '';
    return { tipo: 'imagem', conteudo: url, caption: body.image.caption || '' };
  }

  // Documento
  if (body.document) return { tipo: 'documento', conteudo: body.document.documentUrl, caption: body.document.caption || '' };

  // Áudio (ignorado)
  if (body.audio) return { tipo: 'texto', conteudo: '[áudio recebido]' };

  return null;
}

// ============================================================
// INICIA SERVIDOR
// ============================================================
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log('\n================================================');
  console.log('🤖 BOT SMART CURSOS UNAÍ — SISTEMA COMPLETO');
  console.log('================================================');
  console.log(`🚀 Porta: ${PORT}`);
  console.log(`📡 Webhook: http://localhost:${PORT}/webhook`);
  console.log(`🌐 Landing: http://localhost:${PORT}/produtos`);
  console.log('================================================\n');
});
