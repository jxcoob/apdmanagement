const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const config = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log-report')
    .setDescription('Log an incident report')
    .setDefaultMemberPermissions(null),

  async execute(interaction) {
    if (!interaction.member.roles.cache.some(r => r.id === config.logReportRoleId)) {
      return interaction.reply({ content: 'You do not have permission to log reports.', flags: MessageFlags.Ephemeral });
    }

    const modal = new ModalBuilder()
      .setCustomId('report_modal')
      .setTitle('Incident Report');

    const sceneLocationInput = new TextInputBuilder()
      .setCustomId('scene_location')
      .setLabel('Scene Location')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const callsignInput = new TextInputBuilder()
      .setCustomId('callsign')
      .setLabel('Your Callsign / Roleplay Name')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Description')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const outcomeInput = new TextInputBuilder()
      .setCustomId('outcome')
      .setLabel('Outcome')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(sceneLocationInput),
      new ActionRowBuilder().addComponents(callsignInput),
      new ActionRowBuilder().addComponents(descriptionInput),
      new ActionRowBuilder().addComponents(outcomeInput)
    );

    await interaction.showModal(modal);
  }
};
