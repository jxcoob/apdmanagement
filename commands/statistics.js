const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { loadLogs } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('statistics')
    .setDescription('View statistics on logs issued')
    .setDefaultMemberPermissions(null),

  async execute(interaction) {
    if (!interaction.member.roles.cache.some(r => r.id === '1376058141128790076')) {
      return interaction.reply({ content: 'You do not have permission to view statistics.', flags: MessageFlags.Ephemeral });
    }

    const logs = loadLogs();
    const userCitations = logs.citations.filter(c => c.moderator === interaction.user.id);
    const userArrests = logs.arrests.filter(a => a.moderator === interaction.user.id);
    const userWarrants = logs.warrants.filter(w => w.moderator === interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle('Your Statistics')
      .setColor('#0C588A')
      .addFields(
        { name: 'Citations Issued', value: `${userCitations.length}`, inline: true },
        { name: 'Arrests Issued', value: `${userArrests.length}`, inline: true },
        { name: 'Warrants Issued', value: `${userWarrants.length}`, inline: true }
      )
      .setImage('https://media.discordapp.net/attachments/1413339969174503446/1428979456512626788/IMG_1627.png?ex=690a3913&is=6908e793&hm=e46b5dec3ed3e7b307983f552dc42c4188619090d98449ee280d08d159eb4891&=&format=webp&quality=lossless')
      .setFooter({ text: 'APD Management' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
