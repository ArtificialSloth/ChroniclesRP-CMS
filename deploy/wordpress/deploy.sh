#!/bin/bash

mkdir /var/www/$1
cd /var/www/$1
wget http://wordpress.org/latest.tar.gz > /dev/null

tar xzvf latest.tar.gz
rm latest.tar.gz

mv wordpress/* .
rm -R wordpress

PASS=$(pwgen -s 64)
SALT=$(wget https://api.wordpress.org/secret-key/1.1/salt/ -q -O -)
mysql <<_EOF_
	CREATE DATABASE $1;
	GRANT ALL PRIVILEGES ON $1.* TO '$1'@'localhost' IDENTIFIED BY '$PASS';
_EOF_

cp /var/www/crp/deploy/wordpress/wp-config.php wp-config.php
sed -i -e "s/[SNAME]/$1/g" -e "s/[PASS]/$PASS/g" -e "s/[SALT]/$SALT/" wp-config.php

bash /var/www/crp/deploy/php-fpm/deploy.sh $1
