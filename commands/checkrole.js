const {
	Permissions
} = require("discord.js");
const editPlayRole = require("../util/editRole.js");
const send = require("../util/sendMessage.js");

const runCheck = (memb, role, guild) => {
	const P = memb.user.presence.activities.find(a => a.name === "Distance");

	const regex = /^Distance$/i;

	const hasStream = (P) ? P.type === "STREAMING" : false;
	const hasDistance = (P) ? (hasStream) ? regex.test(P.state) : (P.applicationId) ? regex.test(P.name) : false : false;
	const hasRole = memb.roles.cache.has(role.id);

	if (hasDistance && !hasRole) {
		editPlayRole("add", memb, role, guild);
	} else if (!hasDistance && hasRole) {
		editPlayRole("del", memb, role, guild);
	} else if (hasDistance && !hasRole) {
		editPlayRole("add", memb, role, guild);
	}
};

exports.run = (bot, msg, args, perm) => {
	const member = msg.member;
	const guild = member.guild;
	if (guild.id === "83078957620002816") {
		const botMember = guild.members.cache.get(bot.user.id);
		if ((botMember.permissions.has(Permissions.FLAGS.MANAGE_ROLES) || botMember.permissions.has(10000000n)) && botMember.roles.highest.position > member.roles.highest.position) {
			const playRole = guild.roles.cache.find(val => val.name === "Playing Distance");
			if (!playRole) {
				return;
			}
			if (perm >= 2 && args[0] === "all") {
				guild.members.cache.forEach(m => {
					runCheck(m, playRole, guild);
				});
			} else {
				runCheck(member, playRole, guild);
				send(msg.channel, "Checked for game. Restart Discord if your game isn't being detected.");
			}
		}
	}
};

exports.conf = {
	guildOnly: true,
	aliases: ["cr"],
	permLevel: 0,
	onCooldown: false,
	cooldownTimer: 0
};

exports.help = {
	name: "checkrole",
	description: "Manually check if you should be added to or removed from the \"Playing Game\" role if the bot didn't automatically detect a game change.",
	extendedDescription: "",
	usage: "checkrole"
};
