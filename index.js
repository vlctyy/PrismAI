require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { OpenAI } = require('openai');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FAQ = {
  "download": "You can download PrismStrap in <#1369349351637389352>!",
  "how do i download": "To download PrismStrap, go to <#1369349351637389352>.",
  "how to use": "Check the usage guide in <#1369349351637389352>!",
  "exec": "Executors are explained in <#1369349351637389352>."
};

client.on('ready', () => {
  console.log(`✅ PrismAI is online as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const lowerContent = message.content.toLowerCase();

  for (const keyword in FAQ) {
    if (lowerContent.includes(keyword)) {
      return message.reply(FAQ[keyword]);
    }
  }

  try {
    const response = await openai.chat.completions.create({
      messages: [{ role: 'user', content: message.content }],
      model: 'gpt-3.5-turbo',
    });

    const reply = response.choices[0].message.content;
    if (reply) message.reply(reply);
  } catch (err) {
    console.error("❌ OpenAI Error:", err);
    message.reply("There was an error getting a response. Try again later.");
  }
});

client.login(process.env.DISCORD_TOKEN);
