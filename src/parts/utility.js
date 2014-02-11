/**
 * Empties result lists, userSettings (filters, term list visibility),
 * resets status and switches to first page and redisplays.
 *
 * @returns {undefined}
 */
pz2_client.prototype.resetPage = function () {
	this.curPage = 1;
	this.hitList = {};
	this.displayHitList = [];
	this.filterArray = {};
	for (var facetIndex in this.config.termLists) {
		this.config.termLists[facetIndex].showAll = undefined;
	}
	jQuery('.pz2-pager .pz2-progressIndicator').css({'width': 0});
	this.updateAndDisplay();
};



/**
 * Remove duplicate entries from an array.
 * The first occurrence of any item is kept, later ones are removed.
 * This function works in place and alters the original array.
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
	if (typeof(piwikTracker) !== 'undefined') {
		var pageURL = document.URL.replace(/\/$/,'') + '/pazpar2/' + action;
		if (info) {
			pageURL += '/' + info;
		}
		piwikTracker.setCustomUrl(pageURL);
		piwikTracker.trackPageView('pazpar2: ' + action);
		piwikTracker.setCustomUrl(document.URL);
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
 * Replaces characters from pazpar2 ids which are not allowed in HTML ids.
 *
 * @param {object} recordData
 * @returns {string}
 */
pz2_client.prototype.HTMLIDForRecordData = function (recordData) {
	var result;

	if (recordData.recid[0] !== undefined) {
		result = recordData.recid[0].replace(/ /g, '-pd-').replace(/\//g, '-pe-').replace(/\./g,'-pf-');
	}

	return result;
};



/**
 * Transform HTML id back to original pazpar id.
 * @param {string} – HTML id
 * @returns {string} - record id this HTML id belongs to
 */
pz2_client.prototype.recordIDForHTMLID = function (HTMLID) {
	return HTMLID.replace(/-pd-/g, ' ').replace(/-pe-/g, '/').replace(/-pf-/g, '.');
};



/**
 * Convenince method to append an item to another one, even if undefineds and arrays are involved.
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



/*	fieldContentsInRecord
	Returns array of data from a record's md-fieldName field.
		* special case for xtargets which is mapped to location/@name
		* special case for date which uses the date from each location rather than the merged range
	input:	fieldName - name of the field to use
			record - pazpar2 record
	output:	array with content of the field in the record
*/
pz2_client.prototype.fieldContentsInRecord = function (fieldName, record) {
	var result = [];

	if ( fieldName === 'xtargets' ) {
		// special case xtargets: gather server names from location info for this
		for (var xtargetsLocationNumber in record.location) {
			result.push(record.location[xtargetsLocationNumber]['@name']);
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
