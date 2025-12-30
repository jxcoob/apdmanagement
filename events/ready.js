const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);
    
    const commands = [];
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    console.log(`📦 Preparing ${commandFiles.length} command files for registration...`);
    
    for (const file of commandFiles) {
      try {
        const command = require(path.join(commandsPath, file));
        
        // Handle commands that export an array of SlashCommandBuilders
        if (Array.isArray(command.data)) {
          for (const cmdData of command.data) {
            commands.push(cmdData.toJSON ? cmdData.toJSON() : cmdData);
          }
        } else if (command.data) {
          commands.push(command.data.toJSON ? command.data.toJSON() : command.data);
        }
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
      }
    }
    
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    
    try {
      console.log('🧹 Clearing all existing commands...');
      
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: [] }
      );
      
      console.log('✅ Guild commands cleared');
      
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: [] }
      );
      
      console.log('✅ Global commands cleared');
      console.log('⏳ Waiting 5 seconds for Discord to process...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const commandNames = commands.map(c => c.name);
      const uniqueNames = new Set(commandNames);
      
      if (commandNames.length !== uniqueNames.size) {
        console.error('❌ Error: Duplicate command names detected!');
        const duplicates = commandNames.filter((name, index) => commandNames.indexOf(name) !== index);
        console.error('Duplicates:', duplicates);
        return;
      }
      
      console.log(`✅ ${commands.length} unique commands ready`);
      console.log(`📝 Commands: ${commandNames.join(', ')}`);
      console.log('🔄 Registering commands with Discord...');
      
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      
      console.log(`✅ Successfully registered ${data.length} commands!`);
      console.log('🎉 Bot is ready to use!');
      
    } catch (err) {
      console.error('❌ Error registering commands:');
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      if (err.code) console.error('Error code:', err.code);
      if (err.stack) console.error('Stack trace:', err.stack);
    }
  }
};
