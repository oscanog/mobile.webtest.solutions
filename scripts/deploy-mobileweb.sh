#!/usr/bin/env bash

set -euo pipefail

RELEASE_DIR="${1:?usage: deploy-mobileweb.sh <release-dir>}"
APP_NAME="bugcatcher-mobileweb"
WEB_ROOT="/var/www/${APP_NAME}"
NGINX_AVAILABLE="/etc/nginx/sites-available/${APP_NAME}.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/${APP_NAME}.conf"
NGINX_SOURCE="${RELEASE_DIR}/infra/nginx/bugcatcher-mobileweb.conf"
DIST_SOURCE="${RELEASE_DIR}/dist"
CERT_NAME="${APP_NAME}"
CERT_FULLCHAIN="/etc/letsencrypt/live/${CERT_NAME}/fullchain.pem"

if [ ! -d "${DIST_SOURCE}" ]; then
  echo "dist directory is missing from release bundle" >&2
  exit 1
fi

if [ ! -f "${NGINX_SOURCE}" ]; then
  echo "nginx config is missing from release bundle" >&2
  exit 1
fi

sudo mkdir -p "${WEB_ROOT}"
sudo rsync -a --delete "${DIST_SOURCE}/" "${WEB_ROOT}/"
sudo mkdir -p "${WEB_ROOT}/.well-known/acme-challenge"
sudo chown -R www-data:www-data "${WEB_ROOT}"

if [ ! -f "${CERT_FULLCHAIN}" ]; then
  BOOTSTRAP_CONFIG="$(mktemp)"

  cat <<'EOF' > "${BOOTSTRAP_CONFIG}"
server {
    listen 80;
    listen [::]:80;
    server_name m.bugcatcher.online mobile.bugcatcher.online;

    root /var/www/bugcatcher-mobileweb;
    index index.html;

    location /.well-known/acme-challenge/ {
        allow all;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ /\.(?!well-known) {
        deny all;
    }
}
EOF

  sudo install -m 644 "${BOOTSTRAP_CONFIG}" "${NGINX_AVAILABLE}"
  sudo ln -sfn "${NGINX_AVAILABLE}" "${NGINX_ENABLED}"
  rm -f "${BOOTSTRAP_CONFIG}"

  sudo nginx -t
  sudo systemctl reload nginx

  sudo certbot certonly \
    --webroot \
    -w "${WEB_ROOT}" \
    -d m.bugcatcher.online \
    -d mobile.bugcatcher.online \
    --cert-name "${CERT_NAME}" \
    --non-interactive \
    --agree-tos \
    --keep-until-expiring
fi

sudo install -m 644 "${NGINX_SOURCE}" "${NGINX_AVAILABLE}"
sudo ln -sfn "${NGINX_AVAILABLE}" "${NGINX_ENABLED}"
sudo nginx -t
sudo systemctl reload nginx
