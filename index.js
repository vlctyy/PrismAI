import { Client, GatewayIntentBits, Partials } from 'discord.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

const { DISCORD_TOKEN, OPENAI_API_KEY } = process.env;

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

if (!DISCORD_TOKEN || !OPENAI_API_KEY) {
    console.error("Missing critical environment variables: DISCORD_TOKEN or OPENAI_API_KEY");
    process.exit(1);
}

let discordClientReady = false; // State for Discord client readiness

// --- Health Check Server for Railway & Uptime Robot ---
const PORT = process.env.PORT || 3000;
const HEALTH_CHECK_MESSAGE_OK = `PrismStrap AI Bot is healthy. Discord client is ready.\n`;
const HEALTH_CHECK_MESSAGE_NOT_READY = `PrismStrap AI Bot HTTP server is up, but Discord client is not ready yet.\n`;

const healthCheckServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        if (discordClientReady) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(HEALTH_CHECK_MESSAGE_OK);
        } else {
            res.writeHead(503, { 'Content-Type': 'text/plain' }); // 503 Service Unavailable
            res.end(HEALTH_CHECK_MESSAGE_NOT_READY);
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found\n');
    }
});

healthCheckServer.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ HTTP health check server running on port ${PORT}. Responds on '/' or '/health'.`);
});

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

const BOT_USER_AGENT_NAME = "PrismStrap AI";

client.on('ready', () => {
    console.log(`✅ ${BOT_USER_AGENT_NAME} is online and ready! Logged in as ${client.user.tag}`);
    discordClientReady = true; // Set Discord client as ready
    client.user.setPresence({
        activities: [{ name: `chat | @${BOT_USER_AGENT_NAME} help` }],
        status: 'online',
    });
});

client.on('disconnect', () => {
    console.warn(`🔌 ${BOT_USER_AGENT_NAME} disconnected from Discord.`);
    discordClientReady = false; // Set Discord client as not ready
});

client.on('reconnecting', () => {
    console.log(`🔄 ${BOT_USER_AGENT_NAME} is reconnecting to Discord...`);
    discordClientReady = false; // Not fully ready while reconnecting
});

client.on('error', (error) => {
    console.error(`❌ Discord client error for ${BOT_USER_AGENT_NAME}:`, error);
    discordClientReady = false; // Assume not ready on error, though it might recover
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

        if (!(requireMentionForGreeting && !mentioned && !isDM)) {
            const replies = ["Hello there!", "Hi!", "Hey, how can I help you today?", "Greetings!"];
            await message.reply(replies[Math.floor(Math.random() * replies.length)]);
            return;
        }
    }

    if (!mentioned && !isDM) {
        return;
    }

    let processedContent = message.content;
    if (mentioned && client.user) {
        const mentionRegex = new RegExp(`<@!?${client.user.id}>`, 'g');
        processedContent = processedContent.replace(mentionRegex, '').trim();
    }

    if (processedContent.length === 0) {
        await message.reply("Yes? How can I help you?");
        return;
    }

    const lowerProcessedContent = processedContent.toLowerCase();

    for (const keyword in PRISMSTRAP_QA) {
        if (lowerProcessedContent.includes(keyword)) {
            try {
                await message.reply(PRISMSTRAP_QA[keyword]);
            } catch (replyError) {
                console.error("Error sending PRISMSTRAP_QA reply:", replyError);
            }
            return;
        }
    }

    try {
        if (!discordClientReady) { // Added check
            await message.reply("I'm currently having some trouble connecting fully. Please try again in a moment.");
            return;
        }
        await message.channel.sendTyping();

        let systemPromptContent = `You are ${BOT_USER_AGENT_NAME}, a friendly and helpful AI assistant for the PrismStrap project. Engage in natural conversation. Be concise but informative.`;

        if (channelId === SUPPORT_CHANNEL_ID) {
            systemPromptContent += " You are currently in the PrismStrap support channel. Your primary goal is to assist users with their PrismStrap-related questions and issues.";
        } else if (channelId === DOWNLOAD_INFO_CHANNEL_ID) {
            systemPromptContent += ` You are in the PrismStrap download and information channel. Focus on providing direct information about PrismStrap features, download links, and official resources. If a user asks for general help or troubleshooting beyond basic info, politely suggest they ask in the dedicated support channel <#${SUPPORT_CHANNEL_ID}>.`;
        } else if (channelId === PRISMSTRAP_UPDATES_CHANNEL_ID) {
            systemPromptContent += ` You are in a channel for PrismStrap updates and discussion about supported executables/features. Keep responses concise and focused on PrismStrap news, changes, or compatibility. Guide users to <#${SUPPORT_CHANNEL_ID}> for support.`;
        }

        const messagesForOpenAI = [
            { role: "system", content: systemPromptContent },
            { role: "user", content: processedContent }
        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messagesForOpenAI,
            max_tokens: 300,
            temperature: 0.7,
        });

        const reply = completion.choices[0]?.message?.content?.trim();

        if (reply) {
            if (reply.length > 2000) {
                const parts = [];
                for (let i = 0; i < reply.length; i += 1990) {
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
        if (error.response) {
            console.error("OpenAI API Response Status:", error.response.status);
            console.error("OpenAI API Response Data:", error.response.data);
        } else if (error.code) {
             console.error("Error Code:", error.code);
        }
        await message.reply("Sorry, I encountered an issue while trying to process that. The AI might be temporarily unavailable or there was a network problem. Please try again in a moment.");
    }
});

client.login(DISCORD_TOKEN)
    .catch(err => {
        console.error(`❌ Failed to login to Discord as ${BOT_USER_AGENT_NAME}:`, err.message);
        discordClientReady = false; // Ensure this is false if login fails
        // process.exit(1); // Let Railway handle restarts based on health checks
    });

function gracefulShutdown(signal) {
    console.log(`ℹ️ Received ${signal}. Shutting down ${BOT_USER_AGENT_NAME} gracefully...`);
    discordClientReady = false;
    if (healthCheckServer) {
        healthCheckServer.close(() => {
            console.log('🚫 HTTP health check server closed.');
        });
    }
    if (client) {
        client.destroy();
        console.log('🚫 Discord client destroyed.');
    }
    // Give a brief moment for async operations to complete before exiting
    setTimeout(() => {
        process.exit(0);
    }, 1000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});
