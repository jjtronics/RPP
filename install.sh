#!/bin/bash
sudo apt update
sudo apt install git
sudo apt install python3-pip
sudo apt install python3-flask
sudo pip3 install alive-progress --break-system-packages

cd /opt/
git clone https://github.com/jjtronics/RPP.git

sudo chmod -R 775 /opt/RPP/uploads
sudo chown -R www-data:www-data /opt/RPP/uploads
sudo chmod -R 775 /opt/RPP/printer_ip.txt
sudo chown -R www-data:www-data /opt/RPP/printer_ip.txt

cd RPP

sudo mv rpp.service /etc/systemd/system/
sudo systemctl enable rpp
sudo systemctl start rpp