const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('massshift')
    .setDescription('Manage mass shift events')
    .setDefaultMemberPermissions(null)
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Start a mass shift event')
        .addUserOption(opt => opt.setName('watch-commander').setDescription('Watch Commander').setRequired(true))
        .addStringOption(opt => opt.setName('supervisors').setDescription('Supervisor(s)').setRequired(true))
        .addUserOption(opt => opt.setName('assistant-watch-commander').setDescription('Assistant Watch Commander').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('end')
        .setDescription('End the current mass shift event')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const massshiftAllowedRoles = ['1376057126446698506', '1376056345291128872'];

    if (!interaction.member.roles.cache.some(r => massshiftAllowedRoles.includes(r.id))) {
      return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    if (sub === 'start') {
      const watchCommander = interaction.options.getUser('watch-commander');
      const assistantWC = interaction.options.getUser('assistant-watch-commander');
      const supervisorsInput = interaction.options.getString('supervisors');

      const embed = new EmbedBuilder()
        .setTitle('Apex Police Department Mass Shift')
        .setDescription(`<@&1376058141128790076>\n\nA mass shift has now commenced, all officers are encouraged to attend and assist with patrol duties. Please ensure you are in proper uniform and have all necessary equipment. Your dedication to serving the community is greatly appreciated!`)
        .setColor('#0C588A')
        .addFields(
          { name: 'Watch Commander', value: `${watchCommander}`, inline: false },
          ...(assistantWC ? [{ name: 'Assistant Watch Commander', value: `${assistantWC}`, inline: false }] : []),
          { name: 'Supervisor(s)', value: supervisorsInput, inline: false }
        )
        .setImage('https://media.discordapp.net/attachments/1413339969174503446/1428979456512626788/IMG_1627.png?ex=690a3913&is=6908e793&hm=e46b5dec3ed3e7b307983f552dc42c4188619090d98449ee280d08d159eb4891&=&format=webp&quality=lossless')
        .setTimestamp();

      const massShiftChannel = await interaction.client.channels.fetch(config.channels.massShift);
      
      if (!massShiftChannel) {
        return interaction.reply({ content: 'Mass shift channel not found.', flags: MessageFlags.Ephemeral });
      }

      await massShiftChannel.send({
        content: '<@&1376058141128790076>',
        embeds: [embed],
        allowedMentions: { roles: ['1376058141128790076'] }
      });

      await interaction.reply({ content: `Mass shift successfully started with Watch Commander ${watchCommander.tag}.`, flags: MessageFlags.Ephemeral });
    }

    else if (sub === 'end') {
      const embed = new EmbedBuilder()
        .setTitle('Apex Police Department - End')
        .setDescription('The mass shift has now concluded. Thank you to all deputies who attending this mass shift, your hard work will not go unnoticed!')
        .setColor('#0C588A')
        .setImage('https://media.discordapp.net/attachments/1413339969174503446/1428979456512626788/IMG_1627.png?ex=690a3913&is=6908e793&hm=e46b5dec3ed3e7b307983f552dc42c4188619090d98449ee280d08d159eb4891&=&format=webp&quality=lossless')
        .setFooter({ text: `Concluded by ${interaction.user.tag}` })
        .setTimestamp();

      const massShiftEndChannel = await interaction.client.channels.fetch(config.channels.massShift);

      if (!massShiftEndChannel) {
        return interaction.reply({ content: 'Mass shift end channel not found.', flags: MessageFlags.Ephemeral });
      }

      await massShiftEndChannel.send({ embeds: [embed] });

      await interaction.reply({ content: 'Mass shift successfully concluded.', flags: MessageFlags.Ephemeral });
    }
  }
};
