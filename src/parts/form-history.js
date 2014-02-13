/**
 * Show and handle the pane with recent search terms from local storage.
 *
 * @returns {undefined}
 */
pz2_client.prototype.showHistory = function () {
	var startHistorySearchForQueryString = function () {
		hideHistory();
		jQuery('#pz2-field-all').val(jQuery(this).text());
		jQuery.proxy(that.config.triggerSearchFunction, that)();
		return false;
	};

	var hideHistory = function () {
		jQuery('#pz2-searchHistory').slideUp('fast', function () {
			jQuery(this).remove();
		});

		return false;
	};


	var that = this;

	if (that.storage && that.storage.localStorage) {
		jQuery('#pz2-searchHistory').remove();

		var container = document.createElement('div');
		container.id = 'pz2-searchHistory';

		var heading = document.createElement('h5');
		container.appendChild(heading);
		heading.appendChild(document.createTextNode(that.localise('Suchgeschichte')));

		var closeButton = document.createElement('a');
		heading.appendChild(document.createTextNode(' '));
		heading.appendChild(closeButton);
		closeButton.setAttribute('href', '#');
		closeButton.onclick = hideHistory;
		closeButton.class = 'pz2.closeButton';
		closeButton.appendChild(document.createTextNode('[ausblenden]'));

		var ol = document.createElement('ol');
		container.appendChild(ol);

		var history = that.storage.localStorage.get('history') || [];
		var li;
		var a;
		for (var historyIndex in history) {
			var historyItem = history[historyIndex];

			li = document.createElement('li');
			ol.appendChild(li);

			a = document.createElement('a');
			li.appendChild(a);
			a.setAttribute('href', '#');
			a.onclick = startHistorySearchForQueryString;
			a.appendChild(document.createTextNode(historyItem.queryString));
		}

		var jContainer = jQuery(container);
		jContainer.hide();
		jQuery('#pazpar2').append(container);
		jContainer.slideDown('fast');
	}
};



/**
 * Sets up autocomplete to return earlier query terms from the history.
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
			var history = that.storage.localStorage.get('history') || [];
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
