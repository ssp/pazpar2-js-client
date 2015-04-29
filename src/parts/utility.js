/**
 * Return the number of search results.
 *
 * @returns {number}
 */
pz2_client.prototype.resultCount = function () {
	if (this.config.usePazpar2Facets && this.currentView.type === 'query') {
		return this.currentView.resultCount;
	}
	else {
		return this.displayHitList.length;
	}
};



/**
 * Remove duplicate entries from an array.
 * The first occurrence of any item is kept, later ones are removed.
 * This function works in place and alters the original array.
 *
 * @param {array} information - array to remove duplicate entries from.
 * @returns {undefined}
 */
pz2_client.prototype.deduplicate = function (information) {
	if (information) {
		for (var i = 0; i < information.length; i++) {
			var item = information[i].toLowerCase();
			var isDuplicate = false;
			for (var j = 0; j < i; j++) {
				var jtem = information[j].toLowerCase();
				if (item === jtem) {
					isDuplicate = true;
					information.splice(i, 1);
					i--;
					break;
				}
			}
		}
	}
};



/**
 * Log a user action with Piwik if it is available.
 *
 * @param {string} action - string of the user’s action, possibly in the style of a Unix file path
 * @param {string} info - string with additional information regarding the action [optional]
 * @returns {undefined}
 */
pz2_client.prototype.trackPiwik = function (action, info) {
	if (typeof _paq !== 'undefined') {
		var pageURL = document.URL.replace(/\/$/,'') + '/pazpar2/' + action;
		if (info) {
			pageURL += '/' + info;
		}
		_paq.push(['setCustomUrl', pageURL]);
		_paq.push(['trackPageView', 'pazpar2: ' + action]);
		_paq.push(['setCustomUrl', document.URL]);
	}
};



/**
 * Tell MathJax to process the passed element, if it is loaded.
 *
 * @param {DOMElement} element
 * @returns {undefined}
 */
pz2_client.prototype.runMathJax = function (element) {
	if (typeof(MathJax) !== 'undefined') {
		MathJax.Hub.Queue(["Typeset", MathJax.Hub, element]);
	}
};



/**
 * Function to remove the dependence on jQuery.browser (removed in jQuery 1.9)
 * Takes the only part of the jQuery code we need from:
 * https://github.com/jquery/jquery-migrate/blob/master/src/core.js
 * @returns {number} - number of the IE version we are running in | undefined if not running in IE
 */
pz2_client.prototype.MSIEVersion = function () {
	var version;
	
	var agentString = navigator.userAgent.toLowerCase();
	var IEAgentMatch = /(msie) ([\w.]+)/.exec(agentString);
	if (IEAgentMatch) {
		version = parseFloat(IEAgentMatch[2]);
	}

	return version;
};



/**
 * Convenience method to append an item to another one, even if undefineds and arrays are involved.
 *
 * @param {DOMElement} info - the element to insert
 * @param {type} container - the element to insert info into
 * @returns {undefined}
 */
pz2_client.prototype.appendInfoToContainer = function (info, container) {
	if (info !== undefined && container !== undefined ) {
		if (info.constructor !== Array) {
			// info is a single item
			container.appendChild(info);
		}
		else {
			for (var infoNumber in info) {
				container.appendChild(info[infoNumber]);
			}
		}
	}
};



/**
 * Add a target attribute to open in our target window and add a note
 * to the title about this fact.
 * The link’s title element should be set before calling this function.
 *
 * @param {DOMElement} link - a element
 * @returns {undefined} -
 */
pz2_client.prototype.turnIntoNewWindowLink = function (link) {
	if (link) {
		link.setAttribute('target', 'pz2-linkTarget');
		jQuery(link).addClass('pz2-newWindowLink');

		var newTitle = this.localise('Erscheint in separatem Fenster.');
		if (link.title) {
			var oldTitle = link.title;
			newTitle = oldTitle + ' (' + newTitle + ')';
		}
		link.title = newTitle;

		if (typeof(piwikTracker) !== 'undefined') {
			piwikTracker.addListener(link);
		}
	}
};



/**
 * Returns array of data from a record’s md-fieldName field.
 * * special case for xtargets which is mapped to location/@name
 * * special case for date which uses the date from each location rather than the merged range
 *
 * @param {string} fieldName - name of the field to use
 * @param {object} record - pazpar2 record
 * @returns {Array} - content of the field in the record
 */
pz2_client.prototype.fieldContentsInRecord = function (fieldName, record) {
	var result = [];

	if ( fieldName === 'xtargets' ) {
		// special case xtargets: gather server names from location info for this
		for (var xtargetsLocationNumber in record.location) {
			result.push(record.location[xtargetsLocationNumber]['@id']);
		}
	}
	else if ( fieldName === 'date' ) {
		// special case for dates: go through locations and collect date for each edition
		for (var dateLocationNumber in record.location) {
			var date = record.location[dateLocationNumber]['md-date'];
			if (date) {
				if (typeof(date) === 'string') {
					result.push(date);
				}
				else if (typeof(date) === 'object') {
					for (var datenumber in date) {
						result.push(date[datenumber]);
					}
				}
			}
		}
	}
	else {
		result = record['md-' + fieldName];
	}

	return result;
};



/**
 * Returns marked up version of the DOM items passed, putting them into a list if necessary:
 *
 * * 1-element array => just the element
 * * multi-element array => UL with an LI containing each of the elements
 * * empty array => undefined
 *
 * @param {type} infoItems - array of DOM elements to insert
 * @returns {DOMElement}
 */
pz2_client.prototype.markupInfoItems = function (infoItems) {
	var result;

	if (infoItems.length === 1) {
		result = infoItems[0];
	}
	else if (infoItems.length > 1) {
		result = document.createElement('ul');
		jQuery(infoItems).each( function(index) {
				var LI = document.createElement('li');
				result.appendChild(LI);
				LI.appendChild(this);
			}
		);
	}

	return result;
};



/**
 * Using the passed title and data elements, return an array with:
 * 0: DT element with the titleElement
 * 1: DD element with the informationElement
 *
 * @param {DOMElement} titleElement - DOM element containing the title
 * @param {DOMElement} dataElement - DOM element with the information to be displayed
 * @param {object} attributes - attributes added to the resulting elements (optional)
 * @returns {Array}
 */
pz2_client.prototype.detailLineBasic = function (titleElement, dataElement, attributes) {
	var line, attributeName;
	if (titleElement && dataElement) {
		var rowTitleElement = document.createElement('dt');
		for (attributeName in attributes) {
			rowTitleElement.setAttribute(attributeName, attributes[attributeName]);
		}
		rowTitleElement.appendChild(titleElement);

		var rowDataElement = document.createElement('dd');
		for (attributeName in attributes) {
			rowDataElement.setAttribute(attributeName, attributes[attributeName]);
		}
		rowDataElement.appendChild(dataElement);

		line = [rowTitleElement, rowDataElement];
	}

	return line;
};



/**
 * Return array with hyphen-less ISBNs from all the record’s locations.
 *
 * @param {object} record
 * @returns {Array}
 */
pz2_client.prototype.ISBNsForRecord = function (record) {
	var ISBNs = [];

	for (var locationNumber in record.location) {
		var ISBNField = String(record.location[locationNumber]['md-isbn']);
		var matches = ISBNField.replace(/-/g,'').match(/[0-9]{9,12}[0-9xX]/g);
		if (matches) {
			for (var ISBNMatchNumber = 0; ISBNMatchNumber < matches.length; ISBNMatchNumber++) {
				ISBNs.push(matches[ISBNMatchNumber]);
			}
		}
	}

	return ISBNs;
};



/**
 * Return array with OCLC numbers from all the record’s locations.
 *
 * @param {object} record
 * @returns {Array}
 */
pz2_client.prototype.OCLCNumbersForRecord = function (record) {
	var OCLCNumbers = [];

	for (var locationNumber in record.location) {
		var OCLCNumberField = String(record.location[locationNumber]['md-oclc-number']);
		var matches = OCLCNumberField.match(/[0-9]{4,}/g);
		if (matches) {
			for (var OCLCMatchNumber = 0; OCLCMatchNumber < matches.length; OCLCMatchNumber++) {
				OCLCNumbers.push(matches[OCLCMatchNumber]);
			}
		}
	}

	return OCLCNumbers;
};



/**
 * Try to sanitise the passed string for use in CSS class names.
 *
 * @param {string} string
 * @returns {string}
 */
pz2_client.prototype.classNameForString = function (string) {
	return string.replace(/[- ,.\/]/g , '-');
};



/**
 * Add the keys() function to Object if necessary.
 * http://stackoverflow.com/questions/126100/
 */
if (!Object.keys) {
	Object.keys = function (obj) {
		var keys = [],
			k;
		for (k in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, k)) {
				keys.push(k);
			}
		}
		return keys;
	};
}
