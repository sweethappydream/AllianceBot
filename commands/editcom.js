const connection = require("../util/connection.js");
const colors = require("colors");
//var config;
const escape = require("../util/escapeChars.js");
const send = require("../util/sendMessage.js");
//const pre = config.prefix;
// const modrolename = config.modrolename;
// const membrolename = config.membrolename;
// const adminrolename = config.adminrolename;


exports.run = (bot, msg, args, perms, cmd, flags) => {
	// const config = bot.servConf;
	// const pre = config.prefix;

	//checks for all the right flags to be assigned values by user
	if (!flags) {
		return send(msg.channel, "You must specify flags.");
	} else if (!flags.name) {
		return send(msg.channel, "You must specify a name.");
	} else if (flags.name.includes(" ")) {
		return send(msg.channel, "The name cannot have any spaces.");
	} else if (flags.inpm && !flags.inpm.match(/^(true|false)$/)) {
		return send(msg.channel, "PM must be true or false.");
	}

	if (flags.name && !(flags.message || flags.inpm || flags.permlvl || flags.type)) {
		return send(msg.channel, "You must specify flags for what you want to change.");
	}


	const cmdname = escape.chars(flags.name);
	if (cmdname !== flags.name) {
		return send(msg.channel, "Invalid characters used in command name.");
	}
	connection.select("*", "servcom", `server_id='${msg.channel.guild.id}' AND comname='${cmdname}'`).then(r => {
		if (!r[0]) {
			return send(msg.channel, `The command \`${cmdname}\` does not exist.`);
		} else if (r[0].type === "quote" && flags.message) {
			return send(msg.channel, "You can't change the message on a quote-type command.");
		} else if (flags.type && flags.type !== r[0].type) {
			return send(msg.channel, "You cannot change the command type. Delete the command and re-create it to change type.");
		}

		const assign = [];
		if (flags.permlvl) {
			assign.push(`permlvl=${flags.permlvl}`);
		}
		if (flags.inpm) {
			assign.push(`inpm='${flags.inpm}'`);
		}
		if (flags.message) {
			const comtext = `'${flags.message}'`;
			const escdMsg = escape.chars(comtext);
			assign.push(`comtext='${escdMsg}'`);
		}
		const assignment = assign.join(", ");

		console.log(colors.red(`Attempting to edit the command \`${cmdname}\`.`));

		connection.update("servcom", assignment, `comname='${cmdname}' AND server_id='${msg.channel.guild.id}'`).then(() => {
			console.log(colors.red("Successfully edited command."));
			send(msg.channel, "Success");
		}).catch(e => {
			send(msg.channel, "Failed");
			console.error(e);
			return;
		});
	});
};

exports.conf = {
	guildOnly: true,
	aliases: ["ec"],
	permLevel: 2,
	onCooldown: false,
	cooldownTimer: 5000
};

exports.help = {
	name: "editcom",
	description: "Edit an already-existing custom command.",
	extendedDescription: "<command-name>\n* Name of command without prefix\n\n<perm-level> (0-3)\n* 0 is @everyone, 1 is Members, 2 is Moderators, 3 is Admins\n\n<reply-in-pm> (true|false)\n* Reply to command in a PM rather than in-channel.\n\n<message>\n* The message to be sent when command is given.\n\n= Examples =\n\"editcom --n spook --m Sorry for the scare!\" :: The command being edited would be \"spook\" and the edited message would be \"Sorry for the scare!\"",
	usage: "editcom --name <command name> --permlvl <perm level> --inpm <reply in pm> --message <message>"
};

exports.f = {
	name: ["n", "name"],
	permlvl: ["permlvl", "perm", "p", "pl", "lvl", "l"],
	inpm: ["inpm", "pm"],
	type: ["t", "type"],
	message: ["msg", "message", "m"]
};
