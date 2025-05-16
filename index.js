import { Client, GatewayIntentBits, Partials } from 'discord.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import http from 'http'; // For health check

dotenv.config(); // Load environment variables from .env file

const { DISCORD_TOKEN, OPENAI_API_KEY } = process.env;
const BOT_USER_AGENT_NAME = "PrismStrap AI"; // Consistent name for logs and presence

// --- Channel IDs ---
const SUPPORTED_EXECS_CHANNEL_ID = "1369681918278242465";
const PRISMSTRAP_UPDATES_CHANNEL_ID = "1369681918278242465";
const SUPPORT_CHANNEL_ID = "1346152690975244348";
const DOWNLOAD_INFO_CHANNEL_ID = "1369349351637389352";

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

// --- Critical Environment Variable Check ---
if (!DISCORD_TOKEN || !OPENAI_API_KEY) {
    console.error(`🔴 CRITICAL: Missing environment variables! DISCORD_TOKEN or OPENAI_API_KEY is not set.
    Please check your .env file (local) or Railway project variables. Bot cannot start.`);
    process.exit(1); // Exit immediately if critical tokens are missing
}

// --- Health Check Server for Railway (or other PaaS) ---
const rawPort = process.env.PORT;
let PORT = parseInt(rawPort, 10);
if (isNaN(PORT) || PORT <= 0) {
    if (rawPort) {
        console.warn(`⚠️ Warning: Environment variable PORT ("${rawPort}") is not a valid positive number. Defaulting to 3000.`);
    }
    PORT = 3000;
}

const HEALTH_CHECK_MESSAGE = `${BOT_USER_AGENT_NAME} HTTP health check endpoint. Bot is alive if this responds 200 OK.\nDiscord functionality is separate.\n`;

console.log(`🔵 Attempting to start HTTP health check server on 0.0.0.0:${PORT}...`);
const healthCheckServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(HEALTH_CHECK_MESSAGE);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found\n');
    }
});

healthCheckServer.on('error', (err) => {
    console.error(`🔴 HTTP health check server encountered an error:`, err);
    if (err.code === 'EADDRINUSE') {
        console.error(`🔴 FATAL: Port ${PORT} is already in use. Health check server cannot start.`);
        process.exit(1);
    }
});

try {
    healthCheckServer.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ HTTP health check server successfully listening on 0.0.0.0:${PORT}`);
    });
} catch (listenError) {
    console.error(`🔴 FATAL: Failed to initiate listening for HTTP health check server on port ${PORT}:`, listenError);
    process.exit(1);
}
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

client.on('ready', () => {
    console.log(`✅ Discord bot "${BOT_USER_AGENT_NAME}" is online and ready! Logged in as ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: `chat | @${BOT_USER_AGENT_NAME} help` }],
        status: 'online',
    });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const channelId = message.channel.id;
    const lowerContent = message.content.toLowerCase().trim();
    const mentioned = message.mentions.has(client.user);
    const isDM = !message.guild;

    const greetings = ["hi", "hello", "hey", "yo", "sup", "heya", "howdy"];
    const isGreeting = greetings.some(greeting => lowerContent === greeting || lowerContent.startsWith(greeting + " "));

    if (isGreeting) {
        const requireMentionForGreeting =
            (channelId === PRISMSTRAP_UPDATES_CHANNEL_ID ||
             channelId === DOWNLOAD_INFO_CHANNEL_ID);

        if (!isDM && requireMentionForGreeting && !mentioned) {
            // Do nothing
        } else {
            const replies = ["Hello there!", "Hi!", "Hey, how can I help you today?", "Greetings!"];
            try { await message.reply(replies[Math.floor(Math.random() * replies.length)]); }
            catch (replyError) { console.error("Error sending greeting reply:", replyError); }
            return;
        }
    }

    if (!mentioned && !isDM) return;

    let processedContent = message.content;
    if (mentioned && client.user) {
        const mentionRegex = new RegExp(`<@!?${client.user.id}>`, 'g');
        processedContent = processedContent.replace(mentionRegex, '').trim();
    }

    if (processedContent.length === 0) {
        try { await message.reply("Yes? How can I help you?"); }
        catch (replyError) { console.error("Error replying to empty mention:", replyError); }
        return;
    }

    const lowerProcessedContent = processedContent.toLowerCase();

    for (const keyword in PRISMSTRAP_QA) {
        if (lowerProcessedContent.includes(keyword)) {
            try { await message.reply(PRISMSTRAP_QA[keyword]); }
            catch (replyError) { console.error("Error sending PRISMSTRAP_QA reply:", replyError); }
            return;
        }
    }

    try {
        await message.channel.sendTyping();
        let systemPromptContent = `You are ${BOT_USER_AGENT_NAME}, a friendly AI for PrismStrap. Be conversational, concise, informative.`;
        if (channelId === SUPPORT_CHANNEL_ID) systemPromptContent += " You're in the support channel. Assist with PrismStrap issues patiently.";
        else if (channelId === DOWNLOAD_INFO_CHANNEL_ID) systemPromptContent += ` You're in the download/info channel. Focus on facts, links. For detailed support, guide to <#${SUPPORT_CHANNEL_ID}>.`;
        else if (channelId === PRISMSTRAP_UPDATES_CHANNEL_ID) systemPromptContent += ` You're in an updates channel. Be concise on news, compatibility. Guide to <#${SUPPORT_CHANNEL_ID}> for support.`;

        const messagesForOpenAI = [{ role: "system", content: systemPromptContent }, { role: "user", content: processedContent }];
        const completion = await openai.chat.completions.create({ model: "gpt-3.5-turbo", messages: messagesForOpenAI, max_tokens: 300, temperature: 0.7 });
        const reply = completion.choices[0]?.message?.content?.trim();

        if (reply) {
            if (reply.length > 2000) {
                for (let i = 0; i < reply.length; i += 1990) await message.reply(reply.substring(i, Math.min(i + 1990, reply.length)));
            } else await message.reply(reply);
        } else await message.reply("AI response was empty. Try rephrasing?");
    } catch (error) {
        console.error("OpenAI API or reply processing error:", error.message);
        if (error.response) console.error("OpenAI API Response:", error.response.status, error.response.data);
        else if (error.code) console.error("Network/Operational Error Code:", error.code);
        try { await message.reply("Sorry, issue processing that. AI might be busy. Try again soon."); }
        catch (fallbackReplyError) { console.error("Error sending fallback error reply:", fallbackReplyError); }
    }
});

console.log("🔵 Attempting to login to Discord...");
client.login(DISCORD_TOKEN)
    .then(() => {
        console.log("✅ Successfully initiated Discord login sequence. Waiting for 'ready' event.");
    })
    .catch(err => {
        console.error(`🔴 FATAL: Failed to login to Discord: ${err.message}. Token or intents might be incorrect.`);
        process.exit(1);
    });

function gracefulShutdown(signal) {
    console.log(`🟡 Received ${signal}. Shutting down ${BOT_USER_AGENT_NAME} gracefully...`);
    if (healthCheckServer) {
        healthCheckServer.close(() => { console.log("✅ HTTP health check server closed."); });
    }
    if (client) client.destroy();
    console.log(`👋 ${BOT_USER_AGENT_NAME} has been shut down.`);
    process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔴 Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err, origin) => {
    console.error(`🔴 Uncaught Exception: ${err.message}`, 'Origin:', origin, 'Stack:', err.stack);
    gracefulShutdown('uncaughtException');
});

console.log("🔵 Script execution reached end of main file. Event listeners are active.");
