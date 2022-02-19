// Global

const {parseHtml} = require("./html");

const _toScrape = {
	infoBox: "character-block",
	infoBoxBlock: "character-block__box",
	fcCrest: "character__freecompany__crest__image"
};

// Parse HTML

function _charHtml(content) {
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

function scrapeClasses(list=[], html) {
	const res = {};
	for (const className of list)
		res[className] = [];

	function _recurse(iter) {
		for (const obj of iter) {
			for (const className of obj.classes)
				if (list.includes(className))
					res[className].push(obj);
			_recurse(obj.children);
		}
	}

	_recurse(html);

	return res;
}

// Parse character

function parse(content) {
	const data = {};

	const html = _charHtml(content),
	scrape = scrapeClasses(Object.values(_toScrape), html);

	// Profile

	for (const infoBox of [
		...scrape[_toScrape.infoBox],
		...scrape[_toScrape.infoBoxBlock]
	]) {
		const values = infoBox.children.filter(_=>_.tag != "img");
		if (values.length < 2)
			continue;
		
		for (let i = 0; i<values.length; i+=2) {
			let key = values[i].content,
				value = values[i+1];
			
			if (key == "Free Company") {
				const crest = scrape[_toScrape.fcCrest][0].children.map(_=>_.src);

				value = {
					name: value.content,
					link: value.href,
					crest: {
						background: crest[0],
						border: crest[1],
						icon: crest[2]
					}
				}
			} else {
				value = value.content.replace(/<br \/>/g, " / ");
			}
			data[key] = value;
		}
		/*const key = infoBox.children[0].content,
			value = infoBox.children[1].content.replace(/<br \/>/g, " / ");
		data[key] = value;*/
	}

	// Return

	console.log(data);

	return html;
}

// Export

module.exports = parse;