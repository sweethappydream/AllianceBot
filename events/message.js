//const config = require("../config.json");
const connection = require("../util/connection.js");
const colors = require("colors");
const escape = require("../util/escapeChars.js");
const workshopItemEmbed = require("../util/workshopItemEmbed.js");
const cl = require("../util/chatinfo.js");
// const fs = require("fs-extra");
const guestToMemb = require("../util/guestToMemb.js").guestToMemb;
const parseFlags = require("../util/parseFlags.js");
const customQuotes = require("../util/customQuotes.js").ripWin;
const send = require("../util/sendMessage.js");
let pre = require("../config.json").prefix; //default prefix

module.exports = async (bot, meter, msg) => {
	if (!msg.channel.guild) {
		console.log(colors.grey(`(Private) ${msg.author.username}: ${msg.cleanContent}`));
		if (msg.content.startsWith(pre) && !msg.author.bot) { //default prefix
			const command = msg.content.split(" ")[0].slice(pre.length).toLowerCase(); //default prefix
			const perms = await bot.elevation(msg);
			const args = msg.content.split(" ").slice(1);
			let cmd;
			if (bot.commands.has(command)) {
				cmd = bot.commands.get(command);
			} else if (bot.aliases.has(command)) {
				cmd = bot.commands.get(bot.aliases.get(command));
			}
			if (cmd && perms >= cmd.conf.permLevel && !cmd.conf.guildOnly) {
				let flags;
				if (cmd.flags) {
					flags = parseFlags(cmd, args);
				}
				cmd.run(bot, msg, args, perms, cmd, flags);
			} else {
				send(msg.author, "Only certain commands can be used in PM. Using this command via PM is not supported as I have no indication of which server you're coming from. Please use this command from within the server - To view which commands are enabled for your server, use the `help` command within that server.");
			}
		}
		return;
	}

	if (msg.type.match(/^(thread_starter_message|thread_created)$/i)) {
		// thread created
		console.log(colors.grey(`* New thread #${msg.channel.name} created in #${msg.channel.parent.name} on guild ${msg.channel.guild.name}`));
		return;
	} else if (!msg.type.match(/^(default|reply)$/i)) {
		return;
	}

	const conf = bot.servConf.get(msg.channel.guild.id);
	pre = conf.prefix;
	const membrole = conf.membrole;
	const cha = await cl.formatChatlog(msg);
	meter.mark();
	console.log(colors.white(cha.consoleChat + cha.formattedAtturls));
	if (membrole && (msg.guild.members.cache.get(msg.author.id) && !msg.guild.members.cache.get(msg.author.id).roles.cache.some(val => val.name === membrole))) {
		guestToMemb(bot, msg);
	}

	const perms = await bot.elevation(msg);

	if (msg.channel.guild.id === "83078957620002816" && !msg.author.bot) {
		const urlMatchReg = /(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)+(?:[a-z\u00a1-\uffff]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?/i;
		if (perms === 0 && urlMatchReg.test(msg.content)) {
			return send(msg.channel, "Guests can't send links. Participare in chat and wait for staff to add you to the Member role.").then(m => {
				msg.delete().then(() => {
					setTimeout(() => {
						m.delete();
					}, 9000);
				});
			}).catch(console.error);
		}
		if (msg.channel.id === "478841453934542848") {
			return workshopItemEmbed(bot, msg);
		}
	}


	if (!msg.content.startsWith(pre)) {
		return;
	}
	if (msg.author.bot) {
		return;
	}

	const command = msg.content.split(" ")[0].slice(pre.length).toLowerCase();
	const args = msg.content.split(" ").slice(1);

	const escapedCom = escape.chars(command);
	connection.select("*", "servcom", `server_id='${msg.channel.guild.id}' AND comname='${escapedCom}'`).then(response => {
		if (response[0]) {
			let strs;
			let results;
			if (response[0].comtext) {
				strs = response[0].comtext;
				results = strs.slice(1, strs.length - 1);
			}
			if (response[0].permlvl <= perms) {
				if (response[0].type === "simple") {
					if (response[0].inpm === "true") {
						return send(msg.author, results);
					} else {
						return send(msg.channel, results);
					}
				} else if (response[0].type === "quote") {
					customQuotes(msg, args, command, perms);
					return;
				}
				return;
			}
		}
	}).catch(e => console.error(e.stack));



	let cmd;
	if (bot.commands.has(command)) {
		cmd = bot.commands.get(command);
	} else if (bot.aliases.has(command)) {
		cmd = bot.commands.get(bot.aliases.get(command));
	}
	if (cmd) {
		if (perms < cmd.conf.permLevel || cmd.conf.onCooldown || cmd.conf.endGameCooldown) {
			if (cmd.help.name === "strivia" || cmd.help.name === "num" || cmd.help.name === "scramble") {
				send(msg.channel, "This command is on cooldown (1 minute cooldown after game ends) or is otherwise unavailable at this time. Try again in a few minutes.");
			}
			return;
		}
		connection.select("commandname", "commands", `server_id='${msg.channel.guild.id}' AND commandname='${cmd.help.name}'`).then(response => {
			if (!response[0] && cmd.conf.permLevel < 4) {
				console.log(colors.red("Command not enabled for this server."));
				return;
			}
			console.log(colors.red("Command enabled for this server."));
			cmd.conf.onCooldown = true;
			let flags;
			if (cmd.flags) {
				flags = parseFlags(cmd, args);
			}
			cmd.run(bot, msg, args, perms, cmd, flags);
			setTimeout(() => {
				cmd.conf.onCooldown = false;
			}, cmd.conf.cooldownTimer);
		}).catch(e => console.error(e.stack));
	}
};
