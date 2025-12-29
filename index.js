require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');

const token = process.env.TOKEN;

console.log('🚀 Starting bot...');

// Verify environment variables
if (!token || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
  console.error('❌ ERROR: Missing environment variables!');
  process.exit(1);
}

// Start web server FIRST for Render health check
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(3000, () => console.log('🌐 Web server started on port 3000'));

// Create client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();
client.prefixCommands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
console.log(`📝 Loading ${commandFiles.length} commands...`);

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data?.name) {
    client.commands.set(command.data.name, command);
  }
}

// Load prefix commands
const prefixPath = path.join(__dirname, 'prefixCommands');
if (fs.existsSync(prefixPath)) {
  const prefixFiles = fs.readdirSync(prefixPath).filter(f => f.endsWith('.js'));
  for (const file of prefixFiles) {
    const command = require(path.join(prefixPath, file));
    if (command.name) client.prefixCommands.set(command.name, command);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
console.log(`📝 Loading ${eventFiles.length} events...`);

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Error handlers
client.on('error', console.error);
client.on('warn', console.warn);

// Login
console.log('🔐 Logging in...');
client.login(token)
  .then(() => console.log('✅ Login initiated'))
  .catch(err => {
    console.error('❌ Login failed:', err.message);
    if (err.code === 'TOKEN_INVALID') {
      console.error('💡 Token is invalid - regenerate it!');
    } else if (err.message?.includes('ENOTFOUND') || err.message?.includes('ETIMEDOUT')) {
      console.error('💡 Cannot reach Discord - Render IP may be blocked');
      console.error('💡 SOLUTION: Use Railway.app instead of Render');
    }
    process.exit(1);
  });
