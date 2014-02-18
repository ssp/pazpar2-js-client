/**
 * Create an array of COinS spans, to be used by Zotero.
 *
 * @param {object} hit - pazpar2 record
 * @returns {Array} - of SPAN elements with COinS data
 */
pz2_client.prototype.COinSInfo = function (hit) {

	/*	COinSStringForObject
		Turns an Object containing arrays of strings for its keys into a
			string suitable for the title attribute of a COinS style element.
		input: data - object
		output: string
	*/
	var COinSStringForObject = function (data) {
		var infoList = [];
		for (var key in data) {
			var info = data[key];
			if (info !== undefined) {
				for (var infoIndex in info) {
					infoList.push(key + '=' + encodeURIComponent(info[infoIndex]));
				}
			}
		}
		return infoList.join('&');
	};


	var coinsSpans = [];

	for (var locationIndex in hit.location) {
		var location = hit.location[locationIndex];
		var coinsData = {'ctx_ver': ['Z39.88-2004']};

		// title
		var title = '';
		if (location['md-title']) {
			title += location['md-title'][0];
		}
		if (location['md-multivolume-title']) {
			title += ' ' + location['md-multivolume-title'][0];
		}
		if (location['md-title-remainder']) {
			title += ' ' + location['md-title-remainder'][0];
		}

		// format info
		if (location['md-medium'] && location['md-medium'][0] === 'article') {
			coinsData['rft_val_fmt'] = ['info:ofi/fmt:kev:mtx:journal'];
			coinsData['rft.genre'] = ['article'];
			coinsData['rft.atitle'] = [title];
			coinsData['rft.jtitle'] = location['md-journal-title'];
			if (location['md-volume-number'] || location['md-pages-number']) {
				// We have structured volume or pages information: use that instead of journal-subpart.
				coinsData['rft.volume'] = location['md-volume-number'];
				coinsData['rft.issue'] = location['md-issue-number'];
				if (location['md-pages-number']) {
					var pageInfo = (location['md-pages-number'][0]).split('-');
					coinsData['rft.spage'] = [pageInfo[0]];
					if (pageInfo.length >= 2) {
						coinsData['rft.epage'] = [pageInfo[1]];
					}
				}
			}
			else {
				// We lack structured volume information: use the journal-subpart field.
				coinsData['rft.volume'] = location['md-journal-subpart'];
			}
		}
		else {
			coinsData['rft_val_fmt'] = ['info:ofi/fmt:kev:mtx:book'];
			coinsData['rft.btitle'] = [title];
			if (location['md-medium'] && location['md-medium'][0] === 'book')  {
				coinsData['rft.genre'] = ['book'];
			}
			else {
				coinsData['rft.genre'] = ['document'];
			}
		}

		// authors
		var authors = [];
		if (location['md-author']) {
			authors = authors.concat(location['md-author']);
		}
		if (location['md-other-person']) {
			authors = authors.concat(location['md-other-person']);
		}
		coinsData['rft.au'] = authors;

		// further fields
		coinsData['rft.date'] = location['md-date'];
		coinsData['rft.isbn'] = location['md-isbn'];
		coinsData['rft.issn'] = location['md-issn'];
		coinsData['rft.source'] = location['md-catalogue-url'];
		coinsData['rft.pub'] = location['md-publication-name'];
		coinsData['rft.place'] = location['md-publication-place'];
		coinsData['rft.series'] = location['md-series-title'];
		coinsData['rft.description'] = location['md-description'];
		coinsData['rft_id'] = [];
		if (location['md-doi']) {
			coinsData['rft_id'].push('info:doi/' + location['md-doi'][0]);
		}
		for (var URLID in location['md-electronic-url']) {
			coinsData['rft_id'].push(location['md-electronic-url'][URLID]);
		}

		var span = document.createElement('span');
		jQuery(span).addClass('Z3988');
		var coinsString = COinSStringForObject(coinsData);
		span.setAttribute('title', coinsString);
		coinsSpans.push(span);
	}

	return coinsSpans;
};
