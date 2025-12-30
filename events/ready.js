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
      console.log('🔄 Registering/updating commands with Discord...');
      
      // Just PUT commands directly - Discord will handle updates automatically
      // No need to clear first!
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      
      console.log(`✅ Successfully registered ${data.length} commands!`);
      console.log(`📋 Active commands: ${data.map(c => c.name).join(', ')}`);
      console.log('🎉 Bot is ready to use!');
      console.log(`\n💡 Type / in your Discord server to see all commands!`);
      
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
};
