/**
 * Create a parameter string for OpenURL query for the passed record.
 *
 * @param {type} record - pz2 record
 * @returns {string} query parameter string
 */
pz2_client.prototype.OpenURLParameterStringForRecord = function (record) {
	var parameters = this.OpenURLParametersForRecord(record);
	// Use »traditional mode« to get repeating parameters without an array structure.
	return jQuery.param(parameters, true);
};



/**
 * Create OpenURL parameters for the passed record.
 *
 * @param {object} record - pz2 record
 * @returns {object} - parameters for query URL for use with jQuery.get()
 */
pz2_client.prototype.OpenURLParametersForRecord = function (record) {
	var parameters = {};

	var ISSN;
	if (record['md-issn'] && record['md-issn'].length > 0) {
		ISSN = record['md-issn'][0];
	}
	else if (record['md-pissn'] && record['md-pissn'].length > 0) {
		ISSN = record['md-pissn'][0];
	}
	var eISSN;
	if (record['md-eissn'] && record['md-eissn'].length > 0) {
		eISSN = record['md-eissn'][0];
	}
	var ZDBID;
	if (record['md-zdb-number'] && record['md-zdb-number'].length > 0) {
		ZDBID = record['md-zdb-number'][0];
		// ZDB-JOP expects the ZDB-ID to be of the form XXXXXXX-Y: Insert the »-« if it is not there.
		if (ZDBID[ZDBID.length - 2] !== '-') {
			ZDBID = ZDBID.slice(0, ZDBID.length - 1) + '-' + ZDBID[ZDBID.length - 1];
		}
	}


	if (ISSN) {	parameters['issn'] = ISSN; }
	if (eISSN) { parameters['eissn'] = eISSN; }
	if (!(ISSN || eISSN) && ZDBID) { parameters['pid'] = 'zdbid=' + ZDBID; }

	var year = parseInt(record['md-date'], 10);
	if (year && year.length) {	parameters['date'] = year[0]; }

	var author = record['md-author'];
	if (author && author.length > 0) { parameters['au'] = record['md-author']; }

	var title = record['md-title'];


	if (record['md-medium'] === 'article') {
		parameters['genre'] = 'article';

		// Add additional information to request to get more precise result and better display.
		var volume = parseInt(record['md-volume-number'], 10);
		if (volume && volume.length) { parameters['volume'] = volume[0]; }

		var issue = parseInt(record['md-issue-number'], 10);
		if (issue && issue.length > 0) { parameters['issue'] = issue[0]; }

		var pages = record['md-pages-number'];
		if (pages && pages.length > 0) { parameters['pages'] = pages[0]; }

		if (title && title.length > 0) { parameters['atitle'] = title[0]; }
	}
	else if (parameters['issn']) {
		// it’s a journal
		parameters['genre'] = 'journal';

		var journalTitle = record['md-title'];
		if (journalTitle && journalTitle.length > 0) { parameters['title'] = journalTitle[0]; }
	}
	else {
		if (record['md-medium'] === 'book') {
			parameters['genre'] = 'book';
			if (title && title.length > 0) { parameters['btitle'] = title[0]; }
		}
		else {
			parameters['genre'] = 'other';
			if (title && title.length > 0) { parameters['title'] = title[0]; }
		}

		var ISBNs = this.ISBNsForRecord(record);
		if (ISBNs.length > 0) { parameters['isbn'] = ISBNs[0]; }

		var publisher = record['md-publisher'];
		if (publisher && publisher.length > 0) { parameters['pub'] = publisher[0]; }
	}

	return parameters;
};
