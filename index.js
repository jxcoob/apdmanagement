require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const keep_alive = require('./keep_alive.js');

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

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

// Ready event - register commands here
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);
  
  const rest = new REST({ version: '10' }).setToken(token);
  
  try {
    console.log('🧹 Clearing all existing commands...');
    
    // Clear guild commands
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
    
    // Clear global commands (optional, but good practice)
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    
    console.log('⏳ Waiting 2 seconds for Discord to process...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for duplicate command names
    const commandNamesArray = commands.map(c => c.name);
    const uniqueNames = new Set(commandNamesArray);
    
    if (commandNamesArray.length !== uniqueNames.size) {
      console.error('❌ Error: Duplicate command names detected!');
      const duplicates = commandNamesArray.filter((name, index) => commandNamesArray.indexOf(name) !== index);
      console.error('Duplicates:', duplicates);
      return;
    }
    
    console.log(`🔄 Registering ${commands.length} unique commands...`);
    console.log(`📋 Commands: ${commandNamesArray.join(', ')}`);
    
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId), 
      { body: commands }
    );
    
    console.log(`✅ Successfully registered ${data.length} commands!`);
    console.log(`📋 Active commands: ${data.map(c => c.name).join(', ')}`);
    console.log('🎉 Bot is ready to use!');
    console.log('\n💡 Type / in your Discord server to see all commands!');
    
  } catch (err) {
    console.error('\n❌❌❌ ERROR REGISTERING COMMANDS ❌❌❌');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error status:', err.status);
    
    if (err.rawError) {
      console.error('Raw error:', JSON.stringify(err.rawError, null, 2));
    }
  }
});

// Express server
const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('Web server running on port 3000'));

// Login
client.login(token);
