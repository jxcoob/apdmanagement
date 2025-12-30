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

console.log(`📦 Processing ${commandFiles.length} command files...`);

for (const file of commandFiles) {
  try {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    // Handle commands that export an array of SlashCommandBuilders
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
console.log(`📝 Commands: ${Array.from(commandNames).sort().join(', ')}`);

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

// Register commands with Discord
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(token);
  
  try {
    console.log('🔄 Registering/updating commands with Discord...');
    
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    
    console.log(`✅ Successfully registered ${data.length} commands!`);
    console.log(`📋 Active commands: ${data.map(c => c.name).join(', ')}`);
    console.log('🎉 Commands registered successfully!');
    
  } catch (err) {
    console.error('\n❌❌❌ ERROR REGISTERING COMMANDS ❌❌❌');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error status:', err.status);
    
    if (err.rawError) {
      console.error('Raw error:', JSON.stringify(err.rawError, null, 2));
    }
    
    if (err.requestBody) {
      console.error('Request body:', JSON.stringify(err.requestBody, null, 2));
    }
    
    console.error('\n🔧 POSSIBLE FIXES:');
    console.error('1. Verify CLIENT_ID in Render: ' + process.env.CLIENT_ID);
    console.error('2. Verify GUILD_ID in Render: ' + process.env.GUILD_ID);
    console.error('3. Re-invite bot with this URL:');
    console.error(`   https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`);
    console.error('4. Make sure bot is actually IN the server with GUILD_ID: ' + process.env.GUILD_ID);
  }
}

// Register commands before logging in
registerCommands().then(() => {
  // Express server
  const app = express();
  app.get('/', (req, res) => res.send('Bot is alive!'));
  app.listen(3000, () => console.log('Web server running on port 3000'));
  
  // Login to Discord
  client.login(token);
});

// Add a ready event listener for status updates
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);
  console.log('\n💡 Type / in your Discord server to see all commands!');
});
