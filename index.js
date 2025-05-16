import { Client, GatewayIntentBits, Partials } from 'discord.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const { DISCORD_TOKEN, OPENAI_API_KEY } = process.env;

// --- Channel IDs ---
// Replace these with your actual channel IDs if they are different
// or load them from environment variables for more flexibility.
const SUPPORTED_EXECS_CHANNEL_ID = "1369681918278242465";
const PRISMSTRAP_UPDATES_CHANNEL_ID = "1369681918278242465"; // Same as Supported Execs
const SUPPORT_CHANNEL_ID = "1346152690975244348";
const DOWNLOAD_INFO_CHANNEL_ID = "1369349351637389352";
// const ANOTHER_SERVER_CHANNEL_ID = "1372592488241565768"; // Not specifically handled yet

// --- Configuration for PrismStrap Specific Replies ---
const PRISMSTRAP_QA = {
    "download": process.env.PRISMSTRAP_DOWNLOAD_LINK || `You can find download links in the <#${DOWNLOAD_INFO_CHANNEL_ID}> channel or ask me for specific versions. (Link not fully configured)`,
    "usage": process.env.PRISMSTRAP_USAGE_INFO || `For PrismStrap usage, please refer to our documentation or ask specific questions in <#${SUPPORT_CHANNEL_ID}>. (Info not fully configured)`,
    "what is prismstrap": process.env.PRISMSTRAP_ABOUT || "PrismStrap is an awesome project! (About info not configured)",
    "about prismstrap": process.env.PRISMSTRAP_ABOUT || "PrismStrap is an awesome project! (About info not configured)",
    "help": `I can chat with you conversationally!
For PrismStrap support, please use the <#${SUPPORT_CHANNEL_ID}> channel.
For downloads and general info, check out <#${DOWNLOAD_INFO_CHANNEL_ID}>.
You can also ask me specific questions like "where to download PrismStrap" or "what is PrismStrap".`
};
// --- End Configuration ---

if (!DISCORD_TOKEN || !OPENAI_API_KEY) {
    console.error("Missing critical environment variables: DISCORD_TOKEN or OPENAI_API_KEY");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

const BOT_NAME = "PrismStrap AI";

client.on('ready', () => {
    console.log(`${BOT_NAME} is online and ready! Logged in as ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: `chat | @${BOT_NAME} help` }],
        status: 'online',
    });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const channelId = message.channel.id;
    const lowerContent = message.content.toLowerCase().trim();
    const mentioned = message.mentions.has(client.user);
    const isDM = !message.guild;

    // 1. Handle casual greetings
    const greetings = ["hi", "hello", "hey", "yo", "sup", "heya", "howdy"];
    const isGreeting = greetings.some(greeting => lowerContent === greeting || lowerContent.startsWith(greeting + " "));

    if (isGreeting) {
        // In these specific channels, only respond to greetings if mentioned or in DMs.
        // Otherwise, respond to unmentioned greetings.
        const requireMentionForGreeting =
            (channelId === PRISMSTRAP_UPDATES_CHANNEL_ID || // Also covers Supported Execs
             channelId === DOWNLOAD_INFO_CHANNEL_ID);

        if (requireMentionForGreeting && !mentioned && !isDM) {
            // Do nothing for unmentioned greetings in these restricted channels
        } else {
            const replies = ["Hello there!", "Hi!", "Hey, how can I help you today?", "Greetings!"];
            await message.reply(replies[Math.floor(Math.random() * replies.length)]);
            return; // Greeting handled
        }
    }

    // 2. For further processing, bot must be mentioned or it's a DM.
    if (!mentioned && !isDM) {
        return;
    }

    // Clean the message content: remove the bot's mention
    let processedContent = message.content;
    if (mentioned && client.user) {
        const mentionRegex = new RegExp(`<@!?${client.user.id}>`, 'g');
        processedContent = processedContent.replace(mentionRegex, '').trim();
    }

    // If only mention was sent (empty processedContent)
    if (processedContent.length === 0) {
        await message.reply("Yes? How can I help you?");
        return;
    }

    const lowerProcessedContent = processedContent.toLowerCase();

    // 3. Handle specific PrismStrap questions/commands (PRISMSTRAP_QA)
    for (const keyword in PRISMSTRAP_QA) {
        if (lowerProcessedContent.includes(keyword)) {
            await message.reply(PRISMSTRAP_QA[keyword]);
            return; // Handled by QA
        }
    }

    // 4. If no QA match, and bot was addressed, use OpenAI
    try {
        await message.channel.sendTyping();

        let systemPromptContent = `You are ${BOT_NAME}, a friendly and helpful AI assistant for the PrismStrap project. Engage in natural conversation. Be concise but informative.`;

        // Tailor system prompt based on channel
        if (channelId === SUPPORT_CHANNEL_ID) {
            systemPromptContent += " You are currently in the PrismStrap support channel. Your primary goal is to assist users with their PrismStrap-related questions and issues. Be patient, empathetic, and thorough in your explanations.";
        } else if (channelId === DOWNLOAD_INFO_CHANNEL_ID) {
            systemPromptContent += " You are in the PrismStrap download and information channel. Focus on providing direct information about PrismStrap features, download links, and official resources. If a user asks for general help or troubleshooting beyond basic info, politely suggest they ask in the dedicated support channel for more detailed assistance after providing a brief answer.";
        } else if (channelId === PRISMSTRAP_UPDATES_CHANNEL_ID) { // Also covers Supported Execs channel
            systemPromptContent += " You are in a channel for PrismStrap updates and discussion about supported executables/features. Keep responses concise and focused on PrismStrap news, changes, or compatibility. For general support or troubleshooting, guide users to the appropriate support channel.";
        }
        // For DMs or other non-specified channels, the default system prompt will be used.

        const messagesForOpenAI = [
            { role: "system", content: systemPromptContent },
            { role: "user", content: processedContent }
        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messagesForOpenAI,
            max_tokens: 300, // Slightly increased for potentially more detailed support answers
            temperature: 0.7,
        });

        const reply = completion.choices[0]?.message?.content?.trim();

        if (reply) {
            if (reply.length > 2000) {
                // Simple split for long messages (can be improved)
                const parts = [];
                for (let i = 0; i < reply.length; i += 1990) {
                    parts.push(reply.substring(i, i + 1990));
                }
                for (const part of parts) {
                    await message.reply(part);
                }
            } else {
                await message.reply(reply);
            }
        } else {
            await message.reply("I tried to generate a response, but it came back empty. Could you try rephrasing?");
        }

    } catch (error) {
        console.error("Error calling OpenAI API:", error.message);
        if (error.response) {
            console.error("OpenAI API Response Status:", error.response.status);
            console.error("OpenAI API Response Data:", error.response.data);
        }
        await message.reply("Sorry, I encountered an issue while trying to process that. The AI might be temporarily unavailable. Please try again in a moment.");
    }
});

client.login(DISCORD_TOKEN)
    .catch(err => {
        console.error("Failed to login to Discord:", err.message);
        process.exit(1);
    });

process.on('SIGINT', () => {
    console.log('Shutting down PrismStrap AI...');
    client.destroy();
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('Shutting down PrismStrap AI...');
    client.destroy();
    process.exit(0);
});
