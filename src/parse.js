// Global

const {parseHtml} = require("./html");

const _toScrape = {
	infoBox: "character-block",
	infoBoxBlock: "character-block__box",
	fcCrest: "character__freecompany__crest__image",
	charLevels: "character__level__list"
};

// Parse HTML

function _charHtml(content) {
	const split = content.split("\n");

	let found = false;
	for (const index in split) {
		const line = split[index];
		if (found) {
			if (line.startsWith("<div")) {
				return parseHtml(line);
			}
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
function scrapeTagName(tag, html) {
	const res = [];

	function _recurse(iter) {
		for (const obj of iter) {
			if (obj.tag == tag)
				res.push(obj);
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

	for (const infoBox of scrape[_toScrape.infoBoxBlock]) {
		const values = infoBox.children.filter(_=>_.tag != "img");
		if (values.length < 2)
			continue;
		
		for (let i = 0; i<values.length; i+=2) {
			let key = values[i].content.toLowerCase().replace(/[\s-]/g, "_"),
				value = values[i+1];

			console.log(key);
			
			if (key == "grand_company") {
				const values = value.content.split(" / ");
				value = {
					name: values[0],
					rank: values[1]
				};
			} else if (value.content) {
				value = value.content.replace(/<br \/>/g, " / ");

				if (key.includes("/")) {
					const keys = key.split("/"),
						values = value.split(" / ");
					key = null;
					for (let i = 0; i<keys.length; i++) {
						let val = values[i];
						
						if (val == "♀")
							val = "Female";
						else if (val == "♂")
							val = "Male";

						data[keys[i]] = val;
					}
				}
			}

			if (key !== null)
				data[key] = value;
		}
	}

	// TODO: Free Company

	// Job Levels

	//console.log(scrape[_toScrape.charLevels]);
	//for (const charLevels of scrapeTagName("li", scrape[_toScrape.charLevels])) {
		//console.log(charLevels[0]);
	//}

	// Return

	console.log(data);

	return html;
}

// Export

module.exports = parse;