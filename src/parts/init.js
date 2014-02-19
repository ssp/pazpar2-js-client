/**
 * Called by jQuery.ready() when the page is loaded.
 * Set up the JavaScript based search.
 * Overwrites the default configuration with the values provided by setup.
 *
 * @param {object} setup
 * @returns {undefined}
 */
pz2_client.prototype.init = function (setup) {
	// Override default configuration with values from setup.
	for (var key in setup) {
		this.config[key] = setup[key];
	}

	// Determine the page’s language as set in html/@lang for localisations.
	// If not set, use English.
	var HTMLLanguage = jQuery('html').attr('lang');
	if (HTMLLanguage.length === 2) {
		this.pageLanguage = HTMLLanguage;
	}
	else if (HTMLLanguage.length > 2 && HTMLLanguage[2] === '_') {
		this.pageLanguage = HTMLLanguage.substring(0, 2);
	}
	else {
		this.pageLanguage = 'en';
	}

	// Set up handlers for form submission and extended/simple search toggling.
	var pRemoveExtendedSearch = jQuery.proxy(this.removeExtendedSearch, this);
	var pAddExtendedSearch = jQuery.proxy(this.addExtendedSearch, this);
	jQuery('.pz2-searchForm')
		.submit(jQuery.proxy(this.onFormSubmitEventHandler, this))
		.each( function(index, form) {
			if (jQuery('form.pz2-searchForm').hasClass('pz2-extended')) {
				jQuery('.pz2-extendedLink', form).click(pRemoveExtendedSearch);
			}
			else {
				jQuery('.pz2-extendedLink', form).click(pAddExtendedSearch);
			}
		}
	);

	// Add event handlers for selects.
	jQuery('.pz2-sort, .pz2-perPage').attr('onchange', 'onSelectDidChange');

	// Add event handers for the status display to record count.
	jQuery('.pz2-recordCount').click(jQuery.proxy(this.toggleStatus, this));

	// Set up local storage if possible.
	if (jQuery.localStorage) {
		this.storage = jQuery.initNamespaceStorage('pazpar2');
	}

	// Add links for optional features if so configured
	var linkDiv = document.createElement('div');
	linkDiv.setAttribute('class', 'pz2-featureLinks');
	jQuery('#pazpar2').prepend(linkDiv);
	if (this.config.addHistoryLink && this.config.historyItems > 0) {
		var historyLink = document.createElement('a');
		linkDiv.appendChild(historyLink);
		historyLink.setAttribute('href', '#');
		historyLink.setAttribute('class', 'pz2-historyLink');
		jQuery(historyLink).click(jQuery.proxy(this.showHistory, this));
		historyLink.appendChild(document.createTextNode(this.localise('Suchgeschichte')));
	}

	// Add event handlers for autocomplete.
	this.setupAutocomplete();

	// Remove the no-JS warning.
	jQuery('#pazpar2').removeClass('pz2-noJS');

	// Start search for provided term if required.
	jQuery.proxy(this.config.triggerSearchFunction, this)();
};



/**
 * Initialise pazpar2 or Service Proxy.
 *
 * @returns {undefined}
 */
pz2_client.prototype.initialiseService = function () {
	this.errorCount = 0;

	if (!this.my_paz) {
		this.my_paz = new pz2( {
			pazpar2path: this.config.pazpar2Path,
			serviceId: this.config.serviceID,
			usesessions: this.usesessions(),
			autoInit: false,
			oninit: jQuery.proxy(this.oninit, this),
			onshow: jQuery.proxy(this.onshow, this),
			showtime: 1000, //each timer (show, stat, term, bytarget) can be specified this way
			onbytarget: jQuery.proxy(this.onbytarget, this),
			onstat: jQuery.proxy(this.onstat, this),
			errorhandler: jQuery.proxy(this.onerror, null, this),
			/* We are not using pazpar2’s termlists but create our own.
				onterm: callbacks.onterm,
				termlist: termListNames.join(","),
			*/
			showResponseType: this.config.showResponseType
		});


		// Remove error handler when the user leaves the page. (Prevents error messages
		// from appearing in some browsers when the page unloads while queries
		// are still running.)
		var pRemoveErrorHandler = jQuery.proxy(
			function () { this.my_paz.errorhandler = undefined; },
			this
		);
		jQuery(window).on('unload', pRemoveErrorHandler);


		// Only run init if the previous init is more than 15 seconds ago.
		var currentTime = new Date().getTime();
		if (this.pz2InitRequestStartTime + 15000 < currentTime) {
			this.pz2InitRequestStartTime = currentTime;
			this.my_paz.init(undefined, this.my_paz.serviceId);
		}
	}

	if (this.usesessions()) {
		this.initialisePazpar2();
	}
	else {
		this.initialiseServiceProxy();
	}
};



/**
 * (Re-)Initialise a pazpar2 session.
 *
 * @returns {undefined}
 */
pz2_client.prototype.initialisePazpar2 = function () {
	if (this.pz2InitTimeout !== undefined) {
		clearTimeout(this.pz2InitTimeout);
		this.pz2InitTimeout = undefined;
	}

	if (this.my_paz) {
		this.my_paz.init(undefined, this.my_paz.serviceId);
	}
	else {
		this.initialiseService();
	}
};



/**
 * Get a service proxy session.
 *
 * @returns {undefined}
 */
pz2_client.prototype.initialiseServiceProxy = function () {
	jQuery.get(this.config.serviceProxyAuthPath, function () {
		this.pz2Initialised = true;
		this.callbacks_init();
	});
};



/**
 * pazpar2 callback for session initialisation.
 *
 * @param {object} data - pazpar2 init result
 * @returns {undefined}
 */
pz2_client.prototype.oninit = function (data) {
	this.pz2InitRequestStartTime = 0; // The request has returned: set time to 0.
	this.my_paz.stat();
	this.my_paz.bytarget();
	this.pz2Initialised = true;

	// Clean up potentially existing error messages from previously failed intialisations.
	var jRecordCount = jQuery('.pz2-recordCount');
	jRecordCount.empty();
	jRecordCount.removeClass('pz2-noResults');

	// Process Information from pazpar2-access if it is available.
	if (data) {
		var accessRightsTags = data.getElementsByTagName('accessRights');
		if (accessRightsTags.length > 0) {
			var accessRights = accessRightsTags[0];
			var institutionNameTags = accessRights.getElementsByTagName('institutionName');
			this.institutionName = undefined;
			if (institutionNameTags.length > 0) {
				var institution = institutionNameTags[0].textContent;
				if (institution) {
					this.institutionName = institution;
				}
			}

			var allTargetsActiveTags = accessRights.getElementsByTagName('allTargetsActive');
			if (allTargetsActiveTags.length > 0) {
				this.allTargetsActive = (parseInt(allTargetsActiveTags[0].textContent, 10) === 1);
			}

		}

		if (this.institutionName !== undefined) {
			var accessMessage;
			if (this.institutionName === 'Gastzugang') {
				accessMessage = this.localise('Gastzugang');
			}
			else {
				accessMessage =  this.localise('Zugang über:') + ' ' + institutionName;
			}

			var accessNote;
			if (this.allTargetsActive === false) {
				accessNote = this.localise('Nicht alle Datenbanken verfügbar.');
			}

			jQuery(document).ready(function () {
					var jAccessNote = jQuery('.pz2-accessNote');
					jAccessNote.text(accessMessage);
					if (accessNote !== undefined) {
						jAccessNote.attr({'title': accessNote});
					}
				});
		}
	}

	jQuery.proxy(this.config.triggerSearchFunction, this)();
};



/**
 * Return whether to use sessions or not.
 *
 * @returns {boolean}
 */
pz2_client.prototype.usesessions = function () {
	result = true;
	if (typeof(this.config.useServiceProxy) !== 'undefined' && this.config.useServiceProxy) {
		result = false;
	}
	return result;
};



/**
 * Return whether the page is ready for starting a query.
 * 
 * @returns {boolean}
 */
pz2_client.prototype.isReady = function () {
	return this.pz2Initialised;
};
