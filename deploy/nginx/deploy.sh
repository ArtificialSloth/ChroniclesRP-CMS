#!/bin/bash

cp /var/www/crp/deploy/nginx/$1 /etc/nginx/sites-available/$2
sed -i -e "s/NICENAME/$2/g" -e "s/SLUG/$3/g" /etc/nginx/sites-available/$2

ln -s /etc/nginx/sites-available/$2 /etc/nginx/sites-enabled/$2

sudo systemctl reload nginx
