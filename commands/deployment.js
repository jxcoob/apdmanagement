const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../utils/config');
const { deploymentAttendees } = require('../handlers/deploymentButtons');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deployment')
    .setDescription('Manage SWAT deployments')
    .setDefaultMemberPermissions(null)
    .addSubcommand(sub =>
      sub.setName('vote')
        .setDescription('Initiate a SWAT deployment vote')
    )
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Start the SWAT deployment')
    )
    .addSubcommand(sub =>
      sub.setName('end')
        .setDescription('End the SWAT deployment')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const allowedDeploymentRoles = ['1376358556256960573', '1416610939364446279', '1376358615509762150'];

    if (!interaction.member.roles.cache.some(r => allowedDeploymentRoles.includes(r.id))) {
      return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    if (sub === 'vote') {
      const embed = new EmbedBuilder()
        .setTitle('<:check:1435486854928535632> SWAT Deployment - Vote')
        .setDescription(`> A SWAT Deployment vote has been initiated by ${interaction.user} Please mark yourself attending to join the upcoming deployment. In order for this deployment to start, it'll require at least 2+ operators attending.\n\n **If you mark yourself as attending, you are required to join the deployment.**`)
        .setColor('#0C588A')
        .setImage('https://media.discordapp.net/attachments/1413339969174503446/1428979456512626788/IMG_1627.png?ex=690a3913&is=6908e793&hm=e46b5dec3ed3e7b307983f552dc42c4188619090d08449ee280d08d159eb4891&=&format=webp&quality=lossless')
        .setTimestamp();

      const deploymentChannel = await interaction.client.channels.fetch(config.channels.deployment);

      if (!deploymentChannel) {
        return interaction.reply({ content: 'Deployment channel not found.', flags: MessageFlags.Ephemeral });
      }

      const attendButton = new ButtonBuilder()
        .setCustomId(`deployment_attend_PLACEHOLDER`)
        .setLabel('Attending')
        .setStyle(ButtonStyle.Success);

      const viewButton = new ButtonBuilder()
        .setCustomId(`deployment_view_PLACEHOLDER`)
        .setLabel('View Attendance')
        .setStyle(ButtonStyle.Secondary);

      const buttonRow = new ActionRowBuilder()
        .addComponents(attendButton, viewButton);

      const message = await deploymentChannel.send({
        content: '<@&1376359560658288640>',
        embeds: [embed],
        components: [buttonRow],
        allowedMentions: { roles: ['1376359560658288640'] }
      });

      const updatedAttendButton = new ButtonBuilder()
        .setCustomId(`deployment_attend_${message.id}`)
        .setLabel('Attending')
        .setStyle(ButtonStyle.Success);

      const updatedViewButton = new ButtonBuilder()
        .setCustomId(`deployment_view_${message.id}`)
        .setLabel('View Attendance')
        .setStyle(ButtonStyle.Secondary);

      const updatedButtonRow = new ActionRowBuilder()
        .addComponents(updatedAttendButton, updatedViewButton);

      await message.edit({ components: [updatedButtonRow] });

      deploymentAttendees.set(message.id, new Set());

      await interaction.reply({ content: 'Deployment vote initiated successfully!', flags: MessageFlags.Ephemeral });
    }

    else if (sub === 'start') {
      await interaction.reply({ content: 'Processing deployment start...', flags: MessageFlags.Ephemeral });

      let attendeesList = '';
      let latestMessageId = null;
      let latestTimestamp = 0;

      for (const [messageId, attendees] of deploymentAttendees.entries()) {
        const timestamp = Number((BigInt(messageId) >> 22n) + 1420070400000n);
        if (timestamp > latestTimestamp && attendees.size > 0) {
          latestTimestamp = timestamp;
          latestMessageId = messageId;
        }
      }

      if (latestMessageId && deploymentAttendees.get(latestMessageId).size > 0) {
        const attendees = deploymentAttendees.get(latestMessageId);
        attendeesList = Array.from(attendees).map(id => `<@${id}>`).join(' ');
      }

      const embed = new EmbedBuilder()
        .setTitle('<:arrow:1421672106902687804>SWAT Deployment - Start')
        .setDescription(`> A SWAT Deployment has now commenced by ${interaction.user} If you have marked yourself attending to the deployment vote, you are required to attend this deployment.\n\n > Please ensure you are in proper uniform and have all necessary equipment, then head your way down to the briefing room for assignments and deployment details.`)
        .setColor('#0C588A')
        .setImage('https://media.discordapp.net/attachments/1413339969174503446/1428979456512626788/IMG_1627.png?ex=690a3913&is=6908e793&hm=e46b5dec3ed3e7b307983f552dc42c4188619090d08449ee280d08d159eb4891&=&format=webp&quality=lossless')
        .setTimestamp();

      const deploymentChannel = await interaction.client.channels.fetch(config.channels.deployment);

      if (!deploymentChannel) {
        return interaction.editReply({ content: 'Deployment channel not found.' });
      }

      const mentionContent = attendeesList ? `<@&1376359560658288640> ${attendeesList}` : '<@&1376359560658288640>';

      await deploymentChannel.send({
        content: mentionContent,
        embeds: [embed],
        allowedMentions: { roles: ['1376359560658288640'], users: latestMessageId ? Array.from(deploymentAttendees.get(latestMessageId)) : [] }
      });

      deploymentAttendees.clear();

      await interaction.editReply({ content: 'Deployment started successfully!' });
    }

    else if (sub === 'end') {
      await interaction.reply({ content: 'Processing deployment end...', flags: MessageFlags.Ephemeral });

      const embed = new EmbedBuilder()
        .setTitle('<:x_:1435486937590009906> SWAT Deployment - Ended')
        .setDescription(`> The recent SWAT Deployment has now concluded by ${interaction.user}.\n\n > Thank you to all operators who have attended the deployment. If you missed this one, don't worry! You'll be able to attend the other deployments usually hosted every other day unless said otherwise by SWAT Command.`)
        .setColor('#0C588A')
        .setImage('https://media.discordapp.net/attachments/1413339969174503446/1428979456512626788/IMG_1627.png?ex=690a3913&is=6908e793&hm=e46b5dec3ed3e7b307983f552dc42c4188619090d08449ee280d08d159eb4891&=&format=webp&quality=lossless')
        .setFooter({ text: `Concluded by ${interaction.user.tag}` })
        .setTimestamp();

      const deploymentChannel = await interaction.client.channels.fetch(config.channels.deployment);

      if (!deploymentChannel) {
        return interaction.editReply({ content: 'Deployment channel not found.' });
      }

      await deploymentChannel.send({ embeds: [embed] });

      await interaction.editReply({ content: 'Deployment ended successfully!' });
    }
  }
};
