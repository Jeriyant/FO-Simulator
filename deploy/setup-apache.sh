#!/usr/bin/env bash
set -euo pipefail

ROOT="/mnt/e/Cursor-Project/FO-Simulator"
SITE="fo-simulator.conf"

echo "==> Build production assets"
cd "$ROOT"
npm run build

echo "==> Make update.sh executable"
chmod +x "$ROOT/update.sh" "$ROOT/deploy/update-from-github.sh" "$ROOT/deploy/setup-apache.sh"

echo "==> Install Apache site config"
sudo a2enmod headers 2>/dev/null || true
sudo cp "$ROOT/deploy/apache-fo-simulator.conf" "/etc/apache2/sites-available/$SITE"
sudo a2dissite jnet-monitor.conf 2>/dev/null || true
sudo a2ensite "$SITE"
sudo apache2ctl configtest
sudo systemctl reload apache2

echo "==> Done. Open http://localhost/ in your browser."
echo "    To update production build later:  $ROOT/update.sh"
