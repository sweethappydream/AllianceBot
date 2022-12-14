const send = (chan, msg, options) => {
	return new Promise((resolve, reject) => {
		if (options) {
			chan.send(msg, options).then(m => {
				resolve(m);
			}).catch(e => {
				reject(e);
			});
		} else {
			chan.send(msg).then(m => {
				resolve(m);
			}).catch(e => {
				reject(e);
			});
		}
	});
};

module.exports = (chan, msg, options) => {
	return new Promise((resolve, reject) => {
		const type = (chan.content) ? (chan.guild) ? chan.channel : chan.author : chan;
		send(type, msg, options).then(m => {
			resolve(m);
		}).catch(e => {
			reject(e);
		});
	});
};
