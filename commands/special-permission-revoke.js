const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { loadPermissions, savePermissions } = require('../utils/database');
const config = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('special-permission-revoke')
    .setDescription('Revoke a special permission')
    .setDefaultMemberPermissions(null)
    .addStringOption(opt => opt.setName('id').setDescription('Permission ID to revoke').setRequired(true)),

  async execute(interaction) {
    const allowedRoles = ['1376056345291128872'];
    
    if (!interaction.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    const permissionId = interaction.options.getString('id').toUpperCase();
    const specialPermissions = loadPermissions();

    if (!specialPermissions[permissionId]) {
      return interaction.reply({ content: `No special permission found with ID ${permissionId}.`, flags: MessageFlags.Ephemeral });
    }

    const permission = specialPermissions[permissionId];
    const user = await interaction.client.users.fetch(permission.userId);

    delete specialPermissions[permissionId];
    savePermissions(specialPermissions);

    const embed = new EmbedBuilder()
      .setTitle('Special Permission Revoked')
      .setColor('#0C588A')
      .addFields(
        { name: 'Permission ID', value: permissionId, inline: true },
        { name: 'User', value: `${user}`, inline: true },
        { name: 'Revoked By', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Original Permission', value: permission.permission }
      )
      .setFooter({ text: 'APD Management' })
      .setTimestamp();

    try {
      await user.send({ embeds: [embed] });
    } catch { }

    const specialPermChannel = await interaction.client.channels.fetch(config.channels.specialPermissions);
    if (specialPermChannel) await specialPermChannel.send({ embeds: [embed] });

    await interaction.reply({ content: `Special permission ${permissionId} revoked.`, flags: MessageFlags.Ephemeral });
  }
};
