// Global

const {parseHtml} = require("./html");

// Parse HTML

function _charData(content) {
	const split = content.split("\n");

	let found = false;
	for (const index in split) {
		const line = split[index];
		if (found) {
			if (line.startsWith("<div"))
				return parseHtml(line);
		} else if (line.includes("character__content selected")) {
			found = true;
		}
	}
}

// Parse character

function parse(content) {
	return JSON.stringify(_charData(content), null, 4);
}

// Export

module.exports = parse;