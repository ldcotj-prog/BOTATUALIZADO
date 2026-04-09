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
    const url = `https://drive.google.com/uc?export=download&confirm=t&id=${driveId}`;
    console.log(`[ZAPI] Enviando doc para ${telefone} | ID: ${driveId}`);
    const resp = await axios.post(`${config.zapi.baseUrl()}/send-file`,
      { phone: telefone, file: url, fileName: nomeArquivo, caption: legenda || '' },
      { headers: headers() });
    console.log(`[ZAPI] ✅ Doc resp:`, JSON.stringify(resp.data));
  } catch (e) {
    console.error('[ZAPI] ❌ Erro doc:', e.response?.data || e.message);
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
