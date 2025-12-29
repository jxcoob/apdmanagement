const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { loadLogs, saveLogs, generateArrestID } = require('../utils/database');
const config = require('../utils/config');

let arrestCounter = 0;

// Initialize counter
const logs = loadLogs();
arrestCounter = logs.arrests.length;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log-arrest')
    .setDescription('Log an arrest')
    .setDefaultMemberPermissions(null)
    .addStringOption(opt => opt.setName('username').setDescription('Name of person arrested').setRequired(true))
    .addStringOption(opt => opt.setName('charges').setDescription('Charges').setRequired(true)),

  async execute(interaction) {
    if (!interaction.member.roles.cache.some(r => r.id === config.logArrestRoleId)) {
      return interaction.reply({ content: 'You do not have permission to log arrests.', flags: MessageFlags.Ephemeral });
    }

    const username = interaction.options.getString('username');
    const charges = interaction.options.getString('charges');
    
    arrestCounter++;
    const arrestId = generateArrestID(arrestCounter);

    const embed = new EmbedBuilder()
      .setTitle('Arrest Log')
      .setDescription(`**ID:** ${arrestId}\n**Suspect:** ${username}\n**Charges:** ${charges}`)
      .setColor('#0C588A')
      .setThumbnail('https://images-ext-1.discordapp.net/external/xt1CuOBOZ4m5QYMHzGi-ERzaeC5dIJveECS88WPKGkQ/%3Fsize%3D512/https/cdn.discordapp.com/icons/1412324928333807689/a8773509f9faa0ad052e60af2a92faea.png?format=webp&quality=lossless')
      .setImage('https://media.discordapp.net/attachments/1413339969174503446/1428979456512626788/IMG_1627.png?ex=690a3913&is=6908e793&hm=e46b5dec3ed3e7b307983f552dc42c4188619090d98449ee280d08d159eb4891&=&format=webp&quality=lossless')
      .setFooter({ text: `Executed by ${interaction.user.tag}` })
      .setTimestamp();

    const arrestChannel = await interaction.client.channels.fetch(config.channels.arrests);

    if (arrestChannel) {
      await arrestChannel.send({ embeds: [embed] });
      const logs = loadLogs();
      logs.arrests.push({
        id: arrestId,
        username,
        charges,
        moderator: interaction.user.id,
        timestamp: new Date().toISOString()
      });
      saveLogs(logs);
      await interaction.reply({ content: `Arrest logged successfully for ${username}.`, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: 'Failed to log arrest: channel not found.', flags: MessageFlags.Ephemeral });
    }
  }
};
