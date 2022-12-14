//const pre = require("../config.json").prefix;
const firebase = require("../util/firebase.js");
let possibleBets;
let numbProps;
firebase.db.ref("possibleroulettebets").once("value").then(data => {
	possibleBets = data.val();
});
firebase.db.ref("roulettenumberproperties").once("value").then(data => {
	numbProps = data.val();
});
const rouletteconfig = require("../config.json").roulette;
const sm = require("../util/scoremanager.js");
const send = require("../util/sendMessage.js");
let running = false;
let cantbet = false;

function Bet(userid, amount, pbet, msg) {
	this.id = userid;
	this.amnt = amount;
	this.chipPlace = pbet;
	this.payback = 0;
	this.msg = msg;

	this.setPayback = (amnt) => {
		this.payback = amnt;
	};
}
let betArray = [];
let winningBets = {
	"users": [],
	"payouts": []
};
let landNumb = -1;

const isEven = (n) => {
	return n % 2 === 0;
};

const resetBetting = () => {
	running = false;
	cantbet = false;
	winningBets = {
		"users": [],
		"payouts": []
	};
	betArray = [];
	landNumb = -1;
};

const manageBets = (msg, debugnum) => {
	cantbet = true;
	let rollingMsg;
	send(msg.channel, "No longer taking new bets. Rolling...").then(m => {
		rollingMsg = m;
	});
	landNumb = Math.floor(Math.random() * 37);
	if (debugnum >= 0 && debugnum <= 37) {
		landNumb = debugnum;
	}
	const displayNumber = (landNumb === 37) ? "00" : landNumb;
	const isZero = (displayNumber === "00" || displayNumber === 0);
	const evenOrOdd = (isEven(landNumb)) ? "even" : "odd";
	const color = numbProps[`${displayNumber}`].color;
	const afterRoll = () => {
		let chipPlace;
		let index;
		const ppay = {
			users: [],
			payouts: []
		};
		let i = betArray.length - 1;
		for (i; i > -1; i--) {
			//console.log("betArray", betArray);
			chipPlace = betArray[i].chipPlace;
			if (possibleBets[chipPlace].numbers.includes(landNumb)) {
				betArray[i].setPayback((possibleBets[chipPlace].payout * betArray[i].amnt) + betArray[i].amnt);
				if (winningBets.users.includes(betArray[i].id)) {
					index = winningBets.users.indexOf(betArray[i].id);
					winningBets.payouts[index] += betArray[i].payback;
					index = ppay.users.indexOf(betArray[i].id);
					ppay.payouts[index] += betArray[i].amnt;

				} else {
					winningBets.users.push(betArray[i].id);
					winningBets.payouts.push(betArray[i].payback);
					ppay.users.push(betArray[i].id);
					ppay.payouts.push(betArray[i].amnt);
				}
			} else {
				// if (winningBets.users.includes(betArray[i].id)) {
				// 	index = winningBets.users.indexOf(betArray[i].id);
				// 	winningBets.payouts[index] -= betArray[i].amnt;
				// }
				//connection.update("triviascore", `score=score-${betArray[i].amnt}`, `userid='${betArray[i].id}' AND server_id='${msg.guild.id}'`).catch(e => console.error(e.stack));
				//betArray.splice(i, 1);
			}
		}
		if (winningBets.users.length <= 0) {
			resetBetting();
			return send(msg.channel, "There were no winners.");
		}
		let textLine = `The winner${(winningBets.users.length > 1)?"s are:\n":" is: "}`;
		let ment;
		i = 0;
		for (i; i < winningBets.users.length; i++) {
			ment = msg.channel.guild.members.cache.get(winningBets.users[i]).user;
			textLine += `${ment}: +${winningBets.payouts[i] - ppay.payouts[i]}\n`;
			sm.setScore(msg.channel.guild, msg.channel.guild.members.cache.get(winningBets.users[i]), "add", winningBets.payouts[i]).catch(console.error);
			// sm.getScore(msg.guild, msg.guild.members.cache.get(winningBets.users[i])).then(res => {
			// 	if (res.score === 0) {
			// 		var info = {
			//
			// 		};
			// 		sm.
			// 	} else {
			// 		connection.update("triviascore", `score=score+${winningBets.payouts[i]}`, `userid='${winningBets.users[i]}' AND server_id='${msg.guild.id}'`).catch(e => console.error(e.stack));
			// 	}
			// });
		}
		send(msg.channel, textLine);

		resetBetting();
	};
	const rollBall = () => {
		rollingMsg.edit(`The ball lands on ${displayNumber}.${(isZero)?"":` It is ${evenOrOdd} and ${color}.`}`);
		setTimeout(afterRoll, rouletteconfig.timeAfterRoll);
	};
	setTimeout(rollBall, rouletteconfig.timeBeforeRoll);
};

exports.run = (bot, msg, args, perm) => {
	const pre = bot.servConf.get(msg.channel.guild.id).prefix;
	let debugnum;
	if (perm >= 2 && args[2] && !isNaN(args[2]) && parseInt(args[2]) >= 0 && parseInt(args[2]) <= 37) {
		debugnum = parseInt(args[2]);
	} else if (args[2]) {
		return msg.reply(`Invalid syntax. Use \`${pre}help bet\` to get more information.`);
	}
	if (!possibleBets[`${args[1]}`]) {
		return msg.reply("That is not a possible bet location on the roulette table.");
	}
	if (!(args[0] && args[1])) {
		return msg.reply("You must specify an amount to bet and a dice side to bet on.");
	}
	if (isNaN(args[0])) {
		return msg.reply("Your bet amount must be a positive number.");
	}
	const amount = parseInt(args[0]);
	if (amount <= 0) {
		return msg.reply("Your bet amount must be a positive number.");
	}
	sm.getScore(msg.channel.guild, msg.member).then(res => {
		if (res.score === 0 && perm < 2) {
			return msg.reply("You do not have any points to bet with.");
		}
		if (amount > res.score && perm < 2) {
			return msg.reply("You cannot bet more points than you have.");
		}
		//console.log(running, cantbet);
		if (perm < 2) {
			sm.setScore(msg.channel.guild, msg.member, "add", amount * -1).catch(console.error);
		}
		if (!running && !cantbet) {
			running = true;
			send(msg.channel, `${msg.member.displayName} has started roulette! Use \`${pre}help bet\` to get the list of possible bets and other information.`).then(() => {
				betArray.push(new Bet(msg.author.id, amount, args[1], msg));
				//console.log(betArray[betArray.length - 1]);
				setTimeout(() => {
					manageBets(msg, debugnum);
				}, rouletteconfig.timeBeforeEndBets);
			});
		} else if (!cantbet) {
			betArray.push(new Bet(msg.author.id, amount, args[1], msg));
			//console.log(betArray[betArray.length - 1]);
		} else {
			msg.reply("Betting has ended.");
		}
	});
};

exports.conf = {
	guildOnly: true,
	aliases: ["b"],
	permLevel: 0,
	onCooldown: false,
	cooldownTimer: 0
};

exports.help = {
	name: "bet",
	description: "Roulette betting, bet on as many different places as you like until betting duration ends.",
	extendedDescription: "<amount>\n* Amount of points to bet\n\n<possible bet>\n* Place to bet on. Possibilites below.\n\n= Reference Table =\n* http://i.imgur.com/949rfyc.png\n\n= Possible Bet Locations =\n[1to18, 19to36, even, odd, red, black]\n1:1 payout\n\n[1st12, 2nd12, 3rd12, 1rd, 2rd, 3rd]\n2:1 payout\n\n[Xline]\n5:1 payout, where X is first number of first row, betting on two rows (i.e. 4line bets on 4,5,6,7,8,9 and 25line bets on 25,26,27,28,29,30)\n\n[5num]\n6:1 payout, bets on 0,00,1,2,3\n\n[Xcorner]\n8:1 payout, where X is top left corner when betting on 4 numbers (i.e. 17corner bets on 17,18,20,21)\n\n[Xstreet, basket]\n11:1 payout, where basket bets on 0,00,2, or where X is first number of the row to bet on (i.e. 22street bets on 22,23,24)\n\n[XsplitY]\n17:1 payout, where X is any number and Y is a neighboring number (i.e 35split32 bets on 35 and 32)\n\n[X]\n35:1 payout, where X is any individual number\n\n= Examples =\n\"bet 10 0split00\" :: This would bet 10 points on the split between 0 and 00\n\n\"bet 5 1rd\" :: This would bet 5 points on the first column\n\n\"bet 20 4line\" :: This would bet 20 points on the lines [4,5,6] and [7,8,9]",
	usage: "bet <amount> <possible bet>"
};
