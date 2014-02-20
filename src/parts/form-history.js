/**
 * Append a link for displaying the history to container.
 *
 * @param {DOMElement} container - the element to append the link to.
 * @returns {undefined}
 */
pz2_client.prototype.appendHistoryLinkToContainer = function (container) {
	if (this.config.addHistoryLink && this.config.historyItems > 0) {
		var historyLink = document.createElement('a');
		container.appendChild(historyLink);
		historyLink.setAttribute('href', '#');
		historyLink.setAttribute('class', 'pz2-historyLink');
		jQuery(historyLink).click(jQuery.proxy(this.showHistory, this));
		historyLink.appendChild(document.createTextNode(this.localise('Suchgeschichte', 'form-history')));
	}
};



/**
 * Store the passed query string at the beginning of the history
 * in local storage.
 * Remove potentially existing entry with the same query string and
 * ensure the configured maximum history size is not exceeded.
 *
 * @param {string} queryString - the query string to add to the history
 */
pz2_client.prototype.addToHistory = function (queryString) {
	if (this.storage && this.config.historyItems > 0) {
		var history = this.getHistory();
		for (var historyIndex in history) {
			if (history[historyIndex].queryString === queryString) {
				history.splice(historyIndex, 1);
				break;
			}
		}

		var searchData = {
			service: this.my_paz.serviceId,
			queryString: queryString,
			time: jQuery.now()
		};

		history.unshift(searchData);
		history.splice(this.config.historyItems, history.length - this.config.historyItems);
		this.setHistory(history);
	}
};



/**
 * Delete the displayed history and rebuild it with the current data.
 *
 * @returns {undefined}
 */
pz2_client.prototype.updateHistory = function () {
	var jHistoryList = jQuery('#pz2-history .pz2-historyList');

	if (jHistoryList.length > 0) {

		/**
		 * Event handler for clicking a string in the search history.
		 * Hide the search history and start a search for that query.
		 *
		 * @param {Event} event
		 * @returns {boolean} - false
		 */
		var startHistorySearchForQueryString = function (event) {
			this.hideHistory();
			jQuery('#pz2-field-all').val(jQuery(event.target).text());
			jQuery.proxy(this.config.triggerSearchFunction, this)();

			return false;
		};


		jHistoryList.empty();

		var history = this.getHistory();
		if (history.length > 0) {
			jHistoryList.parents('#pz2-history').removeClass('pz2-empty');

			for (var historyIndex in history) {
				var historyItem = history[historyIndex];

				var li = document.createElement('li');
				jHistoryList.append(li);

				var a = document.createElement('a');
				li.appendChild(a);
				a.setAttribute('href', '#');
				jQuery(a).click(jQuery.proxy(startHistorySearchForQueryString, this));
				a.appendChild(document.createTextNode(historyItem.queryString));
			}
		}
		else {
			var note = document.createElement('li');
			jHistoryList.append(note);
			jHistoryList.parents('#pz2-history').addClass('pz2-empty');
			note.appendChild(document.createTextNode(this.localise('Noch keine Suchabfragen durchgeführt.', 'form-history')));
		}
	}
};



/**
 * Show the pane with recent search terms from local storage.
 * Handle clicks on history items.
 *
 * @returns {boolean} - false
 */
pz2_client.prototype.showHistory = function () {

	/**
	 * Event handler for deleting the history link.
	 * Remove all entries and update the display.
	 *
	 * @param {Event} event
	 * @returns {undefined}
	 */
	var deleteHistory = function (event) {
		this.setHistory([]);
		this.updateHistory();
	};



	var that = this;

	if (that.storage && that.storage.localStorage) {
		jQuery('#pazpar2').addClass('pz2-historyVisible');
		jQuery('.pz2-historyLink').off('click').click(jQuery.proxy(that.hideHistory, that));
		jQuery('#pz2-history').remove();

		var container = document.createElement('div');
		container.id = 'pz2-history';

		var heading = document.createElement('h5');
		container.appendChild(heading);
		heading.appendChild(document.createTextNode(that.localise('Suchgeschichte', 'form-history')));

		var closeButton = document.createElement('a');
		heading.appendChild(document.createTextNode(' '));
		heading.appendChild(closeButton);
		closeButton.setAttribute('href', '#');
		jQuery(closeButton).click(jQuery.proxy(that.hideHistory, that));
		closeButton.setAttribute('class', 'pz2-closeButton');
		closeButton.appendChild(document.createTextNode(that.localise('[ausblenden]', 'form-history')));

		var deleteButton = document.createElement('a');
		heading.appendChild(document.createTextNode(' '));
		heading.appendChild(deleteButton);
		deleteButton.setAttribute('href', '#');
		jQuery(deleteButton).click(jQuery.proxy(deleteHistory, that));
		deleteButton.setAttribute('class', 'pz2-deleteButton');
		deleteButton.appendChild(document.createTextNode(that.localise('[Einträge löschen]', 'form-history')));

		var ol = document.createElement('ol');
		container.appendChild(ol);
		ol.setAttribute('class', 'pz2-historyList');

		var jContainer = jQuery(container);
		jContainer.hide();
		jQuery('#pazpar2').append(container);
		this.updateHistory();
		jContainer.slideDown('fast');
	}

	return false;
};



/**
 * Event handler to close pane with recent search term.
 *
 * @returns {boolean} - false
 */
pz2_client.prototype.hideHistory = function () {
	var jHistory = jQuery('#pz2-history');

	if (jHistory.length > 0) {
		jQuery('#pazpar2').removeClass('pz2-historyVisible');
		jQuery('.pz2-historyLink').off('click').click(jQuery.proxy(this.showHistory, this));

		jHistory.slideUp('fast', function () {
			jQuery(this).remove();
		});
	}
	
	return false;
};



/**
 * Set up autocomplete to return earlier query terms from the history.
 *
 * Configure autocompleteSetupFunction = pz2client.autocompleteSetupHistory to use it.
 *
 * @param {string} URL
 * @param {string} fieldName
 * @returns {object}
 */
pz2_client.prototype.autocompleteSetupHistory = function (URL, fieldName) {
	var that = this;

	var source = function (request, response) {
		if (that.storage && that.storage.localStorage) {
			var suggestions = [];
			var history = that.getHistory();
			var re = new RegExp(jQuery.ui.autocomplete.escapeRegex(request.term), 'i');
			for (var historyIndex in history) {
				var query = history[historyIndex].queryString;
				if (re.exec(query)) {
					suggestions.push(query);
				}
			}
			response(suggestions);
		}
	};

	return {
		source: source
	};
};



/**
 * Get the search history from local storage.
 *
 * @returns {array}
 */
pz2_client.prototype.getHistory = function () {
	return this.storage.localStorage.get('history') || [];
};



/**
 * Write the search history to local storage.
 *
 * @param {array} newHistory - array of search terms
 * @returns {undefined}
 */
pz2_client.prototype.setHistory = function (newHistory) {
	this.storage.localStorage.set('history', newHistory);
	this.updateHistory();
};
