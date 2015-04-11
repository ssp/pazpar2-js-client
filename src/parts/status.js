/**
 * Shows and hides the status display with information on all targets.
 * Invoked by clicking the number of results.
 *
 * @returns {Boolean} - false
 */
pz2_client.prototype.toggleStatus = function () {
	var jTargetView = jQuery('#pz2-targetView');
	jQuery('#pazpar2 .pz2-recordCount').after(jTargetView);
	jTargetView.slideToggle('fast');
	this.trackPiwik('status/toggle');
	return false;
};



/**
 * Sets the progress bar to the passed percentage.
 * Ensures a minimum width, animates changes, hides the progress bar quickly
 * when finished.
 *
 * @param {number} percentage
 * @returns {undefined}
 */
pz2_client.prototype.updateProgressBar = function (percentage) {
	// Display progress bar, with a minimum of 5% progress.
	var progress = Math.max(percentage, 5);
	var finished = (progress === 100);
	var opacityValue = (finished ? 0 : 1);
	var duration = 500 * (finished ? 0.2 : 1);

	jQuery('.pz2-pager .pz2-progressIndicator').animate({'width': progress + '%', 'opacity': opacityValue}, duration);
};



/**
 * Callback for target status information. Updates the status display.
 *
 * @param {object} data - pazpar2 bytarget response
 * @returns {undefined}
 */
pz2_client.prototype.onbytarget = function (data) {
	var targetDiv = document.getElementById('pz2-targetView');
	jQuery(targetDiv).empty();

	var table = document.createElement('table');
	targetDiv.appendChild(table);

	var caption = document.createElement('caption');
	table.appendChild(caption);
	caption.appendChild(document.createTextNode(this.localise('Übertragungsstatus', 'status')));
	var closeLink = document.createElement('a');
	caption.appendChild(closeLink);
	closeLink.setAttribute('href', '#');
	jQuery(closeLink).on('click', jQuery.proxy(this.toggleStatus, this));
	closeLink.appendChild(document.createTextNode(this.localise('[ausblenden]', 'status')));

	var thead = document.createElement('thead');
	table.appendChild(thead);
	var tr = document.createElement('tr');
	thead.appendChild(tr);
	var td = document.createElement('th');
	tr.appendChild(td);
	td.appendChild(document.createTextNode(this.localise('Datenbank', 'status')));
	td.id = 'pz2-target-name';
	td = document.createElement('th');
	tr.appendChild(td);
	td.appendChild(document.createTextNode(this.localise('Geladen', 'status')));
	td.id = 'pz2-target-loaded';
	td = document.createElement('th');
	tr.appendChild(td);
	td.appendChild(document.createTextNode(this.localise('Treffer', 'status')));
	td.id = 'pz2-target-hits';
	td = document.createElement('th');
	tr.appendChild(td);
	jQuery(td).addClass('pz2-target-status');
	td.appendChild(document.createTextNode(this.localise('Status', 'status')));
	td.id = 'pz2-target-status';

	var tbody = document.createElement('tbody');
	table.appendChild(tbody);

	for (var i = data.length - 1; 0 <= i; i--) {
		var dataItem = data[i];

		tr = document.createElement('tr');
		tbody.appendChild(tr);
		
		td = document.createElement('th');
		tr.appendChild(td);
		td.appendChild(document.createTextNode(this.localise(dataItem.id, 'facet-xtargets')));
		td.title = dataItem.id;
		td.setAttribute('headers', 'pz2-target-name');
		
		td = document.createElement('td');
		tr.appendChild(td);
		var recordCount = dataItem.records.toString();
		if (dataItem.filtered !== undefined && dataItem.filtered > 0) {
			recordCount += ' (+' + dataItem.filtered.toString() + ')';
		} 
		td.appendChild(document.createTextNode(recordCount));
		td.setAttribute('headers', 'pz2-target-loaded');
		
		td = document.createElement('td');
		tr.appendChild(td);
		var hitCount = dataItem.hits;
		if (hitCount === -1) {
			hitCount = '?';
		}
		td.appendChild(document.createTextNode(hitCount));
		td.setAttribute('headers', 'pz2-target-hits');
		
		td = document.createElement('td');
		tr.appendChild(td);
		td.appendChild(document.createTextNode(this.localise(dataItem.state, 'status')));
		if (parseInt(dataItem.diagnostic, 10) !== 0) {
			td.setAttribute('title', this.localise('Code', 'status') + ': ' + dataItem.diagnostic);
		}
		td.setAttribute('headers', 'pz2-target-status');

		this.targetStatus[dataItem.name] = dataItem;
	}

	if (this.my_paz.activeClients === 0) {
		// When building our own facets, update when no more clients are active,
		// to ensure result counts and overflow indicators are up to date.
		if (!this.config.usePazpar2Facets) {
			this.updateFacetLists();
		}
		// Update result count
		this.updatePagers();
	}

};





/**
 * Callback for pazpar2 status information. Updates the progress bar, pagers and
 * and status information.
 *
 * @param {object} data
 * @returns {undefined}
 */
pz2_client.prototype.onstat = function (data) {
	var progress = (data.clients[0] - data.activeclients[0]) / data.clients[0] * 100;
	this.updateProgressBar(progress);

	this.updatePagers();

	// Create markup with status information.
	var statDiv = document.getElementById('pz2-stat');
	if (statDiv) {
		jQuery(statDiv).empty();

		var heading = document.createElement('h4');
		statDiv.appendChild(heading);
		heading.appendChild(document.createTextNode(this.localise('Status:', 'status')));

		var statusText = this.localise('Aktive Abfragen:', 'status') + ' ' +
			data.activeclients + '/' + data.clients + ' – ' +
			this.localise('Geladene Datensätze:', 'status') + ' ' +
			data.records + '/' + data.hits;
		statDiv.appendChild(document.createTextNode(statusText));
	}
};



/**
 * @param {object} error
 * @param {XMLHttpRequest} request
 * @returns {undefined}
 */
pz2_client.prototype.onerror = function (error, request) {
	this.errorCount++;
	var errorCode = parseInt(error.code, 10);

	if (errorCode !== 12 && this.errorCount < 3 && request.status < 500) {
		if (errorCode === 1 && request.status === 417) {
			// The pazpar2 session has expired: create a new one.
			this.initialisePazpar2();
		}
		else if (errorCode === 100 && request.status === 417) {
			// The Service Proxy session has expired / cookie got lost: create a new one.
			this.initialiseServiceProxy();
		}
	}
	else  {
		// The service is unavailable: Disable the search form.
		var jRecordCount = jQuery('.pz2-recordCount');
		jRecordCount.empty();
		var message = this.localise('Suche momentan nicht verfügbar.', 'status');
		jRecordCount.text(message);
		jRecordCount.addClass('pz2-noResults');

		if (this.pz2InitTimeout !== undefined) {
			clearTimeout(this.pz2InitTimeout);
		}

		this.pz2InitTimeout = setTimeout(jQuery.proxy(this.initialiseService, this), 15000);
		this.errorCount = 0;
	}

	// If  the error happens while loading, clear the current search term,
	// to allow restarting the search.
	if (this.my_paz.activeClients > 0) {
		this.currentView.query = null;
	}
};
