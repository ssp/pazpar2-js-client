/**
 * Localisation functions and dictionary setup.
 */



/**
 * Return localised term using the passed dictionary
 * or the one stored in localisations.default.
 * The localisation dictionary has ISO 639-1 language codes as keys.
 * For each of them there can be a dictionary with terms for that language.
 * In case the language dictionary is not present, the default ('en') is used.
 *
 * @param {string} term - the string to localise
 * @param {string} dictionaryName (optional) - name of localisation in the localisations object
 * @returns {string} localised string
 */
pz2_client.prototype.localise = function (term, dictionaryName) {
	var localised = term;

	var dictionary = this.localisations.general;
	if (dictionaryName && this.localisations[dictionaryName]) {
		dictionary = this.localisations[dictionaryName];
	}

	if (this.pageLanguage === undefined) {
		// Determine the page’s language as set in html/@lang for localisations ASAP.
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
	}

	var languageDict = dictionary[this.pageLanguage];
	if (languageDict === undefined) {
		languageDict = dictionary['en'];
	}

	if (languageDict && languageDict[term] !== undefined) {
		localised = languageDict[term];
	}
	else if (dictionary['en'][term] !== undefined) {
		localised = languageDict[term];
	}
	else {
		// for debugging
		// if (!dictionaryName || !dictionaryName.match(/^(detail-label|facet-)/)) { console.log(term + ' - ' + dictionaryName); }
	}
	
	return localised;
};



/**
 * Overwrite specific strings in the localisation dictionaries.
 * Figures out the correct dictionary based on the key.
 * Made to enable overwriting localisation strings from a CMS without
 * needing to touch the JavaScript code.
 *
 * @param {string} languageCode
 * @param {string} key
 * @param {string} localisedString
 * @returns {undefined}
 */
pz2_client.prototype.overrideLocalisation = function (languageCode, key, localisedString) {
	// First figure out the correct object to override the localisation in.
	var localisationObject = this.localisations.general;
	for (var localisationType in this.localisations) {
		if (key.substr(0, localisationType.length) === localisationType) {
			localisationObject = this.localisations[localisationType];
			key = key.substr(localisationType.length + 1);
			break;
		}
	}

	// Then override the localisation if the language exists.
	if (languageCode === 'default') {
		languageCode = 'en';
	}
	if (localisationObject[languageCode]) {
		localisationObject[languageCode][key] = localisedString;
	}
};



/**
 * Localisation dictionaries.
 * The object is filled with these from the files in localisation.
 *
 * @type {object}
 */
pz2_client.prototype.localisations = {};
