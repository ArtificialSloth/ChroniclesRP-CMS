#!/bin/bash

cp /var/www/crp/deploy/pool.conf /etc/php/7.0/fpm/pool.d/$1.conf
sed -i "s/NICENAME/$1/g" /etc/php/7.0/fpm/pool.d/$1.conf

sudo systemctl reload php7.0-fpm
