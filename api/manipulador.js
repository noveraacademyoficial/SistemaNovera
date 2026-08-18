/**
 * Ponto de entrada da Vercel (função sem estado). Só repassa a requisição
 * para o mesmo handler que o servidor de processo único usa — toda a lógica
 * de verdade (rotas, sessão, banco) mora em ../servidor.js.
 */
const tratarRequisicao = require('../servidor');

module.exports = (req, res) => tratarRequisicao(req, res);
