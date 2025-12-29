const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { loadPermissions, savePermissions, loadCounter, saveCounter } = require('../utils/database');
const config = require('../utils/config');

let specialPermissionCounter = loadCounter();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('special-permission-log')
    .setDescription('Grant a special permission to a user')
    .setDefaultMemberPermissions(null)
    .addUserOption(opt => opt.setName('user').setDescription('User to grant permission to').setRequired(true))
    .addStringOption(opt => opt.setName('permission').setDescription('Permission type').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for permission').setRequired(true)),

  async execute(interaction) {
    const allowedRoles = ['1376056345291128872'];
    
    if (!interaction.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    const targetUser = interaction.options.getUser('user');
    const permission = interaction.options.getString('permission');
    const reason = interaction.options.getString('reason');

    specialPermissionCounter++;
    const permissionId = `#${String(specialPermissionCounter).padStart(3, '0')}`;

    const specialPermissions = loadPermissions();
    specialPermissions[permissionId] = {
      userId: targetUser.id,
      permission: permission,
      reason: reason,
      grantedBy: interaction.user.id,
      timestamp: new Date().toISOString()
    };

    saveCounter(specialPermissionCounter);
    savePermissions(specialPermissions);

    const embed = new EmbedBuilder()
      .setTitle('Special Permission Granted')
      .setColor('#0C588A')
      .addFields(
        { name: 'Permission ID', value: permissionId, inline: true },
        { name: 'User', value: `${targetUser}`, inline: true },
        { name: 'Granted By', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Permission', value: permission },
        { name: 'Reason', value: reason }
      )
      .setFooter({ text: 'APD Management' })
      .setTimestamp();

    try {
      await targetUser.send({ embeds: [embed] });
    } catch { }

    const specialPermChannel = await interaction.client.channels.fetch(config.channels.specialPermissions);
    if (specialPermChannel) await specialPermChannel.send({ embeds: [embed] });

    await interaction.reply({ content: `Special permission ${permissionId} successfully logged and granted to ${targetUser.tag}.`, flags: MessageFlags.Ephemeral });
  }
};
