#!/bin/bash

set -e

PROJECT="/workspace/rh-connect"
API="$PROJECT/apps/api"

echo "==> Encerrando serviços atuais..."

# Mata qualquer processo que esteja ocupando as portas
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true

# Pequena espera para garantir que as portas sejam liberadas
sleep 2

echo "==> Verificando portas..."

if ss -tulpn | grep -q ':3000 '; then
    echo "ERRO: porta 3000 ainda está ocupada."
    exit 1
fi

if ss -tulpn | grep -q ':5173 '; then
    echo "ERRO: porta 5173 ainda está ocupada."
    exit 1
fi

echo "==> Iniciando API..."

cd "$API"
nohup pnpm start:dev > api.log 2>&1 &

echo "==> Iniciando frontend..."

cd "$PROJECT"
nohup pnpm dev:web --host 0.0.0.0 > vite.log 2>&1 &

echo "==> Aguardando serviços..."
sleep 5

echo ""
echo "==> Status:"
ss -tulpn | grep -E ':5173|:3000' || true

echo ""
echo "==> Últimas linhas da API:"
tail -10 "$API/api.log"

echo ""
echo "==> Últimas linhas do frontend:"
tail -10 "$PROJECT/vite.log"

echo ""
echo "==> Reinicialização concluída."
