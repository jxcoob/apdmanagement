const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleprobie')
    .setDescription('Promote a user to probationary officer')
    .setDefaultMemberPermissions(null)
    .addUserOption(opt => opt.setName('user').setDescription('User to promote').setRequired(true)),

  async execute(interaction) {
    const allowedRoles = ['1376056345291128872', '1376057126446698506'];
    
    if (!interaction.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetUser = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(targetUser.id);

    for (const roleId of config.rolesToRemove) {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
      }
    }

    for (const roleId of config.rolesToAdd) {
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('User Promoted to Probie')
      .setColor('#0C588A')
      .setImage('https://media.discordapp.net/attachments/1413339969174503446/1449385795893985480/IMG_1627.png?ex=694006b6&is=693eb536&hm=f726bdda1a4136a1f40e5db2a20697e66db904a6a5e785f51273e1f8f6492f50&=&format=webp&quality=lossless')
      .addFields(
        { name: 'User', value: `${targetUser}`, inline: true },
        { name: 'Promoted By', value: `<@${interaction.user.id}>`, inline: true }
      )
      .setFooter({ text: 'APD Management' })
      .setTimestamp();

    const logChannel = await interaction.client.channels.fetch(config.channels.promotions);
    if (logChannel) await logChannel.send({ embeds: [embed] });

    await interaction.editReply({ content: `${targetUser.tag} has been roled as a probationary officer.` });
  }
};
