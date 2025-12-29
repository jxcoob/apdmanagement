module.exports = {
  name: 'say',
  async execute(message, args) {
    const allowedSayRoles = ['1376056345291128872'];
    
    if (!message.member.roles.cache.some(r => allowedSayRoles.includes(r.id))) {
      return message.reply('You do not have permission.');
    }

    const text = args.join(' ').trim();
    
    if (!text) {
      return message.reply('Please provide text.');
    }

    await message.delete().catch(console.error);
    await message.channel.send(text);
  }
};
