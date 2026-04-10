const Airtable = require("airtable");

let base;

function initAirtable() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    throw new Error(
      "Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in environment variables",
    );
  }

  Airtable.configure({ apiKey });
  base = Airtable.base(baseId);
  console.log("✅ Airtable initialized successfully");
}

function getTable() {
  const tableName = process.env.AIRTABLE_TABLE_NAME || "Vocabulary";
  return base(tableName);
}

async function wordExists(word) {
  const table = getTable();
  const normalizedWord = word.toLowerCase().trim();

  try {
    const records = await table
      .select({
        filterByFormula: `LOWER({Word}) = "${normalizedWord}"`,
        maxRecords: 1,
      })
      .firstPage();

    return records.length > 0;
  } catch (err) {
    console.error(`⚠️ Error checking for duplicate word: ${err.message}`);
    return false;
  }
}

async function saveWord(word, meaning) {
  const table = getTable();

  try {
    // Check for duplicates
    const exists = await wordExists(word);
    if (exists) {
      console.log(`⚠️ Word "${word}" already exists in Airtable, skipping`);
      return { duplicate: true };
    }

    const record = await table.create([
      {
        fields: {
          Word: word.trim(),
          Meaning: meaning,
        },
      },
    ]);

    console.log(`✅ Saved to Airtable: "${word}" → ${meaning}`);
    return { duplicate: false, record };
  } catch (err) {
    console.error(`❌ Error saving to Airtable: ${err.message}`);
    throw err;
  }
}

async function getRecentWords(count = 5) {
  const table = getTable();

  try {
    const records = await table
      .select({
        maxRecords: count,
        sort: [{ field: "Date", direction: "desc" }],
      })
      .firstPage();

    const words = records.map((record) => ({
      word: record.get("Word"),
      meaning: record.get("ShortMeaning"),
    }));

    console.log(`📋 Fetched ${words.length} recent words from Airtable`);
    return words;
  } catch (err) {
    console.error(`❌ Error fetching from Airtable: ${err.message}`);
    throw err;
  }
}

async function getRecentSentences(count = 5) {
  const table = getTable();

  try {
    const records = await table
      .select({
        maxRecords: count,
        sort: [{ field: "Date", direction: "desc" }],
        filterByFormula: `{sentence} != ''`,
        fields: ["Word", "sentence"],
      })
      .firstPage();

    const sentences = records.map((record) => ({
      word: record.get("Word"),
      sentence: record.get("sentence"),
    }));

    console.log(`📋 Fetched ${sentences.length} recent sentences from Airtable`);
    return sentences;
  } catch (err) {
    console.error(`❌ Error fetching sentences from Airtable: ${err.message}`);
    throw err;
  }
}

module.exports = { initAirtable, saveWord, getRecentWords, getRecentSentences };
