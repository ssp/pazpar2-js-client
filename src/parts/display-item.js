/**
 * Create and return a LI with markup for the passed hit.
 *
 * @param {object} hit - data for a result
 * @returns {DOMElement} - LI element
 */
pz2_client.prototype.createResultItem = function (hit) {

	/**
	 * Create span DOM element and content for the given field name.
	 * Append it to the given container.
	 *
	 * @param {string} fieldName - key for a field stored in hit
	 * @param {DOMElement} container - (optional) the DOM element we created is appended here
	 * @param {string} prepend - (optional) inserted before the DOM element with the field data
	 * @param {string} append - (optional) appended after the DOM element with the field data
	 * @returns {DOMElement} the SPAN element that was appended
	 */
	var markupForField = function (fieldName, container, prepend, append) {
		var span;
		var fieldContent = hit['md-' + fieldName];

		if (fieldContent !== undefined && container) {
			that.deduplicate(fieldContent);
			span = document.createElement('span');
			jQuery(span).addClass('pz2-' + fieldName);
			span.appendChild(document.createTextNode(fieldContent.join('; ')));

			if (prepend) {
				container.appendChild(document.createTextNode(prepend));
			}

			container.appendChild(span);

			if (append) {
				container.appendChild(document.createTextNode(append));
			}
		}

		return span;
	};



	/**
	 * Return DOM SPAN element with markup for the current hit’s title.
	 *
	 * @returns {DOMElement} - SPAN element
	 */
	var titleInfo = function() {
		var titleCompleteElement = document.createElement('span');
		jQuery(titleCompleteElement).addClass('pz2-title-complete');

		var titleMainElement = document.createElement('span');
		titleCompleteElement.appendChild(titleMainElement);
		jQuery(titleMainElement).addClass('pz2-title-main');
		markupForField('title', titleMainElement);
		markupForField('multivolume-title', titleMainElement, ' ');

		markupForField('title-remainder', titleCompleteElement, ' ');
		markupForField('title-number-section', titleCompleteElement, ' ');

		titleCompleteElement.appendChild(document.createTextNode('. '));

		return titleCompleteElement;
	};



	/**
	 * Return DOM SPAN element with markup for the current hit’s author information.
	 * The pre-formatted title-responsibility field is preferred and a list of author
	 * names is used as a fallback.
	 * 
	 * @returns {DOMElement} - SPAN element
	 */
	var authorInfo = function() {
		var output;
		var outputText;

		if (hit['md-title-responsibility'] !== undefined) {
			// use responsibility field if available
			outputText = hit['md-title-responsibility'].join('; ');
		}
		else if (hit['md-author'] !== undefined) {
			// otherwise try to fall back to author fields
			var authors = [];
			for (var index = 0; index < hit['md-author'].length; index++) {
				if (index < that.config.maxAuthors) {
					var authorname = hit['md-author'][index];
					authors.push(authorname);
				}
				else {
					authors.push(that.localise('et al.'));
					break;
				}
			}

			outputText = authors.join('; ');
		}

		if (outputText) {
			output = document.createElement('span');
			jQuery(output).addClass('pz2-item-responsibility');
			output.appendChild(document.createTextNode(outputText));
		}

		return output;
	};



	/**
	 * Return a DOM SPAN element with the current hit’s journal information.
	 *
	 * @returns {DOMElement} - SPAN element
	 */
	var journalInfo = function () {
		var result = document.createElement('span');
		jQuery(result).addClass('pz2-journal');

		var journalTitle = markupForField('journal-title', result, ' – ' + that.localise('In') + ': ');
		if (journalTitle) {
			markupForField('journal-subpart', journalTitle, ', ');
			journalTitle.appendChild(document.createTextNode('.'));
		}
		else {
			result = undefined;
		}

		return result;
	};



	/**
	 * Called when a list item is clicked.
	 * Reveals/Hides the detail information for the record.
	 * Detail information is created when it is first needed and then stored with the record.
	 *
	 * @param {event} event
	 * @returns {undefined}
	 */
	var toggleDetails = function (event) {
		var jLI = jQuery(event.target).parents('li.pz2-record');
		var record = jLI.data('record');
		var jDetails = jQuery('.pz2-details', jLI);
		var jExtraLinks = jQuery('.pz2-extraLinks', record.detailsDiv);

		if (record.detailsDivVisible) {
			// Detailed record information is present: remove it
			jExtraLinks.fadeOut('fast');
			jDetails.slideUp('fast');
			record.detailsDivVisible = false;
			jLI.removeClass('pz2-detailsVisible');
			that.trackPiwik('details/hide');
		}
		else {
			// Create detail view if it doesn’t exist yet.
			if (!record.detailsDiv) {
				record.detailsDiv = that.renderDetails(record);
				that.runMathJax(record.detailsDiv);
			}

			// Append the detail view if it is not in the DOM.
			if (jDetails.length === 0) {
				jDetails = jQuery(record.detailsDiv);
				jDetails.hide();
				jLI.append(jDetails);
				jExtraLinks = jQuery('.pz2-extraLinks', jDetails);
			}

			jExtraLinks.hide();
			if (!that.MSIEVersion() || that.MSIEVersion() >= 8) {
				jDetails.slideDown('fast');
				jExtraLinks.fadeIn('fast');
			}
			else {
				jDetails.show();
				jExtraLinks.show();
			}

			record.detailsDivVisible = true;
			jLI.addClass('pz2-detailsVisible');
			that.trackPiwik('details/show');
		}

		return false;
	};



	var that = this;

	var LI = document.createElement('li');
	LI.setAttribute('class', 'pz2-record');
	jQuery(LI).data('record', hit);

	var linkElement = document.createElement('a');
	var jLinkElement = jQuery(linkElement);
	LI.appendChild(linkElement);
	linkElement.setAttribute('href', '#');
	jLinkElement.addClass('pz2-recordLink');
	jLinkElement.click(toggleDetails);

	var iconElement = document.createElement('span');
	linkElement.appendChild(iconElement);
	var mediaClass = 'unknown';
	if (hit['md-medium'].length === 1) {
		mediaClass = hit['md-medium'][0];
	}
	else if (hit['md-medium'].length > 1) {
		mediaClass = 'multiple';
	}
	jQuery(iconElement).addClass('pz2-mediaIcon ' + mediaClass);
	iconElement.title = that.localise(mediaClass, 'facet-medium');

	that.appendInfoToContainer(titleInfo(), linkElement);
	var authors = authorInfo();
	that.appendInfoToContainer(authors, linkElement);

	var journal = journalInfo();
	that.appendInfoToContainer(journal, linkElement);

	// The text in journal will contain a date. If it does not exist, append the date.
	if (!journal) {
		var spaceBefore = ' ';
		if (authors) {
			spaceBefore = ', ';
		}
		markupForField('date', linkElement, spaceBefore, '.');
	}

	if (that.config.provideCOinSExport) {
		that.appendInfoToContainer(that.COinSInfo(hit), LI);
	}

	if (that.config.useClipboard) {
		that.appendClipboardLinkForRecordToContainer(LI);
	}

	hit.li = LI;
	that.runMathJax(LI);
	that.highlightSearchTerms(LI);

	return LI;
};
