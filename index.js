const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { OpenAI } = require('openai');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// IDs of your special channels
const BOT_CHANNEL_ID = '1369349351637389352';
const EXEC_CHANNEL_ID = '1369681918278242465';
const SUPPORT_CHANNEL_ID = '1346152690975244348';

// Predefined FAQ responses (exact keyword matching, lowercase)
const FAQ = {
  "download": `You can download PrismStrap here: <#${BOT_CHANNEL_ID}>.`,
  "how do i use": `Check out the usage guide in <#${BOT_CHANNEL_ID}>.`,
  "executor": `Supported executors and how to use them are listed in <#${EXEC_CHANNEL_ID}>.`,
  "executors": `Supported executors and updates: <#${EXEC_CHANNEL_ID}>.`,
  "injector": `Recommended injectors info: <#${BOT_CHANNEL_ID}>.`,
  "updates": `Latest updates are posted in <#${EXEC_CHANNEL_ID}>.`,
  "support": `Need help? Head over to <#${SUPPORT_CHANNEL_ID}> for assistance.`,
  "help": `For support and info, visit <#${SUPPORT_CHANNEL_ID}> or ask me here!`,
};

// Common greetings to catch
const GREETINGS = ["hi", "hello", "hey", "hiya", "sup"];

// Register slash commands on ready
client.once(Events.ClientReady, async () => {
  console.log(`✅ PrismAI is online as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('help')
      .setDescription('Get info about PrismStrap support and resources.')
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

// Slash command handler
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'help') {
    await interaction.reply({
      content:
`**PrismStrap Support and Resources**

• 📥 Download & Usage: <#${BOT_CHANNEL_ID}>
• 🔧 Supported Executors & Updates: <#${EXEC_CHANNEL_ID}>
• 🆘 Support Channel: <#${SUPPORT_CHANNEL_ID}>

Feel free to ask me any questions here!`,
      ephemeral: true
    });
  }
});

// Message handler for bot channel only
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== BOT_CHANNEL_ID) return;

  let userInput = message.content.toLowerCase();

  // Handle replies to bot messages - add context if replying
  if (message.reference) {
    try {
      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
      if (repliedMessage.author.id === client.user.id) {
        // Include previous bot message context before user input
        userInput = repliedMessage.content.toLowerCase() + "\n\n" + userInput;
      }
    } catch (err) {
      console.warn("Could not fetch replied message:", err);
    }
  }

  // Check greetings
  for (const greet of GREETINGS) {
    if (userInput.includes(greet)) {
      return message.reply("Hello! 👋 How can I assist you with PrismStrap today?");
    }
  }

  // Check FAQ keywords
  for (const keyword in FAQ) {
    if (userInput.includes(keyword)) {
      return message.reply(FAQ[keyword]);
    }
  }

  // Otherwise, use OpenAI Chat API for any other question (math, casual, etc)
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are PrismStrap AI, a helpful and friendly Discord bot assistant for the PrismStrap Roblox utility client."
        },
        {
          role: "user",
          content: userInput
        }
      ],
    });

    const response = completion.choices[0].message.content;
    if (response) {
      await message.reply(response);
    } else {
      await message.reply("Sorry, I couldn't think of a response. Please try again.");
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    await message.reply("⚠️ Sorry, I encountered an error while trying to respond. Please try again later.");
  }
});

client.login(process.env.DISCORD_TOKEN);
