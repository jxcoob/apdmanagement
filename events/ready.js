const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const commands = [];
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      if (command.data) {
        commands.push(command.data.toJSON());
      }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
      console.log('🧹 Clearing all existing commands...');

      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: [] }
      );
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: [] }
      );

      console.log('⏳ Waiting 2 seconds for Discord to process...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const commandNames = commands.map(c => c.name);
      const uniqueNames = new Set(commandNames);

      if (commandNames.length !== uniqueNames.size) {
        console.error('Error: Duplicate command names detected!');
        const duplicates = commandNames.filter((name, index) => commandNames.indexOf(name) !== index);
        console.error('Duplicates:', duplicates);
        return;
      }

      console.log(`Registering ${commands.length} unique commands...`);
      console.log('Commands:', commandNames.join(', '));

      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );

      console.log(`✅ Successfully registered ${data.length} commands!`);
    } catch (err) {
      console.error('Error registering commands:', err);
    }
  }
};
