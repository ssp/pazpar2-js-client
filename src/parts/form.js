/**
 * Run pz2’s search method with the current query, facet, paging setup.
 *
 * @returns {undefined}
 */
pz2_client.prototype.search = function () {

	/**
	 * Go through currentView’s filters and update the filter/limit
	 * strings required for the pazpar2 search query.
	 *
	 * @returns {undefined}
	 */
	var updateFilterConfiguration = function () {
		var filters = {'limit': [], 'filter': []};

		for (var filterID in that.currentView.filters) {
			var filtersForType = that.currentView.filters[filterID];
			var filterMethod = 'limit';

			if (filterID === 'xtargets') {
				filterMethod = 'filter';
				// Targets need to be filtered with »pz:id«
				filterID = 'pz:id';
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
				filters[filterMethod].push(filterID + '=' + filterListEscaped.join('|'));
			}
		}

		that.currentView.limit = filters.limit.join(',');
		that.currentView.filter = filters.filter.join(',');
	};


	var that = this;
	updateFilterConfiguration();

	try {
		that.my_paz.search(
			that.currentView.query,
			that.currentView.recPerPage,
			that.currentView.sort,
			that.currentView.filter,
			undefined,
			{'limit': that.currentView.limit}
		);
	}
	catch (exception) {
		console.log(exception);
	}
};



/**
 * Trigger pazpar2 search.
 * Called when my_paz is initialised and when the search button is clicked.
 *
 * @param {DOMElement} form - the form used to trigger the search
 * @param {array} additionalQueryTerms - query terms not entered in the form [optional]
 * @returns {boolean}
 */
pz2_client.prototype.triggerSearchForForm = function (form, additionalQueryTerms) {

	/**
	 * Extract the search terms for field name and:
	 * * add the CCL search string for it to the closure’s searchChunks array
	 * * add its terms to the closure’s search Terms array
	 *
	 * @param {string} fieldName - name of the pazpar2 search field / CCL index
	 * @returns {undefined}
	 */
	var addSearchStringForField = function (fieldName) {

		/**
		 * Return a CCL search string for the given index name and search term.
		 * If operating on the »all« index, use the default CCL index without a name.
		 * On other indexes »and«, »not« and »or« in the search string will be
		 * replaced by the boolean operator with a following index name and '='.
		 * 
		 * @param {string} indexName - name of the CCL index, e.g. »subject«
		 * @param {string} searchString - e.g. »rocket not science«
		 * @returns {string} - the CCL query, e.g. »(subject=rocket not subject=science)«
		 */
		var CCLQuery = function (indexName, searchString) {
			var search = searchString;
			if (indexName !== 'all') {
				search = indexName + '=' + searchString;
				search = search.replace(' and ', ' and ' + indexName + '=');
				search = search.replace(' not ', ' not ' + indexName + '=');
				search = search.replace(' or ', ' or ' + indexName + '=');
				search = '(' + search + ')';
			}

			return search;
		};



		var indexName = fieldName;
		var searchString = jQuery('#pz2-field-' + fieldName, myForm).val();

		if (searchString && searchString !== '') {
			searchString = jQuery.trim(searchString);
			if (fieldName === 'all') {
				if (jQuery('#pz2-checkbox-fulltext:checked', myForm).length > 0) {
					indexName = 'fulltext';
				}
			}
			else if (fieldName === 'title' && jQuery('#pz2-checkbox-journal:checked', myForm).length > 0) {
				// Special case for title restricted to journals only.
				indexName = 'journal';
			}
			else if (fieldName === 'person') {
				// Special case for person search: always do a phrase search.
				// Remove potentially added quotation marks for a phrase search and add new ones.
				searchString = '"' + searchString.replace(/^[\s"]*/, '').replace(/[\s"]*$/, '') + '"';
			}

			queryParts.push(CCLQuery(indexName, searchString));

			var terms =  searchString
							.toLowerCase()
							.replace(/([\w-]*=| and | or | not )/g, ' ')
							.replace(/[\s.-;,/:"'?*]+/g, ' ')
							.split(' ');
			jQuery.merge(queryTerms, terms);
		}
	};



	var that = this;
	var myForm = form;
	var queryParts = [];
	var queryTerms = [];

	// If no form is passed use the first .pz2-searchForm.
	if (!myForm) {
		var searchForms = jQuery('.pz2-searchForm');
		if (searchForms.length > 0) {
			myForm = searchForms[0];
		}
	}

	// Deal with additional query terms if there are any.
	if (additionalQueryTerms !== undefined) {
		that.currentView.additionalQueryTerms = additionalQueryTerms;
	}

	if (that.isReady()) {
		addSearchStringForField('all');
		var isExtendedSearch = jQuery(myForm).hasClass('pz2-extended');
		if (isExtendedSearch) {
			addSearchStringForField('title');
			addSearchStringForField('person');
			addSearchStringForField('subject');
			addSearchStringForField('date');
		}
		queryParts = queryParts.concat(that.currentView.additionalQueryTerms);
		var query = queryParts.join(' and ');
		query = query.replace('*', '?');
		if (query !== '' && query !== that.currentView.query) {
			that.resetPage();
			that.hideHistory();
			that.loadSelectsInForm(myForm);
			that.addToHistory(query);
			that.currentView.query = query;
			that.currentView.queryTerms = queryTerms;
			that.search();
			that.trackPiwik('search', query);
		}
	}
	else {
		that.initialiseService();
	}
};



/**
 * Empties result lists, userSettings (filters, term list visibility),
 * resets status and switches to first page and redisplays.
 *
 * @returns {undefined}
 */
pz2_client.prototype.resetPage = function () {
	this.my_paz.stop();

	this.currentView.page = 1;
	this.currentView.resultCount = 0;

	this.hitList = {};
	this.currentHits = [];
	this.displayHitList = [];
	this.facetData = {};

	this.currentView.filters = {};
	this.currentView.limit = null;
	this.currentView.filter = null;
	this.currentView.query = null;
	this.currentView.queryTerms = [];

	for (var facetIndex in this.config.termLists) {
		this.config.termLists[facetIndex].showAll = undefined;
	}

	jQuery('#pazpar2').removeClass();
	jQuery('#pz2-targetView td').text('-');
	jQuery('.pz2-pager .pz2-progressIndicator').css({'width': 0});

	this.updateAndDisplay(true);
};



/**
 * Function to call when the form is submitted.
 * Allows other scripts to hook into form submission.
 *
 * @type {function}
 */
pz2_client.prototype.config.triggerSearchFunction = pz2_client.prototype.triggerSearchForForm;



/**
 * Called when the search button is pressed.
 *
 * @param {object} event - Event for the form submission
 * @returns {boolean} false
 */
pz2_client.prototype.onFormSubmitEventHandler = function (event) {
	if (jQuery.ui && jQuery.ui.autocomplete) {
		jQuery('.ui-autocomplete-input').autocomplete('close');
	}

	var form;
	if (event && event.currentTarget) {
		form = event.currentTarget;
	}
	jQuery.proxy(this.config.triggerSearchFunction, this, [form])();

	return false;
};



/**
 * Called when sort-order popup menu is changed.
 * Gather new sort-order information and redisplay.
 *
 * @returns {Boolean} - false
 */
pz2_client.prototype.onSelectDidChange = function () {
	this.loadSelectsInForm(this.form);
	this.updateAndDisplay();
	return false;
};



/**
 * Switches the form  to extended search.
 * Shows the extended search fields, moves the search button and updates
 * the link to show basic search.
 *
 * @param {object} event - jQuery event
 * @param {boolean} dontTrack - [defaults to false]
 * @returns {boolean} - false
 */
pz2_client.prototype.addExtendedSearch = function (event, dontTrack) {
	// switch form type
	var jFormContainer = jQuery('.pz2-mainForm');
	jFormContainer.parent('form')
		.removeClass('pz2-basic')
		.addClass('pz2-extended');

	// move the controls
	var jControls = jQuery('.pz2-formControls', jFormContainer);
	jQuery('.pz2-fieldContainer:last', jFormContainer).append(jControls);

	// switch the link to a simple search link
	jQuery('.pz2-extendedLink', jFormContainer)
		.off('click')
		.click(jQuery.proxy(this.removeExtendedSearch, this))
		.empty()
		.text(this.localise('einfache Suche'));
	jQuery('.pz2-extraFields', jFormContainer).show();

	if (dontTrack !== true) {
		this.trackPiwik('extendedsearch/show');
	}

	return false;
};



/**
 * Switches the form to basic search.
 * Hides the extended search fields, moves the search button and updates
 * the link to reflect the state.
 *
 * @param {object} event - jQuery event
 * @param {boolean} dontTrack - [defaults to false]
 * @returns {boolean} - false
 */
pz2_client.prototype.removeExtendedSearch  = function (event, dontTrack) {
	// switch form type
	var jFormContainer = jQuery('.pz2-mainForm');
	jFormContainer.parent('form')
		.removeClass('pz2-extended')
		.addClass('pz2-basic');

	// move the controls
	var jControls = jQuery('.pz2-formControls', jFormContainer);
	jQuery('#pz2-field-all').after(jControls);

	// switch the link to an extended search link
	jQuery('.pz2-extendedLink', jFormContainer)
		.off('click')
		.click(jQuery.proxy(this.addExtendedSearch, this))
		.empty()
		.text(this.localise('erweiterte Suche'));

	// remove extended search fields
	jQuery('.pz2-extraFields', jFormContainer).hide();

	if (dontTrack !== true) {
		this.trackPiwik('extendedsearch/hide');
	}

	return false;
};



/**
 * Sets up the sort order and items per page from the form that is passed.
 *
 * @param {DOMElement} form
 * @returns {undefined}
 */
pz2_client.prototype.loadSelectsInForm = function (form) {
	var sortOrderString = jQuery('.pz2-sort option:selected', form).val();
	this.setSortCriteriaFromString(sortOrderString);

	var jPerPageSelect = jQuery('.pz2-perPage option:selected', form);
	if (jPerPageSelect.length > 0) {
		this.currentView.recPerPage = jPerPageSelect.val();
	}
};



/**
 * Takes the passed sort value string with sort criteria separated by --
 * and labels and value inside the criteria separated by -, [this strange
 * format is owed to escaping problems when creating a Fluid template for the form]
 * parses them and sets the displaySort and currentView.sort settings accordingly.
 * If the sort form is not present, the sort order stored in displaySort is used.
 *
 * @param {string} sortString
 * @returns {undefined}
 */
pz2_client.prototype.setSortCriteriaFromString = function (sortString) {
	var curSortArray = [];

	if (sortString) {
		// The sort string exists: we get our settings from the menu.
		this.config.displaySort = [];
		var sortCriteria = sortString.split('--');

		for (var criterionIndex in sortCriteria) {
			var criterionParts = sortCriteria[criterionIndex].split('-');
			if (criterionParts.length === 2) {
				var fieldName = criterionParts[0];
				var direction = criterionParts[1];
				this.config.displaySort.push({'fieldName': fieldName,
											'direction': ((direction === 'd') ? 'descending' : 'ascending')});
				curSortArray.push(fieldName + ':' + ((direction === 'd') ? '0' : '1') );
			}
		}
	}
	else {
		// Use the default sort order set in displaySort.
		for (var displaySortIndex in this.config.displaySort) {
			var sortCriterion = this.config.displaySort[displaySortIndex];
			curSortArray.push(sortCriterion.fieldName + ':' + ((sortCriterion.direction === 'descending') ? '0' : '1'));
		}
	}

	this.currentView.sort = curSortArray.join(',');
};
