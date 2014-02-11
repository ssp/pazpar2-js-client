/**
 * Insert a Google Books Preview for the current data if possible.
 * 
 * @param {type} data - pz2 object for the item
 * @param {type} container - DOM element that the resulting information is inserted into.
 * @returns {undefined}
 */
pz2_client.prototype.appendGoogleBooksElementTo = function (data, container) {

	/**
	 * Callback for Google’s asynchronous loader. Start working here.
	 */
	var booksLoaded = function () {
		// Create list of search terms from ISBN and OCLC numbers.
		var searchTerms = [];
		for (var locationNumber in data.location) {
			var numberField = String(data.location[locationNumber]['md-isbn']);
			var matches = numberField.replace(/-/g,'').match(/[0-9]{9,12}[0-9xX]/g);
			if (matches) {
				for (var ISBNMatchNumber = 0; ISBNMatchNumber < matches.length; ISBNMatchNumber++) {
					searchTerms.push('ISBN:' + matches[ISBNMatchNumber]);
				}
			}
			numberField = String(data.location[locationNumber]['md-oclc-number']);
			matches = numberField.match(/[0-9]{4,}/g);
			if (matches) {
				for (var OCLCMatchNumber = 0; OCLCMatchNumber < matches.length; OCLCMatchNumber++) {
					searchTerms.push('OCLC:' + matches[OCLCMatchNumber]);
				}
			}
		}

		if (searchTerms.length > 0) {
			// Query Google Books for the ISBN/OCLC numbers in question.
			var googleBooksURL = 'http://books.google.com/books?bibkeys=' + searchTerms + '&jscmd=viewapi&callback=?';
			
			jQuery.getJSON(googleBooksURL,
				function(data) {
					/*	bookScore
						Returns a score for given book to help determine which book
						to use on the page if several results exist.

						Preference is given existing previews and books that are
						embeddable are preferred if there is a tie.

						input: book - Google Books object
						output: integer
					*/
					function bookScore (book) {
						var score = 0;

						if (book.preview === 'full') {
							score += 10;
						}
						else if (book.preview === 'partial') {
							score += 5;
						}
						if (book.embeddable === true) {
							score += 1;
						}

						return score;
					}


					/*
						If there are multiple results choose the first one with
						the maximal score. Ignore books without a preview.
					*/
					var selectedBook;
					jQuery.each(data,
						function(bookNumber, book) {
							var score = bookScore(book);
							book.score = score;

							if (selectedBook === undefined || book.score > selectedBook.score) {
								if (book.preview !== 'noview') {
									selectedBook = book;
								}
							}
						}
					);

					// Add link to Google Books if there is a selected book.
					if (selectedBook !== undefined) {
						/*	createGoogleBooksLink
							Returns a link to open the Google Books Preview.
							Depending on the features of the Preview, it opens interactively
							on top of our view or in a new window.

							output: DOMElement - a Element with href and possibly onclick
						*/

						var createGoogleBooksLink = function () {
							var bookLink = document.createElement('a');
							bookLink.setAttribute('href', selectedBook.preview_url);
							that.turnIntoNewWindowLink(bookLink);
							if (selectedBook.embeddable === true) {
								bookLink.onclick = openPreview;
							}
							return bookLink;
						};

						var dt = document.createElement('dt');
						var dd = document.createElement('dd');

						var bookLink = createGoogleBooksLink();
						dd.appendChild(bookLink);

						var buttonImageURL = 'http://www.google.com/intl/' + that.pageLanguage + '/googlebooks/images/gbs_preview_button1.gif';

						var buttonImage = document.createElement('img');
						buttonImage.setAttribute('src', buttonImageURL);
						var buttonAltText = 'Google Books';
						if (selectedBook.preview === 'full') {
							buttonAltText = that.localise('Google Books: Vollständige Ansicht');
						}
						else if (selectedBook.preview === 'partial') {
							buttonAltText = that.localise('Google Books: Eingeschränkte Vorschau');
						}
						buttonImage.setAttribute('alt', buttonAltText);
						bookLink.appendChild(buttonImage);

						if (selectedBook.thumbnail_url !== undefined) {
							bookLink = createGoogleBooksLink();
							dt.appendChild(bookLink);
							var coverArtImage = document.createElement('img');
							bookLink.appendChild(coverArtImage);
							coverArtImage.setAttribute('src', selectedBook.thumbnail_url);
							coverArtImage.setAttribute('alt', that.localise('Umschlagbild'));
							jQuery(coverArtImage).addClass('bookCover');
						}

						jElements = jQuery([dt, dd]);
						jElements.addClass('pz2-googleBooks');
						jElements.hide();
						container.appendChild(dt);
						container.appendChild(dd);
						if (!that.MSIEVersion() || that.MSIEVersion() >= 8) {
							jElements.slideDown('fast');
						}
						else {
							jElements.show();
						}
					}
				}
			);
		}



		/*	openPreview
			Called when the Google Books button is clicked.
			Opens Google Preview.
			output: false (so the click isn’t handled any further)
		*/
		var openPreview = function() {
			var googlePreviewButton = this;
			// Get hold of containing <div>, creating it if necessary.
			var previewContainerDivName = 'googlePreviewContainer';
			var previewContainerDiv = document.getElementById(previewContainerDivName);
			var previewDivName = 'googlePreview';
			var previewDiv = document.getElementById(previewDivName);


			if (!previewContainerDiv) {
				previewContainerDiv = document.createElement('div');
				previewContainerDiv.setAttribute('id', previewContainerDivName);
				jQuery('#page').get(0).appendChild(previewContainerDiv);

				var titleBarDiv = document.createElement('div');
				jQuery(titleBarDiv).addClass('googlePreview-titleBar');
				previewContainerDiv.appendChild(titleBarDiv);

				var closeBoxLink = document.createElement('a');
				titleBarDiv.appendChild(closeBoxLink);
				jQuery(closeBoxLink).addClass('googlePreview-closeBox');
				closeBoxLink.setAttribute('href', '#');

				var onClosePreview = function () {
					jQuery('#' + previewContainerDivName).hide(200);
					that.trackPiwik('googlebooks/close');
					return false;
				};

				closeBoxLink.onclick = onClosePreview;
				closeBoxLink.appendChild(document.createTextNode(that.localise('Vorschau schließen')));

				previewDiv = document.createElement('div');
				previewDiv.setAttribute('id', previewDivName);
				previewContainerDiv.appendChild(previewDiv);
			}
			else {
				jQuery(previewContainerDiv).show(200);
			}

			var viewer = new google.books.DefaultViewer(previewDiv);
			viewer.load(googlePreviewButton.href);

			that.trackPiwik('googlebooks/open');

			return false;
		};
	};



	var that = this;

	if (that.config.useGoogleBooks && google) {
		google.load('books', '0', {callback: booksLoaded});
	}
	
}; 
