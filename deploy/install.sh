#!/bin/bash

process() {
	cd /var/www/crp

	apt-get update && apt-get upgrade -y
	curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
	apt-get install -y nginx php-fpm php-mysql php-gd mysql-server nodejs

	sed -i 's/;cgi.fix_pathinfo=1/cgi.fix_pathinfo=0/' /etc/php/7.0/fpm/php.ini
	systemctl reload php7.0-fpm

	rm -R /var/www/html
	mv deploy/nginx/default /etc/nginx/sites-available/default
	mv deploy/nginx/php /etc/nginx/sites-available/php
	ln -s /etc/nginx/sites-available/php /etc/nginx/sites-enabled/php
	systemctl reload nginx

	mysql <<_EOF_
		DELETE FROM mysql.user WHERE User='';
		DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
		DROP DATABASE IF EXISTS test;
		DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
		FLUSH PRIVILEGES;
_EOF_
}
process > /dev/null &
pid=$!

sp="/-\|"
while kill -0 $pid 2> /dev/null; do
	for ((i=0; i<${#sp}; i++)); do
		echo -en "Setting up environment ${sp:$i:1}" "\r"
		sleep 0.2
	done
done

echo -e "\033[KDone!"
