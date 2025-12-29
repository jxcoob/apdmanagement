const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../utils/config');

module.exports = {
  async handle(interaction) {
    if (!interaction.customId.startsWith('warrant_completed_') && !interaction.customId.startsWith('warrant_remove_')) {
      return;
    }

    const isCompleted = interaction.customId.startsWith('warrant_completed_');
    const warrantId = interaction.customId.split('_')[2];
    const completedUser = interaction.user.tag;
    const removedUser = interaction.user.tag;

    const embed = interaction.message.embeds[0];

    const warrantChannelId = config.channels.warrants;
    const warrantAnnounceChannelId = config.channels.warrantAnnounce;

    const currentChannelId = interaction.channel.id;
    const otherChannelId = currentChannelId === warrantChannelId ? warrantAnnounceChannelId : warrantChannelId;

    if (isCompleted) {
      const updatedEmbed = new EmbedBuilder(embed.data)
        .setColor('#2ECC71');

      const completedButton = new ButtonBuilder()
        .setCustomId(`warrant_completed_${warrantId}`)
        .setLabel(`Completed by ${completedUser}`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(true);

      const buttonRow = new ActionRowBuilder()
        .addComponents(completedButton);

      await interaction.update({ embeds: [updatedEmbed], components: [buttonRow] });

      try {
        const otherChannel = await interaction.client.channels.fetch(otherChannelId);
        if (otherChannel) {
          const messages = await otherChannel.messages.fetch({ limit: 100 });
          const targetMessage = messages.find(msg =>
            msg.embeds.length > 0 &&
            msg.embeds[0].data.description &&
            msg.embeds[0].data.description.includes(warrantId)
          );

          if (targetMessage) {
            await targetMessage.edit({ embeds: [updatedEmbed], components: [buttonRow] });
          }
        }
      } catch (err) {
        console.error('Error updating other channel:', err);
      }
    } else {
      const updatedEmbed = new EmbedBuilder(embed.data)
        .setColor('#0C588A');

      const removeButton = new ButtonBuilder()
        .setCustomId(`warrant_remove_${warrantId}`)
        .setLabel(`Warrant Removed by ${removedUser}`)
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true);

      const buttonRow = new ActionRowBuilder()
        .addComponents(removeButton);

      await interaction.update({ embeds: [updatedEmbed], components: [buttonRow] });

      try {
        const otherChannel = await interaction.client.channels.fetch(otherChannelId);
        if (otherChannel) {
          const messages = await otherChannel.messages.fetch({ limit: 100 });
          const targetMessage = messages.find(msg =>
            msg.embeds.length > 0 &&
            msg.embeds[0].data.description &&
            msg.embeds[0].data.description.includes(warrantId)
          );

          if (targetMessage) {
            await targetMessage.edit({ embeds: [updatedEmbed], components: [buttonRow] });
          }
        }
      } catch (err) {
        console.error('Error updating other channel:', err);
      }
    }
  }
};
