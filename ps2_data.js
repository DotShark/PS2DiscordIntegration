const mysql = require("mysql2");
require("./string_transcoder");

class PS2Data {
	constructor(mysqlLogin) {
		const pool = mysql.createPool(mysqlLogin);
		this.pool = pool.promise();
		this.createItemStatusTable();
	}

	async getItems() {
		let itemsRows;
		let items = [];

		try {
			[itemsRows] = await this.pool.execute("SELECT * FROM ps2_itempersistence");
		} catch {
			console.log("Failed to connect to the database");
		}

		itemsRows.forEach(item => {
			items.push({id: item.id, price: item.price, name: item.name.transcodeFrom("latin1").to("utf8")});
		})
		return items;
	}

	async getItemByName(name) {
		try {
			const [itemsRows] = await this.pool.execute("SELECT * FROM ps2_itempersistence WHERE name = ?", [name.transcodeFrom("utf8").to("latin1")]);
			const item = itemsRows[0];
			item.name = item.name.transcodeFrom("latin1").to("utf8");
			item.description = item.description.transcodeFrom("latin1").to("utf8");
			return item;
		} catch {
			console.log(`Failed to find ${name}`);
		}
	}

	async getItemInfos(itemID) {
		let item;
		let categoryID;

		try {
			const [itemsRows] = await this.pool.execute("SELECT * FROM ps2_itempersistence WHERE id = ?", [itemID]);
			item = itemsRows[0];
			item.name = item.name.transcodeFrom("latin1").to("utf8");
			item.description = item.description.transcodeFrom("latin1").to("utf8");
		} catch {
			console.log("Failed to find item");
		}

		try {
			const [mappingRows] = await this.pool.execute("SELECT * FROM ps2_itemmapping WHERE itemClass = ?", [itemID]);
			categoryID = mappingRows[0].categoryId;
		} catch {
			console.log(`Failed to find ${item.name} category ID.`);
		}

		try {
			const [categoriesRows] = await this.pool.execute("SELECT * FROM ps2_categories WHERE id = ?", [categoryID]);
			const category = categoriesRows[0];
			item.category = category.label.transcodeFrom("latin1").to("utf8");
		} catch {
			console.log(`Failed to find ${item.name} category name.`);
		}

		try {
			const [itemCountRows] = await this.pool.execute("SELECT COUNT(*) AS count FROM kinv_items WHERE itemclass = ?", [`KInventory.Items.${itemID}`]);
			item.occurences = itemCountRows[0].count;
		} catch(error) {
			console.log(`Failed to count ${item.name} occurences in players inventories`);
			console.log(error);
		}

		if (item.occurences <= 50) {
			try {
				item.owners = await this.getItemOwners(itemID);
			} catch {}
		}

		return item;
	}

	async getItemOwners(itemClassID) {
		let items = [];
		let owners = [];
		
		try {
			[items] = await this.pool.execute("SELECT * FROM kinv_items WHERE itemclass = ?", [`KInventory.Items.${itemClassID}`]);
		} catch {
			console.log(`Failed to find items with this class: KInventory.Items.${itemClassID}`);
		}

		if (!items) return;

		for (const item of items) {
			try {
				const owner = await this.getItemOwner(item);
				owners.push(owner);
			} catch {}
		}

		return owners;
	}

	async getItemOwner(item) {
		let playerID;

		try {
			if (item.inventory_id) {
				const [inventories] = await this.pool.execute("SELECT ownerId FROM inventories WHERE id = ?", [item.inventory_id]);
				playerID = inventories[0].ownerId;
			} else {
				const [slots] = await this.pool.execute("SELECT ownerId FROM ps2_equipmentslot WHERE itemId = ?", [item.id]);
				playerID = slots[0].ownerId;
			}
		} catch(error) {
			console.log(error);
		}

		if (!playerID) return;
		try {
			const [players] = await this.pool.execute("SELECT * FROM libk_player WHERE id = ?", [playerID]);
			let player = players[0];
			player.name = player.name.transcodeFrom("latin1").to("utf8");
			return player;
		} catch {
			console.log(`Failed to find SteamID from player ID: ${playerID}`);
		}
	}

	async getPlayerWallet(steamID) { // Doesn't work
		let name;
		let walletID;

		try {
			const [playersRows] = await this.pool.execute("SELECT * FROM libk_player WHERE player = ?", [steamID]);
			walletID = playersRows[0].id;
			name = playersRows[0].name;
		} catch {
			console.log(`Failed to find player: ${steamID}`);
		}

		try {
			const [walletRows] = await this.pool.execute("SELECT * FROM ps2_wallet WHERE ownerId = ?", [walletID]);
			const wallet = walletRows[0];
			return {name: name, points: wallet.points, premiumPoints: wallet.premiumPoints};
		} catch {
			console.log(`Failed to find ${name} inventory`);
		}
	}

	async createItemStatusTable() {
		await this.pool.execute("CREATE TABLE IF NOT EXISTS `ps2_itemstatus` ( `messageID` VARCHAR(255) NOT NULL, `channelID` VARCHAR(255) NOT NULL, `itemID` INT NOT NULL, `itemName` VARCHAR(255) NOT NULL, `thumbailURL` VARCHAR(255) NOT NULL ) ENGINE = InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_general_ci");
	}

	async getItemStatusMessages() {
		try {
			const [statusMessages] = await this.pool.execute("SELECT * FROM ps2_itemstatus");
			return statusMessages;
		} catch {
			console.log(`Failed to connect to the database`);
		}
	}

	async getItemStatusMessage(messageID) {
		try {
			const [statusMessages] = await this.pool.execute("SELECT * FROM ps2_itemstatus WHERE messageID = ?", [messageID]);
			return statusMessages[0];
		} catch {
			console.log(`Failed to find message (id: ${messageID})`);
		}
	}

	async addItemStatusMessage(messageID, channelID, itemID, itemName, thumbailURL) {
		try {
			const [statusMessages] = await this.pool.execute("INSERT INTO ps2_itemstatus VALUES (?, ?, ?, ?, ?)", [messageID, channelID, itemID, itemName, thumbailURL]);
			return statusMessages[0];
		} catch {
			console.log(`Failed to save message infos (id: ${messageID})`);
		}
	}

	async deleteItemStatusMessage(messageID) {
		try {
			const statusMessage = await this.pool.execute("DELETE FROM ps2_itemstatus WHERE messageID = ?", [messageID]);
			return statusMessage[0];
		} catch {
			console.log(`Failed to delete message (id: ${messageID})`);
		}
	}
}

module.exports = PS2Data;