# MM2 Value Discord Bot

A ready-to-use Discord bot that looks up Murder Mystery 2 item values using the [RBLXValue API](https://docs.rblxvalue.com).

Built with [discord.js](https://discord.js.org) v14.

## Features

- `/item [name]` — Look up any MM2 item value with demand and stability
- `/set [name]` — Look up a full MM2 set with all items and total value  
- `/profile [username]` — Look up a RBLXValue user profile and inventory value

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/un6107617/mm2-value-discord-bot.git
cd mm2-value-discord-bot
npm install
```

### 2. Get a free API key

Go to [rblxvalue.com/developer](https://rblxvalue.com/developer) and log in with your Roblox account to create a free API key. Free keys include 30 requests per minute — enough for most bots.

### 3. Create a Discord bot

1. Go to [discord.com/developers](https://discord.com/developers/applications)
2. Click **New Application**
3. Go to **Bot** and copy your token
4. Go to **OAuth2 → URL Generator**, select `bot` and `applications.commands`, copy the invite URL

### 4. Configure

```bash
cp .env.example .env
```

Fill in your `.env`:

```
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
RBLXVALUE_API_KEY=rbx_your_key_here
```

### 5. Run

```bash
node bot.js
```

Or with PM2:

```bash
npm install -g pm2
pm2 start bot.js --name mm2-bot
pm2 save
```

## Commands

| Command | Description | Requires API key |
|---------|-------------|-----------------|
| `/item [name]` | Item value, demand, stability | No |
| `/set [name]` | Set total value and item list | No |
| `/profile [username]` | User profile and inventory | Yes (free) |

## Rate Limits

The free RBLXValue API key supports 30 requests per minute. For higher volume bots, upgrade at [rblxvalue.com/developer](https://rblxvalue.com/developer).

## Credit Requirement

Free plan users must include `Data from rblxvalue.com` in embed footers. This bot does this by default.

## API Documentation

Full API docs at [docs.rblxvalue.com](https://docs.rblxvalue.com)

## Links

- [RBLXValue.com](https://rblxvalue.com) — MM2 value comparison platform
- [docs.rblxvalue.com](https://docs.rblxvalue.com) — API documentation  
- [Get API Key](https://rblxvalue.com/developer) — Free API key
- [Discord Server](https://discord.gg/2puhtMjdnw) — Support and community

## Powered by

[RBLXValue API](https://rblxvalue.com/developer) — free public MM2 value API.

## License

MIT
