// Global

const tagRegex = /<(.*?)>/g,
	propRegex = /([-A-z]*?)="(.*?)"/g

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

function parseHtml(content) {
	// Parse text

	const _elements = [];

	let exec, propExec;
	while ((exec = tagRegex.exec(content)) !== null) {
		const tagRaw = exec[0],
			tag = tagRaw.slice(1, Math.min(tagRaw.indexOf(" "), tagRaw.indexOf(">"))),
			properties = {};
		
		let innerText = null;
		if (tag != "input") {
			const start = exec.index + tagRaw.length;
			innerText = content.slice(start, start);
		}
		
		while ((propExec = propRegex.exec(tagRaw)) !== null) {
			const key = propExec[1],
				value = propExec[2];
			properties[key] = value;
		}

		_elements.push(Object.assign({
			tag,
			tagRaw,
			content: innerText,
			children: [],
			_index: exec.index
		}, properties));
	}

	// Result

	const result = [];

	while (_elements.length > 0) {
		const element = _recurse(_elements);
		if (element != null)
			result.push(element);
	}

	return result;
}

// Export

module.exports = {parseHtml};