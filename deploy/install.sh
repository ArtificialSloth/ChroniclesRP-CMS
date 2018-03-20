#!/bin/bash

groupadd crp
useradd -m -g crp crp
echo 'crp ALL=(ALL)	NOPASSWD: /bin/systemctl reload nginx, /bin/systemctl reload php7.0-fpm, /usr/bin/npm, /usr/bin/pm2' >> /etc/sudoers

apt-get update && apt-get upgrade -y
curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
apt-get install -y ufw nginx php-fpm php-mysql php-gd mysql-server nodejs
clear

chown -R crp:crp /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/php/7.0/fpm/pool.d /var/www
sed -i 's/;cgi.fix_pathinfo=1/cgi.fix_pathinfo=0/' /etc/php/7.0/fpm/php.ini

ufw allow ssh
ufw allow http
ufw enable

mysql -p <<_EOF_
	DELETE FROM mysql.user WHERE User='';
	DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
	DROP DATABASE IF EXISTS test;
	DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
	FLUSH PRIVILEGES;
_EOF_

su -c "rm -R /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default /var/www/html" crp
su -c "rm /etc/php/7.0/fpm/pool.d/www.conf" crp
su -c "sudo systemctl reload php7.0-fpm" crp

su -c "bash /var/www/crp/deploy/nginx/deploy.sh nodejs crp chroniclesrp.com" crp
su -c "sudo npm i -g pm2" crp

su -c "cd /var/www/crp && npm i && pm2 ecosystem" crp

echo "Done!"
