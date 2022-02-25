// Global

const {parseHtml} = require("./html");

const schema = require("./data_schema.json");

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

function _filterElements(html, cb=()=>{}) {
	const res = [];

	function _recurse(iter) {
		for (const obj of iter) {
			if (cb(obj))
				res.push(obj);
			_recurse(obj.children);
		}
	}

	_recurse(html);

	return res;
}

function scrapeClasses(html, list=[]) {
	const res = {};
	for (const className of list)
		res[className] = _filterElements(html, e=>e.classes.includes(className));
	return res;
}
function scrapeClassPrefix(html, pre) {
	return _filterElements(html, e=>e.classes.length&&e.classes.find(t=>t.startsWith(pre)));
}
function scrapeTagName(html, tag) {
	return _filterElements(html, e=>e.tag==tag);
}

// Parse character

function parse(content) {
	const _toScrape = schema.scrape.classes;

	const _rStat = /(.*) \+(.*)/;
		_rStatEmbed = /<span>(.*)<\/span> \+(.*)/,
		_rFormatKey = /[\s-]/g,
		_rFormatAttr = /__/g,
		_rBreak = /<br \/>/g;

	// Start Parse

	const data = {};

	const {html, info} = _charHtml(content),
	scrape = scrapeClasses(html, Object.values(_toScrape));

	// Character Info

	data.name = info.name.content;
	data.title = info.title ? info.title.content : null;
	
	const world = info.world.content.split(">").pop().match(/(.*) \((.*)\)/);
	data.world = world[1];
	data.datacenter = world[2];

	// Images

	data.portrait = scrape[_toScrape.charPortrait][0].src;
	data.image = scrapeTagName(scrape[_toScrape.charImage], "img")[0].src;

	// Profile

	for (const infoBox of scrape[_toScrape.infoBoxBlock]) {
		const values = infoBox.children.filter(_=>_.tag != "img");
		if (values.length < 2)
			continue;
		
		for (let i = 0; i<values.length; i+=2) {
			let key = values[i].content.toLowerCase().replace(_rFormatKey, "_"),
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
				value = value.content.replace(_rBreak, " / ");

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

	let bio = scrape[_toScrape.charBio][0];
	data.bio = bio ? bio.content : null;

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

	// Items

	let curJob = null;

	data.gear = {};
	for (const div of scrape[_toScrape.charItems]) {
		const slotName = schema.chara.item_slots[div.classes[0].split("-").pop()];

		let item = null;
		if (div.children.length > 0) {
			const elements = scrapeClassPrefix(div.children, _toScrape.iAttrPrefix),
				attributes = {};

			for (const e of elements) {
				const attr = e.class.split(_toScrape.iAttrPrefix)[1].split(" ")[0].replace(_rFormatAttr, "_");
				attributes[attr] = e.children.length > 0 ? e : e.content;
			}
			
			// Equippable Class

			let eqClass = attributes.item_equipment_class,
				splitClass = eqClass.split(" ");
			if (eqClass == eqClass.toUpperCase())
				eqClass = splitClass;

			if (slotName == "MainHand")
				curJob = attributes.item_category.split("'")[0];

			// Item Stats

			let stats = null;
			if (attributes.basic_bonus) {
				stats = {};
				for (const bonus of attributes.basic_bonus.children) {
					const match = bonus.content.match(_rStatEmbed);
					if (match)
						stats[match[1]] = match[2];
				}
			}

			// Item Materia

			let materia = null;
			if (attributes.materia) {
				materia = [];

				if (!attributes.materia_forbidden);
					attributes.materia_forbidden = {children:[]};
				for (const slot of [
					...attributes.materia.children,
					...attributes.materia_forbidden.children
				]) {
					const overmeld = slot.class.includes("materia__forbidden"),
						mItem = slot.children[1];

					if (!mItem) {
						materia.push(null);
						continue;
					}

					const match = mItem.children[0].content.match(_rStat);
					if (!match) continue;

					materia.push({
						name: mItem.content.split("<br")[0],
						attribute: [match[1], parseInt(match[2])],
						overmeld
					});
				}
			}

			// Item Object
			
			item = {
				name: attributes.item_name,
				category: attributes.item_category,
				class: eqClass,
				level: parseInt(attributes.item_equipment_level.split(" ").pop()),
				item_level: parseInt(attributes.item_level.split(" ").pop()),
				attributes: stats,
				properties: {
					sellable: !attributes.unsellable,
					market_sellable: !attributes.market_notsell,
					advanced_melding: materia > 0 && !attributes.cannot_materia_prohibition
				},
				materia
			};
		}

		data.gear[slotName] = item;
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

				if (curJob == obj.name || curJob == obj.class) {
					obj.current = true;
					data.job = obj;
				}

				data.jobs.push(obj);
			}
		}
	}

	// Attributes

	data.attributes = {};

	const params = scrapeTagName(scrape[_toScrape.charParams][0].children, "span");
	data.attributes.HP = params[0].content;
	data.attributes.MP = params[1].content;

	for (const attrs of scrape[_toScrape.charAttrs]) {
		for (const tr of attrs.children) {
			let stat = scrapeTagName(tr.children, "span")[0].content;
			if (stat.endsWith("Rate"))
				stat = stat.slice(0, -5);
			data.attributes[stat] = tr.children[1].content;
		}
	}

	// Return

	return data;
}

// Export

module.exports = parse;