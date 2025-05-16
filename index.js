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

const BOT_CHANNEL_ID = '1369349351637389352';

const FAQ = {
  "download": "You can download PrismStrap in <#1369349351637389352>.",
  "how do i use": "Check the getting started guide in <#1369349351637389352>.",
  "executor": "PrismStrap supports many popular executors. For details, visit <#1369681918278242465>.",
  "executors": "Check supported executors here: <#1369681918278242465>.",
  "injector": "Our recommended injectors are listed in <#1369349351637389352>.",
  "updates": "Stay up to date on PrismStrap in <#1369681918278242465>.",
  "support": "Need help? Ask your questions in <#1346152690975244348>.",
  "help": "If you need assistance, check out <#1346152690975244348> or ask me directly!",
};

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

// Handle slash commands
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'help') {
    await interaction.reply({
      content:
`**PrismStrap Support and Resources**

• 📥 Download: <#1369349351637389352>
• 🔧 Supported Executors & Updates: <#1369681918278242465>
• 🆘 Support Channel: <#1346152690975244348>

Feel free to ask me any questions here!`,
      ephemeral: true
    });
  }
});

// Handle normal messages and replies
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || message.channel.id !== BOT_CHANNEL_ID) return;

  let userInput = message.content.toLowerCase();

  // Handle replies to the bot's messages
  if (message.reference) {
    try {
      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
      if (repliedMessage.author.id === client.user.id) {
        userInput = repliedMessage.content.toLowerCase() + "\n\n" + userInput;
      }
    } catch (err) {
      console.warn("Could not fetch reply context:", err);
    }
  }

  // Check FAQ keywords first
  for (const keyword in FAQ) {
    if (userInput.includes(keyword)) {
      return message.reply(FAQ[keyword]);
    }
  }

  // If no FAQ matched, call OpenAI chat
  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: "You are PrismStrap AI, a helpful and friendly bot assistant for the PrismStrap Roblox utility client."
        },
        { role: 'user', content: userInput }
      ],
    });

    const response = chatCompletion.choices[0].message.content;
    if (response) {
      await message.reply(response);
    }
  } catch (err) {
    console.error("OpenAI error:", err);
    await message.reply("⚠️ I ran into a problem trying to respond. Please try again later.");
  }
});

client.login(process.env.DISCORD_TOKEN);
