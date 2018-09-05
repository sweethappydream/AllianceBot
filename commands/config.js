const connection = require("../util/connection.js");
const escape = require("../util/escapeChars.js");
const send = require("../util/sendMessage.js");

function update(flag, type, msg) {
	return new Promise((resolve, reject) => {
		let newFlag;
		if (flag) {
			newFlag = escape.chars(flag);
			if (newFlag !== flag) {
				reject(new Error("You used an invalid character."));
			}
			connection.update("servers", `${type}='${newFlag}'`, `serverid='${msg.guild.id}'`).then(() => {
				resolve();
			}).catch(console.error);
		}
	});
}

function doAll(flags, msg) {
	return new Promise((resolve, reject) => {
		const types = [];
		const newVals = [];
		for (const key in flags) {
			if (flags.hasOwnProperty(key)) {
				newVals.push(flags[key]);
				types.push(key);
				update(flags[key], key, msg).catch(e => {
					reject(e);
				});
			}
		}
		const ret = {
			types,
			newVals
		};
		resolve(ret);
	});
}

exports.run = (bot, msg, args, perms, cmd, flags) => {
	console.log("flags", flags);
	const conf = bot.servConf.get(msg.guild.id);
	if (!flags || !args[0]) {
		return send(msg.channel, `Incorrect syntax. Use \`${conf.prefix}help config\` for help.`);
	}
	doAll(flags, msg).then(ret => {
		const msgCon = [];
		let i = 0;
		for (i; i < ret.types.length; i++) {
			switch (ret.types[i]) {
				case "prefix":
					msgCon.push(`Prefix - ${ret.newVals[i]}`);
					break;
				case "membrole":
					msgCon.push(`Member Role Name - ${ret.newVals[i]}`);
					break;
				case "modrole":
					msgCon.push(`Moderator Role Name - ${ret.newVals[i]}`);
					break;
				case "adminrole":
					msgCon.push(`Admin Role Name - ${ret.newVals[i]}`);
					break;
			}
		}
		bot.confRefresh().then(() => {
			send(msg.channel, `**Updated:**\n${msgCon.join("\n")}`);
		}).catch(e => {
			send(msg.channel, e.message);
		});
	});
};

exports.conf = {
	guildOnly: true,
	aliases: [],
	permLevel: 3,
	onCooldown: false,
	cooldownTimer: 0
};

exports.help = {
	name: "config",
	description: "Set server config",
	extendedDescription: "<prefix>\n* Command prefix to use in the server\n\n<membrole>\n* Name of the role to have perm level 1\n\n<modrole>\n* Name of the role to have perm level 2\n\n<adminrole>\n* Name of the role to have perm level 3\n\n= Examples =\n\"config --prefix ~ --membrole Member --modrole Moderator --adminrole Admin\" :: This would set all of the config options, however, it is also possible to only edit need needed change:\n\n\"config --adminrole Admin\" :: This would only set the admin role.\n\n\"config --modrole Mod --prefix #\" :: This would set the prefix and moderator role.",
	usage: "config --<prefix|membrole|modrole|adminrole> [<prefix>|<member role>|<moderator role>|<admin role>]"
};

exports.f = {
	prefix: ["p", "pre"],
	membrole: ["memb", "membrole"],
	modrole: ["mod", "modrole"],
	adminrole: ["admin", "adminrole"]
};
