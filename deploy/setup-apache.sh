#!/usr/bin/env bash
set -euo pipefail

ROOT="/mnt/e/Cursor-Project/FO-Simulator"
SITE="fo-simulator.conf"

echo "==> Build production assets"
cd "$ROOT"
npm run build

echo "==> Install Apache site config"
sudo cp "$ROOT/deploy/apache-fo-simulator.conf" "/etc/apache2/sites-available/$SITE"
sudo a2dissite jnet-monitor.conf 2>/dev/null || true
sudo a2ensite "$SITE"
sudo apache2ctl configtest
sudo systemctl reload apache2

echo "==> Done. Open http://localhost/ in your browser."
