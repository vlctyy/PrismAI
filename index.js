import { Client, GatewayIntentBits, Partials } from 'discord.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

const { DISCORD_TOKEN, OPENAI_API_KEY } = process.env;
const BOT_CREATOR_NAME = process.env.BOT_CREATOR_NAME || "[Your Name/PrismStrap Team Name]"; // Configure this!

// --- Channel IDs ---
const SUPPORTED_EXECS_CHANNEL_ID = "1369681918278242465";
const PRISMSTRAP_UPDATES_CHANNEL_ID = "1369681918278242465";
const SUPPORT_CHANNEL_ID = "1346152690975244348";
const DOWNLOAD_INFO_CHANNEL_ID = "1369349351637389352";

const BOT_USER_AGENT_NAME = "PrismStrap AI";

// --- Configuration for General Basic Questions ---
const GENERAL_QA = { // This needs to be defined before PRISMSTRAP_QA if PRISMSTRAP_QA references it.
    "what can you do": `I can chat with you conversationally using AI, answer questions about PrismStrap, and perform a few simple tasks!
Try asking:
- "What is PrismStrap?"
- "Where can I download PrismStrap?"
- "How to use PrismStrap?" or "How to get FFlags?"
- "Tell me a joke"
- "Flip a coin"
- "What time is it?"
- For specific PrismStrap help, please use the <#${SUPPORT_CHANNEL_ID}> channel.
- For PrismStrap downloads and general info, check out <#${DOWNLOAD_INFO_CHANNEL_ID}>.`,
    "what are your commands": `I respond to natural language! You can ask me about PrismStrap (e.g., 'download PrismStrap', 'what is PrismStrap', 'how to use fflags'), or chat with me. I also know how to 'tell me a joke', 'flip a coin', or tell you 'what time is it'. My main help info is available if you ask "what can you do".`,
    "who created you": `I am ${BOT_USER_AGENT_NAME}, an AI assistant for the PrismStrap project. I was developed by ${BOT_CREATOR_NAME} with the help of OpenAI's technology.`,
    "who made you": `I am ${BOT_USER_AGENT_NAME}, an AI assistant for the PrismStrap project. I was developed by ${BOT_CREATOR_NAME} with the help of OpenAI's technology.`,
};

// --- Configuration for PrismStrap Specific Replies ---
const PRISMSTRAP_USAGE_RESPONSE = process.env.PRISMSTRAP_USAGE_INFO || `For PrismStrap usage, including how to manage FFlags and other features, please refer to our documentation or ask specific questions in <#${SUPPORT_CHANNEL_ID}>. (Detailed info not fully configured in my settings yet)`;

const PRISMSTRAP_QA = {
    // Download related
    "download": process.env.PRISMSTRAP_DOWNLOAD_LINK || `You can find download links in the <#${DOWNLOAD_INFO_CHANNEL_ID}> channel or ask me for specific versions. (Link not fully configured)`,
    "get prismstrap": process.env.PRISMSTRAP_DOWNLOAD_LINK || `You can find download links in the <#${DOWNLOAD_INFO_CHANNEL_ID}> channel or ask me for specific versions. (Link not fully configured)`,
    "where to download": process.env.PRISMSTRAP_DOWNLOAD_LINK || `You can find download links in the <#${DOWNLOAD_INFO_CHANNEL_ID}> channel or ask me for specific versions. (Link not fully configured)`,

    // Usage & FFlags related - all point to the same response
    "usage": PRISMSTRAP_USAGE_RESPONSE,
    "how to use": PRISMSTRAP_USAGE_RESPONSE,
    "how to use prismstrap": PRISMSTRAP_USAGE_RESPONSE,
    "using prismstrap": PRISMSTRAP_USAGE_RESPONSE,
    "how does prismstrap work": PRISMSTRAP_USAGE_RESPONSE,
    "get started with prismstrap": PRISMSTRAP_USAGE_RESPONSE,
    "prismstrap guide": PRISMSTRAP_USAGE_RESPONSE,
    "prismstrap tutorial": PRISMSTRAP_USAGE_RESPONSE,
    "prismstrap instructions": PRISMSTRAP_USAGE_RESPONSE,

    "fflags": PRISMSTRAP_USAGE_RESPONSE,
    "f flags": PRISMSTRAP_USAGE_RESPONSE,
    "how to get fflags": PRISMSTRAP_USAGE_RESPONSE,
    "how can i get fflags": PRISMSTRAP_USAGE_RESPONSE,
    "enable fflags": PRISMSTRAP_USAGE_RESPONSE,
    "change fflags": PRISMSTRAP_USAGE_RESPONSE,
    "set fflags": PRISMSTRAP_USAGE_RESPONSE,
    "modify fflags": PRISMSTRAP_USAGE_RESPONSE,
    "using fflags": PRISMSTRAP_USAGE_RESPONSE,
    "fflag setup": PRISMSTRAP_USAGE_RESPONSE,
    "fflag guide": PRISMSTRAP_USAGE_RESPONSE,
    "what are fflags": PRISMSTRAP_USAGE_RESPONSE,
    "explain fflags": PRISMSTRAP_USAGE_RESPONSE,

    // About PrismStrap
    "what is prismstrap": process.env.PRISMSTRAP_ABOUT || "PrismStrap is an awesome project! (About info not configured)",
    "about prismstrap": process.env.PRISMSTRAP_ABOUT || "PrismStrap is an awesome project! (About info not configured)",
    "tell me about prismstrap": process.env.PRISMSTRAP_ABOUT || "PrismStrap is an awesome project! (About info not configured)",

    // Help
    "help": GENERAL_QA["what can you do"]
};


if (!DISCORD_TOKEN || !OPENAI_API_KEY) {
    console.error("Missing critical environment variables: DISCORD_TOKEN or OPENAI_API_KEY");
    process.exit(1);
}

let discordClientReady = false;

// --- Health Check Server for Railway & Uptime Robot ---
const PORT = process.env.PORT || 3000;
const HEALTH_CHECK_MESSAGE_OK = `${BOT_USER_AGENT_NAME} is healthy. Discord client is ready.\n`;
const HEALTH_CHECK_MESSAGE_NOT_READY = `${BOT_USER_AGENT_NAME} HTTP server is up, but Discord client is not ready yet.\n`;

const healthCheckServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        if (discordClientReady) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(HEALTH_CHECK_MESSAGE_OK);
        } else {
            res.writeHead(503, { 'Content-Type': 'text/plain' });
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


client.on('ready', () => {
    console.log(`✅ ${BOT_USER_AGENT_NAME} is online and ready! Logged in as ${client.user.tag}`);
    discordClientReady = true;
    client.user.setPresence({
        activities: [{ name: `chat | @${BOT_USER_AGENT_NAME} help` }],
        status: 'online',
    });
});

client.on('disconnect', () => {
    console.warn(`🔌 ${BOT_USER_AGENT_NAME} disconnected from Discord.`);
    discordClientReady = false;
});

client.on('reconnecting', () => {
    console.log(`🔄 ${BOT_USER_AGENT_NAME} is reconnecting to Discord...`);
    discordClientReady = false;
});

client.on('error', (error) => {
    console.error(`❌ Discord client error for ${BOT_USER_AGENT_NAME}:`, error);
    discordClientReady = false;
});

// --- Helper functions for basic commands ---
function tellJoke() {
    const jokes = [
        "Why don't scientists trust atoms? Because they make up everything!",
        "Why did the scarecrow win an award? Because he was outstanding in his field!",
        "Why don't programmers like nature? It has too many bugs.",
        "What do you call a fish with no eyes? Fsh!",
        "Why was the math book sad? Because it had too many problems."
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
}

function flipCoin() {
    return Math.random() < 0.5 ? "Heads!" : "Tails!";
}

function getCurrentTime() {
    const now = new Date();
    return `The current time is ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}.`;
}
// --- End Helper functions ---


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

    // 3. Handle General Basic Questions & Commands
    for (const keyword in GENERAL_QA) {
        if (lowerProcessedContent.includes(keyword)) {
            try {
                await message.reply(GENERAL_QA[keyword]);
            } catch (replyError) {
                console.error("Error sending GENERAL_QA reply:", replyError);
            }
            return;
        }
    }
    if (lowerProcessedContent.includes("tell me a joke") || lowerProcessedContent.includes("tell joke")) {
        await message.reply(tellJoke());
        return;
    }
    if (lowerProcessedContent.includes("flip a coin") || lowerProcessedContent.includes("flip coin")) {
        await message.reply(flipCoin());
        return;
    }
    if (lowerProcessedContent.includes("what time is it") || lowerProcessedContent.includes("current time")) {
        await message.reply(getCurrentTime());
        return;
    }

    // 4. Handle specific PrismStrap questions/commands (PRISMSTRAP_QA)
    for (const keyword in PRISMSTRAP_QA) {
        if (keyword === "help" && (lowerProcessedContent.includes("what can you do") || lowerProcessedContent.includes("what are your commands"))) {
            continue;
        }
        if (lowerProcessedContent.includes(keyword)) {
            try {
                await message.reply(PRISMSTRAP_QA[keyword]);
            } catch (replyError) {
                console.error("Error sending PRISMSTRAP_QA reply:", replyError);
            }
            return;
        }
    }

    // 5. If no predefined match, and bot was addressed, use OpenAI
    try {
        if (!discordClientReady) {
            await message.reply("I'm currently having some trouble connecting fully. Please try again in a moment.");
            return;
        }
        await message.channel.sendTyping();

        let systemPromptContent = `You are ${BOT_USER_AGENT_NAME}, a friendly and helpful AI assistant for the PrismStrap project. You can engage in natural conversation. Be concise but informative. If asked about your capabilities, you can mention you can answer questions about PrismStrap (including FFlag usage and general operation), tell jokes, flip coins, and state the time, in addition to general chat.`;

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
        console.error(`❌ Failed to login to Discord as ${BOT_USER_AGENT_NAME}:`, err.message); // Corrected line
        discordClientReady = false;
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
    setTimeout(() => {
        process.exit(0);
    }, 1000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});
