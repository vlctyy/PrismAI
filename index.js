require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const OpenAI = require('openai');

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// FAQ responses
const faqs = {
  download: "You can download Prismstrap from the <#YOUR_CHANNEL_ID> channel. Check pinned messages!",
  usage: "To use Prismstrap, follow the full guide in <#YOUR_CHANNEL_ID>. Need help? Just ask!",
  execs: "Executors are explained in detail in <#YOUR_CHANNEL_ID>. It's all pinned there!",
};

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  // FAQ match
  for (const keyword in faqs) {
    if (content.includes(keyword)) {
      return message.reply(faqs[keyword]);
    }
  }

  // Otherwise use OpenAI to reply
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: message.content }],
    });

    const botReply = response.choices[0].message.content;
    message.reply(botReply);
  } catch (err) {
    console.error("OpenAI error:", err);
    message.reply("Something went wrong while trying to reply...");
  }
});

// On bot ready
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
