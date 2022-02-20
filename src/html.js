// Global

const tagRegex = /<(.*?)>/g,
	propRegex = /([-A-z]*?)="(.*?)"/g;

const _noClose = ["input", "img"];

// Parse HTMl elements into JSON

function _recurse(elements, content) {
	const first = elements.pop();
	if (!first) return null;

	while (elements.length > 0) {
		const next = elements[elements.length-1];

		if (next.tag == `/${first.tag}`) {
			elements.pop();
			first.content = content.slice(first._end, next._index);
			break;
		}

		const child = _recurse(elements, content, next);
		if (child)
			first.children.push(child);
	}

	return first;
}

function parseHtml(content) {
	// Parse text

	let _elements = [];

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

	_elements = _elements.reverse();

	// Result

	const result = [];

	while (_elements.length > 0) {
		const element = _recurse(_elements, content);
		if (element != null)
			result.push(element);
	}

	return result;
}

// Export

module.exports = {parseHtml};