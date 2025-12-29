module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // Check for prefix commands
    if (!message.content.startsWith('$')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.prefixCommands.get(commandName);

    if (!command) return;

    try {
      await command.execute(message, args);
    } catch (error) {
      console.error(`Error executing prefix command ${commandName}:`, error);
      await message.reply('There was an error executing that command.');
    }
  }
};
