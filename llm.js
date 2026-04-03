const axios = require("axios");

/**
 * Strategy 1: Gemini API (free key) — English-to-Hindi vocabulary tutor
 * Strategy 2: MyMemory Translation API — English to Hindi translation (free, no key)
 * Strategy 3: Free Dictionary API (dictionaryapi.dev) — English definitions
 * Strategy 4: OpenAI fallback (requires OPENAI_API_KEY)
 */

const GEMINI_SYSTEM_PROMPT = `Project Instructions: English-to-Hindi Vocabulary Tutor
Role: You are a bilingual English-Hindi linguistic expert and vocabulary coach. Your goal is to help me understand new English words I encounter while reading, focusing on clarity and practical usage.
Response Structure:
For every word or phrase I provide, please respond using the following format:
1. Word : Provide the most accurate Hindi translation(s). If the word has multiple meanings based on context, list the top three.
2. Simple Definition: A brief explanation in simple English.
3. English Examples: * One casual/everyday sentence.
4. Synonyms: 2-3 similar words to help expand my range.
Tone: Encouraging, clear, and concise. Avoid overly academic jargon unless specifically asked.
Example of how it will work:
If you type the word "Reluctant", the AI will follow your instructions like this:
• Reluctant: अनिच्छुक / बेमन
• Definition: Not wanting to do something; hesitant.
• Synonyms: Unwilling, Hesitant.
• Ex. 1: I was a bit reluctant to go to the party because I was tired.`;

async function getHindiMeaningFromGemini(word) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await axios.post(
        url,
        {
          contents: [
            {
              parts: [
                {
                  text: `${GEMINI_SYSTEM_PROMPT}\n\nUser input: ${word}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 500,
          },
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 15000,
        },
      );

      const reply =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (reply) return reply;
    } catch (err) {
      const status = err.response?.status;
      console.log(`⚠️ Gemini ${model} failed (${status || err.message})`);
      if (status === 429) {
        // Rate limited — wait 2s then try next model
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      // For other errors, still try next model
      continue;
    }
  }

  return null;
}

async function getHindiMeaningFromMyMemory(word) {
  const url = `https://api.mymemory.translated.net/get`;
  const response = await axios.get(url, {
    params: {
      q: word,
      langpair: "en|hi",
    },
    timeout: 10000,
  });

  const translated = response.data?.responseData?.translatedText;
  if (
    translated &&
    translated.toLowerCase() !== word.toLowerCase() &&
    !translated.includes("NO QUERY SPECIFIED")
  ) {
    return translated;
  }
  return null;
}

async function getEnglishDefinition(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  const response = await axios.get(url, { timeout: 10000 });

  const meanings = response.data?.[0]?.meanings;
  if (meanings && meanings.length > 0) {
    const firstDef = meanings[0]?.definitions?.[0]?.definition;
    return firstDef || null;
  }
  return null;
}

async function getHindiMeaningFromOpenAI(word) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a translator. Given an English word, reply ONLY with its Hindi meaning in Devanagari script. No explanation, no transliteration, just the Hindi word(s).",
        },
        {
          role: "user",
          content: word,
        },
      ],
      max_tokens: 60,
      temperature: 0.3,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );

  const reply = response.data?.choices?.[0]?.message?.content?.trim();
  return reply || null;
}

async function getMeaning(word) {
  console.log(`📖 Looking up meaning for: "${word}"`);

  // Strategy 1: Gemini API (free, primary)
  try {
    const geminiResult = await getHindiMeaningFromGemini(word);
    if (geminiResult) {
      console.log(`✅ Gemini response received`);
      return { meaning: geminiResult, source: "Gemini" };
    }
  } catch (err) {
    console.log(`⚠️ Gemini API failed: ${err.message}`);
  }

  // Strategy 2: MyMemory free translation API (English → Hindi)
  try {
    const hindi = await getHindiMeaningFromMyMemory(word);
    if (hindi) {
      console.log(`✅ MyMemory translation found: ${hindi}`);
      return { meaning: hindi, source: "MyMemory" };
    }
  } catch (err) {
    console.log(`⚠️ MyMemory API failed: ${err.message}`);
  }

  // Strategy 1: Free dictionary API for English definition, then translate
  try {
    const englishDef = await getEnglishDefinition(word);
    if (englishDef) {
      // Try translating the definition to Hindi
      try {
        const hindiDef = await getHindiMeaningFromMyMemory(englishDef);
        if (hindiDef) {
          console.log(`✅ Dictionary + MyMemory translation: ${hindiDef}`);
          return { meaning: hindiDef, source: "Dictionary+MyMemory" };
        }
      } catch {
        // If translation of definition fails, return English definition
      }
      console.log(`✅ English definition found: ${englishDef}`);
      return { meaning: englishDef, source: "FreeDictionary" };
    }
  } catch (err) {
    console.log(`⚠️ Free Dictionary API failed: ${err.message}`);
  }

  // Strategy 3: OpenAI fallback
  try {
    const openaiMeaning = await getHindiMeaningFromOpenAI(word);
    if (openaiMeaning) {
      console.log(`✅ OpenAI translation found: ${openaiMeaning}`);
      return { meaning: openaiMeaning, source: "OpenAI" };
    }
  } catch (err) {
    console.log(`⚠️ OpenAI API failed: ${err.message}`);
  }

  console.log(`❌ No meaning found for: "${word}"`);
  return null;
}

module.exports = { getMeaning };
