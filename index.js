import { Client, GatewayIntentBits, Partials } from 'discord.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import http from 'http'; // Added for health check

dotenv.config(); // Load environment variables from .env file

const { DISCORD_TOKEN, OPENAI_API_KEY } = process.env;

// --- Channel IDs ---
// Replace these with your actual channel IDs if they are different
// or load them from environment variables for more flexibility.
const SUPPORTED_EXECS_CHANNEL_ID = "1369681918278242465";
const PRISMSTRAP_UPDATES_CHANNEL_ID = "1369681918278242465"; // Same as Supported Execs
const SUPPORT_CHANNEL_ID = "1346152690975244348";
const DOWNLOAD_INFO_CHANNEL_ID = "1369349351637389352";
// const ANOTHER_SERVER_CHANNEL_ID = "1372592488241565768"; // Not specifically handled yet, but you can add logic

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

// --- Health Check Server for Railway (or other PaaS) ---
const PORT = process.env.PORT || 3000; // Railway provides PORT, 3000 is a fallback for local
const HEALTH_CHECK_MESSAGE = `PrismStrap AI Bot is alive! Discord bot functionality is separate.\n`;

const healthCheckServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') { // Respond to common health check paths
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(HEALTH_CHECK_MESSAGE);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found\n');
    }
});

healthCheckServer.listen(PORT, '0.0.0.0', () => { // Listen on 0.0.0.0 for container environments
    console.log(`✅ HTTP health check server running on port ${PORT}`);
});
// --- End Health Check Server ---

// Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

// Initialize OpenAI Client
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

const BOT_USER_AGENT_NAME = "PrismStrap AI"; // Used in logs and presence

client.on('ready', () => {
    console.log(`✅ ${BOT_USER_AGENT_NAME} is online and ready! Logged in as ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: `chat | @${BOT_USER_AGENT_NAME} help` }], // Use the defined name
        status: 'online',
    });
});

client.on('messageCreate', async (message) => {
    // Ignore messages from other bots
    if (message.author.bot) return;

    const channelId = message.channel.id;
    const lowerContent = message.content.toLowerCase().trim();
    const mentioned = message.mentions.has(client.user);
    const isDM = !message.guild;

    // 1. Handle casual greetings
    const greetings = ["hi", "hello", "hey", "yo", "sup", "heya", "howdy"];
    const isGreeting = greetings.some(greeting => lowerContent === greeting || lowerContent.startsWith(greeting + " "));

    if (isGreeting) {
        // In these specific channels, only respond to greetings if mentioned.
        // In DMs or other channels, respond to unmentioned greetings.
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
    // Exception: If it was a greeting that required mention but wasn't handled above (e.g. just "hi @bot")
    // that case is already handled. This ensures non-greeting messages need mention.
    if (!mentioned && !isDM) {
        return;
    }

    // Clean the message content: remove the bot's mention
    let processedContent = message.content;
    if (mentioned && client.user) {
        const mentionRegex = new RegExp(`<@!?${client.user.id}>`, 'g');
        processedContent = processedContent.replace(mentionRegex, '').trim();
    }

    // If only mention was sent (empty processedContent after cleaning)
    if (processedContent.length === 0) {
        await message.reply("Yes? How can I help you?");
        return;
    }

    const lowerProcessedContent = processedContent.toLowerCase();

    // 3. Handle specific PrismStrap questions/commands (PRISMSTRAP_QA)
    for (const keyword in PRISMSTRAP_QA) {
        if (lowerProcessedContent.includes(keyword)) {
            try {
                await message.reply(PRISMSTRAP_QA[keyword]);
            } catch (replyError) {
                console.error("Error sending PRISMSTRAP_QA reply:", replyError);
            }
            return; // Handled by QA
        }
    }

    // 4. If no QA match, and bot was addressed, use OpenAI
    try {
        await message.channel.sendTyping();

        let systemPromptContent = `You are ${BOT_USER_AGENT_NAME}, a friendly and helpful AI assistant for the PrismStrap project. Engage in natural conversation. Be concise but informative.`;

        // Tailor system prompt based on channel
        if (channelId === SUPPORT_CHANNEL_ID) {
            systemPromptContent += " You are currently in the PrismStrap support channel. Your primary goal is to assist users with their PrismStrap-related questions and issues. Be patient, empathetic, and thorough in your explanations.";
        } else if (channelId === DOWNLOAD_INFO_CHANNEL_ID) {
            systemPromptContent += ` You are in the PrismStrap download and information channel. Focus on providing direct information about PrismStrap features, download links, and official resources. If a user asks for general help or troubleshooting beyond basic info, politely suggest they ask in the dedicated support channel <#${SUPPORT_CHANNEL_ID}> for more detailed assistance after providing a brief answer.`;
        } else if (channelId === PRISMSTRAP_UPDATES_CHANNEL_ID) { // Also covers Supported Execs channel
            systemPromptContent += ` You are in a channel for PrismStrap updates and discussion about supported executables/features. Keep responses concise and focused on PrismStrap news, changes, or compatibility. For general support or troubleshooting, guide users to the appropriate support channel <#${SUPPORT_CHANNEL_ID}>.`;
        }
        // For DMs or other non-specified channels, the default system prompt will be used.

        const messagesForOpenAI = [
            { role: "system", content: systemPromptContent },
            { role: "user", content: processedContent }
        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Or your preferred model e.g., "gpt-4"
            messages: messagesForOpenAI,
            max_tokens: 300,
            temperature: 0.7,
        });

        const reply = completion.choices[0]?.message?.content?.trim();

        if (reply) {
            // Discord has a 2000 character limit per message.
            // This is a simple split; more advanced splitting might be needed for complex formatting.
            if (reply.length > 2000) {
                const parts = [];
                for (let i = 0; i < reply.length; i += 1990) { // Split with some buffer
                    parts.push(reply.substring(i, Math.min(i + 1990, reply.length)));
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
        console.error("Error calling OpenAI API or processing its response:", error.message);
        if (error.response) { // For errors from the OpenAI SDK (v4+)
            console.error("OpenAI API Response Status:", error.response.status);
            console.error("OpenAI API Response Data:", error.response.data);
        } else if (error.code) { // For network or other operational errors
             console.error("Error Code:", error.code);
        }
        await message.reply("Sorry, I encountered an issue while trying to process that. The AI might be temporarily unavailable or there was a network problem. Please try again in a moment.");
    }
});

// Login to Discord
client.login(DISCORD_TOKEN)
    .catch(err => {
        console.error("Failed to login to Discord:", err.message);
        // No need to explicitly call process.exit(1) here if Railway terminates on failed start.
        // However, for local debugging, it's useful.
        // For Railway, the main concern is the health check. If login fails, health check might not start or the process exits.
    });

// Graceful shutdown
process.on('SIGINT', () => {
    console.log(`Shutting down ${BOT_USER_AGENT_NAME} due to SIGINT...`);
    if (healthCheckServer) healthCheckServer.close();
    if (client) client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(`Shutting down ${BOT_USER_AGENT_NAME} due to SIGTERM...`);
    if (healthCheckServer) healthCheckServer.close();
    if (client) client.destroy();
    process.exit(0); // Important for Railway to know the process exited cleanly on SIGTERM
});

// Optional: Handle unhandled promise rejections for better debugging
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
    // Depending on the error, you might want to gracefully shut down or just log
});
