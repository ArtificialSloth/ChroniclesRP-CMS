#!/bin/bash

cd /var/www/crp

apt-get update && apt-get upgrade -y
curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
apt-get install -y ufw nginx php-fpm php-mysql php-gd mysql-server nodejs
clear

sed -i 's/;cgi.fix_pathinfo=1/cgi.fix_pathinfo=0/' /etc/php/7.0/fpm/php.ini
rm /etc/php/7.0/fpm/pool.d/www.conf
systemctl reload php7.0-fpm

rm -R /var/www/html
mv deploy/php-fpm/pool.conf /etc/nginx/sites-available/default
systemctl reload nginx

ufw allow ssh
ufw allow http
ufw allow https
ufw enable

mysql -p <<_EOF_
	DELETE FROM mysql.user WHERE User='';
	DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
	DROP DATABASE IF EXISTS test;
	DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
	FLUSH PRIVILEGES;
_EOF_

npm i
npm i -g pm2
pm2 ecosystem

echo "Done!"
