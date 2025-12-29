const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const deploymentAttendees = new Map();

module.exports = {
  deploymentAttendees, // Export for use in deployment command
  
  async handle(interaction) {
    if (interaction.customId.startsWith('deployment_attend_')) {
      const messageId = interaction.customId.split('_')[2];
      
      if (!deploymentAttendees.has(messageId)) {
        deploymentAttendees.set(messageId, new Set());
      }
      
      const attendees = deploymentAttendees.get(messageId);
      
      if (attendees.has(interaction.user.id)) {
        const removeButton = new ButtonBuilder()
          .setCustomId(`deployment_remove_${messageId}`)
          .setLabel('Remove Attendance')
          .setStyle(ButtonStyle.Danger);
        
        const removeRow = new ActionRowBuilder()
          .addComponents(removeButton);
        
        await interaction.reply({
          content: "You've already marked yourself as attending to this deployment, would you like to remove your attendance?",
          components: [removeRow],
          flags: MessageFlags.Ephemeral
        });
      } else {
        attendees.add(interaction.user.id);
        await interaction.reply({
          content: 'You have been marked as attending this deployment!',
          flags: MessageFlags.Ephemeral
        });
      }
      return;
    }
    
    if (interaction.customId.startsWith('deployment_view_')) {
      const messageId = interaction.customId.split('_')[2];
      
      if (!deploymentAttendees.has(messageId) || deploymentAttendees.get(messageId).size === 0) {
        await interaction.reply({
          content: 'No operators have marked themselves as attending yet.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }
      
      const attendees = deploymentAttendees.get(messageId);
      const attendeesList = Array.from(attendees).map(id => `<@${id}>`).join('\n');
      
      const embed = new EmbedBuilder()
        .setTitle('Operators Attending:')
        .setDescription(attendeesList)
        .setColor('#0C588A')
        .setFooter({ text: 'APD Management' })
        .setTimestamp();
      
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    
    if (interaction.customId.startsWith('deployment_remove_')) {
      const messageId = interaction.customId.split('_')[2];
      
      if (deploymentAttendees.has(messageId)) {
        const attendees = deploymentAttendees.get(messageId);
        attendees.delete(interaction.user.id);
        
        await interaction.update({
          content: 'Your attendance has been removed.',
          components: [],
          flags: MessageFlags.Ephemeral
        });
      }
      return;
    }
  }
};
