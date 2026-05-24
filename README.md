# Bilet

Статический сайт билета, который раздается контейнером `bilet-frontend` через `python -m http.server 8000` и публикуется через `gateway` на поддомене `https://bilet.appline.tw1.ru/`.

## Структура

- `index.html` — страница настройки.
- `ticket.html` — страница билета.
- `img/qr.png` — статичный QR.
- `animate.py` — генерация GIF по времени.
- `animate_all.sh` — генерация диапазона `1000..2000`.
- `compose.yaml` — Docker Compose для `bilet-frontend`.
- `scripts/start_bilet.sh` — запуск и сборка контейнера.
- `scripts/restart_bilet.sh` — рестарт контейнера.
- `../gateway/scripts_mtls/create_client_ca.sh` — выпуск собственного CA.
- `../gateway/scripts_mtls/create_client_cert.sh` — выпуск клиентского сертификата.
- `../gateway/scripts_mtls/create_iphone_p12.sh` — упаковка клиентского сертификата в `iphone.p12`.

## Docker

Запуск контейнера:

```bash
./scripts/start_bilet.sh
```

Рестарт контейнера:

```bash
./scripts/restart_bilet.sh
```

Проверка итогового compose:

```bash
docker compose -f compose.yaml config
```

## Gateway

Для отдельного поддомена нужен такой блок в `../gateway/config/routes.yml`:

```yaml
domains:
  - host: bilet.appline.tw1.ru
    client_ca: /etc/nginx/client-ca/bilet-client-ca.crt
    require_client_cert: true
    routes:
      - path: /
        upstream: http://bilet-frontend:8000
        strip_prefix: false
```

Текущий `gateway` этого ещё не умеет: `../gateway/scripts/generate_nginx_conf.py` надо расширить под два новых поля уровня домена:

- `client_ca`
- `require_client_cert`

Логика должна быть такой:

1. В `load_routes(...)` считать эти поля из YAML.
2. Протащить их в `normalized_domains`.
3. В `render_https_server(...)` добавлять mTLS-директивы только если `require_client_cert: true`.

Нужный фрагмент итогового `nginx`-конфига для `bilet.appline.tw1.ru`:

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name bilet.appline.tw1.ru;

    ssl_certificate /etc/letsencrypt/live/bilet.appline.tw1.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bilet.appline.tw1.ru/privkey.pem;

    ssl_client_certificate /etc/nginx/client-ca/bilet-client-ca.crt;
    ssl_verify_client on;
    ssl_verify_depth 2;

    location / {
        set $gateway_upstream http://bilet-frontend:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        send_timeout 60s;
        proxy_buffering off;
        proxy_pass $gateway_upstream;
    }
}
```

В `gateway` контейнер надо смонтировать публичный сертификат твоего CA:

```yaml
volumes:
  - ./secrets/client-ca/ca.crt:/etc/nginx/client-ca/bilet-client-ca.crt:ro
```

После правок `routes.yml`, `generate_nginx_conf.py` и `compose.yaml` у `gateway`:

```bash
cd ../gateway
docker compose restart gateway
```

Сайт будет доступен по адресу:

```text
https://bilet.appline.tw1.ru/index.html
```

Без установленного клиентского сертификата `nginx` будет отклонять вход уже на TLS-уровне.

## Client Certificates

Скрипты вынесены в `../gateway/scripts_mtls/`: они общие и подходят для любых поддоменов с mTLS, не только для `bilet`.

По умолчанию они создают локальный CA и клиентский сертификат в `./secrets/client-ca/`.

Создать свой CA:

```bash
../gateway/scripts_mtls/create_client_ca.sh
```

Создать клиентский сертификат `iphone.crt` и `iphone.key`:

```bash
../gateway/scripts_mtls/create_client_cert.sh
```

Собрать `iphone.p12` для установки на iPhone:

```bash
../gateway/scripts_mtls/create_iphone_p12.sh
```

По умолчанию получится такой набор файлов:

- `secrets/client-ca/ca.crt`
- `secrets/client-ca/ca.key`
- `secrets/client-ca/iphone.crt`
- `secrets/client-ca/iphone.key`
- `secrets/client-ca/iphone.csr`
- `secrets/client-ca/iphone.ext`
- `secrets/client-ca/iphone.p12`

Важно:

- `ca.key` и `iphone.key` нельзя коммитить в git.
- В `gateway` нужен только `ca.crt`.
- На iPhone устанавливается `iphone.p12`.
- При экспорте `.p12` OpenSSL попросит пароль; iPhone попросит его во время импорта.

Если нужен сертификат не с именем `iphone`, а, например, `iphone-oleg`, используй:

```bash
../gateway/scripts_mtls/create_client_cert.sh ./secrets/client-ca iphone-oleg
P12_NAME=iphone-oleg ../gateway/scripts_mtls/create_iphone_p12.sh ./secrets/client-ca iphone-oleg
```

## PWA

Сайт настроен как PWA для корня домена:

- `manifest.webmanifest`
- `sw.js`

Для офлайн-режима на iPhone:

1. Открой сайт по `HTTPS`.
2. Дождись полной загрузки.
3. Добавь сайт на домашний экран.
4. После этого сайт должен открываться локально из кэша даже без интернета.
