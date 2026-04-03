# 🎓 Telegram Vocab Bot

A Telegram bot-based AI vocabulary assistant that fetches Hindi meanings of English words and sends periodic recall messages.

## Features

- 📖 Send any English word → get its Hindi meaning instantly
- 💾 All words are saved to Airtable automatically
- 🔁 Duplicate detection — same word won't be saved twice
- ⏰ Every hour, receive your last 5 saved words for revision
- 🆓 Uses FREE APIs (MyMemory Translation + Free Dictionary API)
- 🔄 Falls back to OpenAI if free APIs fail

## Tech Stack

- **Runtime:** Node.js
- **Bot:** node-telegram-bot-api (polling mode)
- **Database:** Airtable
- **Translation:** MyMemory API (free), Free Dictionary API (free), OpenAI (fallback)
- **Scheduling:** node-cron
- **HTTP Client:** axios

## Prerequisites

1. **Telegram Bot Token** — Create a bot via [@BotFather](https://t.me/BotFather)
2. **Airtable Account** — Sign up at [airtable.com](https://airtable.com) (free tier)
3. **Airtable Base & Table** — Create a base with a table containing these columns:
   - `Word` (Single line text)
   - `Meaning` (Long text)
   - `CreatedTime` (Single line text or Date)
4. **OpenAI API Key** _(optional)_ — Only needed as fallback if free APIs fail

## Setup

### 1. Clone the project

```bash
git clone <your-repo-url>
cd vocab-bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
TELEGRAM_TOKEN=your_telegram_bot_token
AIRTABLE_API_KEY=your_airtable_personal_access_token
AIRTABLE_BASE_ID=your_airtable_base_id
AIRTABLE_TABLE_NAME=Vocabulary
OPENAI_API_KEY=your_openai_key_optional
CHAT_ID=your_telegram_chat_id
```

#### How to get each value:

| Variable              | How to get it                                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TELEGRAM_TOKEN`      | Message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot` → copy the token                                                                            |
| `AIRTABLE_API_KEY`    | Go to [airtable.com/create/tokens](https://airtable.com/create/tokens) → create a personal access token with `data.records:read` and `data.records:write` scopes |
| `AIRTABLE_BASE_ID`    | Open your base in Airtable → check the URL: `airtable.com/appXXXXXXXXXX` → the `appXXX...` part is the base ID                                                   |
| `AIRTABLE_TABLE_NAME` | The name of your table (e.g., `Vocabulary`)                                                                                                                      |
| `OPENAI_API_KEY`      | _(Optional)_ Get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)                                                                       |
| `CHAT_ID`             | Start the bot, send `/start` — the bot will reply with your Chat ID                                                                                              |

### 4. Run the bot

```bash
npm start
```

Or with auto-restart on changes (Node.js 18+):

```bash
npm run dev
```

## Bot Commands

| Command      | Description                       |
| ------------ | --------------------------------- |
| `/start`     | Welcome message + your Chat ID    |
| `/help`      | How to use the bot                |
| `/recent`    | Show last 5 saved words           |
| _(any word)_ | Look up Hindi meaning and save it |

## Project Structure

```
vocab-bot/
├── index.js          # Entry point — initializes all modules
├── bot.js            # Telegram bot logic (polling)
├── airtable.js       # Airtable CRUD operations
├── llm.js            # Translation API logic (free APIs + OpenAI fallback)
├── cron.js           # Hourly recall agent
├── .env.example      # Environment variable template
├── package.json      # Dependencies
└── README.md         # This file
```

## Deployment

### Railway (Recommended — Free Tier)

1. Push your code to a GitHub repository
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Add environment variables:
   - Go to your service → **Variables** tab
   - Add all variables from `.env.example` with your actual values
5. Railway auto-detects Node.js and runs `npm start`
6. Your bot will run 24/7 on the free tier

### Render (Alternative — Free Tier)

1. Push your code to a GitHub repository
2. Go to [render.com](https://render.com) → **New** → **Background Worker**
3. Connect your GitHub repo
4. Configure:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
5. Add environment variables in the **Environment** tab
6. Click **Create Background Worker**

> **Note:** Render's free tier may spin down after inactivity. For always-on bots, Railway's free tier is better.

## How It Works

1. **User sends a word** → Bot receives it via polling
2. **Translation pipeline:**
   - First tries **MyMemory API** (free, no key needed) for direct English→Hindi translation
   - If that fails, tries **Free Dictionary API** for English definition, then translates it
   - If all free APIs fail, falls back to **OpenAI** (requires API key)
3. **Bot replies** with the Hindi meaning and saves the word to Airtable
4. **Every hour**, the cron job fetches the last 5 words and sends a recap message

## License

MIT
