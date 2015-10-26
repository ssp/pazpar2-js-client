/**
 * Updates all facet lists for the facet types stored in termLists.
 *
 * @returns {undefined}
 */
pz2_client.prototype.updateFacetLists = function () {

	/**
	 * Create DOM elements for the facet list of the requested type.
	 * Uses facet information stored in facetData.
	 *
	 * @param {string} type - facet ID
	 * @returns {DOMElement} - elements for displaying the facets
	 */
	var facetListForType = function (type) {

		/**
		 * Return whether there is a filter for the facets of type type.
		 *
		 * @param {string} type - ID of the facet to get information for
		 * @returns {boolean}
		 */
		var isFilteredForType = function (type) {
			var result = false;
			if (that.currentView.filters[type]) {
				result = (Object.keys(that.currentView.filters[type]).length > 0);
			}
			return result;
		};



		/**
		 * Return list with facet information.
		 *
		 * @param {string} type - ID of the facet to get information for
		 * @returns {array} - of objects with properties 'name' and 'freq'(uency)
		 */
		var facetInformationForType = function (type) {

			/**
			 * Return list with facet information for the given type.
			 * Generate the list from the records that are availble/displayed.
			 *
			 * @param {string} type - ID of the facet to return facet information for
			 * @returns {array} - of objects with properties 'name' and 'freq'(uency)
			 */
			var facetInformationFromRecordsForType = function (type) {
				var terms = [];

				var termDict = {};
				var recordList = that.displayHitList;
				if (type === 'filterDate') {
					recordList = that.displayHitListUpToDate;
				}
				for (var recordIndex in recordList) {
					var record = recordList[recordIndex];
					var dataArray = that.fieldContentsInRecord(type, record);
					var countsToIncrement = {};
					for (var index in dataArray) {
						var data = dataArray[index];
						countsToIncrement[data] = true;
					}

					for (var countTerm in countsToIncrement) {
						if (!termDict[countTerm]) {
							termDict[countTerm] = 0;
						}
						termDict[countTerm]++;
					}
				}

				for (var term in termDict) {
					terms.push({'name': term, 'freq': termDict[term]});
				}

				// Sort by term frequency.
				if (terms.length > 0) {
					terms.sort( function(term1, term2) {
							if (term1.freq < term2.freq) {return 1;}
							else if (term1.freq === term2.freq) {
								if (term1.name < term2.name) {return -1;}
								else {return 1;}
							}
							else {return -1;}
						}
					);
				}

				return terms;
			};



			var termList = [];

			if (that.config.usePazpar2Facets && that.currentView.type === 'query') {
				termList = that.facetData[type];
				if (termList && termList.length > 0) {
					termList.maximumNumber = termList[0].freq;
				}
			}
			else {
				termList = facetInformationFromRecordsForType(type);
			}

			return termList;
		}; // end of facetInformationForType



		/**
		 * Do a bit of facet cleanup and analysis.
		 *
		 * @param {array} terms - facet terms to display
		 * @param {string} type - ID of the facet to return facet information for
		 */
		var massageTerms = function (terms, type) {
			// Note the maximum number
			if (terms.length > 0) {
				terms.maximumNumber = terms[0].freq;
			}

			if (type === 'filterDate' && !that.config.useHistogramForYearFacets) {
				// Special treatment for dates when displaying them as a list:
				// take the most frequent items and sort by date if we are not using the histogram.
				var maximumDateFacetCount = parseInt(that.config.termLists['filterDate'].maxFetch, 10);
				if (terms.length > maximumDateFacetCount) {
					terms.splice(maximumDateFacetCount, terms.length - maximumDateFacetCount);
				}
				terms.sort( function(term1, term2) {
						return (term1.name < term2.name) ? 1 : -1;
					}
				);
			}
			else if (type === 'language' || type === 'medium') {
				// Special handling for languages and media types:
				// put 'unknown' item at the end of the list.
				var unknownString = (type === 'language' ? 'zzz' : 'other');

				var unknownItemIndex;
				for (var termIndex in terms) {
					if (terms[termIndex].name === unknownString) {
						unknownItemIndex = termIndex;
						break;
					}
				}
				if (unknownItemIndex !== undefined) {
					var unknownItem = terms.splice(unknownItemIndex, 1);
					terms.push(unknownItem[0]);
				}
			}
		};



		/**
		 * Create the link for removing a (text) facet selection.
		 *
		 * @return {DOMElement} - link
		 */
		var createFacetCancelLink = function () {
			var cancelLink = document.createElement('a');
			cancelLink.setAttribute('href', '#');
			jQuery(cancelLink).addClass('pz2-facetCancel');
			cancelLink.appendChild(document.createTextNode(that.localise('Filter aufheben', 'facets')));
			return cancelLink;
		};



		/**
		 * Return OL with facet items for the passed terms.
		 *
		 * @param {array} terms - facet terms to display
		 * @param {string} type - ID of the facet to return facet information for
		 * @returns {DOMElement} - ol with facet list
		 */
		var facetDisplayTermsForType = function (terms, type) {
			massageTerms(terms, type);

			var list = document.createElement('ol');

			// Determine whether facets need to be hidden.
			// Avoid hiding less than 3 facets.
			var needToHideFacets = (terms.length > parseInt(that.config.termLists[type].maxFetch, 10) + 2) &&
									(that.config.termLists[type].showAll !== true);
			var invisibleCount = 0;


			// Loop through list of terms for the type and create an item with link for each one.
			for (var facetIndex = 0; facetIndex < terms.length; facetIndex++) {
				var facet = terms[facetIndex];
				var item = document.createElement('li');
				list.appendChild(item);
				var jItem = jQuery(item);
				var facetTerm = (facet.id ? facet.id : facet.name);
				jItem.attr('facetTerm', facetTerm);

				// Make items beyond the display limit invisible unless otherwise
				// requested. Be a bit wiggly about this to avoid hiding less than 3
				// items
				if (needToHideFacets &&
					facetIndex >= parseInt(that.config.termLists[type].maxFetch, 10) &&
					!(type === 'language' && facetTerm === 'zzz')) {
					jItem.addClass('pz2-facet-hidden');
					invisibleCount++;
				}

				// Link
				var link = document.createElement('a');
				item.appendChild(link);
				link.setAttribute('href', '#');
				link.setAttribute('class', 'pz2-facetSelect');

				// »Progress bar« to visualise the number of results
				var progressBar = document.createElement('div');
				link.appendChild(progressBar);
				var progress = facet.freq / terms['maximumNumber'] * 100;
				progressBar.setAttribute('style', 'width:' + progress + '%;');
				jQuery(progressBar).addClass('pz2-progressIndicator');

				// Facet display name
				var facetDisplayName = that.localise(facetTerm, 'facet-' + type);
				var textSpan = document.createElement('span');
				link.appendChild(textSpan);
				jQuery(textSpan).addClass('pz2-facetName');
				textSpan.appendChild(document.createTextNode(facetDisplayName));

				// Hit Count
				var count = document.createElement('span');
				link.appendChild(count);
				jQuery(count).addClass('pz2-facetCount');
				count.appendChild(document.createTextNode(facet.freq));
				var target = that.targetStatus[facetTerm];
				if (type === 'xtargets' && target) {
					if (target.state === 'Client_Idle') {
						// When the client is finished with data transfers, check whether
						// we need to add the overflow indicator.
						var hitOverflow = target.hits - target.records;
						if (hitOverflow > 0) {
							count.appendChild(document.createTextNode(that.localise('+', 'status')));
							var titleString = that.localise('In diesem Katalog gibt es noch # weitere Treffer.', 'status');
							titleString = titleString.replace('#', hitOverflow);
							item.title = titleString;
						}
					}
					else if (target.state === 'Client_Working') {
						// While transfers from the target are still running, append an
						// ellipsis to indicate that we are busy.
						count.appendChild(document.createTextNode(that.localise('...', 'status')));
					}
					else if (target.state === 'Client_Error' || target.state === 'Client_Disconnected') {
						// If an error occurred for the target, indicate that.
						count.appendChild(document.createTextNode(that.localise('Error indicator', 'status')));
					}
				}

				// Media icons
				if (type === 'medium') {
					var mediaIcon = document.createElement('span');
					link.appendChild(mediaIcon);
					jQuery(mediaIcon).addClass('pz2-mediaIcon ' + facetTerm);
				}

				// Mark facets which are currently active and add button to remove faceting.
				if (isFilteredForType(type)) {
					for (var filterTerm in that.currentView.filters[type]) {
						if (facetTerm === filterTerm) {
							jItem.addClass('pz2-activeFacet');
							item.appendChild(createFacetCancelLink());
							break;
						}
					}
				}
			}

			// If some facets are hidden, add a show all button at the very end.
			if (needToHideFacets) {
				var showAllItem = document.createElement('li');
				list.appendChild(showAllItem);
				jQuery(showAllItem).addClass('pz2-facet-showAll');

				var showLink = document.createElement('a');
				showAllItem.appendChild(showLink);
				showLink.setAttribute('href', '#');

				var showLinkText = that.localise('# weitere anzeigen', 'facets').replace('#', invisibleCount);
				showLink.appendChild(document.createTextNode(showLinkText));
			}

			return list;
		}; // end of facetDisplayTermsForType



		// Create container and heading.
		var container = document.createElement('div');
		container.setAttribute('facetType', type);
		jQuery(container).addClass('pz2-termList pz2-termList-' + type);

		var terms = facetInformationForType(type);

		// Always display facet list if it is filtered. Otherwise require
		// at least .minDisplay facet elements.
		if (terms &&
			(terms.length >= parseInt(that.config.termLists[type].minDisplay, 10) ||
			that.currentView.filters[type])) {
			var heading = document.createElement('h5');
			container.appendChild(heading);
			var headingText = that.localise(type, 'facet');
			if (isFilteredForType(type)) {
				headingText += ' [' + that.localise('gefiltert', 'facets') + ']';
			}
			heading.appendChild(document.createTextNode(headingText));

			if (terms.length > 0) {
				// We have facet terms: display them.
				if (that.config.useHistogramForYearFacets &&
					(type === 'filterDate' || type === 'date') &&
					(!that.MSIEVersion() || that.MSIEVersion() >= 9)) {
					// Display histogram if set up and able to do so.
					that.appendFacetHistogramForDatesTo(terms, type, container);
				}
				else {
					// Display standard facet terms.
					container.appendChild(facetDisplayTermsForType(terms, type));
				}
			}
			else {
				// There are no facet terms, but a facet has been selected.
				// This would not happen if filtering always worked perfectly,
				// but as it does, give the user a chance to undo the facet selection.
				var facetCancelLink = createFacetCancelLink();
				jQuery(facetCancelLink).addClass('pz2-activeFacet');
				container.appendChild(facetCancelLink);
			}
		}

		return container;
	}; // end of facetListForType



	var that = this;

	var jContainer = jQuery('.pz2-termLists');
	if (jContainer.length > 0) {
		jContainer.empty();

		var mainHeading = document.createElement('h4');
		jContainer.append(mainHeading);
		mainHeading.appendChild(document.createTextNode(that.localise('Facetten', 'facets')));

		for (var facetType in that.config.termLists ) {
			jContainer.append(facetListForType(facetType));
		}
	}
};
