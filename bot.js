// Modules
require("dotenv").config();
const {Client, Events, GatewayIntentBits, EmbedBuilder, MessageType} = require("discord.js");
const PS2Data = require("./ps2_data");
const axios = require("axios");

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

	if (thumbailURL) {
		embed.setThumbnail(thumbailURL);
	} else {
		try {
			await thumbnailAPI.head(`/ps2item/${itemID}.jpg`);
			embed.setThumbnail(`${process.env.API_URL}/ps2item/${itemID}.jpg`);
		} catch {
			console.log(`Failed to find ${item.name} thumbail`);
		}
	}

	return [embed, item];
}

// Bot commands
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const commands = {
	async trackitem(interaction) {
		await interaction.deferReply({ephemeral: true});

		const itemID = interaction.options.getInteger("item");
		const thumbail = interaction.options.getAttachment("thumbail");
		const name = interaction.options.getString("name");
		const validThumbail = thumbail && (thumbail.contentType === "image/jpeg" || thumbail.contentType === "image/webp" || thumbail.contentType === "image/png");
		
		const [embed, item] = await generateItemInfosEmbed(itemID, validThumbail && thumbail.url, name);
		const statusMessage = await interaction.channel.send({embeds: [embed]});
		await shop.addItemStatusMessage(statusMessage.id, itemID, item.name, validThumbail ? thumbail.url : "");
		
		return await interaction.editReply({content: `Vous venez de créer un embed qui affiche les stats de ${item.name}`, ephemeral: true});
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