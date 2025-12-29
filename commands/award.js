const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('award')
    .setDescription('Award a user with a departmental award')
    .setDefaultMemberPermissions(null)
    .addUserOption(opt => opt.setName('user').setDescription('User to award').setRequired(true))
    .addStringOption(opt => opt.setName('type').setDescription('Type of award').setRequired(true)
      .addChoices(
        { name: 'Medal of Valor', value: 'Medal of Valor' },
        { name: 'Medal of Honor', value: 'Medal of Honor' },
        { name: 'Purple Heart Medal', value: 'Purple Heart Medal' },
        { name: 'Distinguished Service', value: 'Distinguished Service' },
        { name: 'Chiefs Recognition', value: 'Chiefs Recognition' },
        { name: 'Officer of the Week', value: 'Officer of the Week' }
      )
    ),

  async execute(interaction) {
    const allowedAwardRoles = ['1376056345291128872', '1376057126446698506'];
    
    if (!interaction.member.roles.cache.some(r => allowedAwardRoles.includes(r.id))) {
      return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    const targetUser = interaction.options.getUser('user');
    const awardType = interaction.options.getString('type');

    const embed = new EmbedBuilder()
      .setTitle('Apex Police Department Awards')
      .setDescription(`**Award:** ${awardType}\n\n**Awarded to:** ${targetUser}\n\n<:line:1413368368848830656><:line:1413368368848830656><:line:1413368368848830656><:line:1413368368848830656><:line:1413368368848830656><:line:1413368368848830656><:line:1413368368848830656><:line:1413368368848830656><:line:1413368368848830656><:line:1413368368848830656><:line:1413368368848830656><:line:1413368368848830656><:line:1413368368848830656><:line:1413368368848830656><:line:1413368368848830656><:line:1413368368848830656>\n\nCongratulations on your award you earned! We are proud and pleased with your work and dedication to the department. We hope to see much more in the future!🎖️`)
      .setColor('#0C588A')
      .setImage('https://media.discordapp.net/attachments/1413339969174503446/1428979456512626788/IMG_1627.png?ex=690a3913&is=6908e793&hm=e46b5dec3ed3e7b307983f552dc42c4188619090d08449ee280d08d159eb4891&=&format=webp&quality=lossless')
      .setThumbnail('https://media.discordapp.net/attachments/1435105704422936687/1435105729345228873/medal_png_2.png?ex=690ac1dc&is=6909705c&hm=c231e41a3f02c95bb2cda254bbd106479f87f26f22794f7d59a9e8721e2d9952&=&format=webp&quality=lossless')
      .setFooter({ text: `Issued by: ${interaction.user.tag}` })
      .setTimestamp();

    const awardChannel = await interaction.client.channels.fetch(config.channels.awards);

    if (!awardChannel) {
      return interaction.reply({ content: 'Award channel not found.', flags: MessageFlags.Ephemeral });
    }

    await awardChannel.send({
      content: `${targetUser}`,
      embeds: [embed]
    });

    await interaction.reply({ content: `Successfully awarded ${targetUser.tag} with ${awardType}!`, flags: MessageFlags.Ephemeral });
  }
};
