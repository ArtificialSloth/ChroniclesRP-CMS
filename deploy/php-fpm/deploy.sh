#!/bin/bash

cp /var/www/crp/deploy/php-fpm/pool.conf /etc/php/7.0/fpm/pool.d/$1.conf
sed -i "s/SNAME/$1/g" /etc/php/7.0/fpm/pool.d/$1.conf

systemctl reload php7.0-fpm
