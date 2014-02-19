/**
 * pazpar2 callback for receiving facet data.
 * Stores facet data and recreates facets on page.
 *
 * @param {array} data - pazpar2 termlist information
 * @returns {undefined}
 */
pz2_client.prototype.onterm = function (data) {
	this.facetData = data;
};



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
	 * @param {boolean} preferOriginalFacets - use pazpar2’s facets or build our own?
	 * @returns {DOMElement} - elements for displaying the facets
	 */
	var facetListForType = function (type, preferOriginalFacets) {

		var classNameRegEx = /[ ,.\/]/g;

		/*	limitResults
			Adds a filter for term for the data of type kind. Then redisplays.
			input:	* kind - string with name of facet type
					* term - string that needs to match the facet
		*/
		var limitResults = function (kind, term) {
			if (that.filterArray[kind]) {
				// add additional condition to an existing filter
				that.filterArray[kind].push(term);
			}
			else {
				// the first filter of its kind: create array
				that.filterArray[kind] = [term];
			}

			// Mark with class for selected facet. Remove spaces from strings.
			var baseName = 'pz2-term-selected-' + kind.replace(' ', '-');
			var termString = (jQuery.type(term) === 'string' ? term : term.from + '-' + term.to).replace(classNameRegEx, '-');
			jQuery('#pazpar2')
				.addClass(baseName)
				.addClass(baseName + '-' + termString);

			that.curPage = 1;
			that.updateAndDisplay();

			that.trackPiwik('facet/limit', kind);
		};



		/*	delimitResults
			Removes a filter for term from the data of type kind. Then redisplays.
			input:	* kind - string with name of facet type
					* term (optional) - string that shouldn't be filtered for
							all terms are removed if term is omitted.
		*/
		var delimitResults = function (kind, term) {
			if (that.filterArray[kind]) {
				var jPazpar2 = jQuery('#pazpar2');
				var baseName = 'pz2-term-selected-' + kind.replace(classNameRegEx, '-');
				if (term) {
					// if a term is given only delete occurrences of 'term' from the filter
					var termString = (jQuery.type(term) === 'string' ? term : term.from + '-' + term.to).replace(classNameRegEx, '-');
					for (var index = that.filterArray[kind].length -1; index >= 0; index--) {
						if (that.filterArray[kind][index] === term) {
							that.filterArray[kind].splice(index,1);
						}
					}
					jPazpar2.removeClass(baseName + '-' + termString);

					if (that.filterArray[kind].length === 0) {
						// all terms of this kind have been removed: remove kind from filterArray
						that.filterArray[kind] = undefined;
						jPazpar2.removeClass(baseName);
					}
				}
				else {
					// if no term is given, delete the complete filter
					that.filterArray[kind] = undefined;
					var classes = jPazpar2.attr('class').split(' ');
					for (var classIndex in classes) {
						var className = classes[classIndex];
						if (className.substr(0, baseName.length) === baseName) {
							jPazpar2.removeClass(className);
						}
					}
				}

				that.updateAndDisplay();

				that.trackPiwik('facet/delimit', kind);
			}
		};


		var facetItemSelect = function () {
			var jThis = jQuery(this);
			var facetName = jThis.parents('[facettype]').attr('facettype');  // TODO: need to run .replace(/"/g, '\\"') ?
			var facetTerm = jThis.parents('li').attr('facetTerm');
			limitResults(facetName, facetTerm);
			return false;
		};


		var facetItemDeselect = function () {
			var jThis = jQuery(this);
			var facetName = jThis.parents('[facettype]').attr('facettype');  // TODO: need to run .replace(/"/g, '\\"') ?
			var facetTerm = jThis.parents('li').attr('facetTerm');
			delimitResults(facetName, facetTerm);
			return false;
		};



		/*	isFilteredForType
			Returns whether there is a filter for the given type.
			input:	type - string with the type's name
			output:	boolean indicating whether there is a filter or not
		*/
		var isFilteredForType = function (type) {
			var result = false;
			if (that.filterArray[type]) {
				result = (that.filterArray[type].length > 0);
			}
			return result;
		};


		/*	facetInformationForType
			Creates list with facet information.
				* information is collected from the filtered hit list.
				* list is sorted by term frequency.
			output:	list of Objects with properties 'name' and 'freq'(uency)
						(these are analogous to the Objects passed to the callback by pz2.js)
		*/
		var facetInformationForType = function (type) {
			/*	isFiltered
				Returns whether there is any filter active.
					(One may want to use pazpar2's original term lists if not.)
				output:	boolean indicating whether a filter is active
			*/
			var isFiltered = function () {
				var isFiltered = false;
				for (var filterType in that.filterArray) {
					isFiltered = isFilteredForType(filterType);
					if (isFiltered) {break;}
				}
				return isFiltered;
			};


			var termList = [];
			if (!isFiltered() && preferOriginalFacets) {
				termList = that.facetData[type];
			}
			else {
				// Loop through data ourselves to gather facet information.
				var termArray = {};
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
						if (!termArray[countTerm]) {
							termArray[countTerm] = 0;
						}
						termArray[countTerm]++;
					}
				}

				// Sort by term frequency.
				for (var term in termArray) {
					termList.push({'name': term, 'freq': termArray[term]});
				}

				if (termList.length > 0) {
					termList.sort( function(term1, term2) {
							if (term1.freq < term2.freq) {return 1;}
							else if (term1.freq === term2.freq) {
								if (term1.name < term2.name) {return -1;}
								else {return 1;}
							}
							else {return -1;}
						}
					);

					// Note the maximum number
					termList['maximumNumber'] = termList[0].freq;

					if (type === 'filterDate' && !that.config.useHistogramForYearFacets) {
						// Special treatment for dates when displaying them as a list:
						// take the most frequent items and sort by date if we are not using the histogram.
						var maximumDateFacetCount = parseInt(that.config.termLists['filterDate'].maxFetch, 10);
						if (termList.length > maximumDateFacetCount) {
							termList.splice(maximumDateFacetCount, termList.length - maximumDateFacetCount);
						}
						termList.sort( function(term1, term2) {
								return (term1.name < term2.name) ? 1 : -1;
							}
						);
					}
					else if (type === 'language') {
						// Special case for languages: put 'unknown' at the end of the list.
						for (var termIndex in termList) {
							var termItem = termList[termIndex];
							if (termItem.name === 'zzz') {
								termList.splice(termIndex, 1);
								termList.push(termItem);
							}
						}
					}
				}
			}

			return termList;
		};



		var facetDisplayTermsForType = function (terms, type) {
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
				jItem.attr('facetTerm', facet.name);

				// Make items beyond the display limit invisible unless otherwise
				// requested. Be a bit wiggly about this to avoid hiding less than 3
				// items
				if (needToHideFacets &&
					facetIndex >= parseInt(that.config.termLists[type].maxFetch, 10) &&
					!(type === 'language' && facet.name === 'zzz')) {
					jItem.addClass('pz2-facet-hidden');
					invisibleCount++;
				}

				// Link
				var link = document.createElement('a');
				item.appendChild(link);
				link.setAttribute('href', '#');
				jQuery(link).click(facetItemSelect);

				// 'Progress bar'
				var progressBar = document.createElement('div');
				link.appendChild(progressBar);
				var progress = facet.freq / terms['maximumNumber'] * 100;
				progressBar.setAttribute('style', 'width:' + progress + '%;');
				jQuery(progressBar).addClass('pz2-progressIndicator');

				// Facet display name
				var facetDisplayName = that.localise(facet.name, 'facet-' + type);
				var textSpan = document.createElement('span');
				link.appendChild(textSpan);
				jQuery(textSpan).addClass('pz2-facetName');
				textSpan.appendChild(document.createTextNode(facetDisplayName));

				// Hit Count
				var count = document.createElement('span');
				link.appendChild(count);
				jQuery(count).addClass('pz2-facetCount');
				count.appendChild(document.createTextNode(facet.freq));
				var target = that.targetStatus[facet.name];
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
					jQuery(mediaIcon).addClass('pz2-mediaIcon ' + facet.name);
				}

				// Mark facets which are currently active and add button to remove faceting.
				if (isFilteredForType(type)) {
					for (var filterIndex in that.filterArray[type]) {
						if (facet.name === that.filterArray[type][filterIndex]) {
							jItem.addClass('pz2-activeFacet');
							var cancelLink = document.createElement('a');
							var jCancelLink = jQuery(cancelLink);
							item.appendChild(cancelLink);
							cancelLink.setAttribute('href', '#');
							jCancelLink.addClass('pz2-facetCancel');
							jCancelLink.click(facetItemDeselect);
							cancelLink.appendChild(document.createTextNode(that.localise('Filter aufheben', 'facets')));
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

				var showAllFacetsOfType = function () {
					var containingList = jQuery(this).parents('[facettype]');

					// Fade in the hidden elemens and hide the Show All link.
					jQuery('.pz2-facet-hidden', containingList).slideDown(300);
					jQuery('.pz2-facet-showAll', containingList).fadeOut(200);

					// Store the current state in the termLists object for the current facet type.
					var facetType = containingList.attr('facetType');
					that.config.termLists[facetType].showAll = true;
					return false;
				};

				jQuery(showLink).click(showAllFacetsOfType);
				var showLinkText = that.localise('# weitere anzeigen', 'facets').replace('#', invisibleCount);
				showLink.appendChild(document.createTextNode(showLinkText));
			}

			return list;
		};

		/*	appendFacetHistogramForDatesTo
			Appends a histogram facet for the passed terms (years).
			inputs:	terms - array of objects with keys »name« and »freq«
					histogramContainer - DOMElement to append the histogram to
		*/
		var appendFacetHistogramForDatesTo = function (terms, histogramContainer) {
			var histogramConfig = {'barWidth': 1};

			if (isFilteredForType('filterDate')) {
				var cancelLink = document.createElement('a');
				var jCancelLink = jQuery(cancelLink);
				histogramContainer.appendChild(cancelLink);
				cancelLink.setAttribute('href', '#');
				jCancelLink.addClass('pz2-facetCancel pz2-activeFacet');
				jCancelLink.click(facetItemDeselect);
				var yearString = that.filterArray['filterDate'][0].from;
				if (that.filterArray['filterDate'][0].from !== that.filterArray['filterDate'][0].to - 1) {
					yearString += '-' + (that.filterArray['filterDate'][0].to - 1);
				}
				var cancelLinkText = that.localise('Filter # aufheben', 'facets').replace('#', yearString);
				cancelLink.appendChild(document.createTextNode(cancelLinkText));
			}

			var graphDiv = document.createElement('div');
			histogramContainer.appendChild(graphDiv);
			var jGraphDiv = jQuery(graphDiv);
			jGraphDiv.addClass('pz2-histogramContainer');

			var graphWidth = jQuery('#pz2-termLists').width();
			var canvasHeight = 150;
			jGraphDiv.css({'width': graphWidth + 'px', 'height': canvasHeight + 'px', 'position': 'relative'});

			var graphData = [];
			for (var termIndex in terms) {
				var year = parseInt(terms[termIndex].name, 10);
				if (year) {
					graphData.push([year, terms[termIndex].freq]);
				}
			}

			/*	Set up xaxis with two labelled ticks, one at each end.
				Dodgy: Use whitespace to approximately position the labels in a way that they don’t
				extend beyond the end of the graph (by default they are centered at the point of
				their axis, thus extending beyond the width of the graph on one site.
			*/
			var xaxisTicks = function (axis) {
				return [[axis.datamin, '      ' + axis.datamin], [axis.datamax, axis.datamax + '      ']];
			};

			// Use the colour of term list titles for the histogram.
			var graphColour = jQuery('.pz2-termList-xtargets a').css('color');
			var selectionColour = jQuery('.pz2-termList-xtargets h5').css('color');

			var graphOptions = {
				'series': {
					'bars': {
						'show': true,
						'fill': true,
						'lineWidth': 0,
						'fillColor': graphColour
					}
				},
				'xaxis':  {
					'tickDecimals': 0,
					'ticks': xaxisTicks,
					'autoscaleMargin': null
				},
				'yaxis': {
					'position': 'right',
					'tickDecimals': 0,
					'tickFormatter': function(val, axis) {return (val !== 0) ? (val) : ('');},
					'labelWidth': 30
				},
				'grid': {
					'borderWidth': 0,
					'clickable': true,
					'hoverable': true
				},
				'selection': {
					'mode': 'x',
					'color': selectionColour,
					'minSize': 0.1
				}
			};

			// Create plot.
			var plot;
			try {
				plot = jQuery.plot(jGraphDiv , [{'data': graphData, 'color': graphColour}], graphOptions);
			}
			catch (exception){
				// console.log(exception);
			}

			// Create tooltip.
			var jTooltip = jQuery('#pz2-histogram-tooltip');
			if (jTooltip.length === 0) {
				tooltipDiv = document.createElement('div');
				tooltipDiv.setAttribute('id', 'pz2-histogram-tooltip');
				jTooltip = jQuery(tooltipDiv).appendTo(document.body);
			}

			var roundedRange = function (range) {
				var outputRange = {};

				var from = Math.floor(range.from);
				outputRange.from = from - (from % histogramConfig.barWidth);

				var to = Math.ceil(range.to);
				outputRange.to = to - (to % histogramConfig.barWidth) + histogramConfig.barWidth;
				return outputRange;
			};

			var selectRanges = function (ranges) {
				var newRange = roundedRange(ranges.xaxis);
				plot.setSelection({'xaxis': newRange}, true);
				hideTooltip();
				that.filterArray['filterDate'] = undefined;
				limitResults('filterDate', newRange);
			};

			jGraphDiv.on('plotclick', function (event, pos, item) {
				if (item && item.datapoint) {
					var year = item.datapoint[0];
					var ranges = {'xaxis': {'from': year, 'to': year + 1} };
					selectRanges(ranges);
				}
			});

			jGraphDiv.on('plotselected', function(event, ranges) {
				selectRanges(ranges);
			});

			jGraphDiv.on('plotunselected', function(event) {
				delimitResults('filterDate');
			});

			var hideTooltip = function () {
				jTooltip.hide();
			};

			/*	update Tooltip
				Updates the tooltip visiblity, position and text.
				input:	event - the event we are called for
						ranges - object with property »xaxis«
						pageX - current x coordinate of the mouse
			*/
			var updateTooltip = function (event, ranges, pageX) {
				var showTooltip = function(x, y, contents) {
					jTooltip.text(contents);
					if (x) {
						jTooltip.css({
							'top': y + 5,
							'left': x + 5
						});
					}
					jTooltip.show();
				};

				var tooltipY = jGraphDiv.offset().top + canvasHeight - 20;
				var displayString;
				if (ranges) {
					var range = roundedRange(ranges.xaxis);

					if (histogramContainer.currentSelection && histogramContainer.currentSelection.xaxis) {
						displayString = range.from.toString() + '-' + range.to.toString();
					}
					else {
						for (var termIndex in terms) {
							var term = parseInt(terms[termIndex].name, 10);
							if (term === range.from) {
								var hitCount = terms[termIndex].freq;
								displayString = term.toString() + ': ' + hitCount + ' ' + that.localise('Treffer', 'facets');
								break;
							}
						}
					}
				}

				if (displayString) {
					showTooltip(pageX, tooltipY, displayString);
				}
				else {
					hideTooltip();
				}
			};

			jGraphDiv.on('plothover', function(event, ranges, item) {
				updateTooltip(event, {'xaxis': {'from': ranges.x, 'to': ranges.x}}, ranges.pageX);
			});

			jGraphDiv.on('plotselecting', function (event, info) {
				histogramContainer.currentSelection = info;
				updateTooltip(event, info);
			});

			jGraphDiv.mouseout(hideTooltip);

			for (var filterIndex in that.filterArray['filterDate']) {
				plot.setSelection({'xaxis': that.filterArray['filterDate'][filterIndex]}, true);
			}
		};


		// Create container and heading.
		var container = document.createElement('div');
		container.setAttribute('facetType', type);
		jQuery(container).addClass('pz2-termList pz2-termList-' + type);

		var terms = facetInformationForType(type);
		if (terms.length >= parseInt(that.config.termLists[type].minDisplay, 10) || that.filterArray[type]) {
			// Always display facet list if it is filtered. Otherwise require
			// at least .minDisplay facet elements.
			var heading = document.createElement('h5');
			container.appendChild(heading);
			var headingText = that.localise(type, 'facet');
			if (isFilteredForType(type)) {
				headingText += ' [' + that.localise('gefiltert', 'facets') + ']';
			}
			heading.appendChild(document.createTextNode(headingText));

			// Display histogram if set up and able to do so.
			if (that.config.useHistogramForYearFacets && type === 'filterDate' &&
				(!that.MSIEVersion() || that.MSIEVersion() >= 9)) {
				appendFacetHistogramForDatesTo(terms, container);
			}
			else {
				container.appendChild(facetDisplayTermsForType(terms, type));
			}
		}

		return container;
	}; // end of facetListForType



	var that = this;

	var container = document.getElementById('pz2-termLists');

	if (container) {
		jQuery(container).empty();

		var mainHeading = document.createElement('h4');
		container.appendChild(mainHeading);
		mainHeading.appendChild(document.createTextNode(that.localise('Facetten', 'facets')));

		for (var facetType in that.config.termLists ) {
			container.appendChild(facetListForType(facetType));
		}
	}
};
