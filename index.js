require("dotenv").config();

const { initAirtable } = require("./airtable");
const { initBot } = require("./bot");
const { initCron } = require("./cron");

async function main() {
  console.log("🚀 Starting Vocab Bot...\n");

  try {
    // 1. Initialize Airtable
    initAirtable();

    // 2. Initialize Telegram Bot (polling)
    initBot();

    // 3. Initialize Cron (recall agent)
    initCron();

    console.log("\n✅ Vocab Bot is running!\n");
  } catch (err) {
    console.error(`❌ Failed to start: ${err.message}`);
    process.exit(1);
  }
}

main();
