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
 * jQuery click event handler for selecting a facet item.
 *
 * @param {Event} event - click event selecting a facet item
 * @returns {boolean} - false
 */
pz2_client.prototype.facetItemSelect = function (event) {
	var jTarget = jQuery(event.target);
	var facetName = jTarget.parents('[facettype]').attr('facettype');  // TODO: need to run .replace(/"/g, '\\"') ?
	var facetTerm = jTarget.parents('li').attr('facetTerm');
	this.limitResults(facetName, facetTerm);
	return false;
};



/**
 * jQuery click event handler for removing a facet item selection.
 *
 * @param {Event} event - click event deselecting the facet item
 * @returns {boolean} - false
 */
pz2_client.prototype.facetItemDeselect = function (event) {
	var jTarget = jQuery(event.target);
	var facetName = jTarget.parents('[facettype]').attr('facettype');  // TODO: need to run .replace(/"/g, '\\"') ?
	var facetTerm = jTarget.parents('li').attr('facetTerm');
	this.delimitResults(facetName, facetTerm);
	return false;
};



/**
 * jQuery click event handler for the »show all facets« link.
 *
 * @param {Event} event - click event
 * @returns {boolean} - false
 */
pz2_client.prototype.showAllFacetsOfType = function (event) {
	var jContainingList = jQuery(event.target).parents('[facettype]');

	// Fade in the hidden elemens and hide the Show All link.
	jQuery('.pz2-facet-hidden', jContainingList).slideDown(300);
	jQuery('.pz2-facet-showAll', jContainingList).fadeOut(200);

	// Store the current state in the termLists object for the current facet type.
	var facetType = jContainingList.attr('facetType');
	this.config.termLists[facetType].showAll = true;

	return false;
};



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
		if (term) {
			// If a term is given remove it from the filter.
			delete this.currentView.filters[kind][term];

			var termString = term.replace(this.classNameRegEx, '-');

			if (Object.keys(this.currentView.filters[kind]).length === 0) {
				// All terms of this kind have been removed: remove kind from filterArray.
				delete this.currentView.filters[kind];
			}
		}
		else {
			// If no term is given, remove the complete filter for this facet.
			delete this.currentView.filters[kind];
		}

		this.updateLimits();

		this.trackPiwik('facet/delimit', kind);
	}
};



/**
 * Start a new query or trigger a redisplay with the current query and filters.
 * Invoked by [de]limitResults.
 *
 * @returns {undefined}
 */
pz2_client.prototype.updateLimits = function () {
	this.updateFacetingClasses();

	// Search / display with the new configuration.
	if (this.config.usePazpar2Facets && this.currentView.type === 'query') {
		this.search();
	}
	else {
		this.updateAndDisplay();
	}
};



/**
 * Set up the CSS classes indicating faceting state on #pazpar2.
 *
 * @returns {undefined}
 */
pz2_client.prototype.updateFacetingClasses = function () {
	var baseName = 'pz2-term-selected-';
	var classNameRegEx = /[- ,.\/]/g;

	var jPazpar2 = jQuery('#pazpar2');
	var classes = jPazpar2.attr('class').split(' ');

	// Remove all faceting classes.
	for (var classIndex in classes) {
		var className = classes[classIndex];
		if (className.substr(0, baseName.length) === baseName) {
			jPazpar2.removeClass(className);
		}
	}

	// Add the classes for the current facet state.
	for (var filterName in this.currentView.filters) {
		var filterClass = baseName + filterName;
		jPazpar2.addClass(filterClass);

		for (var term in this.currentView.filters[filterName]) {
			var termString = term.replace(classNameRegEx, '-');
			jPazpar2.addClass(filterClass + '-' + termString);
		}
	}
};
