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
    const commandNames = new Set();
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    console.log(`📦 Processing ${commandFiles.length} command files...`);
    
    for (const file of commandFiles) {
      try {
        const filePath = path.join(commandsPath, file);
        delete require.cache[require.resolve(filePath)];
        
        const command = require(filePath);
        
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
      
      console.log('⏳ Waiting 10 seconds for Discord to fully process...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      console.log('🔄 Registering commands with Discord...');
      
      // Add timeout to prevent hanging
      const registrationPromise = rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Registration timeout after 30 seconds')), 30000)
      );
      
      const data = await Promise.race([registrationPromise, timeoutPromise]);
      
      console.log(`✅ Successfully registered ${data.length} commands!`);
      console.log(`📋 Registered commands: ${data.map(c => c.name).join(', ')}`);
      console.log('🎉 Bot is ready to use!');
      console.log(`\n💡 Try typing / in your Discord server to see commands!`);
      
    } catch (err) {
      console.error('\n❌❌❌ ERROR REGISTERING COMMANDS ❌❌❌');
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Error code:', err.code);
      console.error('Error status:', err.status);
      
      if (err.rawError) {
        console.error('Raw error:', JSON.stringify(err.rawError, null, 2));
      }
      
      if (err.stack) {
        console.error('Stack trace:', err.stack);
      }
      
      console.error('\n🔧 POSSIBLE FIXES:');
      console.error('1. Check CLIENT_ID and GUILD_ID in Render environment variables');
      console.error('2. Re-invite bot: https://discord.com/api/oauth2/authorize?client_id=' + process.env.CLIENT_ID + '&permissions=8&scope=bot%20applications.commands');
      console.error('3. Make sure bot has "applications.commands" scope');
    }
  }
};
