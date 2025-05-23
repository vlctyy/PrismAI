# PrismStrap AI Discord Bot

A Discord bot that acts as an AI assistant for the PrismStrap project. It uses OpenAI's GPT models to understand and respond to user queries in natural language, providing information about PrismStrap, answering general questions, and performing simple interactive tasks.

## Features

*   **PrismStrap Project Assistance:** Answers questions about PrismStrap, including FFlag usage, download information, and general project details.
*   **Conversational AI:** Engages in natural conversations using OpenAI's language models.
*   **Simple Commands:**
    *   `tell me a joke`
    *   `flip a coin`
    *   `what time is it?`
*   **Flexible Interaction:** Responds to direct mentions (@bot-name) in channels or direct messages (DMs).
*   **Configurable Responses:** Allows customization of PrismStrap-specific answers and information through environment variables and direct code configuration.
*   **Health Check Endpoint:** Includes an HTTP server with a `/health` endpoint for monitoring bot status, useful for deployment platforms like Railway.
*   **Dynamic Presence:** Shows bot activity status on Discord (e.g., "chat | @BotName help").
*   **Channel-Specific Behavior:** Can tailor responses or guidance based on the Discord channel where the message originated (e.g., support channel, download channel).

## Prerequisites

Before you begin, ensure you have the following installed and configured:

*   **Node.js:** (Specify version if known, e.g., v16.x or later). You can download it from [nodejs.org](https://nodejs.org/).
*   **Discord Bot Token:** You'll need a token for your Discord bot. You can create a bot and get a token from the [Discord Developer Portal](https://discord.com/developers/applications).
*   **OpenAI API Key:** An API key from OpenAI is required for the AI functionalities. You can obtain one from your [OpenAI dashboard](https://platform.openai.com/account/api-keys).

## Installation and Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd prismstrap-bot 
    ```
    *(Replace `<your-repository-url>` with the actual URL of this repository)*

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env` file:**
    Create a file named `.env` in the root directory of the project and add the following environment variables:

    ```env
    DISCORD_TOKEN="YOUR_DISCORD_BOT_TOKEN"
    OPENAI_API_KEY="YOUR_OPENAI_API_KEY"

    # Optional: Configure the name of the bot creator (defaults if not set)
    # BOT_CREATOR_NAME="Your Name/Team Name"

    # Optional: Configure specific responses (these have defaults in index.js if not set)
    # PRISMSTRAP_USAGE_INFO="Detailed information about how to use PrismStrap and FFlags..."
    # PRISMSTRAP_DOWNLOAD_LINK="Direct link to PrismStrap downloads or a link to the #downloads channel"
    # PRISMSTRAP_ABOUT="A brief description of what PrismStrap is."

    # Optional: Port for the health check server (defaults to 3000 if not set)
    # PORT=3000
    ```
    *   Replace `"YOUR_DISCORD_BOT_TOKEN"` and `"YOUR_OPENAI_API_KEY"` with your actual credentials.
    *   Uncomment and set the optional variables as needed.

## Running the Bot

Once the setup is complete, you can run the bot using the following scripts:

*   **Production mode:**
    ```bash
    npm start
    ```
    This will start the bot using `node index.js`.

*   **Development mode (with auto-reloading):**
    ```bash
    npm run dev
    ```
    This uses `node --watch index.js` to automatically restart the bot when file changes are detected.

## Configuration

Beyond the environment variables in the `.env` file, some bot behaviors are configured directly within `index.js`:

*   **Channel IDs:** Constants like `SUPPORTED_EXECS_CHANNEL_ID`, `PRISMSTRAP_UPDATES_CHANNEL_ID`, `SUPPORT_CHANNEL_ID`, and `DOWNLOAD_INFO_CHANNEL_ID` define specific channels that the bot might interact with or reference. You may need to update these IDs to match your Discord server's channel structure.
*   **Bot User Agent Name:** The `BOT_USER_AGENT_NAME` constant (defaulting to "PrismStrap AI") defines the name used in some bot messages and logs.
*   **Predefined Q&A:** The `GENERAL_QA` and `PRISMSTRAP_QA` objects in `index.js` contain predefined questions and answers. You can extend or modify these to customize the bot's knowledge base for common queries.
*   **System Prompts for OpenAI:** The `systemPromptContent` within the `messageCreate` event handler is tailored based on the channel of interaction. This can be adjusted to change the AI's persona or instructions for different contexts.

## Contributing

Contributions to the PrismStrap AI Bot are welcome! If you have suggestions for improvements or new features, please consider the following:

1.  **Fork the repository.**
2.  **Create a new branch** for your feature or bug fix (e.g., `git checkout -b feature/your-feature-name` or `git checkout -b fix/issue-description`).
3.  **Make your changes.**
4.  **Test your changes thoroughly.**
5.  **Commit your changes** with clear and descriptive messages.
6.  **Push your branch** to your forked repository.
7.  **Open a pull request** to the main repository, detailing the changes you've made.

Please ensure your code adheres to the existing style and that any new features are well-documented.

## License

This project is licensed under the ISC License. See the `LICENSE` file for more details.
