const { MessageFlags } = require('discord.js');

// Import button handlers
const deploymentButtons = require('../handlers/deploymentButtons');
const warrantButtons = require('../handlers/warrantButtons');
const reportModal = require('../handlers/reportModal');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Handle button interactions
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('deployment_')) {
        return deploymentButtons.handle(interaction);
      }
      if (interaction.customId.startsWith('warrant_')) {
        return warrantButtons.handle(interaction);
      }
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'report_modal') {
        return reportModal.handle(interaction);
      }
    }

    // Handle slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      
      const errorMessage = { content: 'There was an error executing this command!', flags: MessageFlags.Ephemeral };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
};
