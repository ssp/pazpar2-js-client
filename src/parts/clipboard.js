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
		jQuery(clipboardLink).click(jQuery.proxy(this.showClipboard, this));
		clipboardLink.appendChild(document.createTextNode(this.localise('Merkliste', 'clipboard')));
		this.updateClipboardCount();
	}
};



/**
 * Given a container, get the associated record and add a link for
 * adding or removing the record to the clipboard to the container.
 *
 * @param {DOMElement} container - li.pz-record with the record as .data('record')
 * @returns {undefined}
 */
pz2_client.prototype.appendClipboardLinkForRecordToContainer = function (container) {
	jQuery('.pz2-addToClipboardLink', container).remove();

	var a = document.createElement('a');
	container.appendChild(a);
	a.setAttribute('href', '#');

	var record = jQuery(container).data('record');
	var clipboard = this.getClipboard();

	// Add to clipboard link for query results which are not on the clipboard yet.
	if (!clipboard[record.recid[0]] && this.curSource === 'query') {
		a.setAttribute('class', 'pz2-addToClipboardLink pz2-add');
		a.setAttribute('title', this.localise('Zur Merkliste hinzufügen', 'clipboard'));
		jQuery(a).click(jQuery.proxy(this.addToClipboard, this));
		a.appendChild(document.createTextNode('+'));
	}
	else {
		a.setAttribute('class', 'pz2-addToClipboardLink pz2-delete');
		a.setAttribute('title', this.localise('Aus der Merkliste entfernen', 'clipboard'));
		jQuery(a).click(jQuery.proxy(this.deleteFromClipboard, this));
		a.appendChild(document.createTextNode('-'));		
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
		this.appendClipboardLinkForRecordToContainer(jLI[0]);
	}

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
	jQuery('.pz2-clipboardLink').off('click').click(jQuery.proxy(this.hideClipboard, this));

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
	jQuery(back).click(jQuery.proxy(this.hideClipboard, this));
	back.appendChild(document.createTextNode(this.localise('Zurück zur Suche', 'clipboard')));

	var deleteAll = document.createElement('a');
	heading.appendChild(deleteAll);
	heading.appendChild(document.createTextNode(' '));
	deleteAll.setAttribute('href', '#');
	deleteAll.setAttribute('class', 'pz2-clipboardDeleteAll');
	jQuery(deleteAll).click(jQuery.proxy(this.deleteAllFromClipboard, this));
	deleteAll.appendChild(document.createTextNode(this.localise('Alle entfernen', 'clipboard')));

	var exports= document.createElement('span');
	heading.appendChild(exports);
	exports.setAttribute('class', 'pz2-extraLinks');
	this.updateExportLinks();

	this.curSource = 'clipboard';
	this.updateAndDisplay();

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

		if (this.config.exportFormats.length > 0 && clipboard.length > 0) {
			jContainer.append(document.createTextNode(this.localise('Alle exportieren als', 'clipboard') + ': '));

			var allLocations = [];
			for (var itemIndex in clipboard) {
				var item = clipboard[itemIndex];
				jQuery.merge(allLocations, item.location);
			}

			var links = this.exportLinks({'location': allLocations});

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
	jQuery('.pz2-clipboardLink').off('click').click(jQuery.proxy(this.showClipboard, this));

	jQuery('#pz2-clipboardHeading').fadeOut('fast', function() {
		jQuery(this).remove();
	});

	jQuery('.pz2-searchForm').animate({'opacity': 1}, 'fast');

	this.curSource = 'query';
	this.updateAndDisplay();

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
	if (this.curSource === 'clipboard') {
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
			this.appendClipboardLinkForRecordToContainer(hit.li);
		}
	}

	if (this.curSource === 'clipboard') {
		this.updateAndDisplay();
	}
};
