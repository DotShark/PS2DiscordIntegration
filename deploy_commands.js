const config = require("./config");
const {REST, Routes, SlashCommandBuilder} = require("discord.js");

const commands = [
	new SlashCommandBuilder()
		.setName("trackitem")
		.setDescription("Créé un embed discord qui affiche de stats à propos de l'item")
		.addIntegerOption( option => ( 
			option.setName("item")
				.setDescription("L'identifiant de l'item dont vous voulez afficher les stats")
				.setRequired(true) 
		) )
		.addAttachmentOption( option => (
			option.setName("thumbail")
				.setDescription("La miniature de l'item dont vous voulez afficher les stats")
		) )
		.addStringOption( option => (
			option.setName("name")
				.setDescription("Le nom de l'item (à utiliser en cas de problème avec les caractères spéciaux)")
		) )
		.toJSON(),

	new SlashCommandBuilder()
		.setName("refreshitems")
		.setDescription("Actualise les infos de tous les items affichés sur Discord")
		.toJSON()
];

// Construct and prepare an instance of the REST module
const rest = new REST({version: "10"}).setToken(config.DISCORD_TOKEN);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationCommands(config.DISCORD_CLIENT), {body: commands}
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();