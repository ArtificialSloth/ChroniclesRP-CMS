#!/bin/bash

cd /var/www/crp/source

apt-get update && apt-get upgrade -y
curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
apt-get install -y nginx php-fpm php-mysql php-gd mysql-server nodejs build-essential;
npm i pm2 -g

sed -i 's/;cgi.fix_pathinfo=1/cgi.fix_pathinfo=0/' /etc/php/7.0/fpm/php.ini
systemctl reload php7.0-fpm

rm -R /var/www/html
cp deploy/nginx/default /etc/nginx/sites-available/default
cp deploy/nginx/php /etc/nginx/sites-available/php
ln -s /etc/nginx/sites-available/php /etc/nginx/sites-enabled/php
systemctl reload nginx

mysql <<_EOF_
	DELETE FROM mysql.user WHERE User='';
	DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
	DROP DATABASE IF EXISTS test;
	DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
	FLUSH PRIVILEGES;
_EOF_
