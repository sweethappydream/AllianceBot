const sm = require("../util/scoremanager.js");
const connection = require("../util/connection.js");
const send = require("../util/sendMessage.js");

exports.run = (bot, msg, args, perm) => {
	connection.select("*", "giveaway", `server_id='${msg.channel.guild.id}'`).then(response => {
		if (!response[0]) {
			return send(msg.channel, "No giveaway currently running.");
		} else {
			response = response[0];
			if (perm >= 2 && response.cost > 0) {
				return send(msg.channel, "Roles with permission to give themselves points cannot enter giveaways that require spending points.");
			} else {
				sm.getScore(msg.channel.guild, msg.member).then(ret => {
					if (ret.score === 0 && response.cost > 0) {
						return send(msg.channel, "You have no points.");
					} else if (ret.score < response.cost) {
						return send(msg.channel, `You only have ${ret.score} points. You need ${response.cost} to enter the giveaway.`);
					} else if (args[0] && !isNaN(args[0]) && (ret.score < response.cost * parseInt(args[0]))) {
						return send(msg.channel, `You only have ${ret.score} points. You don't have enough to enter ${args[0]} times (${response.cost * parseInt(args[0])}).`);
					}
					let entriesToAdd;
					connection.select("*", "giveusers inner join giveaway on giveusers.giveawayid=giveaway.idgive", `userid='${msg.author.id}' AND server_id='${msg.channel.guild.id}'`).then(ent => {
						let info;
						if (ent[0]) {
							if (ent[0].likelihood === response.entries) {
								return send(msg.channel, `You already have the max amount of entries for this giveaway, ${response.entries}`);
							}
							if (args[0] && !isNaN(args[0]) && (ent[0].likelihood + parseInt(args[0]) > response.entries || parseInt(args[0]) < 0)) {
								return send(msg.channel, `You can only enter ${response.entries-ent[0].likelihood} more time${(response.entries-ent[0].likelihood > 1) ? "s" : ""} and cannot have an entry amount less than or equal to 0.`);
							}
							entriesToAdd = 1;
							if (args[0] && !isNaN(args[0]) && ent[0].likelihood + parseInt(args[0]) <= response.entries && parseInt(args[0]) > 0) {
								entriesToAdd = parseInt(args[0]);
							}
							connection.update("giveusers", `likelihood=likelihood+${entriesToAdd}`, `userid='${msg.author.id}' AND giveawayid=${ent[0].giveawayid}`).then(() => {
								sm.setScore(msg.channel.guild, msg.member, "add", response.cost * -(entriesToAdd)).then(r => {
									return send(msg.channel, `${msg.author}(${r.pScore}=>${r.score}) entered into the giveaway! (${ent[0].likelihood+entriesToAdd}/${response.entries} ${(response.entries > 1) ? "entries" : "entry"})`);
								}).catch(console.error);
							}).catch(console.error);
						} else {
							if (args[0] && !isNaN(args[0]) && (parseInt(args[0]) > response.entries || parseInt(args[0]) < 0)) {
								return send(msg.channel, `You can only enter ${response.entries} times max and cannot have an entry amount less than or equal to 0.`);
							}
							entriesToAdd = 1;
							if (args[0] && !isNaN(args[0]) && parseInt(args[0]) <= response.entries && parseInt(args[0]) > 0) {
								entriesToAdd = parseInt(args[0]);
							}
							info = {
								"userid": msg.author.id,
								"giveawayid": response.idgive,
								"likelihood": entriesToAdd
							};
							connection.insert("giveusers", info).then(() => {
								sm.setScore(msg.channel.guild, msg.member, "add", response.cost * -(entriesToAdd)).then(r => {
									return send(msg.channel, `${msg.author}(${r.pScore}=>${r.score}) entered into the giveaway! (${info.likelihood}/${response.entries} ${(response.entries > 1) ? "entries" : "entry"})`);
								}).catch(console.error);
							}).catch(console.error);
						}
					}).catch(console.error);
				});
			}
		}
	});
};

exports.conf = {
	guildOnly: true,
	aliases: ["e"],
	permLevel: 0,
	onCooldown: false,
	cooldownTimer: 0
};

exports.help = {
	name: "enter",
	description: "Enter a current giveaway.",
	extendedDescription: "",
	usage: "enter [number of entries]"
};
