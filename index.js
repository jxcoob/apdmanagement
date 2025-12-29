require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const https = require('https');

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

// Function to test token validity
async function testToken(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'discord.com',
      port: 443,
      path: '/api/v10/users/@me',
      method: 'GET',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };

    console.log('🔍 Testing token validity with Discord API...');
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          const user = JSON.parse(data);
          console.log(`✅ Token is valid! Bot user: ${user.username}#${user.discriminator}`);
          console.log(`📋 Bot ID: ${user.id}`);
          resolve(true);
        } else if (res.statusCode === 401) {
          console.error('❌ Token is INVALID or EXPIRED!');
          console.error('Response:', data);
          reject(new Error('Invalid token'));
        } else {
          console.error(`⚠️  Unexpected status code: ${res.statusCode}`);
          console.error('Response:', data);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Failed to connect to Discord API:', error.message);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('❌ Request to Discord API timed out');
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Test token before proceeding
async function startBot() {
  try {
    await testToken(token);
  } catch (error) {
    console.error('\n💡 SOLUTION:');
    console.error('1. Go to https://discord.com/developers/applications');
    console.error('2. Select your application');
    console.error('3. Go to "Bot" section');
    console.error('4. Click "Reset Token" to generate a new one');
    console.error('5. Copy the new token and update your TOKEN environment variable');
    console.error('6. Make sure "Message Content Intent" is enabled under Privileged Gateway Intents');
    process.exit(1);
  }

  // Create client with optimized settings for Render
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers
    ],
    // Optimized WebSocket settings for cloud hosting
    ws: {
      large_threshold: 50,
      compress: true,
      properties: {
        os: 'linux',
        browser: 'discord.js',
        device: 'discord.js'
      }
    },
    rest: {
      timeout: 60000,
      retries: 3
    },
    // Important: Set proper timeout values
    closeTimeout: 5000,
    waitGuildTimeout: 15000
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
      guilds: client.guilds.cache.size,
      user: client.user ? client.user.tag : 'Not logged in'
    });
  });
  const server = app.listen(3000, () => console.log('🌐 Web server running on port 3000'));

  // Connection event tracking
  console.log('📊 Setting up event logging...');

  client.on('debug', (info) => {
    // Only log important debug messages
    if (info.includes('Session') || info.includes('Heartbeat') || 
        info.includes('ready') || info.includes('Identify') ||
        info.includes('READY') || info.includes('Guild')) {
      console.log('🐛 [DEBUG]:', info);
    }
  });

  client.on('warn', (warning) => {
    console.warn('⚠️  [WARN]:', warning);
  });

  client.on('error', (error) => {
    console.error('❌ [ERROR]:', error);
  });

  client.on('shardError', error => {
    console.error('❌ [SHARD ERROR]:', error.message);
  });

  // Add global error handlers
  process.on('unhandledRejection', (error) => {
    console.error('❌ [UNHANDLED REJECTION]:', error);
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ [UNCAUGHT EXCEPTION]:', error);
    process.exit(1);
  });

  // Login with proper error handling
  console.log('🔐 Attempting to login to Discord Gateway...');
  console.log('⏳ This may take 10-30 seconds...');

  const loginTimeout = setTimeout(() => {
    console.error('\n❌ CONNECTION TIMEOUT (60 seconds)');
    console.error('💡 Possible causes:');
    console.error('   1. Render firewall blocking WebSocket connections');
    console.error('   2. Discord Gateway experiencing issues');
    console.error('   3. Network routing problems');
    console.error('\n🔧 Try:');
    console.error('   1. Check Discord Status: https://discordstatus.com');
    console.error('   2. Restart this deployment');
    console.error('   3. Contact Render support about WebSocket connections');
  }, 60000);

  try {
    await client.login(token);
    clearTimeout(loginTimeout);
    console.log('✅ Successfully connected to Discord!');
  } catch (error) {
    clearTimeout(loginTimeout);
    console.error('\n❌ LOGIN FAILED!');
    console.error('Error:', error.message);
    
    if (error.code === 'TOKEN_INVALID') {
      console.error('\n💡 Token is invalid - regenerate it in Discord Developer Portal');
    } else if (error.code === 'DISALLOWED_INTENTS') {
      console.error('\n💡 Missing required intents!');
      console.error('   Enable "Message Content Intent" in Discord Developer Portal');
    }
    
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📴 SIGTERM received, shutting down...');
    clearTimeout(loginTimeout);
    server.close(() => {
      console.log('🔌 HTTP server closed');
      client.destroy();
      process.exit(0);
    });
  });
}

// Start the bot
startBot().catch(error => {
  console.error('❌ Fatal error during startup:', error);
  process.exit(1);
});
