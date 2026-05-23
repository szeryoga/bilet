# Bilet

Статический сайт билета, который раздается контейнером `bilet-frontend` через `python -m http.server 8000` и публикуется через `gateway` по пути `/bilet`.

## Структура

- `index.html` — страница настройки.
- `ticket.html` — страница билета.
- `img/qr_spin_*.gif` — готовые анимации QR.
- `animate.py` — генерация одного GIF по времени.
- `animate_all.sh` — генерация диапазона `1000..2000`.
- `compose.yaml` — Docker Compose для `bilet-frontend`.
- `scripts/start_bilet.sh` — запуск и сборка контейнера.
- `scripts/restart_bilet.sh` — рестарт контейнера.

## Генерация GIF

Один файл:

```bash
python3 animate.py 1500
```

Весь набор:

```bash
bash animate_all.sh
```

Скрипт сохраняет файлы как:

```text
img/qr_spin_<time_in_msec>.gif
```

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

Маршрут в `../gateway/config/routes.yml`:

```yaml
domains:
  - host: portal.appline.tw1.ru
    routes:
      - path: /app
        upstream: http://portal-frontend:80
      - path: /bilet
        upstream: http://bilet-frontend:8000
```

После изменения:

```bash
cd ../gateway
docker compose restart gateway
```

Сайт будет доступен по адресу:

```text
https://portal.appline.tw1.ru/bilet/index.html
```

## PWA

Сайт настроен как PWA под подпуть `/bilet`:

- `manifest.webmanifest`
- `sw.js`

Для офлайн-режима на iPhone:

1. Открой сайт по `HTTPS`.
2. Дождись полной загрузки.
3. Добавь сайт на домашний экран.
4. После этого сайт должен открываться локально из кэша даже без интернета.
