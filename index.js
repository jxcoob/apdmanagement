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

// Register commands function with detailed error logging
async function registerCommands() {
  console.log('🔄 Registering commands with Discord...');
  console.log(`📋 CLIENT_ID: ${process.env.CLIENT_ID}`);
  console.log(`📋 GUILD_ID: ${process.env.GUILD_ID}`);
  console.log(`📋 Commands to register: ${commands.length}`);
  
  const rest = new REST({ version: '10' }).setToken(token);
  
  try {
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    
    console.log(`✅ Successfully registered ${data.length} commands!`);
    console.log(`📋 Registered commands: ${data.map(c => c.name).join(', ')}`);
    
  } catch (err) {
    console.error('\n🚨🚨🚨 COMMAND REGISTRATION FAILED 🚨🚨🚨');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error status:', err.status);
    console.error('Full error:', err);
    
    if (err.rawError) {
      console.error('Raw error details:', JSON.stringify(err.rawError, null, 2));
    }
    
    // Log environment variables (safely)
    console.error('\n🔍 Environment Check:');
    console.error('CLIENT_ID exists:', !!process.env.CLIENT_ID);
    console.error('GUILD_ID exists:', !!process.env.GUILD_ID);
    console.error('TOKEN exists:', !!process.env.TOKEN);
    console.error('CLIENT_ID value:', process.env.CLIENT_ID);
    console.error('GUILD_ID value:', process.env.GUILD_ID);
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

// Register commands THEN login
registerCommands()
  .then(() => {
    console.log('✅ Command registration complete, logging in...');
    return client.login(token);
  })
  .catch(err => {
    console.error('❌ Fatal error during startup:', err);
    process.exit(1);
  });
