const axios = require('axios');
const config = require('./config');

/**
 * Analisa imagem de comprovante PIX usando OpenAI Vision
 * Retorna: { valido: bool, valor: number|null, mensagem: string }
 */
async function validarComprovante(imageUrl, valorEsperado) {
  try {
    const prompt = `Analise esta imagem. É um comprovante de pagamento PIX?
Se for, extraia:
1. O valor pago (número)
2. Se o pagamento foi concluído com sucesso

Responda APENAS em JSON assim:
{"isComprovante": true/false, "valorPago": 0.00, "concluido": true/false}

Não escreva nada além do JSON.`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
            { type: 'text', text: prompt }
          ]
        }]
      },
      { headers: { Authorization: `Bearer ${config.openai.apiKey}`, 'Content-Type': 'application/json' } }
    );

    const texto = response.data.choices[0].message.content.trim();
    const clean = texto.replace(/```json|```/g, '').trim();
    const resultado = JSON.parse(clean);

    if (!resultado.isComprovante) {
      return { valido: false, valor: null, mensagem: 'imagem_invalida' };
    }
    if (!resultado.concluido) {
      return { valido: false, valor: resultado.valorPago, mensagem: 'pagamento_nao_concluido' };
    }

    // Tolerância de R$1 para evitar falsos negativos
    const valorOk = Math.abs(resultado.valorPago - valorEsperado) <= 1.00;
    return {
      valido: valorOk,
      valor: resultado.valorPago,
      mensagem: valorOk ? 'ok' : 'valor_incorreto'
    };

  } catch (err) {
    console.error('[PAGAMENTO] Erro na validação:', err.response?.data || err.message);
    // Em caso de erro na IA, retorna pendente (vai para confirmação manual)
    return { valido: null, valor: null, mensagem: 'erro_ia' };
  }
}

module.exports = { validarComprovante };
