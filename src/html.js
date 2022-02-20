// Global

const tagRegex = /<(.*?)>/g,
	propRegex = /([-A-z]*?)="(.*?)"/g;

const _noClose = ["input", "img"];

// Parse HTMl elements into JSON

let __i = 0;

function _recurse(elements, _fallback, _content = "") {
	const first = elements.splice(0, 1)[0];
	
	let close = first && first.tag.startsWith("/");
	if (close && _fallback) {
		_fallback.content = _content.slice(_fallback._end, first._index);
	}
	if (!first || first.tag.startsWith("/"))
		return _fallback || null;

	while (elements.length > 0) {
		const second = elements.splice(0, 1)[0];
		if (second.tagRaw.startsWith("</")) {
			first.content = _content.slice(first._end, second._index);
			break;
		}
		first.children.push(_recurse(elements, second, _content));
	}
	
	return first;
}

function parseHtml(content) {
	// Parse text

	const _elements = [];

	let exec, propExec;
	while ((exec = tagRegex.exec(content)) !== null) {
		const tagRaw = exec[0],
			tag = tagRaw.slice(1, Math.min(tagRaw.indexOf(" "), tagRaw.indexOf(">"))),
			properties = {};
		
		if (tag == "br")
			continue;
		
		while ((propExec = propRegex.exec(tagRaw)) !== null) {
			const key = propExec[1],
				value = propExec[2];
			properties[key] = value;
		}
		const classes = properties.class ? properties.class.split(" ") : [],
			_end = exec.index + tagRaw.length;

		_elements.push(Object.assign({
			tag,
			tagRaw,
			content: null,
			children: [],
			_index: exec.index,
			_end,
			classes
		}, properties));

		if (_noClose.includes(tag)) {
			_elements.push({
				tag: `/${tag}`,
				tagRaw: `</${tag}>`,
				children: [],
				classes: [],
				_index: _end,
				_end
			});
		}
	}

	// Result

	const result = [];

	while (_elements.length > 0) {
		const element = _recurse(_elements, null, content);
		if (element != null)
			result.push(element);
	}

	return result;
}

// Export

module.exports = {parseHtml};