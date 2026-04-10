const TelegramBot = require("node-telegram-bot-api");
const { getMeaning } = require("./llm");
const { saveWord } = require("./airtable");

let bot;

function initBot() {
  const token = process.env.TELEGRAM_TOKEN;

  if (!token) {
    throw new Error("Missing TELEGRAM_TOKEN in environment variables");
  }

  bot = new TelegramBot(token, { polling: true });
  console.log("✅ Telegram bot started (polling mode)");

  // /start command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      `🎓 *Welcome to Vocab Bot!*\n\n` +
        `Send me any English word, and I'll give you its Hindi meaning.\n\n` +
        `📚 I'll also save it and send you a recap every hour!\n\n` +
        `Your Chat ID: \`${chatId}\``,
      { parse_mode: "Markdown" },
    );
  });

  // /recent command
  bot.onText(/\/recent/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const { getRecentWords } = require("./airtable");
      const words = await getRecentWords(5);
      if (words.length === 0) {
        bot.sendMessage(
          chatId,
          "📭 No words saved yet. Send me a word to get started!",
        );
        return;
      }
      const message = formatRecallMessage(words);
      bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error(`❌ Error fetching recent words: ${err.message}`);
      bot.sendMessage(
        chatId,
        "❌ Error fetching your recent words. Please try again.",
      );
    }
  });

  // Handle regular messages (words)
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Skip commands
    if (!text || text.startsWith("/")) return;

    // Validate input
    const word = text.trim();
    if (word.length === 0) {
      bot.sendMessage(chatId, "⚠️ Please send a valid English word.");
      return;
    }

    if (word.length > 50) {
      bot.sendMessage(chatId, "⚠️ That's too long! Please send a single word.");
      return;
    }

    // Check if input looks like a word (basic validation)
    if (!/^[a-zA-Z\s-]+$/.test(word)) {
      bot.sendMessage(chatId, "⚠️ Please send an English word (letters only).");
      return;
    }

    bot.sendMessage(chatId, `🔍 Looking up *"${word}"*...`, {
      parse_mode: "Markdown",
    });

    try {
      const result = await getMeaning(word);

      if (!result) {
        bot.sendMessage(
          chatId,
          `😕 Sorry, I couldn't find the meaning of *"${word}"*.`,
          { parse_mode: "Markdown" },
        );
        return;
      }

      const { meaning, source } = result;

      // Save to Airtable
      try {
        const saveResult = await saveWord(word, meaning);
        const savedNote = saveResult.duplicate
          ? "ℹ️ _(already in your vocabulary list)_"
          : "💾 _Saved to your vocabulary list!_";

        bot.sendMessage(
          chatId,
          `📗 *${word}*\n\n` + `🇮🇳 *Hindi:* ${meaning}\n`,
          { parse_mode: "Markdown" },
        );
      } catch (err) {
        // Even if save fails, still show the meaning
        console.error(`❌ Airtable save error: ${err.message}`);
        bot.sendMessage(
          chatId,
          `📗 *${word}*\n\n` +
            `🇮🇳 *Hindi:* ${meaning}\n` +
            `📡 _Source: ${source}_\n\n` +
            `⚠️ _Could not save to vocabulary list_`,
          { parse_mode: "Markdown" },
        );
      }
    } catch (err) {
      console.error(`❌ Error processing word "${word}": ${err.message}`);
      bot.sendMessage(
        chatId,
        "❌ Something went wrong. Please try again later.",
      );
    }
  });

  // Handle polling errors
  bot.on("polling_error", (err) => {
    console.error(`🔴 Polling error: ${err.message}`);
  });

  return bot;
}

function formatRecallMessage(words) {
  let message = "🧠 *Your Recent Words:*\n\n";
  words.forEach((item, index) => {
    message += `${index + 1}. *${item.word}* → ${item.meaning}\n`;
  });
  message += "\n📚 _Keep learning!_";
  return message;
}

function formatSentenceMessage(sentences) {
  let message = "📝 *Recent Sentences:*\n\n";
  sentences.forEach((item, index) => {
    message += `${index + 1}. *${item.word}* → _${item.sentence}_\n`;
  });
  message += "\n📚 _Use them in your own sentences today!_";
  return message;
}

function getBot() {
  return bot;
}

module.exports = { initBot, getBot, formatRecallMessage, formatSentenceMessage };
