/**
 * Hooks jQuery autocomplete up to the search fields that have autocompleteURLs configured.
 *
 * @returns {undefined}
 */
pz2_client.prototype.setupAutocomplete = function () {
	if (jQuery.ui && jQuery.ui.autocomplete && typeof(this.config.autocompleteSetupFunction) === 'function') {
		var that = this;

		var selectionHandler = function (event, ui) {
			event.target.value = ui.item.value;
			that.trackPiwik('autocomplete');
			jQuery.proxy(that.config.triggerSearchFunction, that)();
		};

		for (var fieldName in that.config.autocompleteURLs) {
			var URL = that.config.autocompleteURLs[fieldName];
			var autocompleteConfiguration = jQuery.proxy(that.config.autocompleteSetupFunction, that, URL, fieldName)();
			autocompleteConfiguration['select'] = selectionHandler;
			var jField = jQuery('#pz2-field-' + fieldName);
			jField.autocomplete(autocompleteConfiguration);
		}
	}
};




/**
 * Most basic function for handling autocomplete: Configures jQuery autocomplete
 * to load terms from the given URL on the host which is expected to return
 * a JSON array.
 *
 * Configure autocompleteSetupFunction = pz2client.autocompleteSetupArray to use it.
 *
 * @param {string} URL
 * @param {string} fieldName
 * @returns {object}
 */
pz2_client.prototype.autocompleteSetupArray = function (URL, fieldName) {
	return {'source': URL};
};



/**
 * Autocomplete setup function for using a Solr spellchecker with JSON output.
 * Uses JSONP, so it may be on a different host.
 *
 * Configure autocompleteSetupFunction = pz2client.autocompleteSetupSolrSpellcheck to use it.
 *
 * @param {type} URL
 * @param {type} fieldName
 * @returns {undefined}
 */
pz2_client.prototype.autocompleteSetupSolrSpellcheck = function (URL, fieldName) {
	return {
		'source': function(request, response) {
			jQuery.getJSON(URL + request.term + '&wt=json&json.wrf=?', request, function (data) {
				var suggestions = data.spellcheck.suggestions;
				if (suggestions.length > 0) {
					response(data.spellcheck.suggestions[1].suggestion);
				}
			});
		}
	};
};



/**
 * Autocomplete setup function for using a Solr spellchecker with XML output
 * provided by Service Proxy.
 *
 * Configure autocompleteSetupFunction = pz2_client.autocompleteSetupSolrSpellcheckServiceProxyXML to use it.
 *
 * @param {type} URL
 * @param {type} fieldName
 * @returns {undefined}
 */
pz2_client.prototype.autocompleteSetupSolrSpellcheckServiceProxyXML = function (URL, fieldName) {
    return {
        'source': function(request, response) {
            jQuery.get(URL + request.term, function (data) {
                var suggestions = [];
                jQuery(data).find('item').each(function() {
                    suggestions.push($(this).attr('name'));
                });
                response(suggestions);
            });
        }
    };
};
