require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const keep_alive = require('./keep_alive.js');

const token = process.env.TOKEN;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Load all commands
client.commands = new Map();
const commands = [];
const commandNames = new Set();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log(`📦 Loading ${commandFiles.length} command files...`);

for (const file of commandFiles) {
  try {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if (Array.isArray(command.data)) {
      for (const cmdData of command.data) {
        client.commands.set(cmdData.name, command);
        const jsonCmd = cmdData.toJSON ? cmdData.toJSON() : cmdData;
        if (!commandNames.has(jsonCmd.name)) {
          commands.push(jsonCmd);
          commandNames.add(jsonCmd.name);
        }
      }
    } else {
      client.commands.set(command.data.name, command);
      const jsonCmd = command.data.toJSON ? command.data.toJSON() : command.data;
      if (!commandNames.has(jsonCmd.name)) {
        commands.push(jsonCmd);
        commandNames.add(jsonCmd.name);
      }
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log(`✅ Loaded ${commands.length} unique commands`);

// Load event handlers
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Register commands with timeout
async function registerCommands() {
  console.log('🔄 Starting command registration...');
  console.log(`📋 CLIENT_ID: ${process.env.CLIENT_ID}`);
  console.log(`📋 GUILD_ID: ${process.env.GUILD_ID}`);
  console.log(`📋 Commands to register: ${commands.length}`);
  
  const rest = new REST({ version: '10' }).setToken(token);
  
  // Create a timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Command registration timed out after 10 seconds')), 10000);
  });
  
  // Race between the actual registration and timeout
  try {
    const registrationPromise = rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    
    const data = await Promise.race([registrationPromise, timeoutPromise]);
    
    console.log(`✅ Successfully registered ${data.length} commands!`);
    console.log(`📋 Registered commands: ${data.map(c => c.name).join(', ')}`);
    return true;
    
  } catch (err) {
    console.error('\n🚨 COMMAND REGISTRATION FAILED 🚨');
    console.error('Error message:', err.message);
    console.error('Error name:', err.name);
    
    if (err.code) console.error('Error code:', err.code);
    if (err.status) console.error('HTTP status:', err.status);
    if (err.stack) console.error('Stack:', err.stack);
    
    if (err.rawError) {
      console.error('Raw error:', JSON.stringify(err.rawError, null, 2));
    }
    
    console.error('\n⚠️  Bot will continue without registering commands');
    return false;
  }
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);
  console.log('🎉 Bot is ready!');
});

// Express server
const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('Web server running on port 3000'));

// Start bot login immediately, register commands in parallel
console.log('🚀 Starting bot login...');
client.login(token);

// Register commands in the background (don't block bot login)
registerCommands()
  .then(success => {
    if (success) {
      console.log('✅ Command registration completed successfully');
    } else {
      console.log('⚠️  Command registration failed, but bot is still running');
    }
  })
  .catch(err => {
    console.error('❌ Unexpected error in command registration:', err);
  });
