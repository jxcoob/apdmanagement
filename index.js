require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const keep_alive = require('./keep_alive.js');

// ====== CONFIG ======
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

// ====== CLIENT SETUP ======
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ====== LOAD COMMANDS ======
client.commands = new Map();
client.prefixCommands = new Map(); // For prefix commands if needed
const commands = [];
const commandNames = new Set();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log(`📦 Loading ${commandFiles.length} command files...`);

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
    } else if (command.data) {
      client.commands.set(command.data.name, command);
      const jsonCmd = command.data.toJSON ? command.data.toJSON() : command.data;
      if (!commandNames.has(jsonCmd.name)) {
        commands.push(jsonCmd);
        commandNames.add(jsonCmd.name);
      }
    }
  } catch (error) {
    console.error(`❌ Error loading ${file}:`, error.message);
  }
}

console.log(`✅ Loaded ${commands.length} unique commands`);
console.log(`📝 Commands: ${Array.from(commandNames).sort().join(', ')}`);

// ====== LOAD EVENT HANDLERS ======
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  console.log(`📦 Loading ${eventFiles.length} event files...`);

  for (const file of eventFiles) {
    try {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      
      console.log(`  ✓ Loaded event: ${event.name}`);
    } catch (error) {
      console.error(`❌ Error loading event ${file}:`, error.message);
    }
  }

  console.log(`✅ Loaded ${eventFiles.length} events`);
} else {
  console.log('📁 No events folder found, skipping event loading');
}

// ====== READY EVENT & COMMAND REGISTRATION ======
client.once('ready', async () => {
  console.log('\n🎯 ========== READY EVENT FIRED ==========');
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);
  console.log(`🆔 Client ID: ${clientId}`);
  console.log(`🏠 Guild ID: ${guildId}`);
  
  const rest = new REST({ version: '10' }).setToken(token);
  
  try {
    console.log('\n🧹 Clearing all existing commands...');
    
    // Clear guild commands
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
    console.log('  ✓ Guild commands cleared');
    
    // Clear global commands
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log('  ✓ Global commands cleared');
    
    console.log('\n⏳ Waiting 2 seconds for Discord to process...');
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
    
    console.log(`\n🔄 Registering ${commands.length} commands with Discord...`);
    console.log(`📋 Command list: ${commandNamesArray.join(', ')}`);
    
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId), 
      { body: commands }
    );
    
    console.log(`\n✅ Successfully registered ${data.length} commands!`);
    console.log(`📋 Active commands: ${data.map(c => c.name).join(', ')}`);
    console.log('\n🎉 ========== BOT READY TO USE ==========');
    console.log('💡 Type / in your Discord server to see all commands!\n');
    
  } catch (err) {
    console.error('\n❌❌❌ ERROR REGISTERING COMMANDS ❌❌❌');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    if (err.code) console.error('Error code:', err.code);
    if (err.status) console.error('Error status:', err.status);
    
    if (err.rawError) {
      console.error('Raw error:', JSON.stringify(err.rawError, null, 2));
    }
    
    console.error('\n🔧 TROUBLESHOOTING:');
    console.error('1. Verify CLIENT_ID:', clientId);
    console.error('2. Verify GUILD_ID:', guildId);
    console.error('3. Check bot is in the server');
    console.error(`4. Re-invite bot: https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`);
  }
});

// ====== EXPRESS SERVER ======
const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('🌐 Web server running on port 3000'));

// ====== LOGIN ======
console.log('🔐 Logging in to Discord...');
client.login(token).catch(err => {
  console.error('❌ Failed to login:', err);
  process.exit(1);
});
