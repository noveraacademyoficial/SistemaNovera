#!/usr/bin/env bash
#
# Configura o Sistema Financeiro (Novera Academy) numa VM Ubuntu limpa.
# Pensado para o Oracle Cloud "Always Free", mas funciona em qualquer VPS Ubuntu.
#
# Uso, depois de entrar na VM por SSH:
#   curl -fsSL https://raw.githubusercontent.com/noveraacademyoficial/SistemaNovera/main/deploy/setup.sh -o setup.sh
#   sudo bash setup.sh
#
# Roda quantas vezes precisar sem problema (idempotente): se já tiver rodado
# antes, a próxima execução só atualiza o código (git pull) e reinicia o
# serviço — nunca mexe nos dados nem recria as contas de login.
#
# O que ele faz:
#   1. Instala o Node.js (se não tiver)
#   2. Baixa (ou atualiza) o código deste repositório em /opt/sistema-financeiro
#   3. Na primeira vez, cria um arquivo .env com um modelo para você preencher
#   4. Cria e liga o serviço do sistema (systemd) — reinicia sozinho se cair
#   5. Instala o Caddy e configura HTTPS automático para o domínio informado
#   6. Libera as portas 80 e 443 no firewall da própria VM
#
# O que ele NÃO faz (precisa ser feito no painel do Oracle Cloud, no navegador):
#   - Criar a VM
#   - Liberar as portas 80/443 na "Security List" da rede (VCN)

set -euo pipefail

REPO_URL="https://github.com/noveraacademyoficial/SistemaNovera.git"
PASTA_APP="/opt/sistema-financeiro"
PASTA_DADOS="/opt/dados-sistema-financeiro"
ARQUIVO_ENV="$PASTA_APP/.env"
USUARIO_SERVICO="${SUDO_USER:-ubuntu}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Rode com sudo: sudo bash setup.sh"
  exit 1
fi

echo "== 1/6 — Node.js =="
if ! command -v node >/dev/null || [ "$(node -v | grep -oE '[0-9]+' | head -1)" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "Node.js $(node -v) já instalado."
fi

echo "== 2/6 — código do sistema =="
apt-get install -y git
if [ -d "$PASTA_APP/.git" ]; then
  git -C "$PASTA_APP" pull
else
  git clone "$REPO_URL" "$PASTA_APP"
fi
mkdir -p "$PASTA_DADOS"
chown -R "$USUARIO_SERVICO":"$USUARIO_SERVICO" "$PASTA_APP" "$PASTA_DADOS"

echo "== 3/6 — variáveis de ambiente (.env) =="
if [ ! -f "$ARQUIVO_ENV" ]; then
  cat > "$ARQUIVO_ENV" <<'MODELO'
# Preencha os valores abaixo e rode "sudo bash setup.sh" de novo.
PORT=3300

# Domínio que vai apontar para o IP público desta VM (ex.: noveraacademy.duckdns.org
# ou um domínio seu). Sem isso o Caddy não consegue emitir o certificado HTTPS.
DOMINIO=

# Mesmos valores do seu .env local (painel do Supabase → Project Settings → API).
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Só usadas se a tabela "usuarios" do Supabase ainda estiver vazia (para criar
# as contas de login pela primeira vez). Se já existem contas no banco, pode
# deixar em branco — elas não fazem nada nesse caso.
ADMIN_USUARIO=davi
ADMIN_SENHA=
PROF_USUARIO=olivia
PROF_SENHA=
MODELO
  chmod 600 "$ARQUIVO_ENV"
  chown "$USUARIO_SERVICO":"$USUARIO_SERVICO" "$ARQUIVO_ENV"
  echo ""
  echo "Criei $ARQUIVO_ENV com um modelo."
  echo "Edite com:  nano $ARQUIVO_ENV"
  echo "Preencha DOMINIO, ADMIN_SENHA e PROF_SENHA, salve (Ctrl+O, Enter, Ctrl+X)"
  echo "e rode este script de novo: sudo bash setup.sh"
  exit 0
fi

set -a
# shellcheck disable=SC1090
source "$ARQUIVO_ENV"
set +a

if [ -z "${DOMINIO:-}" ]; then
  echo "DOMINIO está vazio em $ARQUIVO_ENV — preencha e rode de novo."
  exit 1
fi

echo "== 4/6 — serviço do sistema (systemd) =="
cat > /etc/systemd/system/sistema-financeiro.service <<SERVICO
[Unit]
Description=Sistema Financeiro - Novera Academy
After=network.target

[Service]
Type=simple
WorkingDirectory=$PASTA_APP
EnvironmentFile=$ARQUIVO_ENV
ExecStart=$(command -v node) servidor.js
Restart=always
RestartSec=5
User=$USUARIO_SERVICO

[Install]
WantedBy=multi-user.target
SERVICO
systemctl daemon-reload
systemctl enable --now sistema-financeiro
systemctl restart sistema-financeiro

echo "== 5/6 — Caddy (HTTPS automático) =="
if ! command -v caddy >/dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi
cat > /etc/caddy/Caddyfile <<CADDY
$DOMINIO {
	reverse_proxy 127.0.0.1:${PORT:-3300}
}
CADDY
systemctl reload caddy 2>/dev/null || systemctl restart caddy

echo "== 6/6 — firewall da VM (portas 80 e 443) =="
if command -v iptables >/dev/null; then
  iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 80 -j ACCEPT
  iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 443 -j ACCEPT
  (apt-get install -y iptables-persistent && netfilter-persistent save) 2>/dev/null || netfilter-persistent save 2>/dev/null || true
fi

echo ""
echo "Pronto. Acesse:  https://$DOMINIO"
echo ""
echo "Lembrete: a Security List da rede (VCN), no PAINEL do Oracle Cloud (no"
echo "navegador, não aqui), também precisa liberar entrada nas portas 80 e 443."
echo "Sem isso o site não vai abrir, mesmo com tudo certo aqui na VM."
