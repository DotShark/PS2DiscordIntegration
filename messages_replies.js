// Trace messages replies
client.on(Events.MessageCreate, async message => {
	if ( !message.inGuild() ) return;
	if (message.member.user.bot) return;

	console.log(`A new message has been sent in ${message.guild.name} by ${message.member.displayName}`);
	console.log(message.content);

	if (message.type !== MessageType.Reply) return;

	const reference = message.reference;
	const channel = await client.channels.fetch(reference.channelId);
	const referenceMessage = await channel.messages.fetch(reference.messageId);
	if (referenceMessage.author.id !== client.user.id) return;

	const status = await shop.getItemStatusMessage(referenceMessage.id);
	if (!status) return;

	const item = await shop.getItemInfos(status.itemID);
	console.log(`${message.member.displayName} want to edit ${item.name} status`);
	const thumbail = message.attachments.first();
	if (thumbail && thumbail.contentType === "image/jpeg") {
		console.log(`New thumbail found at ${thumbail.url}`);
		const [embed] = await generateItemInfosEmbed(item.id, thumbail.url);
		referenceMessage.edit({embeds: [embed]});
	}
});