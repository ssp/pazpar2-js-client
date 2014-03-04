/**
 * Callback for pazpar2 when data become available.
 * Go through the records and adds them to hitList.
 * Regenerate displayHitList(UpToDate) and trigger redisplay.
 *
 * @param {object} data
 * @returns {undefined}
 */
pz2_client.prototype.onshow = function (data) {

	/*	extractNewestDates
		Looks for the md-date array in the passed record and returns an array
		of integers containing the numbers represented by the last four
		consecutive digits in each member.
		input:	array (a pazpar2 record or a record’s location element)
		output:	array of integers
	*/
	var extractNewestDates = function (record) {
		var result = [];

		if (record['md-date']) {
			for (var dateIndex in record['md-date']) {
				var dateParts = record['md-date'][dateIndex].match(/[0-9]{4}/g);
				if (dateParts && dateParts.length > 0) {
					var parsedDate = parseInt(dateParts[dateParts.length - 1], 10);
					if (!isNaN(parsedDate)) {
						result.push(parsedDate);
					}
				}
			}
		}
		return result;
	};

	var sortNewestFirst = function (a, b) {
		var aDates = extractNewestDates(a);
		var bDates = extractNewestDates(b);

		if (aDates.length > 0 && bDates.length > 0) {
			return bDates[0] - aDates[0];
		}
		else if (aDates.length > 0 && bDates.length === 0) {
			return -1;
		}
		else if (aDates.length === 0 && bDates.length > 0) {
			return -1;
		}
		else {
			return 0;
		}
	};


	this.currentHits = [];
	for (var hitNumber in data.hits) {
		var hit = data.hits[hitNumber];
		var hitID = hit.recid[0];
		if (hitID) {
			this.currentHits.push(hitID);

			var oldHit = this.hitList[hitID];
			if (oldHit) {
				hit.detailsDivVisible = oldHit.detailsDivVisible;
				if (oldHit.location.length === hit.location.length) {
					// Preserve existing LI and details DIV, if the location info
					// has not changed. Otherwise they will be recreated using
					// the updated data.
					hit.li = oldHit.li;
					hit.detailsDiv = oldHit.detailsDiv;
				}
			}

			if (!this.config.usePazpar2Facets) {
				// Make sure the 'medium' field exists by setting it to 'other' if necessary.
				if (!hit['md-medium']) {
					hit['md-medium'] = ['other'];
				}

				// If there is no language information, set the language code to zzz
				// (undefined) to ensure we get a facet for this case as well.
				if (!hit['md-language']) {
					hit['md-language'] = ['zzz'];
				}

				// Create the integer 'filterDate' field for faceting.
				hit['md-filterDate'] = extractNewestDates(hit);
			}

			// If there is no title information but series information, use the
			// first series field for the title.
			if (!(hit['md-title'] || hit['md-multivolume-title']) && hit['md-series-title']) {
				hit['md-multivolume-title'] = [hit['md-series-title'][0]];
			}

			// Sort the location array to have the newest item first
			hit.location.sort(sortNewestFirst);

			this.hitList[hitID] = hit;
		}
	}

	if (this.currentView.type === 'query') {
		this.currentView.resultCount = data.merged;
		this.updateAndDisplay();
	}
};



pz2_client.prototype.show = function () {
	if (this.config.usePazpar2Facets && this.currentView.type === 'query') {
		var start = (this.currentView.page - 1) * this.currentView.recPerPage;
		this.my_paz.show(start, this.currentView.recPerPage, this.currentView.sort);
	}
	else {
		this.updateAndDisplay();
	}
};


/**
 * Update displayHitList and displayHitListUpToDate, then redraw.
 *
 * @param {boolean} forceFacetUpdate - whether to force redraw the facets
 * @returns {undefined}
 */
pz2_client.prototype.updateAndDisplay = function (forceFacetUpdate) {
	var that = this;
	var hitList = {};

	// Set up displayHitList.
	if (that.config.usePazpar2Facets && that.currentView.type === 'query') {
		// Use the last hit list from pazpar2 with remote filtering.
		that.displayHitList = [];
		jQuery.each(that.currentHits, function (index, key) {
			if (that.hitList[key]) {
				that.displayHitList.push(that.hitList[key]);
			}
		});
	}
	else {
		if (that.currentView.type === 'query') {
			// Use the full stored hit list for local filtering.
			hitList = that.hitList;
		}
		else if (that.currentView.type === 'clipboard') {
			// Use a copy of the clipboard.
			hitList = jQuery.extend(true, {}, that.getClipboard());
		}

		var filterResults = that.displayLists(hitList);
		that.displayHitList = filterResults[0];
		that.displayHitListUpToDate = filterResults[1];
	}

	that.display();
	if (!that.config.usePazpar2Facets ||
		that.currentView.type === 'clipboard' ||
		forceFacetUpdate) {
		that.updateFacetLists();
	}
};
