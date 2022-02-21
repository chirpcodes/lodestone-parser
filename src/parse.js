// Global

const {parseHtml} = require("./html");

const schema = require("./data_schema.json"),
	_toScrape = schema.scrape.classes;

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
			for (const ext of schema.scrape.chara) {
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
	data.title = info.title ? info.title.content : null;
	
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
				value = value.children[0];
			
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

	const fcName = scrape[_toScrape.fcName][0];
	if (fcName) {
		let crest = null;

		let crestImgs = scrape[_toScrape.fcCrest][0];
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

	data.jobs = [];
	for (const div of scrape[_toScrape.charLevels]) {
		const ul = div.children[0];
		for (const li of ul.children) {
			const level = parseInt(li.content.split(">").pop()),
				job = li.children[0]["data-tooltip"].split(" (")[0];
			if (level) {
				const obj = {};

				let name = job.split(" / ");
				if (name.length > 1 || schema.chara.base_classes.includes(name[0])) {
					obj.name = name[0];
					obj.class = name[1] || name[0];
					if (job == "Scholar") { // Special case
						obj.class = "Arcanist";
						obj.job_spec = true;
					} else {
						obj.job_spec = name.length > 1;
					}
				} else {
					obj.name = name[0];
					obj.class = name[0];
				}
				obj.level = level;

				data.jobs.push(obj);
			}
		}
	}

	// Items

	data.gear = {};
	for (const div of scrape[_toScrape.charItems]) {
		const slotName = schema.chara.item_slots[div.classes[0].split("-").pop()];
		//console.log(slotName);

		let item = null;

		for (const slot of div.children) {
		}

		data.gear[slotName] = item;
	}

	//console.log(data.gear);

	// Return

	//console.log(data);

	return html;
}

// Export

module.exports = parse;