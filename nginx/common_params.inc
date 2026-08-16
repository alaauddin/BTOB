# --- Security Headers ---
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# --- ACME challenge (Certbot) ---
location /.well-known/acme-challenge/ {
    root /var/www/certbot;
}

# --- Static files (served by Nginx) ---
location /static/ {
    alias /app/staticfiles/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    access_log off;
}

# --- Media files (served by Nginx) ---
location /media/ {
    alias /app/media/;
    expires 7d;
    add_header Cache-Control "public";
    access_log off;
}

# --- Favicon ---
location = /favicon.ico {
    alias /app/staticfiles/logo.png;
    access_log off;
    log_not_found off;
}

# --- WebSocket connections → Daphne (ASGI) ---
location /ws/ {
    proxy_pass http://daphne;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $forwarded_proto;
    proxy_set_header X-Forwarded-Host $host;

    proxy_read_timeout 86400s;   # Keep WS connections alive (24h)
    proxy_send_timeout 86400s;
}

# --- All other requests → Django (Gunicorn/WSGI) ---
location / {
    proxy_pass http://django;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $forwarded_proto;
    proxy_set_header X-Forwarded-Host $host;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;

    proxy_connect_timeout 60s;
    proxy_read_timeout    120s;
    proxy_send_timeout    120s;

    client_max_body_size 50M;
}
