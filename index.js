require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const OpenAI = require('openai');

// Initialize Discord bot with correct intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Requires enabling in Discord Dev Portal
  ],
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// FAQ responses with real channel ID
const faqs = {
  download: "📥 You can download Prismstrap from the <#1369349351637389352> channel. Check pinned messages!",
  usage: "🛠️ To use Prismstrap, follow the guide in <#1369349351637389352>. Everything you need is there!",
  execs: "⚙️ Executions and usage are explained in <#1369349351637389352>. Ask if you need help!",
};

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  // Check for keyword match (FAQ)
  for (const keyword in faqs) {
    if (content.includes(keyword)) {
      return message.reply(faqs[keyword]);
    }
  }

  // If not a keyword, reply with OpenAI
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: message.content }],
    });

    const reply = response.choices[0].message.content;
    message.reply(reply);
  } catch (err) {
    console.error("OpenAI Error:", err);
    message.reply("⚠️ I had trouble generating a reply. Please try again later.");
  }
});

// Bot ready event
client.once('ready', () => {
  console.log(`✅ PrismAI is online as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
