const timers = require("../util/timers.js");

exports.run = (bot, msg) => {
	var forSS = {
		"bool": true
	};
	var currentss = timers.getCount(false, "The next SS will begin in ", forSS);
	msg.author.sendMessage(`Speedy Saturday is a community multiplayer get-together event that occurs every week (on Saturday) at 6:00PM UTC until 8:00PM UTC (2 hour duration). More information can be found here:\nhttp://steamcommunity.com/app/233610/discussions/0/528398719786414266/\nhttps://redd.it/3mlfje\n${currentss}`);
};

exports.conf = {
	guildOnly: false,
	aliases: [],
	permLevel: 0,
	onCooldown: false,
	cooldownTimer: 0
};

exports.help = {
	name: "speedy",
	description: "Get the full Speedy Saturday information.",
	extendedDescription: "",
	usage: "speedy"
};
