#!/bin/bash

mkdir /var/www/$1
cd /var/www/$1
wget http://wordpress.org/latest.tar.gz

tar xzvf latest.tar.gz
rm latest.tar.gz

mv wordpress/* .
rm -R wordpress
