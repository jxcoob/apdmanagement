require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const keep_alive = require('./keep_alive.js');

const token = process.env.TOKEN;

// Add startup logging
console.log('🚀 Starting bot...');
console.log('📁 Loading commands and events...');

// Verify environment variables
if (!token) {
  console.error('❌ ERROR: TOKEN is missing from environment variables!');
  process.exit(1);
}
if (!process.env.CLIENT_ID) {
  console.error('❌ ERROR: CLIENT_ID is missing from environment variables!');
  process.exit(1);
}
if (!process.env.GUILD_ID) {
  console.error('❌ ERROR: GUILD_ID is missing from environment variables!');
  process.exit(1);
}

console.log('✅ Environment variables loaded');

// Create client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Initialize command collections
client.commands = new Collection();
client.prefixCommands = new Collection();

// Load slash commands
const commandsPath = path.join(__dirname, 'commands');

// Check if commands directory exists
if (!fs.existsSync(commandsPath)) {
  console.error('❌ ERROR: commands/ directory not found!');
  console.error('Please create the commands/ directory and add command files.');
  process.exit(1);
}

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
console.log(`📝 Found ${commandFiles.length} command files`);

for (const file of commandFiles) {
  try {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`  ✅ Loaded: ${command.data.name}`);
    } else {
      console.log(`  ⚠️  Skipped ${file}: missing data or execute`);
    }
  } catch (error) {
    console.error(`  ❌ Error loading ${file}:`, error.message);
  }
}

// Load prefix commands
const prefixCommandsPath = path.join(__dirname, 'prefixCommands');
if (fs.existsSync(prefixCommandsPath)) {
  const prefixCommandFiles = fs.readdirSync(prefixCommandsPath).filter(file => file.endsWith('.js'));
  console.log(`📝 Found ${prefixCommandFiles.length} prefix command files`);
  
  for (const file of prefixCommandFiles) {
    try {
      const filePath = path.join(prefixCommandsPath, file);
      const command = require(filePath);
      if ('name' in command && 'execute' in command) {
        client.prefixCommands.set(command.name, command);
        console.log(`  ✅ Loaded: ${command.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Error loading ${file}:`, error.message);
    }
  }
} else {
  console.log('⚠️  prefixCommands/ directory not found, skipping...');
}

// Load event handlers
const eventsPath = path.join(__dirname, 'events');

// Check if events directory exists
if (!fs.existsSync(eventsPath)) {
  console.error('❌ ERROR: events/ directory not found!');
  console.error('Please create the events/ directory and add event files.');
  process.exit(1);
}

const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
console.log(`📝 Found ${eventFiles.length} event files`);

for (const file of eventFiles) {
  try {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
      console.log(`  ✅ Loaded: ${event.name} (once)`);
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
      console.log(`  ✅ Loaded: ${event.name}`);
    }
  } catch (error) {
    console.error(`  ❌ Error loading ${file}:`, error.message);
  }
}

// Express server for keep-alive
const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('Web server running on port 3000'));

// Add global error handlers
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Login
console.log('🔐 Attempting to login...');
client.login(token).catch(error => {
  console.error('❌ Failed to login:', error.message);
  process.exit(1);
});
