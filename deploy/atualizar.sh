#!/usr/bin/env bash
#
# Atualiza o Sistema Financeiro para a versão mais recente do código
# (git pull) e reinicia o serviço. Não mexe em nada dentro de dados/.
#
# Uso, já dentro da VM:  sudo bash /opt/sistema-financeiro/deploy/atualizar.sh

set -euo pipefail
PASTA_APP="/opt/sistema-financeiro"

if [ "$(id -u)" -ne 0 ]; then
  echo "Rode com sudo: sudo bash atualizar.sh"
  exit 1
fi

git -C "$PASTA_APP" pull
systemctl restart sistema-financeiro
echo "Atualizado e reiniciado. Status:"
systemctl status sistema-financeiro --no-pager -l | head -n 8
