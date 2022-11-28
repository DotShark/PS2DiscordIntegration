// Modules
require("dotenv").config();
const {Client, Events, GatewayIntentBits, EmbedBuilder} = require("discord.js");
const PS2Data = require("./ps2_data");
const axios = require("axios");
const adminsSet = new Set( require("./admins.json") );

// Thumbnail API
const thumbnailAPI = axios.create({
	baseURL: process.env.API_URL,
	// headers: {"Authorization": `Bearer ${process.env.API_TOKEN}`}
});

// PointShop2 data
const shop = new PS2Data({
	host: process.env.MYSQL_HOST,
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DATABASE
});

async function generateItemInfosEmbed(itemID, thumbailURL, name) {
	let item;
	try {
		item = await shop.getItemInfos(itemID);
	} catch {
		item = {name: "Impossible de trouver l'item", category: "Inconnue", occurences: "Inconnu"};
	}
	if (name) item.name = name;

	const embed = new EmbedBuilder()
		.setColor("Aqua")
		.setTitle(item.name)
		.addFields(
			{name: "Catégorie", value: item.category, inline: true},
			{name: "Nombre de drops", value: `${item.occurences}`, inline: true}
		);

	if (item.owners) {
		let ownersText = "";
		item.owners.forEach(owner => {
			ownersText += `- ${owner.name}\n`;
		});
		embed.addFields({name: "Liste des joueurs possédants cet item", value: ownersText});
	} 

	if (thumbailURL) embed.setThumbnail(thumbailURL);
	embed.setTimestamp();

	return [embed, item];
}

// Bot commands
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const commands = {
	canBeUsedBy(member) {
		return adminsSet.has(member.id);
	},

	async trackitem(interaction) {
		if (!commands.canBeUsedBy(interaction.member)) return await interaction.reply({content: "Vous n'êtes pas autorisé à utiliser cette commande", ephemeral: true});

		await interaction.deferReply({ephemeral: true});

		const itemID = interaction.options.getInteger("item");
		const thumbail = interaction.options.getAttachment("thumbail");
		const name = interaction.options.getString("name");
		const validThumbail = thumbail && (thumbail.contentType === "image/jpeg" || thumbail.contentType === "image/webp" || thumbail.contentType === "image/png");
		
		const [embed, item] = await generateItemInfosEmbed(itemID, validThumbail ? thumbail.url : process.env.DEFAULT_ITEM_IMAGE, name);
		const statusMessage = await interaction.channel.send({embeds: [embed]});
		await shop.addItemStatusMessage(statusMessage.id, interaction.channel.id, itemID, item.name, validThumbail ? thumbail.url : "");
		
		return await interaction.editReply({content: `Vous venez de créer un embed qui affiche les stats de ${item.name}`, ephemeral: true});
	},

	async refreshitems(interaction) {
		if (interaction && !commands.canBeUsedBy(interaction.member)) return await interaction.reply({content: "Vous n'êtes pas autorisé à utiliser cette commande", ephemeral: true});

		let itemsMessages;
		try {
			itemsMessages = await shop.getItemStatusMessages();
			if (itemsMessages.length < 1) throw true;
		} catch {
			if (interaction) return await interaction.reply("Aucun item n'a été trouvé");
		}

		if (interaction) await interaction.reply(`Les statistiques de ${itemsMessages.length} items vont être actualisés`);
		for (const i in itemsMessages) {
			const itemMessage = itemsMessages[i];
			try {
				const channel = await client.channels.fetch(itemMessage.channelID);
				const message = await channel.messages.fetch(itemMessage.messageID);
				if (interaction) await interaction.editReply(`Edition du message ${parseInt(i) + 1}/${itemsMessages.length}`);
				const [embed, item] = await generateItemInfosEmbed(itemMessage.itemID, itemMessage.thumbailURL, itemMessage.itemName);
				await message.edit({embeds: [embed]});
			} catch(error) {
				console.log(`Message n°${itemMessage.messageID} is not in this channel`);
			}
		}

		if (interaction) {
			return await interaction.editReply(`Les statisques des items ont étés édités`);
		} else {
			return itemsMessages.length;
		}
	}
};

client.once(Events.ClientReady, c => {
	console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const commandFunc = commands[interaction.commandName];+9
	
	try {
		await commandFunc(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({content: "There was an error while executing this command!", ephemeral: true });
	}
});

client.login(process.env.DISCORD_TOKEN);

// Refresh item stats each minute
setInterval(() => {
	commands.refreshitems()
		.then( itemsCount => console.log(`Successfully edited the stats of ${itemsCount} items`) )
		.catch( reason => console.log("Failed to edit items stats") );
}, 60000)