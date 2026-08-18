/**
 * Carrega variáveis de um arquivo .env na raiz do projeto (se existir) para
 * dentro de process.env — sem depender de nenhum pacote externo (dotenv etc.).
 *
 * Nunca sobrescreve uma variável que já esteja definida no ambiente: assim,
 * em produção (Railway, Render, Oracle Cloud), as variáveis configuradas no
 * painel/host sempre vencem um .env que porventura exista junto do código.
 *
 * Precisa ser chamado ANTES de qualquer módulo que leia process.env no
 * carregamento (ex.: banco.js) — por isso é o primeiro require de
 * servidor.js e dos scripts em deploy/.
 */
const fs = require('fs');
const path = require('path');

function carregarEnv() {
  const arquivo = path.join(__dirname, '.env');
  if (!fs.existsSync(arquivo)) return;

  const conteudo = fs.readFileSync(arquivo, 'utf8');
  conteudo.split('\n').forEach(linhaBruta => {
    const linha = linhaBruta.trim();
    if (!linha || linha.startsWith('#')) return;
    const igual = linha.indexOf('=');
    if (igual < 0) return;
    const chave = linha.slice(0, igual).trim();
    let valor = linha.slice(igual + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    if (!(chave in process.env)) process.env[chave] = valor;
  });
}

carregarEnv();
module.exports = carregarEnv;
