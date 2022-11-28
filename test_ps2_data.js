const PS2Data = require("./ps2_data");

(async () => {
	const shop = new PS2Data({
		host: process.env.MYSQL_HOST,
		user: process.env.MYSQL_USER,
		password: process.env.MYSQL_PASSWORD,
		database: process.env.MYSQL_DATABASE
	});

	console.log( await shop.getItemOwners(339) );
	const items = await shop.getItems();
	items.forEach(item => console.log(`${item.id},${item.name},${item.price}`));
	console.log( await shop.getItemInfos(213) );
	console.log( await shop.getPlayerWallet("STEAM_0:1:73530340") );
})();