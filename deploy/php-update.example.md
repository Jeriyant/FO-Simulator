# Update via PHP (tanpa ubah VirtualHost / ScriptAlias)
#
# Syarat:
#   - PHP terpasang (php-cgi / php-fpm / mod_php)
#   - function exec() tidak di-disable
#   - file di DocumentRoot app:
#       index.html, update.php, update.sh, version.json, assets/
#
# Uji:
#   curl -i -X POST https://jeriyant.my.id/FO-Simulator/update.php
#
# UI FO Simulator memanggil ./update.php secara relatif.
#
# Permission:
#   chmod +x update.sh
#   chown -R www-data:www-data /var/www/html/FO-Simulator   # atau user PHP-FPM Anda
#
# Catatan keamanan: endpoint ini bisa memicu update oleh siapa saja yang
# bisa membuka URL-nya. Batasi akses (firewall / basic auth) jika perlu.
