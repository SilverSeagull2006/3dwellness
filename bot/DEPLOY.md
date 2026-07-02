# Запуск MVP 3dWellness

Две части: **бот** (шлёт пуши) и **мини-апп** (красивые экраны). Порядок:

## 1. Создать бота (2 минуты) — это делаешь ты
1. В Telegram открой **@BotFather** → `/newbot`.
2. Придумай имя и username (заканчивается на `bot`).
3. BotFather пришлёт **токен** вида `12345:AbC...` — пришли его мне (или вставь в `.env`).

## 2. Захостить мини-апп (нужен https-адрес)
Telegram открывает мини-апп только по https. Самое простое и бесплатное:
- **GitHub Pages**: залей `index.html` и `опросник.html` в репозиторий → Settings → Pages → адрес вида `https://ты.github.io/3dwellness/`.
- (или Netlify / Vercel — перетащить папку.)
Этот адрес → в `WEBAPP_URL`.

## 3. Запустить бота на Railway
1. Новый проект на Railway → Deploy from GitHub (или залей папку `bot/`).
2. Variables → добавь `BOT_TOKEN`, `WEBAPP_URL`, `TIMEZONE`.
3. Railway сам поставит зависимости из `requirements.txt` и запустит `Procfile` (worker: python bot.py).

## 4. Проверить
- Напиши боту `/start` → он поздоровается и покажет кнопку «открыть 3dWellness».
- `/today` → список напоминаний.
- В `schedule.json` меняешь что/когда — это твоя схема приёма.

## Локально проверить бота
```
cd bot
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # впиши токен
export $(cat .env | xargs)
python bot.py
```

## Что дальше (после MVP)
- Расписание не из файла, а из листа покупок мини-аппа.
- Кнопка «готово» под пушем + учёт выполнения.
- База (Postgres на Railway) вместо json-файлов.
