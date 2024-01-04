#!/bin/bash
cd /opt/RPP/
sudo git reset --hard HEAD
sudo git pull

sudo chmod -R 775 /opt/RPP/uploads
sudo chown -R www-data:www-data /opt/RPP/uploads
sudo chmod -R 775 /opt/RPP/printer_ip.txt
sudo chown -R www-data:www-data /opt/RPP/printer_ip.txt