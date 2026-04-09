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

async function enviarDocumento(telefone, url, nomeArquivo, legenda) {
  try {
    await axios.post(`${config.zapi.baseUrl()}/send-document`,
      { phone: telefone, document: url, fileName: nomeArquivo, caption: legenda || '' },
      { headers: headers() });
  } catch (e) { console.error('[ZAPI] Erro doc:', e.response?.data || e.message); }
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

👤 Cliente: *${nome}*
📱 Número: ${telefoneCliente}
🛒 Produto: *${produto}*
💰 Aguardando confirmação manual

Responda:
✅ *CONFIRMAR ${telefoneCliente}* para liberar
❌ *RECUSAR ${telefoneCliente}* para recusar`;

  await enviarTexto(numeroAtendente, msg);
  if (imageUrl) await enviarImagem(numeroAtendente, imageUrl, 'Comprovante do cliente');
}

module.exports = { enviarTexto, enviarDocumento, enviarImagem, encaminharParaAtendente };
