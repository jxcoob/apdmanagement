require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');

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

// Verify token format (basic check)
if (!token.includes('.')) {
  console.error('❌ ERROR: TOKEN appears to be invalid (should contain dots)');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log(`📝 Token length: ${token.length} characters`);
console.log(`📝 Token starts with: ${token.substring(0, 10)}...`);

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
const server = app.listen(3000, () => console.log('Web server running on port 3000'));

// Add global error handlers
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Add Discord client error handler
client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

client.on('warn', (warning) => {
  console.warn('⚠️  Discord client warning:', warning);
});

client.on('debug', (info) => {
  // Log connection-related debug info
  if (info.includes('Session') || info.includes('Heartbeat') || info.includes('connect')) {
    console.log('🐛 Debug:', info);
  }
});

// Add shardError handler
client.on('shardError', error => {
  console.error('❌ A websocket connection encountered an error:', error);
});

// Login with detailed error catching
console.log('🔐 Attempting to login...');
console.log('⏳ Connecting to Discord Gateway...');

client.login(token)
  .then(() => {
    console.log('✅ Login method completed successfully');
  })
  .catch(error => {
    console.error('❌ Failed to login!');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    
    // Common error codes and solutions
    if (error.code === 'TOKEN_INVALID') {
      console.error('\n💡 Solution: Your bot token is invalid. Please:');
      console.error('   1. Go to https://discord.com/developers/applications');
      console.error('   2. Select your bot');
      console.error('   3. Go to "Bot" section');
      console.error('   4. Click "Reset Token" and copy the new token');
      console.error('   5. Update your TOKEN in the .env file');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('\n💡 Solution: Network connection issue. Check your internet connection.');
    }
    
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('🔌 HTTP server closed');
    client.destroy();
    process.exit(0);
  });
});
