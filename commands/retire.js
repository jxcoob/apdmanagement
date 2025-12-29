const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { loadRetiredUsers, saveRetiredUsers } = require('../utils/database');
const config = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('retire')
    .setDescription('Retire a user from their position')
    .setDefaultMemberPermissions(null)
    .addUserOption(opt => opt.setName('user').setDescription('User to retire').setRequired(true)),

  async execute(interaction) {
    if (!interaction.member.roles.cache.some(r => config.retireReinstate_allowedRoles.includes(r.id))) {
      return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetUser = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(targetUser.id);

    const userRoles = member.roles.cache
      .filter(role => config.retireReinstate_rolesToManage.includes(role.id))
      .map(role => role.id);

    const retiredUsers = loadRetiredUsers();
    retiredUsers.set(targetUser.id, userRoles);
    saveRetiredUsers(retiredUsers);

    for (const roleId of userRoles) {
      await member.roles.remove(roleId);
    }

    const embed = new EmbedBuilder()
      .setTitle('User Retired')
      .setColor('#0C588A')
      .addFields(
        { name: 'User', value: `${targetUser}`, inline: true },
        { name: 'Retired By', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Roles Removed', value: `${userRoles.length}`, inline: true }
      )
      .setFooter({ text: 'APD Management' })
      .setTimestamp();

    const logChannel = await interaction.client.channels.fetch(config.channels.retirements);
    if (logChannel) await logChannel.send({ embeds: [embed] });

    await interaction.editReply({ content: `Successfully retired ${targetUser}.` });
  }
};
