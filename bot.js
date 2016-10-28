// <editor-fold desc='requirements'>
var Discord = require("discord.js"); //requirements
//var mysql = require("mysql"); //requirements
var colors = require("colors"); //requirements
var jsondata = require("./config/options.json"); //local options
var http = require("http"); //requirements
var fs = require("fs-extra"); //requirements
var parseString = require("xml2js").parseString; //requirements
var Twit = require("twit"); //requirements
var util = require("util"); //requirements
var token = require("./config/logins/discordtoken.json").token;
var twitconfig = require("./config/logins/twitconfig.js"); //local js
var sqlconfig = require("./config/logins/sqlconfig.js"); //local js
var RipWin = require("./modules/RipWin.js"); //local js
var sdr = require("./modules/setdelrole.js"); //local js
var CheckMapID = require("./modules/checkmapid.js"); //local js
var timers = require("./modules/timers.js"); //local js
var Command = require("./modules/command.js"); //local js
var commandList = require("./config/commands.json"); //local json
var md = require("./modules/messagedate.js"); //local js
var cl = require("./modules/chatinfo.js"); //local js
//var cmds = require("./modules/commands.js"); //local js
var connection = require("./modules/mysqlmanager.js"); //local js
var guests = require("./modules/guestToMemb.js"); //local js
var checkCmds = require("./modules/checkforcommands.js");
// </editor-fold>


// <editor-fold desc='variables'>
var T = new Twit(twitconfig); //new twitter object
var bot = new Discord.Client(); //create bot
var prefix = jsondata.prefix;
var modrolename = jsondata.modrolename;
var membrolename = jsondata.membrolename;
var botowner = jsondata.botownerid;
var currentss = 0;
var ripwin = null;
var commandname = "";
var isit = false;
var cooldown = false;
var stream = T.stream("statuses/filter", { follow: ["628034104", "241371699"]}); //create tweet filter, first two are refract and torcht, any others for testing
var tweetcount = 0;
var i = 0;
var eventDate = null;
var eventName = null;
var quotespm = "";
var quotespm2 = "";
var info = "";
//var connection;
// </editor-fold>


// <editor-fold desc='twitter stream'>
//on new tweet matching filter
stream.on("tweet", function (tweet) {
	var tweetid = tweet.id_str;
	var tweetuser = tweet.user.screen_name;
	var emoji = bot.guilds.get("83078957620002816").emojis.find("name", "torcht");
	var text = emoji + " <https://twitter.com/" + tweetuser + "/status/" + tweetid + ">";
	console.log(colors.red("Found matching tweet: https://twitter.com/" + tweetuser + "/status/" + tweetid));
	if ((typeof tweet.in_reply_to_screen_name !== "string" || tweet.in_reply_to_user_id === tweet.user.id) && !tweet.text.startsWith("RT @") && (!tweet.text.startsWith("@") || tweet.text.toLowerCase().startsWith("@" + tweet.user.screen_name.toLowerCase())) && (tweet.user.id_str === "628034104" || tweet.user.id_str === "241371699")) {
		var tweetjson = JSON.stringify(tweet,null,2);
		//fs.appendFile("tweet2.json", tweetjson + "\r\n\r\n\r\n\r\n\r\n");
		if (tweetcount < 4) {
			tweetcount += 1;
			fs.appendFile("tweet.json", tweetjson + "\r\n\r\n\r\n\r\n\r\n");
		}
		else {
			fs.writeFile("tweet.json", tweetjson + "\r\n\r\n\r\n\r\n\r\n");
			tweetcount = 0;
		}
		if (tweet.extended_tweet) {
			if (tweet.extended_tweet.full_text) {
				text += "\r" + tweet.extended_tweet.full_text;
			}
		}
		else {
			text += "\r" + tweet.text;
		}
		// if (tweet.entities.media) {
		// 	text += "\r" + tweet.entities.media[0].media_url;
		// }
		// if (tweet.extended_tweet) {
		// 	if (tweet.extended_tweet.entities.media) {
		// 		text += "\r" + tweet.extended_tweet.entities.media[0].media_url;
		// 	}
		// }
		// if (tweet.entities.urls[0]) {
		// 	if (tweet.entities.urls[0].display_url.startsWith("vine.")) {
		// 		text += "\r" + tweet.entities.urls[0].expanded_url;
		// 	}
		// }
		bot.channels.get("83078957620002816").sendMessage(text); //channelid, write message with link to tweet
		//bot.channels.get("211599888222257152").sendMessage("https://twitter.com/" + tweetuser + "/status/" + tweetid + mediaurl + vine); //channelid, write message with link to tweet
	}
});
// </editor-fold>


// <editor-fold desc='twitter API disconnected'>
stream.on("disconnect", function(disconnectMessage) {
	console.log("Twitter stream disconnected: \r\n" + disconnectMessage);
});
// </editor-fold>


// <editor-fold desc='twitter API connection attempt'>
stream.on("connect", function(request) {
	console.log(colors.red("Twitter stream connection attempt."));
});
// </editor-fold>


// <editor-fold desc='twitter API connected'>
stream.on("connected", function(response) {
	console.log(colors.red("Twitter stream connected."));
});
// </editor-fold>


// <editor-fold desc='twitter API reconnect attempt'>
stream.on("reconnect", function(request, response, connectInterval) {
	console.log(colors.red("Twitter stream attemptng reconnect in " + connectInterval + "ms."));
});
// </editor-fold>


// <editor-fold desc='twitter API error'>
stream.on("error", function(error) {
	console.log("Twitter stream error: \r\n" + error);
});
// </editor-fold>


// <editor-fold desc='server unavailable'>
bot.on("guildUnavailable", (guild) => {
	console.log(guild.name + " unavailable.");
});
// </editor-fold>


// <editor-fold desc='bot reconnecting'>
bot.on("reconnecting", () => {
	console.log(colors.red("Reconnecting..."));
});
// </editor-fold>


// <editor-fold desc='bot on ready'>
//log to console when ready
bot.on("ready", () => {
	console.log(colors.red("Bot online and ready on " + bot.guilds.size + " server(s)."));
	bot.user.setStatus("online").catch(console.log);
	bot.user.setGame("Distance").catch(console.log);
});
// </editor-fold>


// <editor-fold desc='bot on disconnect'>
//handle disconnect
bot.on("disconnect", () => {
	console.log(colors.red("Bot disconnected from server."));
});
// </editor-fold>


// <editor-fold desc='bot on server join'>
//add new servers to mysql database when bot added to new server
bot.on("guildCreate", (guild) => {
	console.log(colors.red("Trying to insert server '" + guild.name + "' into database."));
	info = {
		"servername": "'" + guild.name + "'",
		"serverid": guild.id,
		"ownerid": guild.owner.id,
		"prefix": "!"
	};
	connection.query("INSERT INTO servers SET ?", info, function(error) {
		if (error) {
			console.log(error);
			return;
		}
		else {
			console.log(colors.red("Successfully inserted server."));
		}
	});
	console.log(colors.red("Trying to insert win quotes for server '" + guild.name + "'."));
	connection.query("INSERT INTO win (server_id, quote) SELECT \"113151199963783168\", quote FROM win WHERE server_id = \"" + guild.id + "\"", function(error) {
		if (error) {
			console.log(error);
			return;
		}
		else {
			console.log(colors.red("Successfully inserted win quotes."));
		}
	});
	console.log(colors.red("Trying to insert rip quotes for server '" + guild.name + "'."));
	connection.query("INSERT INTO rip (server_id, quote) SELECT \"113151199963783168\", quote FROM win WHERE server_id = \"" + guild.id + "\"", function(error) {
		if (error) {
			console.log(error);
			return;
		}
		else {
			console.log(colors.red("Successfully inserted win quotes."));
		}
	});
});
// </editor-fold>


// <editor-fold desc='bot on server kicked'>
//remove server from mysql database when bot kicked
bot.on("guildDelete", (guild) => {
	if (guild.available) { //ensure kick rather than server outtage
		console.log(colors.red("Attempting to remove " + guild.name + " from the database."));
		connection.query("DELETE FROM servers WHERE serverid = '" + guild.id + "'", function(error) {
			if (error) {
				console.log(error);
				return;
			}
			console.log(colors.red("Successfully removed server."));
		});
	}
});
// </editor-fold>


// <editor-fold desc='member changes status'>
bot.on("presenceUpdate", (oldMember, newMember) => {
	if (!newMember.user.bot) {
		if (oldMember.presence.status === "offline" && newMember.presence.status !== "offline") {
			cl.writeLineToAllLogs(bot, newMember.guild, cl.getDisplayName(newMember) + " has come online");
		}
		else if (oldMember.presence.status !== "offline" && newMember.presence.status === "offline") {
			cl.writeLineToAllLogs(bot, newMember.guild, cl.getDisplayName(newMember) + " went offline");
		}
	}
});
// </editor-fold>


// <editor-fold desc='bot on message edit'>
bot.on("messageUpdate", (oldMessage, newMessage) => {
	if (bot.user !== oldMessage.author || bot.user !== newMessage.author) {
		if (oldMessage.content !== newMessage.content) {

			var newc = cl.formatChatlog(newMessage);
			var oldc = cl.formatChatlog(oldMessage);

			fs.readFile(oldc.currentLog, function(error, data) {
				if (error) {
					console.log(error);
				}
				else {
					var array = data.toString().split("\r\n");
					i = 0;
					for(i; i < array.length; i++) {
						if (array[i] === oldc.chatlinedata || array[i] === "(Edited) " + oldc.chatlinedata) {
							array[i] = "(Edited) " + newc.chatlinedata;
						}
					}
					fs.writeFile(oldc.currentLog, array.join("\r\n"), function(error) {
						if (error) {
							console.log(error);
						}
						else {
							console.log(colors.white.dim("Edited --> " + newc.consoleChat));
						}
					});
				}
			});
			fs.readFile(oldc.fullLog, function(error, data) {
				if (error) {
					console.log(error);
				}
				else {
					var array = data.toString().split("\r\n");
					i = 0;
					for(i; i < array.length; i++) {
						if (!array[i].startsWith("http") && (array[i] === oldc.chatlinedata || array[i] === "(Edited) " + oldc.chatlinedata)) {
							array[i] = "(Edited) " + newc.chatlinedata;
						}
					}
					fs.writeFile(oldc.fullLog, array.join("\r\n"), function(error) {
						if (error) {
							console.log(error);
						}
						else {
							//console.log(colors.white.dim("Edited --> " + newc.consoleChat));
						}
					});
				}
			});
		}
	}
});
// </editor-fold>


// <editor-fold desc='when server user updates'>
bot.on("guildMemberUpdate", (oldMember, newMember) => {
	if (cl.getDisplayName(oldMember) !== cl.getDisplayName(newMember) && !newMember.user.bot) {
		cl.writeLineToAllLogs(bot, newMember.guild, cl.getDisplayName(oldMember) + " is now known as " + cl.getDisplayName(newMember));
	}
});
// </editor-fold>


//--------------------------Begin bot commands--------------------------
bot.on("message", (message) => {
	if (message.guild) { //non-pm messages

		var cha = cl.formatChatlog(message);

		fs.appendFile(cha.currentLog, cha.chatlinedata + cha.formattedAtturls + "\r\n", function(error) {
			if (error) {
				console.log(message.content);
				console.log(error);
			}
			else {
				console.log(colors.white(cha.consoleChat + cha.formattedAtturls));
			}
		});
		fs.appendFile(cha.fullLog, cha.chatlinedata + cha.formattedAtturls + "\r\n", function(error) {
			if (error) {
				console.log(message.content);
				console.log(error);
			}
		});


		//add new members to member role
		if (!message.guild.members.get(message.author.id).roles.exists("name", membrolename)) {
			guests.addGuestToMemb(connection, message, cha, bot);
		}



		var messagesent = false;


		//check for command
		if (message.content.startsWith(prefix)) {
			var str = message.content;
			var results = str.split(" ");
			results[0] = results[0].replace(prefix, "");


			//check for custom server command
			connection.query("SELECT comtext, modonly, inpm FROM servcom WHERE server_id=" + message.guild.id + " AND comname='" + results[0] + "'", function(error, returntext) {
				if (error) {
					console.log(error);
					return;
				}
				else {
					//console.log(typeof returntext[0]);
					if (typeof returntext[0] === "object") {
						if (returntext[0].modonly === "true" && message.member.roles.exists("name", modrolename)) {
							var strs = returntext[0].comtext;
							results = strs.slice(1,strs.length-1);
							if (returntext[0].inpm === "true") {
								message.author.sendMessage(results);
							}
							else if (returntext[0].inpm === "false") {
								message.channel.sendMessage(message, results);
							}
							messagesent = true;
						}
						else if (returntext[0].modonly === "false") {
							var stre = returntext[0].comtext;
							results = stre.slice(1,stre.length-1);
							if (returntext[0].inpm === "true") {
								message.author.sendMessage(results);
							}
							else if (returntext[0].inpm === "false") {
								message.channel.sendMessage(results);
							}
							messagesent = true;
						}
						else {
							message.channel.sendMessage("This is a " + modrolename + "-only command.");
						}
					}
				}
			});







			if(!messagesent) {
				checkCmds.checkForCommands(message, results, connection, http, bot);
			}
		}

		//-----------------------------------------------

	}

	else { //pm messages
		console.log(colors.grey("(Private) " + message.author.username + ": " + message.cleanContent));
		if (message.content.startsWith(prefix)) {
			message.author.sendMessage("Using commands via PM is not supported as I have no indication of which server you want to access the commands for. Please use the command from within the server - To view which commands are enabled for your server, use `" + prefix + "cmds` within that server.");
		}
	}
});




//catch errors
bot.on("error", (e) => { console.error(colors.green(e)); });
bot.on("warn", (e) => { console.warn(colors.blue(e)); });
bot.on("debug", (e) => {
	if (!e.toLowerCase().includes("heartbeat")) { //suppress heartbeat messages
		console.info(colors.yellow(e));
	}
});




//discord login
bot.login(token);
