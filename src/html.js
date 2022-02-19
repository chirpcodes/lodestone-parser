// Global

const tagRegex = /<(.*?)>/g;

// Parse HTMl elements into JSON

function _recurse(elements, _fallback) {
	const first = elements.splice(0, 1)[0];

	if (!first || first.tagRaw.startsWith("</"))
		return _fallback || null;

	while (elements.length > 0) {
		const second = elements.splice(0, 1)[0];
		if (first.tagRaw.startsWith("<input") || second.tagRaw.startsWith("</"))
			break;
		first.children.push(_recurse(elements, second));
	}
	
	return first;
}

function _parseElements(elements) {
	const list = [];

	while (elements.length > 0) {
		const element = _recurse(elements);
		if (element != null)
			list.push(element);
	}

	return list;
}

function parseHtml(content) {
	const elements = [];

	let exec;
	while ((exec = tagRegex.exec(content)) !== null) {
		const tagRaw = exec[0];

		elements.push({
			tagRaw,
			tag: tagRaw.slice(1, Math.min(tagRaw.indexOf(" "), tagRaw.indexOf(">"))),
			index: exec.index,
			children: []
		});
	}

	const res = JSON.stringify(_parseElements(elements), null, 4);

	return res;
}

// Export

module.exports = {parseHtml};