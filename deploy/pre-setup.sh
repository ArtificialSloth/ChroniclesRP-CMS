#!/bin/bash

apt-get update && apt-get upgrade -y
curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
apt-get install -y git nginx php-fpm php-mysql php-gd mysql-server nodejs
