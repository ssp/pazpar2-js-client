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
	var createResultsList = function () {

		/**
		 * Create and return a LI with markup for the passed hit.
		 *
		 * @param {object} hit - data for a result
		 * @returns {DOMElement} - LI element
		 */
		var createResultItem = function (hit) {

			/*	markupForField
				Creates span DOM element and content for a field name; Appends it to the given container.
				input:	fieldName - string with key for a field stored in hit
						container (optional)- the DOM element we created is appended here
						prepend (optional) - string inserted before the DOM element with the field data
						append (optional) - string appended after the DOM element with the field data
				output: the DOM SPAN element that was appended
			*/
			var markupForField = function (fieldName, container, prepend, append) {
				var span;
				var fieldContent = hit['md-' + fieldName];

				if (fieldContent !== undefined && container) {
					that.deduplicate(fieldContent);
					span = document.createElement('span');
					jQuery(span).addClass('pz2-' + fieldName);
					span.appendChild(document.createTextNode(fieldContent.join('; ')));

					if (prepend) {
						container.appendChild(document.createTextNode(prepend));
					}

					container.appendChild(span);

					if (append) {
						container.appendChild(document.createTextNode(append));
					}
				}

				return span;
			};



			/*	titleInfo
				Returns DOM SPAN element with markup for the current hit's title.
				output:	DOM SPAN element
			*/
			var titleInfo = function() {
				var titleCompleteElement = document.createElement('span');
				jQuery(titleCompleteElement).addClass('pz2-title-complete');

				var titleMainElement = document.createElement('span');
				titleCompleteElement.appendChild(titleMainElement);
				jQuery(titleMainElement).addClass('pz2-title-main');
				markupForField('title', titleMainElement);
				markupForField('multivolume-title', titleMainElement, ' ');

				markupForField('title-remainder', titleCompleteElement, ' ');
				markupForField('title-number-section', titleCompleteElement, ' ');

				titleCompleteElement.appendChild(document.createTextNode('. '));

				return titleCompleteElement;
			};



			/*	authorInfo
				Returns DOM SPAN element with markup for the current hit's author information.
				The pre-formatted title-responsibility field is preferred and a list of author
					names is used as a fallback.
				output:	DOM SPAN element
			*/
			var authorInfo = function() {
				var output;
				var outputText;

				if (hit['md-title-responsibility'] !== undefined) {
					// use responsibility field if available
					outputText = hit['md-title-responsibility'].join('; ');
				}
				else if (hit['md-author'] !== undefined) {
					// otherwise try to fall back to author fields
					var authors = [];
					for (var index = 0; index < hit['md-author'].length; index++) {
						if (index < that.config.maxAuthors) {
							var authorname = hit['md-author'][index];
							authors.push(authorname);
						}
						else {
							authors.push(that.localise('et al.'));
							break;
						}
					}

					outputText = authors.join('; ');
				}

				if (outputText) {
					output = document.createElement('span');
					jQuery(output).addClass('pz2-item-responsibility');
					output.appendChild(document.createTextNode(outputText));
				}

				return output;
			};



			/*	journalInfo
				Returns a DOM SPAN element with the current hit’s journal information.
				output: DOM SPAN element
			*/
			var journalInfo = function () {
				var result = document.createElement('span');
				jQuery(result).addClass('pz2-journal');

				var journalTitle = markupForField('journal-title', result, ' – ' + that.localise('In') + ': ');
				if (journalTitle) {
					markupForField('journal-subpart', journalTitle, ', ');
					journalTitle.appendChild(document.createTextNode('.'));
				}
				else {
					result = undefined;
				}

				return result;
			};



			/*	COinSInfo
				Creates an array of COinS spans, to be used by Zotero.
				output:	array of SPAN DOM elements with COinS data.
			*/
			var COinSInfo = function () {

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



			/**
			 * Called when a list item is clicked.
			 * Reveals/Hides the detail information for the record.
			 * Detail information is created when it is first needed and then stored with the record.
			 *
			 * @param {event} event
			 * @returns {undefined}
			 */
			var toggleDetails = function (event) {
				var jLI = jQuery(event.target).parents('li.pz2-record');
				var record = jLI.data('record');
				var jDetails = jQuery('.pz2-details', jLI);
				var jExtraLinks = jQuery('.pz2-extraLinks', record.detailsDiv);

				if (record.detailsDivVisible) {
					// Detailed record information is present: remove it
					jExtraLinks.fadeOut('fast');
					jDetails.slideUp('fast');
					record.detailsDivVisible = false;
					jLI.removeClass('pz2-detailsVisible');
					that.trackPiwik('details/hide');
				}
				else {
					// Create detail view if it doesn’t exist yet.
					if (!record.detailsDiv) {
						record.detailsDiv = that.renderDetails(record);
						that.runMathJax(record.detailsDiv);
					}

					// Append the detail view if it is not in the DOM.
					if (jDetails.length === 0) {
						jDetails = jQuery(record.detailsDiv);
						jDetails.hide();
						jLI.append(jDetails);
						jExtraLinks = jQuery('.pz2-extraLinks', jDetails);
					}

					jExtraLinks.hide();
					if (!that.MSIEVersion() || that.MSIEVersion() >= 8) {
						jDetails.slideDown('fast');
						jExtraLinks.fadeIn('fast');
					}
					else {
						jDetails.show();
						jExtraLinks.show();
					}

					record.detailsDivVisible = true;
					jLI.addClass('pz2-detailsVisible');
					that.trackPiwik('details/show');
				}

				return false;
			};



			var LI = document.createElement('li');
			LI.setAttribute('class', 'pz2-record');
			jQuery(LI).data('record', hit);

			var linkElement = document.createElement('a');
			LI.appendChild(linkElement);
			linkElement.setAttribute('href', '#');
			jQuery(linkElement).addClass('pz2-recordLink');
			linkElement.onclick = toggleDetails;

			var iconElement = document.createElement('span');
			linkElement.appendChild(iconElement);
			var mediaClass = 'unknown';
			if (hit['md-medium'].length === 1) {
				mediaClass = hit['md-medium'][0];
			}
			else if (hit['md-medium'].length > 1) {
				mediaClass = 'multiple';
			}
			jQuery(iconElement).addClass('pz2-mediaIcon ' + mediaClass);
			iconElement.title = that.localise(mediaClass, 'medium');

			that.appendInfoToContainer(titleInfo(), linkElement);
			var authors = authorInfo();
			that.appendInfoToContainer(authors, linkElement);

			var journal = journalInfo();
			that.appendInfoToContainer(journal, linkElement);

			// The text in journal will contain a date. If it does not exist, append the date.
			if (!journal) {
				var spaceBefore = ' ';
				if (authors) {
					spaceBefore = ', ';
				}
				markupForField('date', linkElement, spaceBefore, '.');
			}

			if (that.config.provideCOinSExport) {
				that.appendInfoToContainer(COinSInfo(), LI);
			}
			hit.li = LI;
			that.runMathJax(LI);
			
			return LI;
		};
		
		
		var OL = document.createElement('ol');
		var firstIndex = that.recPerPage * (that.curPage - 1);
		var numberOfRecordsOnPage = Math.min(that.displayHitList.length - firstIndex, that.recPerPage);
		OL.setAttribute('start', firstIndex + 1);
		jQuery(OL).addClass('pz2-resultList');

		for (var i = 0; i < numberOfRecordsOnPage; i++) {
			var hit = that.displayHitList[firstIndex + i];
			var LI = hit.li;

			if (!LI) {
				LI = createResultItem(hit);
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
	var OL = createResultsList();
	jQuery("#pz2-results").empty().append(OL);

	that.updatePagers();

	// Let Zotero know about updated content
	if (!that.MSIEVersion()) {
		var zoteroNotification = document.createEvent('HTMLEvents');
		zoteroNotification.initEvent('ZoteroItemUpdated', true, true);
		document.dispatchEvent(zoteroNotification);
	}
	
};
