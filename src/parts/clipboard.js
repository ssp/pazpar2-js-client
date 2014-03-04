/**
 * Append a link for displaying the clipboard to container.
 *
 * @param {DOMElement} container - the element to append the link to.
 * @returns {undefined}
 */
pz2_client.prototype.appendClipboardLinkToContainer = function (container) {
	if (this.config.addClipboardLink && this.config.useClipboard) {
		var clipboardLink = document.createElement('a');
		container.appendChild(clipboardLink);
		clipboardLink.setAttribute('href', '#');
		clipboardLink.setAttribute('class', 'pz2-clipboardLink');
		jQuery(clipboardLink).on('click', jQuery.proxy(this.showClipboard, this));
		clipboardLink.appendChild(document.createTextNode(this.localise('Merkliste', 'clipboard')));
		this.updateClipboardCount();
	}
};



/**
 * Given a record, create a list item with a link to add/remove the record
 * to/from the clipboard.
 *
 * @param {object} record - record to create the add to clipboard link for
 * @returns {DOMElement} - li element with add to clipboard link
 */
pz2_client.prototype.addToClipboardItem = function (record) {
	var li;

	if (this.storage) {
		li = document.createElement('li');
		li.setAttribute('class', 'pz2-addToClipboard');
		var a = document.createElement('a');
		li.appendChild(a);
		a.setAttribute('href', '#');

		var clipboard = this.getClipboard();

		// Add to clipboard link for query results which are not on the clipboard yet.
		if (!clipboard[record.recid[0]]) {
			a.setAttribute('class', 'pz2-addToClipboardLink pz2-add');
			a.appendChild(document.createTextNode(this.localise('Zur Merkliste hinzufügen', 'clipboard')));
		}
		else {
			a.setAttribute('class', 'pz2-addToClipboardLink pz2-delete');
			a.appendChild(document.createTextNode(this.localise('Aus der Merkliste entfernen', 'clipboard')));
		}
	}
	
	return li;
};



pz2_client.prototype.updateClipboardItemForRecordItem = function (recordItem) {
	var record = jQuery(recordItem).data('record');
	if (jQuery('.pz2-details', recordItem).length > 0) {
		var clipboardItem = this.addToClipboardItem(record);
		jQuery('li.pz2-addToClipboard', recordItem).replaceWith(clipboardItem);
	}
};



/**
 * Click event handler for »add to clipboard« links.
 * Determine the record belonging to the clicked element, copy and clean it,
 * then add it to the clipboard.
 *
 * @param {Event} event - click on add clipboard link
 * @returns {boolean} - false
 */
pz2_client.prototype.addToClipboard = function (event) {

	var addRecordToClipboard = function (record) {
		var clipboard = that.getClipboard();
		clipboard[record.recid[0]] = record;
		that.setClipboard(clipboard);
	};


	var that = this;
	var jLI = jQuery(event.target).parents('li.pz2-record');

	// Copy the record.
	var record = jQuery.extend(true, {}, jLI.data('record'));
	// Remove non-archivable DOM elements from the record.
	delete record.detailsDiv;
	delete record.detailsDivVisible;
	delete record.li;
	for (var locationIndex in record.location) {
		delete record.location[locationIndex].element;
	}

	record['md-timeAddedToClipboard'] = jQuery.now();
	
	addRecordToClipboard(record);
	
	if (jLI.length > 0) {
		this.updateClipboardItemForRecordItem(jLI[0]);
	}

	that.trackPiwik('clipboard/add');

	return false;
};



/**
 * Click event handler for »remove from clipboard« links.
 * Determine the record to remove from the clipboard, then remove it.
 *
 * @param {Event} event - click on remove from clipboard link
 * @returns {boolean} - false
 */
pz2_client.prototype.deleteFromClipboard = function (event) {
	var jLI = jQuery(event.target).parents('li.pz2-record');
	var record = jLI.data('record');

	var clipboard = this.getClipboard();
	delete clipboard[record.recid[0]];

	this.setClipboard(clipboard);

	this.trackPiwik('clipboard/remove');

	return false;
};



/**
 * Click event handler for »empty clipboard« link.
 * Empty the clipboard.
 *
 * @param {Event} event - click on empty clipboard link
 * @returns {boolean} - false
 */
pz2_client.prototype.deleteAllFromClipboard = function (event) {
	this.setClipboard({});

	this.trackPiwik('clipboard/clear');

	return false;
};



/**
 * Click event handler for »show clipboard« link.
 * Show the clipboard content as the result list.
 *
 * @param {Event} event - click on show clipboard link
 * @returns {boolean} - false
 */
pz2_client.prototype.showClipboard = function (event) {
	jQuery('#pazpar2').addClass('pz2-clipboardVisible');
	jQuery('.pz2-clipboardLink')
		.off('click')
		.on('click', jQuery.proxy(this.hideClipboard, this));

	var jForm = jQuery('.pz2-searchForm');
	jForm.animate({'opacity': 0}, 'fast');
	
	var heading = document.createElement('div');
	heading.setAttribute('id', 'pz2-clipboardHeading');
	var jHeading = jQuery(heading);
	jHeading.hide();
	jQuery('#pazpar2').prepend(jHeading);
	jHeading.position(jForm.position());
	jHeading.height(jForm.height());
	jHeading.width(jForm.width());
	jHeading.fadeIn('fast');

	var h3 = document.createElement('h3');
	heading.appendChild(h3);
	heading.appendChild(document.createTextNode(' '));
	h3.appendChild(document.createTextNode(this.localise('Merkliste', 'clipboard')));

	var back = document.createElement('a');
	heading.appendChild(back);
	heading.appendChild(document.createTextNode(' '));
	back.setAttribute('href', '#');
	back.setAttribute('class', 'pz2-removeClipboardLink');
	jQuery(back).on('click', jQuery.proxy(this.hideClipboard, this));
	back.appendChild(document.createTextNode(this.localise('Zurück zur Suche', 'clipboard')));

	var deleteAll = document.createElement('a');
	heading.appendChild(deleteAll);
	heading.appendChild(document.createTextNode(' '));
	deleteAll.setAttribute('href', '#');
	deleteAll.setAttribute('class', 'pz2-clipboardDeleteAll');
	jQuery(deleteAll).on('click', jQuery.proxy(this.deleteAllFromClipboard, this));
	deleteAll.appendChild(document.createTextNode(this.localise('Alle entfernen', 'clipboard')));

	var exports = document.createElement('span');
	heading.appendChild(exports);
	exports.setAttribute('class', 'pz2-extraLinks');
	this.updateExportLinks();

	this.currentView = this.viewSettings.clipboard;
	this.updateFacetingClasses();
	this.updateAndDisplay();

	this.trackPiwik('clipboard/show');

	return false;
};



/**
 * Create or replace the export forms at the top of the history display.
 * Called when the clipboard appears and when the clipboard content changes.
 *
 * @returns {undefined}
 */
pz2_client.prototype.updateExportLinks = function () {
	var jContainer = jQuery('#pz2-clipboardHeading .pz2-extraLinks');
	if (jContainer.length > 0) {
		jContainer.empty();

		var clipboard = this.getClipboard();

		if (this.config.exportFormats.length > 0 && Object.keys(clipboard).length > 0) {
			jContainer.append(document.createTextNode(this.localise('Alle exportieren als', 'clipboard') + ': '));

			var allLocations = [];
			for (var itemIndex in clipboard) {
				var item = clipboard[itemIndex];
				jQuery.merge(allLocations, item.location);
			}

			var links = this.exportLinks({'location': allLocations}, true);

			var UL = document.createElement('ul');
			jContainer.append(UL);
			jQuery('li.pz2-exportItem', links).appendTo(UL);
		}
	}
};



/**
 * Click event handler for »hide clipboard« link.
 * Remove display setup for the clipboard and switch back to displaying query results.
 *
 * @param {Event} event - click on hide clipboard link
 * @returns {undefined} - false
 */
pz2_client.prototype.hideClipboard = function (event) {
	jQuery('#pazpar2').removeClass('pz2-clipboardVisible');
	jQuery('.pz2-clipboardLink')
		.off('click')
		.on('click', jQuery.proxy(this.showClipboard, this));

	jQuery('#pz2-clipboardHeading').fadeOut('fast', function() {
		jQuery(this).remove();
	});

	jQuery('.pz2-searchForm').animate({'opacity': 1}, 'fast');

	this.currentView = this.viewSettings.query;
	this.updateFacetingClasses();
	this.updateAndDisplay(true);

	this.trackPiwik('clipboard/hide');

	return false;
};



/**
 * Return the clipboard.
 *
 * @returns {object} - the clipboard
 */
pz2_client.prototype.getClipboard = function () {
	return this.storage.localStorage.get('clipboard') || {};
};



/**
 * Replace the clipboard with newClipboard.
 *
 * @param {object} newClipboard - the object to set the clipboard to
 * @returns {undefined}
 */
pz2_client.prototype.setClipboard = function (newClipboard) {
	this.storage.localStorage.set('clipboard', newClipboard);
	this.updateClipboardCount();
	this.updateExportLinks();
	this.updateAddRemoveLinks();
	if (this.currentView.type === 'clipboard') {
		this.updateAndDisplay();
	}
};



/**
 * Set the attribute .pz2-clipboardLink/@items to the current
 * number of clipboard items.
 *
 * @returns {undefined}
 */
pz2_client.prototype.updateClipboardCount = function () {
	var clipboard = this.getClipboard();

	var count = 0;
	for (var clipboardIndex in clipboard) {
		count++;
	}

	if (count === 0) {
		jQuery('.pz2-clipboardLink').removeAttr('items');
	}
	else {
		jQuery('.pz2-clipboardLink').attr('items', count);
	}
};



/**
 * Re-create all add to / remove from clipboard links for LIs after the
 * clipboard content has changed.
 * Do this in both the query’s hit list and the clipboard’s hit list.
 *
 * @returns {undefined}
 */
pz2_client.prototype.updateAddRemoveLinks = function () {
	// Query hit list.
	for (var hitIndex in this.hitList) {
		var hit = this.hitList[hitIndex];
		if (hit.li) {
			this.updateClipboardItemForRecordItem(hit.li);
		}
	}

	if (this.currentView.type === 'clipboard') {
		this.updateAndDisplay();
	}
};
