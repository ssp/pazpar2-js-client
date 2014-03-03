/**
 * Go through all terms in currentView.queryTerms and highlight their occurrences
 * inside element.
 *
 * @param {DOMElement} element - highlight the content of this
 * @returns {undefined}
 */
pz2_client.prototype.highlightSearchTerms = function (element) {

	/**
	 * Recursively go through element to find all text nodes and replace the
	 * occurrences of term in them with a version wrapped in a
	 * span.pz2-termHighlight do display highlighted on the page.
	 *
	 * @param {DOMElement} element - highlight the content of this
	 * @param {string} term - highlight this term
	 * @returns {integer} - number of nodes inserted into element
	 */
	var addHighlight = function (element, term) {
		var nodesInserted = 0;

		if (element.nodeType === 3) {
			// Text node: Highlight the text if found.
			var nodeContent = element.nodeValue.toLowerCase();

			var startIndex = 0;
			var matchIndex;
			var textElement = element;
			while ((matchIndex = nodeContent.indexOf(term, startIndex)) !== -1) {
				var matchedText = textElement.splitText(matchIndex - startIndex);
				var remainderText = matchedText.splitText(term.length);
				var highlight = document.createElement('span');
				highlight.setAttribute('class', 'pz2-termHighlight');
				highlight.appendChild(document.createTextNode(matchedText.nodeValue));
				textElement.parentNode.replaceChild(highlight, matchedText);
				textElement = remainderText;
				startIndex = matchIndex + term.length;
				nodesInserted += 2;
			}
		}
		else {
			// Other node: Recurse through child nodes.
			for (var nodeIndex = 0; nodeIndex < element.childNodes.length; nodeIndex++) {
				var node = element.childNodes[nodeIndex];
				if (node.tagName !== 'script' && node.tagName !== 'style') {
					nodeIndex += addHighlight(element.childNodes[nodeIndex], term);
				}
			}
		}

		return nodesInserted;
	};



	if (this.config.highlightSearchTerms) {
		for (var termIndex in this.currentView.queryTerms) {
			var term = this.currentView.queryTerms[termIndex];
			if (term) {
				addHighlight(element, term);
			}
		}
	}
};
