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

console.log('✅ Environment variables loaded');

// Create client with WS options for better connectivity
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  ws: {
    large_threshold: 50
  },
  rest: {
    timeout: 30000
  }
});

// Initialize command collections
client.commands = new Collection();
client.prefixCommands = new Collection();

// Load slash commands
const commandsPath = path.join(__dirname, 'commands');

if (!fs.existsSync(commandsPath)) {
  console.error('❌ ERROR: commands/ directory not found!');
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

if (!fs.existsSync(eventsPath)) {
  console.error('❌ ERROR: events/ directory not found!');
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
app.get('/status', (req, res) => {
  res.json({
    status: client.isReady() ? 'online' : 'connecting',
    uptime: client.uptime,
    guilds: client.guilds.cache.size
  });
});
const server = app.listen(3000, () => console.log('🌐 Web server running on port 3000'));

// FULL DEBUG LOGGING - Every Discord.js event
console.log('📊 Setting up comprehensive event logging...');

client.on('debug', (info) => {
  console.log('🐛 [DEBUG]:', info);
});

client.on('warn', (warning) => {
  console.warn('⚠️  [WARN]:', warning);
});

client.on('error', (error) => {
  console.error('❌ [ERROR]:', error);
});

client.on('shardError', error => {
  console.error('❌ [SHARD ERROR]:', error);
});

client.on('shardReady', (id) => {
  console.log(`✅ [SHARD ${id}] Ready!`);
});

client.on('shardDisconnect', (event, id) => {
  console.log(`🔌 [SHARD ${id}] Disconnected:`, event);
});

client.on('shardReconnecting', (id) => {
  console.log(`🔄 [SHARD ${id}] Reconnecting...`);
});

client.on('shardResume', (id) => {
  console.log(`▶️  [SHARD ${id}] Resumed!`);
});

// Add global error handlers
process.on('unhandledRejection', (error) => {
  console.error('❌ [UNHANDLED REJECTION]:', error);
  if (error.stack) console.error(error.stack);
});

process.on('uncaughtException', (error) => {
  console.error('❌ [UNCAUGHT EXCEPTION]:', error);
  if (error.stack) console.error(error.stack);
  process.exit(1);
});

// Login with timeout detection
console.log('🔐 Attempting to login...');
console.log('⏳ Connecting to Discord Gateway...');

// Set a timeout to detect stuck connections
const loginTimeout = setTimeout(() => {
  console.error('❌ LOGIN TIMEOUT: Bot has been trying to connect for 30 seconds');
  console.error('💡 This usually means:');
  console.error('   1. Network/firewall is blocking WebSocket connections');
  console.error('   2. Discord API is experiencing issues');
  console.error('   3. Your token might be invalid');
  console.error('');
  console.error('🔍 Checking token validity...');
  console.error(`   Token format appears valid (${token.length} chars)`);
  console.error('');
  console.error('🌐 Try testing your token manually at:');
  console.error('   https://discord.com/api/v10/users/@me');
  console.error('   (Use Authorization: Bot YOUR_TOKEN_HERE)');
}, 30000);

client.login(token)
  .then(() => {
    clearTimeout(loginTimeout);
    console.log('✅ Login promise resolved');
  })
  .catch(error => {
    clearTimeout(loginTimeout);
    console.error('❌ LOGIN FAILED!');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'TOKEN_INVALID') {
      console.error('\n💡 Your token is invalid or expired!');
      console.error('   Go to: https://discord.com/developers/applications');
      console.error('   Reset your bot token and update your .env file');
    } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
      console.error('\n💡 Cannot reach Discord servers!');
      console.error('   Check your network connection and firewall settings');
    }
    
    console.error('\nFull error:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  clearTimeout(loginTimeout);
  server.close(() => {
    console.log('🔌 HTTP server closed');
    client.destroy();
    process.exit(0);
  });
});
