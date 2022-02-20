// Global

const {parseHtml} = require("./html");

const _toScrape = {
	// Character Info
	infoBox: "character-block",
	infoBoxBlock: "character-block__box",
	// Free Company
	fcName: "character__freecompany__name",
	fcCrest: "character__freecompany__crest__image",
	// Jobs
	charLevels: "character__level__list"
};

// Parse HTML

function _charHtml(content) {
	const result = {
		info: {},
		html: null
	};
	
	// Parse

	const split = content.split("\n");

	let found = false,
		extCt = 0;
	for (const index in split) {
		let line = split[index];

		if (extCt < 3) {
			for (const ext of ["name", "title", "world"]) {
				if (!result[ext] && line.includes(`chara__${ext}`)) {
					result.info[ext] = parseHtml(line).shift();
					extCt++;
				}
			}
		}

		if (found) {
			if (line.startsWith("<div")) {
				result.html = parseHtml(line);
				break;
			}
		} else if (line.includes("character__content selected")) {
			found = true;
		}
	}

	// Return

	return result;
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

	const {html, info} = _charHtml(content),
	scrape = scrapeClasses(Object.values(_toScrape), html);

	// Character Info

	data.name = info.name.content;
	data.title = info.title.content;
	
	const world = info.world.content.split(">").pop().match(/(.*) \((.*)\)/);
	data.world = world[1];
	data.datacenter = world[2];

	// Profile

	for (const infoBox of scrape[_toScrape.infoBoxBlock]) {
		const values = infoBox.children.filter(_=>_.tag != "img");
		if (values.length < 2)
			continue;
		
		for (let i = 0; i<values.length; i+=2) {
			let key = values[i].content.toLowerCase().replace(/[\s-]/g, "_"),
				value = values[i+1];
			if (value.tag == "h4")
				value = value.children.shift();

			//console.log(key);
			
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

	// Free Company

	const fcName = scrape[_toScrape.fcName].shift();
	if (fcName) {
		let crest = null;

		let crestImgs = scrape[_toScrape.fcCrest].shift();
		if (crestImgs) {
			const imgs = crestImgs.children.map(_=>_.src);
			crest = {
				background: imgs[0],
				border: imgs[1],
				icon: imgs[2]
			};
		}

		const anchor = fcName.children[1].children[0];
		data['free_company'] = {
			name: anchor.content,
			id: anchor.href.split("/")[3],
			crest
		};
	}

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