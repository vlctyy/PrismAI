require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages] });

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

const faqs = {
  download: "You can download Prismstrap from the <#YOUR_PRISMSTRAP_CHANNEL_ID> channel. Check pinned messages!",
  usage: "To use Prismstrap, follow the guide in <#YOUR_PRISMSTRAP_CHANNEL_ID>. We have tutorials and more.",
  execs: "Executors are explained in detail in <#YOUR_PRISMSTRAP_CHANNEL_ID>. Ask if you need help!",
};

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  for (const key in faqs) {
    if (content.includes(key)) {
      return message.reply(faqs[key]);
    }
  }

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message.content }],
    });

    const botReply = response.data.choices[0].message.content;
    message.reply(botReply);
  } catch (error) {
    console.error(error);
    message.reply("Oops, something went wrong while I was thinking...");
  }
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.DISCORD_TOKEN);
