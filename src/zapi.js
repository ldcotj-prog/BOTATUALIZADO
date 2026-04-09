const axios = require('axios');
const config = require('./config');

const headers = () => ({
  'Client-Token': config.zapi.clientToken,
  'Content-Type': 'application/json'
});

async function enviarTexto(telefone, mensagem) {
  try {
    await axios.post(`${config.zapi.baseUrl()}/send-text`,
      { phone: telefone, message: mensagem }, { headers: headers() });
  } catch (e) { console.error('[ZAPI] Erro texto:', e.response?.data || e.message); }
}

async function enviarDocumento(telefone, driveId, nomeArquivo, legenda) {
  try {
    const linkVisualizacao = `https://drive.google.com/file/d/${driveId}/view?usp=sharing`;
    const mensagem = `${legenda}\n\n📥 *Clique para baixar sua apostila:*\n${linkVisualizacao}`;
    await enviarTexto(telefone, mensagem);
    console.log(`[ZAPI] ✅ Link enviado para ${telefone} | ID: ${driveId}`);
  } catch (e) {
    console.error('[ZAPI] ❌ Erro link:', e.message);
  }
}

async function enviarImagem(telefone, url, legenda) {
  try {
    await axios.post(`${config.zapi.baseUrl()}/send-image`,
      { phone: telefone, image: url, caption: legenda || '' },
      { headers: headers() });
  } catch (e) { console.error('[ZAPI] Erro img:', e.response?.data || e.message); }
}

async function encaminharParaAtendente(telefoneCliente, nome, produto, imageUrl) {
  const numeroAtendente = config.escola.numeroAtendimento;
  const msg =
`🔔 *NOVO COMPROVANTE RECEBIDO*

👤 Cliente: *${nome || 'desconhecido'}*
📱 Número: ${telefoneCliente}
🛒 Produto: *${produto}*

Responda:
✅ *CONFIRMAR ${telefoneCliente}* para liberar
❌ *RECUSAR ${telefoneCliente}* para recusar`;

  await enviarTexto(numeroAtendente, msg);
  if (imageUrl) await enviarImagem(numeroAtendente, imageUrl, 'Comprovante do cliente');
}

module.exports = { enviarTexto, enviarDocumento, enviarImagem, encaminharParaAtendente };
