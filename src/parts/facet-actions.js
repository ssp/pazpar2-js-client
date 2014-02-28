/**
 * pazpar2 callback for receiving facet data.
 * Stores facet data and recreates facets on page.
 *
 * @param {array} data - pazpar2 termlist information
 * @returns {undefined}
 */
pz2_client.prototype.onterm = function (data) {
	this.facetData = data;
	if (this.currentView.type === 'query') {
		this.updateFacetLists();
	}
};



/**
 * Regular expression for removing characters from facet strings that
 * are not suitable for use in class names.
 * 
 * @type {RegExp}
 */
pz2_client.prototype.classNameRegEx = /[- ,.\/]/g;



/**
 * Add a filter for term on the field kind and redisplay.
 *
 * @param {string} kind - ID of the facet to filter on
 * @param {string} term - facet term to filter for
 * @returns {undefined}
 */
pz2_client.prototype.limitResults = function (kind, term) {
	if (!this.currentView.filters[kind]) {
		this.currentView.filters[kind] = {};
	}

	var termString = (jQuery.type(term) === 'string' ? term : term.from + '-' + term.to);
	this.currentView.filters[kind][termString] = term;

	// Mark with class for selected facet. Remove spaces from strings.
	var baseName = ('pz2-term-selected-' + kind).replace(this.classNameRegEx, '-');

	jQuery('#pazpar2')
		.addClass(baseName)
		.addClass(baseName + '-' + termString.replace(this.classNameRegEx, '-'));

	this.currentView.page = 1;
	this.updateLimits();

	this.trackPiwik('facet/limit', kind);
};



/**
 * Remove a filter for term from the field kind and redisplay.
 *
 * @param {string} kind - ID of the facet to remove the filter from
 * @param {string} term - string of the facet term to remove the filter for (optional: all terms are removed if omitted)
 * @returns {undefined}
 */
pz2_client.prototype.delimitResults = function (kind, term) {
	if (this.currentView.filters[kind]) {
		var jPazpar2 = jQuery('#pazpar2');
		var baseName = ('pz2-term-selected-' + kind).replace(this.classNameRegEx, '-');

		if (term) {
			// If a term is given remove it from the filter.
			delete this.currentView.filters[kind][term];

			var termString = term.replace(this.classNameRegEx, '-');
			jPazpar2.removeClass(baseName + '-' + termString);

			if (Object.keys(this.currentView.filters[kind]).length === 0) {
				// All terms of this kind have been removed: remove kind from filterArray.
				delete this.currentView.filters[kind];
				jPazpar2.removeClass(baseName);
			}
		}
		else {
			// If no term is given, remove the complete filter for this facet.
			delete this.currentView.filters[kind];

			var classes = jPazpar2.attr('class').split(' ');
			for (var classIndex in classes) {
				var className = classes[classIndex];
				if (className.substr(0, baseName.length) === baseName) {
					jPazpar2.removeClass(className);
				}
			}
		}

		this.updateLimits();

		this.trackPiwik('facet/delimit', kind);
	}
};



/**
 * Depending on configuration start a new query or trigger a redisplay
 * to with the current limits. Invoked by [de]limitResults.
 *
 * @returns {undefined}
 */
pz2_client.prototype.updateLimits = function () {

	/**
	 * Return the filterArray as a filter string suitable for use in
	 * the limit parameter for a pazpar2 search query.
	 *
	 * @returns {string} - limit string for pazar2 queries
	 */
	function filtersToString () {
		var filterComponents = [];

		for (var filterType in that.currentView.filters) {
			var filtersForType = that.currentView.filters[filterType];

			if (filterType === 'xtargets') {
				// Targets need to be filtered with »pz:id«
				filterType = 'pz:id';
			}

			var filterListEscaped = [];
			for (var filterString in filtersForType) {
				// Escape \,| characters.
				filterListEscaped.push(
					filterString
						.replace('\\', '\\\\')
						.replace(',', '\\,')
						.replace('|', '\\|')
				);
			}

			if (filterListEscaped.length > 0) {
				filterComponents.push(filterType + '=' + filterListEscaped.join('|'));
			}
		}

		return filterComponents.join(',');
	}



	var that = this;

	if (this.config.usePazpar2Facets) {
		this.my_paz.search(
			this.currentView.query,
			this.config.fetchRecords,
			this.currentView.sort,
			this.currentView.filter,
			undefined,
			{'limit': filtersToString()}
		);
	}
	else {
		this.updateAndDisplay();
	}
};
