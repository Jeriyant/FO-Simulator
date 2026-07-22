#!/usr/bin/env bash
set -euo pipefail

ROOT="/mnt/e/Cursor-Project/FO-Simulator"
SITE="fo-simulator.conf"

echo "==> Build production assets"
cd "$ROOT"
npm run build

echo "==> Make update scripts executable"
chmod +x "$ROOT/update.sh" "$ROOT/deploy/update-from-github.sh" "$ROOT/deploy/setup-apache.sh"
chmod +x "$ROOT/dist/update.sh" 2>/dev/null || true

echo "==> Install Apache site config"
sudo a2enmod headers 2>/dev/null || true
sudo cp "$ROOT/deploy/apache-fo-simulator.conf" "/etc/apache2/sites-available/$SITE"
sudo a2dissite jnet-monitor.conf 2>/dev/null || true
sudo a2ensite "$SITE"
sudo apache2ctl configtest
sudo systemctl reload apache2

echo "==> Done. Open http://localhost/ in your browser."
echo "    UI update: POST ./update.php  (PHP menjalankan update.sh)"
echo "    Manual:    ./update.sh"
echo "    Tip:       lihat deploy/php-update.example.md"
