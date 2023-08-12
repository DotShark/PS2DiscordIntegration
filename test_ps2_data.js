const config = require("./config");
const PS2Data = require("./ps2_data");

(async () => {
	console.log(config.MYSQL_CHARSET ?? "utf8mb4");

	const shop = new PS2Data({
		host: config.MYSQL_HOST,
		user: config.MYSQL_USER,
		password: config.MYSQL_PASSWORD,
		database: config.MYSQL_DATABASE,
		charset: config.MYSQL_CHARSET ?? "utf8mb4"
	});

	const items = await shop.getItems();
	items.forEach(item => console.log(`${item.id},${item.name},${item.price}`));
	console.log( await shop.getItemByName("Élan") );
	// console.log( await shop.getItemInfos(393) );
	/*
	console.log( await shop.getItemInfos(213) );
	console.log( await shop.getPlayerWallet("STEAM_0:1:73530340") );
	console.log( await shop.getItemOwners(339) );
	*/
})();