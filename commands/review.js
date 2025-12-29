const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { loadReviews, saveReviews, generateReviewID } = require('../utils/database');
const config = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('review')
    .setDescription('Manage officer reviews')
    .setDefaultMemberPermissions(null)
    .addSubcommand(sub =>
      sub.setName('log')
        .setDescription('Log an officer review')
        .addUserOption(opt => opt.setName('user').setDescription('User to review').setRequired(true))
        .addStringOption(opt => opt.setName('rating').setDescription('Rate the user out of 5. (e.g 2/5, 3/5, 4/5, etc.)').setRequired(true))
        .addStringOption(opt => opt.setName('duration').setDescription('Duration').setRequired(true))
        .addStringOption(opt => opt.setName('notes').setDescription('Review notes').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View a specific review')
        .addStringOption(opt => opt.setName('id').setDescription('Review ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('clear')
        .setDescription('Clear a review')
        .addStringOption(opt => opt.setName('id').setDescription('Review ID to clear').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'log') {
      const allowedReviewRoles = ['1376056345291128872', '1376057126446698506', '1376057407775707328'];
      
      if (!interaction.member.roles.cache.some(r => allowedReviewRoles.includes(r.id))) {
        return interaction.reply({ content: 'You do not have permission to log reviews.', flags: MessageFlags.Ephemeral });
      }

      const targetUser = interaction.options.getUser('user');
      const rating = interaction.options.getString('rating');
      const duration = interaction.options.getString('duration');
      const notes = interaction.options.getString('notes');

      const reviewDB = loadReviews();
      const reviewId = generateReviewID(reviewDB);

      const newReview = {
        id: reviewId,
        userId: targetUser.id,
        rating: rating,
        duration: duration,
        notes: notes,
        reviewer: interaction.user.id,
        timestamp: new Date().toISOString()
      };

      reviewDB.reviews.push(newReview);
      saveReviews(reviewDB);

      const dmEmbed = new EmbedBuilder()
        .setTitle('Officer Review')
        .setColor('#0C588A')
        .addFields(
          { name: 'Review ID', value: reviewId, inline: true },
          { name: 'Rating', value: rating, inline: true },
          { name: 'Duration', value: duration, inline: true },
          { name: 'Notes', value: notes }
        )
        .setFooter({ text: 'APD Management' })
        .setTimestamp();

      try { await targetUser.send({ embeds: [dmEmbed] }); } catch { }

      const logEmbed = new EmbedBuilder()
        .setTitle('Officer Review')
        .setColor('#0C588A')
        .addFields(
          { name: 'Review ID', value: reviewId, inline: true },
          { name: 'User', value: `${targetUser}`, inline: true },
          { name: 'Rating', value: rating, inline: true },
          { name: 'Duration', value: duration, inline: true },
          { name: 'Reviewer', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Notes', value: notes }
        )
        .setFooter({ text: 'APD Management' })
        .setTimestamp();

      const reviewChannel = await interaction.client.channels.fetch(config.channels.reviews);
      if (reviewChannel) await reviewChannel.send({ embeds: [logEmbed] });

      await interaction.reply({ content: `Review ${reviewId} logged for ${targetUser.tag}.`, flags: MessageFlags.Ephemeral });
    }

    else if (sub === 'view') {
      const allowedReviewRoles = ['1376056345291128872', '1376057126446698506', '1376057407775707328'];
      
      if (!interaction.member.roles.cache.some(r => allowedReviewRoles.includes(r.id))) {
        return interaction.reply({ content: 'You do not have permission to view reviews.', flags: MessageFlags.Ephemeral });
      }

      const reviewId = interaction.options.getString('id').toUpperCase();
      const reviewDB = loadReviews();
      const review = reviewDB.reviews.find(r => r.id === reviewId);

      if (!review) {
        return interaction.reply({ content: `No review found with ID ${reviewId}.`, flags: MessageFlags.Ephemeral });
      }

      const user = await interaction.client.users.fetch(review.userId);

      const embed = new EmbedBuilder()
        .setTitle(`Review ${reviewId}`)
        .setColor('#0C588A')
        .addFields(
          { name: 'User', value: `${user}`, inline: true },
          { name: 'Rating', value: review.rating, inline: true },
          { name: 'Duration', value: review.duration, inline: true },
          { name: 'Reviewer', value: `<@${review.reviewer}>`, inline: true },
          { name: 'Date', value: `<t:${Math.floor(new Date(review.timestamp).getTime() / 1000)}:f>`, inline: true }
        )
        .setFooter({ text: 'APD Management' })
        .setTimestamp();

      if (review.notes) embed.addFields({ name: 'Notes', value: review.notes });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    else if (sub === 'clear') {
      const allowedReviewRoles = ['1376056345291128872', '1376057126446698506'];
      
      if (!interaction.member.roles.cache.some(r => allowedReviewRoles.includes(r.id))) {
        return interaction.reply({ content: 'You do not have permission to clear reviews.', flags: MessageFlags.Ephemeral });
      }

      const reviewId = interaction.options.getString('id').toUpperCase();
      const reviewDB = loadReviews();
      const reviewIndex = reviewDB.reviews.findIndex(r => r.id === reviewId);

      if (reviewIndex === -1) {
        return interaction.reply({ content: `No review found with ID ${reviewId}.`, flags: MessageFlags.Ephemeral });
      }

      const review = reviewDB.reviews[reviewIndex];
      const user = await interaction.client.users.fetch(review.userId);

      reviewDB.reviews.splice(reviewIndex, 1);
      saveReviews(reviewDB);

      const clearEmbed = new EmbedBuilder()
        .setTitle('Review Cleared')
        .setColor('#0C588A')
        .addFields(
          { name: 'Review ID', value: reviewId, inline: true },
          { name: 'User', value: `${user}`, inline: true },
          { name: 'Cleared By', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setFooter({ text: 'APD Management' })
        .setTimestamp();

      const logChannel = await interaction.client.channels.fetch(config.channels.reviews);
      if (logChannel) await logChannel.send({ embeds: [clearEmbed] });

      await interaction.reply({ content: `Review ${reviewId} successfully cleared.`, flags: MessageFlags.Ephemeral });
    }
  }
};
