import os
import json
import logging
import datetime
try:
    from zoneinfo import ZoneInfo
except ImportError:  # Python < 3.9
    from backports.zoneinfo import ZoneInfo

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s | %(message)s", level=logging.INFO
)
log = logging.getLogger("3dwellness")

BASE = os.path.dirname(os.path.abspath(__file__))
TOKEN = os.environ.get("BOT_TOKEN", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "")
TZ = ZoneInfo(os.environ.get("TIMEZONE", "Europe/Moscow"))
SUBS_FILE = os.path.join(BASE, "subscribers.json")
SCHEDULE_FILE = os.path.join(BASE, "schedule.json")


def load_schedule():
    with open(SCHEDULE_FILE, encoding="utf-8") as f:
        return json.load(f)


def load_subs():
    try:
        with open(SUBS_FILE, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def save_subs(ids):
    with open(SUBS_FILE, "w", encoding="utf-8") as f:
        json.dump(ids, f)


EMOJI = {"утро": "🌅", "день": "☀️", "вечер": "🌙"}


async def send_reminder(context: ContextTypes.DEFAULT_TYPE):
    d = context.job.data
    emoji = EMOJI.get(d["title"], "🔔")
    body = "\n".join("• " + it for it in d["items"])
    await context.bot.send_message(
        chat_id=d["chat_id"],
        text=f"{emoji} {d['title']}\n{body}\n\nотметь, что сделала 💚",
    )


def schedule_for(job_queue, chat_id: int):
    # снимаем прежние задачи этого чата, чтобы не задваивать
    for job in job_queue.jobs():
        if job.name and job.name.startswith(f"rem:{chat_id}:"):
            job.schedule_removal()
    for i, block in enumerate(load_schedule()):
        hour, minute = map(int, block["time"].split(":"))
        job_queue.run_daily(
            send_reminder,
            time=datetime.time(hour, minute, tzinfo=TZ),
            data={"chat_id": chat_id, "title": block["title"], "items": block["items"]},
            name=f"rem:{chat_id}:{i}",
        )
    log.info("scheduled %s reminders for chat %s", len(load_schedule()), chat_id)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    subs = load_subs()
    if chat_id not in subs:
        subs.append(chat_id)
        save_subs(subs)
    schedule_for(context.application.job_queue, chat_id)

    buttons = []
    if WEBAPP_URL:
        buttons.append(
            [InlineKeyboardButton("открыть 3dWellness", web_app=WebAppInfo(url=WEBAPP_URL))]
        )
    await update.message.reply_text(
        "привет! я держу твою схему в голове вместо тебя.\n"
        "буду напоминать по расписанию. /today — план на сегодня.",
        reply_markup=InlineKeyboardMarkup(buttons) if buttons else None,
    )


async def test(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.application.job_queue.run_once(
        send_reminder,
        when=5,
        data={"chat_id": update.effective_chat.id, "title": "проверка", "items": ["выпей воды 💧"]},
    )
    await update.message.reply_text("через 5 секунд прилетит тестовый пуш…")


async def today(update: Update, context: ContextTypes.DEFAULT_TYPE):
    parts = []
    for b in load_schedule():
        parts.append(f"{EMOJI.get(b['title'], '•')} {b['time']} · {b['title']}")
        parts.extend("   • " + it for it in b["items"])
    await update.message.reply_text("\n".join(parts))


async def on_startup(app: Application):
    for chat_id in load_subs():
        schedule_for(app.job_queue, chat_id)


def main():
    if not TOKEN:
        raise SystemExit("нет BOT_TOKEN — задай переменную окружения (см. .env.example)")
    app = Application.builder().token(TOKEN).post_init(on_startup).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("test", test))
    app.add_handler(CommandHandler("today", today))
    log.info("3dWellness bot запущен")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
