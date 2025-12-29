const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { loadLogs, saveLogs, generateWarrantID } = require('../utils/database');
const config = require('../utils/config');

let warrantCounter = 0;

// Initialize counter
const logs = loadLogs();
warrantCounter = logs.warrants.length;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log-warrant')
    .setDescription('Log a warrant')
    .setDefaultMemberPermissions(null)
    .addStringOption(opt => opt.setName('user').setDescription('Name of person warrant issued for').setRequired(true))
    .addStringOption(opt => opt.setName('charges').setDescription('Warrant charges').setRequired(true)),

  async execute(interaction) {
    if (!interaction.member.roles.cache.some(r => r.id === config.logWarrantRoleId)) {
      return interaction.reply({ content: 'You do not have permission to log warrants.', flags: MessageFlags.Ephemeral });
    }

    const username = interaction.options.getString('user');
    const charges = interaction.options.getString('charges');
    
    warrantCounter++;
    const warrantId = generateWarrantID(warrantCounter);

    const embed = new EmbedBuilder()
      .setTitle('New Warrant')
      .setDescription(`**ID:** ${warrantId}\n**Suspect:** ${username}\n**Charges:** ${charges}`)
      .setColor('#0C588A')
      .setThumbnail('https://images-ext-1.discordapp.net/external/xt1CuOBOZ4m5QYMHzGi-ERzaeC5dIJveECS88WPKGkQ/%3Fsize%3D512/https/cdn.discordapp.com/icons/1412324928333807689/a8773509f9faa0ad052e60af2a92faea.png?format=webp&quality=lossless')
      .setImage('https://media.discordapp.net/attachments/1413339969174503446/1428979456512626788/IMG_1627.png?ex=690a3913&is=6908e793&hm=e46b5dec3ed3e7b307983f552dc42c4188619090d98449ee280d08d159eb4891&=&format=webp&quality=lossless')
      .setFooter({ text: `Executed by ${interaction.user.tag}` })
      .setTimestamp();

    const completedButton = new ButtonBuilder()
      .setCustomId(`warrant_completed_${warrantId}`)
      .setLabel('Completed')
      .setStyle(ButtonStyle.Success);

    const removeButton = new ButtonBuilder()
      .setCustomId(`warrant_remove_${warrantId}`)
      .setLabel('Remove')
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder()
      .addComponents(completedButton, removeButton);

    const warrantChannel = await interaction.client.channels.fetch(config.channels.warrants);
    const warrantAnnounceChannel = await interaction.client.channels.fetch(config.channels.warrantAnnounce);

    if (warrantChannel) {
      await warrantChannel.send({ embeds: [embed], components: [buttonRow] });
    }

    if (warrantAnnounceChannel) {
      await warrantAnnounceChannel.send({ embeds: [embed], components: [buttonRow] });
    }

    if (warrantChannel || warrantAnnounceChannel) {
      const logs = loadLogs();
      logs.warrants.push({
        id: warrantId,
        username,
        charges,
        moderator: interaction.user.id,
        timestamp: new Date().toISOString()
      });
      saveLogs(logs);
      await interaction.reply({ content: `Warrant logged successfully for ${username}.`, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: 'Failed to log warrant: channels not found.', flags: MessageFlags.Ephemeral });
    }
  }
};
