const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { loadLogs, saveLogs, generateCitationID } = require('../utils/database');
const config = require('../utils/config');

let citationCounter = 0;

// Initialize counter
const logs = loadLogs();
citationCounter = logs.citations.length;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log-citation')
    .setDescription('Log a citation')
    .setDefaultMemberPermissions(null)
    .addStringOption(opt => opt.setName('username').setDescription('Name of person cited').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for citation').setRequired(true))
    .addStringOption(opt => opt.setName('fine').setDescription('Fine amount').setRequired(true)),

  async execute(interaction) {
    if (!interaction.member.roles.cache.some(r => r.id === config.logCitationRoleId)) {
      return interaction.reply({ content: 'You do not have permission to log citations.', flags: MessageFlags.Ephemeral });
    }

    const username = interaction.options.getString('username');
    const reason = interaction.options.getString('reason');
    const fine = interaction.options.getString('fine');
    
    citationCounter++;
    const citationId = generateCitationID(citationCounter);

    const embed = new EmbedBuilder()
      .setTitle('Citation Log')
      .setDescription(`**ID:** ${citationId}\n**Suspect:** ${username}\n**Reason(s):** ${reason}\n**Fine:** ${fine}`)
      .setColor('#0C588A')
      .setThumbnail('https://images-ext-1.discordapp.net/external/xt1CuOBOZ4m5QYMHzGi-ERzaeC5dIJveECS88WPKGkQ/%3Fsize%3D512/https/cdn.discordapp.com/icons/1412324928333807689/a8773509f9faa0ad052e60af2a92faea.png?format=webp&quality=lossless')
      .setImage('https://media.discordapp.net/attachments/1413339969174503446/1428979456512626788/IMG_1627.png?ex=690a3913&is=6908e793&hm=e46b5dec3ed3e7b307983f552dc42c4188619090d98449ee280d08d159eb4891&=&format=webp&quality=lossless')
      .setFooter({ text: `Executed by ${interaction.user.tag}` })
      .setTimestamp();

    const citationChannel = await interaction.client.channels.fetch(config.channels.citations);

    if (citationChannel) {
      await citationChannel.send({ embeds: [embed] });
      const logs = loadLogs();
      logs.citations.push({
        id: citationId,
        username,
        reason,
        fine,
        moderator: interaction.user.id,
        timestamp: new Date().toISOString()
      });
      saveLogs(logs);
      await interaction.reply({ content: `Citation logged successfully for ${username}.`, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: 'Failed to log citation: channel not found.', flags: MessageFlags.Ephemeral });
    }
  }
};
