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
    const commandNames = new Set(); // Track unique command names
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    console.log(`📦 Processing ${commandFiles.length} command files...`);
    
    for (const file of commandFiles) {
      try {
        // Clear the require cache to avoid stale data
        const filePath = path.join(commandsPath, file);
        delete require.cache[require.resolve(filePath)];
        
        const command = require(filePath);
        
        // Handle commands that export an array of SlashCommandBuilders
        if (Array.isArray(command.data)) {
          for (const cmdData of command.data) {
            const jsonCmd = cmdData.toJSON ? cmdData.toJSON() : cmdData;
            if (!commandNames.has(jsonCmd.name)) {
              commands.push(jsonCmd);
              commandNames.add(jsonCmd.name);
            }
          }
        } else if (command.data) {
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
    
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    
    try {
      console.log('🧹 Clearing all existing commands...');
      
      // Clear guild commands
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: [] }
      );
      console.log('✅ Guild commands cleared');
      
      // Clear global commands
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: [] }
      );
      console.log('✅ Global commands cleared');
      
      console.log('⏳ Waiting 10 seconds for Discord to fully process...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
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
