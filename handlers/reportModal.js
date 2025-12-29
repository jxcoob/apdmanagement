const { EmbedBuilder, MessageFlags } = require('discord.js');
const { loadLogs, saveLogs, generateReportID } = require('../utils/database');
const config = require('../utils/config');

let reportCounter = 0;

// Initialize counter
const logs = loadLogs();
reportCounter = logs.reports.length;

module.exports = {
  async handle(interaction) {
    const sceneLocation = interaction.fields.getTextInputValue('scene_location');
    const callsign = interaction.fields.getTextInputValue('callsign');
    const description = interaction.fields.getTextInputValue('description');
    const outcome = interaction.fields.getTextInputValue('outcome');
    
    reportCounter++;
    const reportId = generateReportID(reportCounter);

    const embed = new EmbedBuilder()
      .setTitle('Incident Report')
      .setDescription(`**ID:** ${reportId}`)
      .setColor('#0C588A')
      .addFields(
        { name: 'Scene Location', value: sceneLocation, inline: false },
        { name: 'Callsign / Roleplay Name', value: callsign, inline: false },
        { name: 'Description', value: description, inline: false },
        { name: 'Outcome', value: outcome, inline: false },
        { name: 'Submitted By', value: `${interaction.user.tag}`, inline: false }
      )
      .setImage('https://media.discordapp.net/attachments/1413339969174503446/1428979456512626788/IMG_1627.png?ex=690a3913&is=6908e793&hm=e46b5dec3ed3e7b307983f552dc42c4188619090d98449ee280d08d159eb4891&=&format=webp&quality=lossless')
      .setFooter({ text: 'APD Management' })
      .setTimestamp();

    const reportChannel = await interaction.client.channels.fetch(config.channels.reports);

    if (reportChannel) {
      await reportChannel.send({ embeds: [embed] });
      const logs = loadLogs();
      logs.reports.push({
        id: reportId,
        sceneLocation,
        callsign,
        description,
        outcome,
        moderator: interaction.user.id,
        timestamp: new Date().toISOString()
      });
      saveLogs(logs);
      await interaction.reply({ content: 'Incident report submitted successfully.', flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: 'Failed to submit report: channel not found.', flags: MessageFlags.Ephemeral });
    }
  }
};
