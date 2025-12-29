const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { loadRetiredUsers, saveRetiredUsers } = require('../utils/database');
const config = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reinstate')
    .setDescription('Reinstate a retired user')
    .setDefaultMemberPermissions(null)
    .addUserOption(opt => opt.setName('user').setDescription('User to reinstate').setRequired(true)),

  async execute(interaction) {
    if (!interaction.member.roles.cache.some(r => config.retireReinstate_allowedRoles.includes(r.id))) {
      return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const targetUser = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(targetUser.id);

    const retiredUsers = loadRetiredUsers();

    if (!retiredUsers.has(targetUser.id)) {
      return interaction.editReply({ content: `${targetUser.tag} is not in the retired users list.` });
    }

    const userRoles = retiredUsers.get(targetUser.id);

    for (const roleId of userRoles) {
      await member.roles.add(roleId);
    }

    retiredUsers.delete(targetUser.id);
    saveRetiredUsers(retiredUsers);

    const embed = new EmbedBuilder()
      .setTitle('User Reinstated')
      .setColor('#0C588A')
      .addFields(
        { name: 'User', value: `${targetUser}`, inline: true },
        { name: 'Reinstated By', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Roles Restored', value: `${userRoles.length}`, inline: true }
      )
      .setFooter({ text: 'APD Management' })
      .setTimestamp();

    const logChannel = await interaction.client.channels.fetch(config.channels.retirements);
    if (logChannel) await logChannel.send({ embeds: [embed] });

    await interaction.editReply({ content: `${targetUser.tag} has been successfully reinstated.` });
  }
};
