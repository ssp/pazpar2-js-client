/**
 * Append a histogram facet for the filterDate terms.
 *
 * @param {array} terms - contains objects with keys »name« and »freq«
 * @param {string} type - facet ID
 * @param {DOMElement} histogramContainer - append the histogram to this
 * @returns {undefined}
 */
pz2_client.prototype.appendFacetHistogramForDatesTo = function (terms, type, histogramContainer) {
	var that = this;
	var histogramConfig = {'barWidth': 1};

	/**
	 * Click event handler for removing a facet item selection.
	 *
	 * @param {Event} event - click event deselecting the facet item
	 * @returns {boolean} false
	 */
	var histogramDeselect = function (event) {
		var facetName = jQuery(event.target).parents('[facettype]').attr('facettype');
		jQuery.proxy(that.delimitResults, that, facetName)();
	};



	if (that.currentView.filters[type]) {
		var cancelLink = document.createElement('a');
		var jCancelLink = jQuery(cancelLink);
		histogramContainer.appendChild(cancelLink);
		cancelLink.setAttribute('href', '#');
		jCancelLink.addClass('pz2-facetCancel pz2-activeFacet');
		jCancelLink.click(histogramDeselect);
		for (var yearFilterString in that.currentView.filters[type]) {
			var cancelLinkText = that.localise('Filter # aufheben', 'facets').replace('#', yearFilterString);
			cancelLink.appendChild(document.createTextNode(cancelLinkText));
		}
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



	/**
	 * jQuery.flot tickFormatter callback.
	 *
	 * Set up xaxis with two labelled ticks, one at each end.
	 * Dodgy: Use whitespace to approximately position the labels in a way that they don’t
	 * extend beyond the end of the graph (by default they are centered at the point of
	 * their axis, thus extending beyond the width of the graph on one site.
	 *
	 * @param {object} axis
	 * @returns {array}
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



	/**
	 * Extend the borders of the passed range to the next range containing it
	 * with boundaries multiples of barWidth.
	 *
	 * @param {object} range - with keys »from« and »to«
	 * @returns {object} - with keys »from« and »to«
	 */
	var roundedRange = function (range) {
		var outputRange = {};

		var from = Math.floor(range.from);
		outputRange.from = from - (from % histogramConfig.barWidth);

		var to = Math.ceil(range.to);
		outputRange.to = to - (to % histogramConfig.barWidth) + histogramConfig.barWidth;
		return outputRange;
	};


	/**
	 * Handler for jQuery.flot.selection.
	 * Get horizontal user selection and use it for filtering.
	 *
	 * @param {object} ranges - with keys »from« and »to«
	 * @returns {undefined}
	 */
	var selectRanges = function (ranges) {
		var newRange = roundedRange(ranges.xaxis);
		plot.setSelection({'xaxis': newRange}, true);
		hideTooltip();
		delete that.currentView.filters[type];
		jQuery.proxy(that.limitResults, that, type, newRange)();
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
		jQuery.proxy(that.delimitResults, that, type)();
	});



	// Create tooltip.
	var jTooltip = jQuery('#pz2-histogram-tooltip');
	if (jTooltip.length === 0) {
		tooltipDiv = document.createElement('div');
		tooltipDiv.setAttribute('id', 'pz2-histogram-tooltip');
		jTooltip = jQuery(tooltipDiv).appendTo(document.body);
	}



	/**
	 * Hide the tooltip.
	 *
	 * @returns {undefined}
	 */
	var hideTooltip = function () {
		jTooltip.hide();
	};



	/**
	 * Update the tooltip visibility, position, and text.
	 *
	 * @param {Event} event - the event we are called for
	 * @param {object} ranges - object with property »xaxis«
	 * @param {number} pageX - current x coordinate of the mouse
	 * @returns {undefined}
	 */
	var updateTooltip = function (event, ranges, pageX) {

		/**
		 * Display the tooltip with contents at coordinates (x,y).
		 *
		 * @param {number} x
		 * @param {number} y
		 * @param {string} contents - string to display in the tooltip
		 */
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

	for (var filterString in that.currentView.filters[type]) {
		plot.setSelection({'xaxis': that.currentView.filters[type][filterString]}, true);
	}
};
