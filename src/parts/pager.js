/**
 * Updates pager and record counts shown in .pz2-pager elements.
 * 
 * @returns {undefined}
 */
pz2_client.prototype.updatePagers = function () {

	/*	showPage
		Shows result page pageNumber.
		input:	pageNum - number of the page to be shown
		return:	false
	*/
	var showPage = function (pageNumber, link) {
		that.currentView.page = Math.min( Math.max(0, pageNumber), Math.ceil(that.displayHitList.length / that.currentView.recPerPage) );
		that.display();
		that.trackPiwik('page', pageNumber);
	};



	/*	pagerGoto
		Get the number in the calling element’s »pageNumber« attribute and go
		to the page with that number.
		return:	false
	*/
	var pagerGoto = function () {
		var jThis = jQuery(this);
		var pageNumber = jThis.parent().attr('pageNumber');
		if (jThis.parents('.pz2-pager').hasClass('pz2-bottom')) {
			jQuery('body,html').animate({'scrollTop': jQuery('.pz2-pager.pz2-top').offset().top}, 'fast');
		}
		showPage(pageNumber);
		return false;
	};


	/*	pagerNext
		Display the next page (if available).
		return:	false
	*/
	var pagerNext = function () {
		showPage(that.currentView.page + 1);
		return false;
	};



	/*	pagerPrev
		Display the previous page (if available).
		return:	false
	*/
	var pagerPrev = function () {
		showPage(that.currentView.page - 1);
		return false;
	};



	/**
	 * Create a pager.
	 * To be used in jQuery.each() via jQuery.proxy() to preserve this.
	 * 
	 * @param {DOMElement} element - element to place the pager into
	 */
	var createPager = function(element) {
		var pages = Math.ceil(that.displayHitList.length / that.currentView.recPerPage);

		// Update pager
		var jPageNumbersContainer = jQuery('.pz2-pageNumbers', element);
		jPageNumbersContainer.removeClass().addClass('pz2-pageNumbers pz2-pageCount-' + pages);
		jPageNumbersContainer.empty();
		var pageNumbersContainer = jPageNumbersContainer[0];

		var previousLink = document.createElement('a');
		var jPreviousLink = jQuery(previousLink);
		if (that.currentView.page > 1) {
			previousLink.setAttribute('href', '#');
			jPreviousLink.click(pagerPrev);
			previousLink.title = that.localise('Vorige Trefferseite anzeigen', 'pager');
		}
		jPreviousLink.addClass('pz2-prev');
		previousLink.appendChild(document.createTextNode('«'));
		pageNumbersContainer.appendChild(previousLink);

		var pageList = document.createElement('ol');
		jQuery(pageList).addClass('pz2-pages');
		pageNumbersContainer.appendChild(pageList);

		var blockSize = 4;
		var inBlockGap = false;

		for(var pageNumber = 1; pageNumber <= pages; pageNumber++) {
			if (pageNumber < 5 || Math.abs(pageNumber - that.currentView.page) < 3 || pages < pageNumber + 4) {
				var pageItem = document.createElement('li');
				pageList.appendChild(pageItem);
				pageItem.setAttribute('pageNumber', pageNumber);
				if(pageNumber !== that.currentView.page) {
					var linkElement = document.createElement('a');
					linkElement.setAttribute('href', '#');
					jQuery(linkElement).click(pagerGoto);
					linkElement.appendChild(document.createTextNode(pageNumber));
					pageItem.appendChild(linkElement);
				}
				else {
					jQuery(pageItem).addClass('pz2-currentPage');
					pageItem.appendChild(document.createTextNode(pageNumber));
				}
				inBlockGap = false;
			}
			else {
				if (!inBlockGap) {
					var dotsItem = document.createElement('li');
					pageList.appendChild(dotsItem);
					dotsItem.setAttribute('class', 'pz2-pagerGap');
					dotsItem.appendChild(document.createTextNode('…'));
					inBlockGap = true;
				}
			}
		}

		var nextLink = document.createElement('a');
		var jNextLink = jQuery(nextLink);
		if (pages - that.currentView.page > 0) {
			nextLink.setAttribute('href', '#');
			jNextLink.click(pagerNext);
			nextLink.title = that.localise('Nächste Trefferseite anzeigen', 'pager');
		}
		jNextLink.addClass('pz2-next');
		nextLink.appendChild(document.createTextNode('»'));
		pageNumbersContainer.appendChild(nextLink);

		var jRecordCount = jQuery('.pz2-recordCount');
		jRecordCount.removeClass('pz2-noResults');

		// Add record count information
		var infoString;
		if (that.displayHitList.length > 0) {
			var firstIndex = that.currentView.recPerPage * (that.currentView.page - 1);
			var numberOfRecordsOnPage = Math.min(that.displayHitList.length - firstIndex, that.currentView.recPerPage);
			infoString = String(firstIndex + 1) + '-' +
				String(firstIndex + numberOfRecordsOnPage) +
				' ' + that.localise('von', 'pager') + ' ' +
				String(that.displayHitList.length);

			// Determine transfer status and append indicators about it to
			// the result count: + for overflow, … while we are busy and
			// · for errors.
			var transfersBusy = [];
			var resultOverflow = [];
			var hasError = [];
			var totalResultCount = 0;
			var statusIndicator = '';

			for (var targetIndex in that.targetStatus) {
				var target = that.targetStatus[targetIndex];

				if (!isNaN(target.hits)) {
					totalResultCount += parseInt(target.hits, 10);
				}

				if (target.state === 'Client_Working') {
					transfersBusy.push(target);
				}
				else if (target.state === 'Client_Idle') {
					if (target.hits > target.records) {
						resultOverflow.push(target);
					}
				}
				else if (target.state === 'Client_Error' || target.state === 'Client_Disconnected') {
					hasError.push(target);
				}
			}

			var titleText = [];
			if (resultOverflow.length > 0) {
				infoString += that.localise('+', 'status');
				var overflowMessage = that.localise('Es können nicht alle # Treffer geladen werden.', 'status');
				titleText.push(overflowMessage.replace('#', totalResultCount));
			}
			if (transfersBusy.length > 0) {
				infoString += that.localise('...', 'status');
			}
			if (hasError.length > 0) {
				infoString += that.localise('Error indicator', 'status');
				var errorMessage = that.localise('Bei der Übertragung von Daten aus # der abgefragten Kataloge ist ein Fehler aufgetreten.', 'status');
				titleText.push(errorMessage.replace('#', hasError.length));
			}

			jRecordCount.attr('title', titleText.join('\n'));

			// Mark results as filtered if the currentView.filters has a
			// non-trivial property.
			for  (var filterIndex  in that.currentView.filters) {
				if (that.currentView.filters[filterIndex] !== undefined) {
					infoString += ' [' + that.localise('gefiltert', 'facets') + ']';
					break;
				}
			}
		}
		else {
			if (!that.my_paz.currQuery) {
				infoString = that.localise('keine Suchabfrage', 'status');
			}
			else if (that.my_paz.activeClients === 0) {
				infoString = that.localise('keine Treffer gefunden', 'status');
				jRecordCount.addClass('pz2-noResults');
				that.updateProgressBar(100);
			}
			else {
				infoString = that.localise('Suche...', 'status');
			}
		}

		jRecordCount.empty();
		jRecordCount.append(infoString);
	};



	var that = this;

	jQuery('div.pz2-pager').each( jQuery.proxy(createPager, that, [arguments[2]]) );

};
