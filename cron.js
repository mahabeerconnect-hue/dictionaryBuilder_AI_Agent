const cron = require("node-cron");
const { getRecentWords } = require("./airtable");
const { getBot, formatRecallMessage } = require("./bot");

function initCron() {
  const chatId = process.env.CHAT_ID;

  if (!chatId) {
    console.warn(
      "⚠️ CHAT_ID not set — recall agent will not send automatic messages. " +
        "Use /start in the bot to get your chat ID, then add it to .env",
    );
    return;
  }

  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Recall agent triggered");

    try {
      const words = await getRecentWords(5);

      if (words.length === 0) {
        console.log("📭 No words to recall, skipping");
        return;
      }

      const message = formatRecallMessage(words);
      const bot = getBot();

      if (!bot) {
        console.error("❌ Bot not initialized, cannot send recall message");
        return;
      }

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      console.log(`✅ Recall message sent to chat ${chatId}`);
    } catch (err) {
      console.error(`❌ Recall agent error: ${err.message}`);
    }
  });

  console.log("✅ Recall agent scheduled (every hour)");
}

module.exports = { initCron };
