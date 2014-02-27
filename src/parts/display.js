/**
 * Update the result display.
 *
 * @returns {undefined}
 */
pz2_client.prototype.display = function () {

	/**
	 * Create and return the list of results required for the current
	 * page/faceting etc.
	 *
	 * @returns {DOMElement} - OL element
	 */
	var createResultsListOL = function () {
		var OL = document.createElement('ol');
		OL.setAttribute('class', 'pz2-resultList');
		var firstIndex = that.currentView.recPerPage * (that.currentView.page - 1);
		var numberOfRecordsOnPage = Math.min(that.displayHitList.length - firstIndex, that.currentView.recPerPage);
		OL.setAttribute('start', firstIndex + 1);

		for (var i = 0; i < numberOfRecordsOnPage; i++) {
			var hit = that.displayHitList[firstIndex + i];
			var LI = hit.li;

			if (!LI) {
				LI = that.createResultItem(hit);
			}

			OL.appendChild(LI);

			if (hit.detailsDivVisible) {
				var detailsDiv = hit.detailsDiv;
				if (!detailsDiv) {
					detailsDiv = that.renderDetails(hit.recid[0]);
					hit.detailsDiv = detailsDiv;
				}
				that.appendInfoToContainer(detailsDiv, LI);
				jQuery(LI).addClass('pz2-detailsVisible');
			}
		}
		
		return OL;
	};



	var that = this;

	// Replace old results list
	var OL = createResultsListOL();
	
	var jResults = jQuery('#pz2-results');
	jQuery('.pz2-resultList', jResults).detach();
	jResults.append(OL);

	that.updatePagers();

	// Let Zotero know about updated content
	if (!that.MSIEVersion()) {
		var zoteroNotification = document.createEvent('HTMLEvents');
		zoteroNotification.initEvent('ZoteroItemUpdated', true, true);
		document.dispatchEvent(zoteroNotification);
	}
	
};
