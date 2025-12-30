const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { loadDB, saveDB, generateID } = require('../utils/database');
const config = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('infraction')
    .setDescription('Manage infractions for users')
    .setDefaultMemberPermissions(null)
    .addSubcommand(sub =>
      sub.setName('execute')
        .setDescription('Issue an infraction to a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to issue infraction to').setRequired(true))
        .addStringOption(opt => opt.setName('type').setDescription('Type of infraction').setRequired(true)
          .addChoices(
            { name: 'Activity Notice', value: 'Activity Notice' },
            { name: 'Verbal Warning', value: 'Verbal Warning' },
            { name: 'Warning', value: 'Warning' },
            { name: 'Strike', value: 'Strike' },
            { name: 'Termination', value: 'Termination' }
          )
        )
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for infraction').setRequired(true))
        .addStringOption(opt => opt.setName('division').setDescription('Division (optional)').setRequired(false)
          .addChoices(
            { name: 'Patrol', value: 'Patrol' },
            { name: 'SWAT', value: 'SWAT' },
            { name: 'CID', value: 'CID' },
            { name: 'Training', value: 'Training' }
          )
        )
        .addAttachmentOption(opt => opt.setName('evidence').setDescription('Evidence file').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('revoke')
        .setDescription('Revoke an infraction')
        .addStringOption(opt => opt.setName('id').setDescription('Infraction ID').setRequired(true))
        .addUserOption(opt => opt.setName('user').setDescription('User to revoke infraction from').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all active infractions for a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('wipe')
        .setDescription('Remove all infractions for a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to wipe infractions for').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const db = loadDB();

    // Permission checks
    if (sub === 'execute' || sub === 'revoke' || sub === 'list') {
      const allowedRoles = ['1376056345291128872', '1376057126446698506', '1376057625015353485'];
      if (!interaction.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
        return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
      }
    }

    if (sub === 'wipe') {
      const allowedRoles = ['1376056345291128872'];
      if (!interaction.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
        return interaction.reply({ content: 'You do not have permission to wipe infractions.', flags: MessageFlags.Ephemeral });
      }
    }

    if (sub === 'execute') {
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      const type = interaction.options.getString('type');
      const division = interaction.options.getString('division');
      const evidence = interaction.options.getAttachment('evidence');

      const infractionId = generateID(db);
      const newInfraction = {
        id: infractionId,
        userId: targetUser.id,
        type,
        reason,
        division: division || null,
        evidence: evidence ? evidence.url : null,
        moderator: interaction.user.id,
        timestamp: new Date().toISOString(),
        revoked: false
      };

      db.infractions.push(newInfraction);
      saveDB(db);

      const dmEmbed = new EmbedBuilder()
        .setTitle('Infraction Issued')
        .setColor('#0C588A')
        .setThumbnail('https://images-ext-1.discordapp.net/external/-DJxTwQM1mhMeUDsepuwxHvGsuPFUL9f0AtZt8b5aK8/%3Fsize%3D512/https/cdn.discordapp.com/icons/1373422521809899542/7581a113166ac66d6f08c66fa008fbcc.png?format=webp&quality=lossless')
        .setImage('https://media.discordapp.net/attachments/1413339969174503446/1449385795893985480/IMG_1627.png?ex=69415836&is=694006b6&hm=1011af88190e4774299271f59edbd5807d7306ce20ecaa3cb533f5009afbec6a&=&format=webp&quality=lossless')
        .addFields(
          { name: 'Type', value: type, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Infraction ID', value: infractionId, inline: true }
        )
        .setFooter({ text: 'APD Management' })
        .setTimestamp();

      try { await targetUser.send({ embeds: [dmEmbed] }); } catch { }

      const logEmbed = new EmbedBuilder()
        .setTitle('Infraction Log')
        .setColor('#0C588A')
        .setThumbnail('https://images-ext-1.discordapp.net/external/-DJxTwQM1mhMeUDsepuwxHvGsuPFUL9f0AtZt8b5aK8/%3Fsize%3D512/https/cdn.discordapp.com/icons/1373422521809899542/7581a113166ac66d6f08c66fa008fbcc.png?format=webp&quality=lossless')
        .setImage('https://media.discordapp.net/attachments/1413339969174503446/1449385795893985480/IMG_1627.png?ex=69415836&is=694006b6&hm=1011af88190e4774299271f59edbd5807d7306ce20ecaa3cb533f5009afbec6a&=&format=webp&quality=lossless')
        .addFields(
          { name: 'User', value: `${targetUser}`, inline: true },
          { name: 'Type', value: type, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Issued by:', value: `${interaction.user.tag}`, inline: true },
          { name: 'Infraction ID', value: infractionId, inline: true }
        )
        .setFooter({ text: 'APD Management' })
        .setTimestamp();

      if (division) logEmbed.addFields({ name: 'Division', value: division, inline: true });
      if (evidence) logEmbed.addFields({ name: 'Evidence', value: `[View Attachment](${evidence.url})` });

      const logChannel = await interaction.client.channels.fetch(config.channels.infractions);
      if (logChannel) await logChannel.send({ content: `${targetUser}`, embeds: [logEmbed] });

      await interaction.reply({ content: `Infraction ${infractionId} issued to ${targetUser.tag}.`, flags: MessageFlags.Ephemeral });
    }

    else if (sub === 'revoke') {
      const id = interaction.options.getString('id');
      const targetUser = interaction.options.getUser('user');

      const infraction = db.infractions.find(i => i.id === id && i.userId === targetUser.id);
      if (!infraction) return interaction.reply({ content: `No infraction found with ID ${id} for ${targetUser.tag}.`, flags: MessageFlags.Ephemeral });

      infraction.revoked = true;
      infraction.revokedBy = interaction.user.id;
      infraction.revokedAt = new Date().toISOString();
      saveDB(db);

      const revokeEmbed = new EmbedBuilder()
        .setTitle('Infraction Revoked')
        .setColor('#0C588A')
        .setThumbnail('https://images-ext-1.discordapp.net/external/-DJxTwQM1mhMeUDsepuwxHvGsuPFUL9f0AtZt8b5aK8/%3Fsize%3D512/https/cdn.discordapp.com/icons/1373422521809899542/7581a113166ac66d6f08c66fa008fbcc.png?format=webp&quality=lossless')
        .setImage('https://media.discordapp.net/attachments/1413339969174503446/1449385795893985480/IMG_1627.png?ex=69415836&is=694006b6&hm=1011af88190e4774299271f59edbd5807d7306ce20ecaa3cb533f5009afbec6a&=&format=webp&quality=lossless')
        .addFields(
          { name: 'User', value: `<@${infraction.userId}>` },
          { name: 'Original Type', value: infraction.type },
          { name: 'Reason', value: infraction.reason },
          { name: 'Revoked By', value: `<@${interaction.user.id}>` },
          { name: 'Infraction ID', value: infraction.id }
        )
        .setFooter({ text: 'APD Management' })
        .setTimestamp();

      try { await targetUser.send({ embeds: [revokeEmbed] }); } catch { }

      const logChannel = await interaction.client.channels.fetch(config.channels.infractions);
      if (logChannel) await logChannel.send({ embeds: [revokeEmbed] });

      await interaction.reply({ content: `Infraction ${id} revoked for ${targetUser.tag}.`, flags: MessageFlags.Ephemeral });
    }

    else if (sub === 'list') {
      const targetUser = interaction.options.getUser('user');
      const userInfractions = db.infractions.filter(i => i.userId === targetUser.id && !i.revoked);

      if (userInfractions.length === 0) {
        return interaction.reply({ content: `${targetUser.tag} has no active infractions.`, flags: MessageFlags.Ephemeral });
      }

      const embed = new EmbedBuilder()
        .setTitle(`Active Infractions for ${targetUser.tag}`)
        .setColor('#0C588A')
        .setThumbnail('https://images-ext-1.discordapp.net/external/-DJxTwQM1mhMeUDsepuwxHvGsuPFUL9f0AtZt8b5aK8/%3Fsize%3D512/https/cdn.discordapp.com/icons/1373422521809899542/7581a113166ac66d6f08c66fa008fbcc.png?format=webp&quality=lossless')
        .setImage('https://media.discordapp.net/attachments/1413339969174503446/1449385795893985480/IMG_1627.png?ex=69415836&is=694006b6&hm=1011af88190e4774299271f59edbd5807d7306ce20ecaa3cb533f5009afbec6a&=&format=webp&quality=lossless')
        .setFooter({ text: 'APD Management' })
        .setTimestamp();

      for (const inf of userInfractions) {
        embed.addFields({
          name: `${inf.id} — ${inf.type}`,
          value: `**Reason:** ${inf.reason}\n**Division:** ${inf.division || 'N/A'}\n**Moderator:** <@${inf.moderator}>\n**Date:** <t:${Math.floor(new Date(inf.timestamp).getTime() / 1000)}:f>\n${inf.evidence ? `[Evidence](${inf.evidence})` : ''}`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    else if (sub === 'wipe') {
      const targetUser = interaction.options.getUser('user');
      const userInfractions = db.infractions.filter(i => i.userId === targetUser.id);

      if (userInfractions.length === 0) {
        return interaction.reply({ content: `${targetUser.tag} has no infractions to wipe.`, flags: MessageFlags.Ephemeral });
      }

      const infractionCount = userInfractions.length;
      db.infractions = db.infractions.filter(i => i.userId !== targetUser.id);
      saveDB(db);

      const wipeEmbed = new EmbedBuilder()
        .setTitle('Infractions Wiped')
        .setColor('#0C588A')
        .setImage('https://media.discordapp.net/attachments/1413339969174503446/1449385795893985480/IMG_1627.png?ex=69415836&is=694006b6&hm=1011af88190e4774299271f59edbd5807d7306ce20ecaa3cb533f5009afbec6a&=&format=webp&quality=lossless')
        .addFields(
          { name: 'User', value: `${targetUser}`, inline: true },
          { name: 'Infractions Removed', value: `${infractionCount}`, inline: true },
          { name: 'Wiped By', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setFooter({ text: 'APD Management' })
        .setTimestamp();

      try {
        await targetUser.send({
          embeds: [new EmbedBuilder()
            .setTitle('Your Infractions Have Been Wiped')
            .setColor('#0C588A')
            .setImage('https://media.discordapp.net/attachments/1413339969174503446/1449385795893985480/IMG_1627.png?ex=69415836&is=694006b6&hm=1011af88190e4774299271f59edbd5807d7306ce20ecaa3cb533f5009afbec6a&=&format=webp&quality=lossless')
            .setDescription(`All of your infractions (${infractionCount}) have been removed from the system.`)
            .setFooter({ text: 'APD Management' })
            .setTimestamp()]
        });
      } catch { }

      const logChannel = await interaction.client.channels.fetch(config.channels.infractions);
      if (logChannel) await logChannel.send({ embeds: [wipeEmbed] });

      await interaction.reply({ content: `Wiped all ${infractionCount} infraction(s) for ${targetUser.tag}.`, flags: MessageFlags.Ephemeral });
    }
  }
};
