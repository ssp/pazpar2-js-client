/**
 * Create DIV with details information about the record passed.
 * Inserts detail information and handles retrieval of external data
 * such as ZDB info and Google Books / Maps.
 * 
 * @param {object} data - the pazpar2 records
 * @returns {DOMElement} - DIV containing the details to be displayed
 */
pz2_client.prototype.renderDetails = function (data) {
	/*	detailLine
		input:	title - string with element's name
				informationElements - array of DOM elements with the information to be displayed
		output: Array of DOM elements containing
				0:	DT element with the row's title
				1:	DD element with the row's data
						If there is more than one data item, they are wrapped in a list.
	*/
	var detailLine = function (title, informationElements) {
		var line, headingText;
		if (title && informationElements) {
			if (informationElements.length === 1) {
				headingText = that.localise(title, 'detail-label');
			}
			else {
				var labelKey = title + '-plural';
				headingText = that.localise(labelKey, 'detail-label');
				if (labelKey === headingText) { // no plural form, fall back to singular
					headingText = that.localise(title, 'detail-label');
				}
			}

			var infoItems = that.markupInfoItems(informationElements);

			if (infoItems) { // we have information, so insert it
				var labelNode = document.createTextNode(headingText + ':');
				var acronymKey = 'acronym-' + title;
				if (that.localise(acronymKey, 'detail-label') !== acronymKey) {
					// acronym: add acronym element
					var acronymElement = document.createElement('abbr');
					acronymElement.title = that.localise(acronymKey);
					acronymElement.appendChild(labelNode);
					labelNode = acronymElement;
				}

				line = that.detailLineBasic(labelNode, infoItems);
			}
		}

		return line;
	};



	/*	detailLineAuto
		input:	title - string with the element's name
		output:	Array of DOM elements for title and the data coming from data[md-title]
				as created by detailLine.
	*/
	var detailLineAuto = function (title) {
		var result;
		var element = DOMElementForTitle(title);

		if (element.length !== 0) {
			result = detailLine( title, element );
		}

		return result;
	};



	/*	linkForDOI
		input:	DOI - string with DOI
		output: DOM anchor element with link to the DOI at dx.doi.org
	*/
	var linkForDOI = function (DOI) {
		var linkElement = document.createElement('a');
		linkElement.setAttribute('href', 'http://dx.doi.org/' + DOI);
		that.turnIntoNewWindowLink(linkElement);
		linkElement.appendChild(document.createTextNode(DOI));

		var DOISpan = document.createElement('span');
		DOISpan.appendChild(linkElement);

		return DOISpan;
	};



	/*	DOMElementForTitle
		input:	title - title string
		output:	nil, if the field md-title does not exist in data. Otherwise:
				array of DOM elements created from the fields of data[md-title]
	*/
	var DOMElementForTitle = function (title) {
		var result = [];
		if ( data['md-' + title] !== undefined ) {
			var theData = data['md-' + title];
			that.deduplicate(theData);

			for (var dataIndex in theData) {
				var rawDatum = theData[dataIndex];
				var wrappedDatum;
				switch	(title) {
					case 'doi':
						wrappedDatum = linkForDOI(rawDatum);
						break;
					default:
						wrappedDatum = document.createTextNode(rawDatum);
				}
				result.push(wrappedDatum);
			}
		}

		return result;
	};



	/*	ISSNsDetailLine
		Returns DOMElements with markup for the record’s ISSN information,
			taking into account the issn, eissn and pissn fields.

		output: Array of DOM elements containing
				0:	DT element with the row’s title ISSN or ISSNs
				1:	DD element with a list of ISSNs
	*/
	var ISSNsDetailLine = function () {
		var ISSNTypes = {'issn': '', 'pissn': 'gedruckt', 'eissn': 'elektronisch'};
		var ISSNList = [];
		for (var ISSNTypeIndex in ISSNTypes) {
			var fieldName = 'md-' + ISSNTypeIndex;
			for (var ISSNIndex in data[fieldName]) {
				var ISSN = data[fieldName][ISSNIndex].substr(0,9);
				if (jQuery.inArray(ISSN, ISSNList) === -1) {
					if (ISSNTypes[ISSNTypeIndex] !== '') {
						ISSN += ' (' + that.localise(ISSNTypes[ISSNTypeIndex]) + ')';
					}
					ISSNList.push(ISSN);
				}
			}
		}

		var infoElements;
		if (ISSNList.length > 0) {
			infoElements = [document.createTextNode(ISSNList.join(', '))];
		}

		return detailLine('issn', infoElements);
	};



	/*	keywordsDetailLine
		If config.useKeywords is true, returns DOMElements with markup for the
			record’s keywords, each wrapped in a link for starting the
			associated subject search.

		output: Array of DOM elements containing
				0:	DT element with the row’s title ISSN or ISSNs
				1:	DD element with a list of ISSNs
	*/
	var keywordsDetailLine = function () {
		var infoElements;
		var labelString = 'keyword';

		if (data['md-subject'] && that.config.useKeywords) {
			var infoElement = document.createElement('span');
			infoElements = [infoElement];

			/**
			 * Trigger a search on the subject field with the content of the link.
			 * Used as action for the links around the subject display.
			 */
			var searchForSubject = function () {
				jForm = jQuery('form.pz2-searchForm');
				if (jQuery('.pz2-field-subject').length > 0) {
					// The subject field is available: switch to extended search and use it.
					if (!jForm.hasClass('pz2-extended')) {
						addExtendedSearch(null, true);
					}
					jQuery('.pz2-searchField', jForm).val('');
					jQuery('input#pz2-field-subject', jForm).val('"' + this.textContent + '"');
				}
				else {
					// The subject field is not available: use "subject=XXX" in the general search field.
					jQuery('.pz2-searchField', jForm).val('subject="' + this.textContent + '"');
				}
				triggerSearchForForm();

				return false;
			};


			for (var subjectIndex = 0; subjectIndex < data['md-subject'].length; subjectIndex++) {
				var subject = data['md-subject'][subjectIndex];
				var linkElement = document.createElement('a');

				var parameters = {
					'tx_pazpar2_pazpar2[controller]': 'Pazpar2',
					'tx_pazpar2_pazpar2[action]': 'index',
					'tx_pazpar2_pazpar2[useJS]': 'no'
				};
				if (jQuery('.pz2-field-subject').length > 0) {
					// The subject field is available: switch to extended search and use it.
					parameters['tx_pazpar2_pazpar2[extended]'] =  1;
					parameters['tx_pazpar2_pazpar2[queryStringKeyword]'] = '"' + subject + '"';
				}
				else {
					// The subject field is not available: use "subject=XXX" in the general search field.
					parameters['tx_pazpar2_pazpar2[queryString]'] = 'subject="' + subject + '"';
				}

				var linkURL = document.location.href.split('?')[0] + '?' + jQuery.param(parameters);
				linkElement.setAttribute('href', linkURL);
				var titleString = that.localise('nach Schlagwort "#" suchen').replace('#', subject);
				linkElement.setAttribute('title', titleString);
				linkElement.onclick = searchForSubject;

				linkElement.appendChild(document.createTextNode(subject));
				infoElement.appendChild(linkElement);

				if (subjectIndex + 1 < data['md-subject'].length) {
					infoElement.appendChild(document.createTextNode('; '));
				}
			}

			if (data['md-subject'].length > 1) {
				labelString += '-plural';
			}
		}

		return detailLine(labelString, infoElements);
	};



	var MSCDetailLine = function () {
		var infoElements;
		var MSCInfo = {};
		var notes = {};

		// Gather MSC data on the location level. The fields can contain
		// a 'accordingto' attribute. Gather those strings as well.
		for (var locationIndex in data.location) {
			var location = data.location[locationIndex];
			if (location['md-classification-msc']) {
				for (var MSCIndex in location['md-classification-msc']) {
					var MSC = location['md-classification-msc'][MSCIndex];
					if (typeof(MSC) === 'object') {
						MSCInfo[MSC['#text']] = true;
						if (MSC['@accordingto']) {
							notes[MSC['@accordingto']] = true;
						}
					}
					else {
						MSCInfo[MSC] = true;
					}
				}
			}
		}

		var MSCStrings = [];
		for (var MSCInfoIndex in MSCInfo) {
			MSCStrings.push(MSCInfoIndex);
		}

		if (MSCStrings.length > 0) {
			var MSCString = MSCStrings.join(', ');

			var MSCNotes = [];
			for (var noteIndex in notes) {
				MSCNotes.push(noteIndex);
			}
			if (MSCNotes.length > 0) {
				MSCString += ' (' + that.localise('gemäß') + ' ' + MSCNotes.join(', ') + ')';
			}

			infoElements = [document.createTextNode(MSCString)];
		}

		return detailLine('classification-msc', infoElements);
	};



	/*	locationDetails
		Returns markup for each location of the item found from the current data.
		output:	DOM object with information about this particular copy/location of the item found
	*/
	var locationDetails = function () {

		/*	detailInfoItemWithLabel
			input:	fieldContent - string with content to display in the field
					labelName - string displayed as the label
					dontTerminate - boolean:	false puts a ; after the text
												true puts nothing after the text
		*/
		var detailInfoItemWithLabel = function (fieldContent, labelName, dontTerminate) {
			var infoSpan;
			if ( fieldContent !== undefined ) {
				infoSpan = document.createElement('span');
				jQuery(infoSpan).addClass('pz2-info');
				if ( labelName !== undefined ) {
					var infoLabel = document.createElement('span');
					infoSpan.appendChild(infoLabel);
					jQuery(infoLabel).addClass('pz2-label');
					infoLabel.appendChild(document.createTextNode(labelName));
					infoSpan.appendChild(document.createTextNode(' '));
				}
				infoSpan.appendChild(document.createTextNode(fieldContent));

				if (!dontTerminate) {
					infoSpan.appendChild(document.createTextNode('; '));
				}
			}
			return infoSpan;
		};



		/*	detailInfoItem
			input:	fieldName - string
			output:	DOM elements containing the label and information for fieldName data
						* the label is looked up from the localisation table
						* data[detail-label-fieldName] provides the data
		*/
		var detailInfoItem = function (fieldName) {
			var infoItem;
			var value = location['md-'+fieldName];

			if ( value !== undefined ) {
				var label;
				var labelID = fieldName;
				var localisedLabelString = that.localise(labelID, 'detail-label');

				if ( localisedLabelString !== labelID ) {
					label = localisedLabelString;
				}

				var valueStrings = [];
				for ( var valueIndex in value ) {
					var currentValue = value[valueIndex];
					if ( typeof(currentValue) === 'string' ) {
						valueStrings.push(currentValue);
					}
					else if ( typeof(currentValue) === 'object' ) {
						if ( typeof(currentValue['#text']) === 'string' ) {
							valueStrings.push(currentValue['#text']);
						}
					}
				}

				var content = valueStrings.join(', ').replace(/^[ ]*/,'').replace(/[ ;.,]*$/,'');

				infoItem = detailInfoItemWithLabel(content, label);
			}

			return infoItem;
		};



		/*  cleanISBNs
			Takes the array of ISBNs in location['md-isbn'] and
				1. Normalises them
				2. Removes duplicates (particularly the ISBN-10 corresponding to an ISBN-13)
		*/
		var cleanISBNs = function () {
			/*	normaliseISBNsINString
				Vague matching of ISBNs and removing the hyphens in them.
				input: string
				output: string
			*/
			var normaliseISBNsInString = function (ISBN) {
				return ISBN.replace(/([0-9]*)-([0-9Xx])/g, '$1$2');
			};


			/*	pickISBN
				input: 2 ISBN number strings without dashes
				output: if both are 'the same': the longer one (ISBN-13)
						if they aren't 'the same': undefined
			*/
			var pickISBN = function (ISBN1, ISBN2) {
				var result;
				var numberRegexp = /([0-9]{9,12})[0-9xX].*/;
				var numberPart1 = ISBN1.replace(numberRegexp, '$1');
				var numberPart2 = ISBN2.replace(numberRegexp, '$1');
				if (numberPart1 !== numberPart2) {
					if (numberPart1.indexOf(numberPart2) !== -1) {
						result = ISBN1;
					}
					else if (numberPart2.indexOf(numberPart1) !== -1) {
						result = ISBN2;
					}
				}
				return result;
			};



			if (location['md-isbn'] !== undefined) {
				var newISBNs = [];
				for (var index in location['md-isbn']) {
					var normalisedISBN = normaliseISBNsInString(location['md-isbn'][index]);
					for (var newISBNNumber in newISBNs) {
						var newISBN = newISBNs[newISBNNumber];
						var preferredISBN = pickISBN(normalisedISBN, newISBN);
						if (preferredISBN !== undefined) {
							newISBNs.splice(newISBNNumber, 1, preferredISBN);
							normalisedISBN = undefined;
							break;
						}
					}
					if (normalisedISBN !== undefined) {
						newISBNs.push(normalisedISBN);
					}
				}
				location['md-isbn'] = newISBNs;
				if (newISBNs.length > 0) {
					var minimalISBN = newISBNs[0].split(' ')[0];
					location['md-isbn-minimal'] = [minimalISBN];
				}
			}
		};



		/*	electronicURLs
			Create markup for URLs in current location data.
			output:	DOM element containing URLs as links.
		*/
		var electronicURLs = function() {

			/*	cleanURLList
				Returns a cleaned list of URLs for presentation.
				1. Removes duplicates of URLs if they exist, preferring URLs with label
				2. Removes URLs duplicating DOI information
				3. Sorts URLs to have those with a label at the beginning
				output:	array of URL strings or URL objects (with #text and other properties)
			*/
			var cleanURLList = function () {
				var originalURLs = location['md-electronic-url'];
				var URLs = [];

				if (originalURLs) {
					// Turn each item into an object so we can store its original index.
					for (var originalURLIndex = 0; originalURLIndex < originalURLs.length; originalURLIndex++) {
						var originalURL = originalURLs[originalURLIndex];
						if (typeof(originalURL) === 'object') {
							originalURL.hasLabelInformation = true;
						}
						else {
							originalURL = {'#text': originalURL};
							originalURL.hasLabelInformation = false;
						}
						originalURL.originalPosition = originalURLIndex;
						URLs.push(originalURL);
					}


					// Figure out which URLs are duplicates and collect indexes of those to remove.
					var indexesToRemove = {};
					for (var URLIndex = 0; URLIndex < URLs.length; URLIndex++) {
						var URLInfo = URLs[URLIndex];
						URLInfo.originalPosition = URLIndex;
						var URL = URLInfo['#text'];

						// Check for duplicates in the electronic-urls field.
						for (var remainingURLIndex = URLIndex + 1; remainingURLIndex < URLs.length; remainingURLIndex++) {
							var remainingURLInfo = URLs[remainingURLIndex];
							var remainingURL = remainingURLInfo['#text'];

							if (URL === remainingURL) {
								// Two of the URLs are identical.
								// Keep the one with the title if only one of them has one,
								// keep the first one otherwise.
								var URLIndexToRemove = URLIndex + remainingURLIndex;
								if (!URLInfo.hasLabelInformation && !remainingURLInfo.hasLabelInformation) {
									URLIndexToRemove = URLIndex;
								}
								indexesToRemove[URLIndexToRemove] = true;
							}
						}

						// Check for duplicates among the DOIs.
						for (var DOIIndex in data['md-doi']) {
							if (URL.search(data['md-doi'][DOIIndex]) !== -1) {
								indexesToRemove[URLIndex] = true;
								break;
							}
						}

					}

					// Remove the duplicate URLs.
					var indexesToRemoveArray = [];
					for (var i in indexesToRemove) {
						if (indexesToRemove[i]) {
							indexesToRemoveArray.push(i);
						}
					}
					indexesToRemoveArray.sort( function(a, b) {return b - a;} );
					for (var j in indexesToRemoveArray) {
						URLs.splice(indexesToRemoveArray[j], 1);
					}

					// Re-order URLs so those with explicit labels appear at the beginning.
					URLs.sort( function(a, b) {
						if (a.hasLabelInformation && !b.hasLabelInformation) {
								return -1;
							}
							else if (!a.hasLabelInformation && b.hasLabelInformation) {
								return 1;
							}
							else {
								return a.originalPosition - b.originalPosition;
							}
						}
					);
				}

				return URLs;
			};



			var electronicURLs;
			if (that.usesessions() || typeof(choose_url) !== 'function') {
				// Using plain pazpar2: display cleaned URL list.
				electronicURLs = cleanURLList();
			}
			else {
				// Using Service Proxy: pick the right URL.
				electronicURLs = [choose_url(location)];
			}

			var URLsContainer;
			if (electronicURLs && electronicURLs.length !== 0) {
				URLsContainer = document.createElement('span');

				for (var URLNumber in electronicURLs) {
					var URLInfo = electronicURLs[URLNumber];
					var linkText = that.localise('Link', 'link-description'); // default link name
					var linkURL = URLInfo;

					if (typeof(URLInfo) === 'object' && URLInfo['#text'] !== undefined) {
						// URLInfo is not just an URL but an array also containing the link name
						if (URLInfo['@name'] !== undefined) {
							linkText = that.localise(URLInfo['@name'], 'link-description');
							if (URLInfo['@note'] !== undefined) {
								linkText += ', ' + that.localise(URLInfo['@note'], 'link-description');
							}
						}
						else if (URLInfo['@note'] !== undefined) {
							linkText = that.localise(URLInfo['@note'], 'link-description');
						}
						else if (URLInfo['@fulltextfile'] !== undefined) {
							linkText = that.localise('Document', 'link-description');
						}
						linkURL = URLInfo['#text'];
					}

					linkText = '[' + linkText +  ']';

					if (URLsContainer.childElementCount > 0) {
						// add , as separator if not the first element
						URLsContainer.appendChild(document.createTextNode(', '));
					}
					var link = document.createElement('a');
					URLsContainer.appendChild(link);
					link.setAttribute('class', 'pz2-electronic-url');
					link.setAttribute('href', linkURL);
					that.turnIntoNewWindowLink(link);
					link.appendChild(document.createTextNode(linkText));
				}
				URLsContainer.appendChild(document.createTextNode('; '));
			}

			return URLsContainer;
		};



		/*	contentOfFirstFieldWithName
			Checks whether the field with the passed name exists and gets the
			data from its first occurence.

			input:	fieldName - string with the name of the metadata field to take the URL from
			output: string in the first metadata field with that name
		*/
		var contentOfFirstFieldWithName = function (fieldName) {
			var URL;

			var catalogueURL = location['md-' + fieldName];
			if (catalogueURL && catalogueURL.length > 0) {
				URL = catalogueURL[0];
			}

			return URL;
		};



		/*	parentLink
			For non-article records, returns DOM elements linking to the
			catalogue page of the current record˚s parent record, plus spacing.

			output: DOM anchor element pointing to the catalogue page|None
		*/
		var parentLink = function () {
			var result;
			var URL = contentOfFirstFieldWithName('parent-catalogue-url');

			if (URL && data['md-medium'][0] !== 'article') {
				var linkElement = document.createElement('a');
				linkElement.setAttribute('href', URL);
				linkElement.title = that.localise('enthaltendes Werk im Katalog ansehen');
				that.turnIntoNewWindowLink(linkElement);
				jQuery(linkElement).addClass('pz2-detail-parentCatalogueLink');
				linkElement.appendChild(document.createTextNode(that.localise('enthaltendes Werk')));
				result = [linkElement, document.createTextNode(' ')];
			}

			return result;
		};



		/*	catalogueLink
			Returns a DOM element linking to the catalogue page of the current record.

			output:	DOM anchor element pointing to the catalogue page.
		*/
		var catalogueLink = function () {
			var linkElement;
			var URL = contentOfFirstFieldWithName('catalogue-url');
			var targetName = that.localise(location['@name'], 'facet-targets');

			if (URL && targetName) {
				linkElement = document.createElement('a');
				linkElement.setAttribute('href', URL);
				linkElement.title = that.localise('Im Katalog ansehen');
				that.turnIntoNewWindowLink(linkElement);
				jQuery(linkElement).addClass('pz2-detail-catalogueLink');
				linkElement.appendChild(document.createTextNode(targetName));
			}

			return linkElement;
		};



		var locationDetails = [];

		for ( var locationNumber in data.location ) {
			var location = data.location[locationNumber];
			var localURL = location['@id'];
			var localName = location['@name'];

			var detailsHeading = document.createElement('dt');
			locationDetails.push(detailsHeading);
			detailsHeading.appendChild(document.createTextNode(that.localise('Ausgabe')+':'));

			var detailsData = document.createElement('dd');
			locationDetails.push(detailsData);
			jQuery(detailsData).addClass('pz2-location');
			location.element = detailsData;

			that.appendInfoToContainer( detailInfoItem('edition'), detailsData );
			if (location['md-medium'] !== 'article') {
				that.appendInfoToContainer( detailInfoItem('publication-name'), detailsData );
				that.appendInfoToContainer( detailInfoItem('publication-place'), detailsData );
				that.appendInfoToContainer( detailInfoItem('date'), detailsData );
				that.appendInfoToContainer( detailInfoItem('physical-extent'), detailsData );
			}
			cleanISBNs();
			that.appendInfoToContainer( detailInfoItem('isbn-minimal'), detailsData );
			that.appendInfoToContainer( electronicURLs(), detailsData );
			that.appendInfoToContainer( parentLink(), detailsData );
			that.appendInfoToContainer( catalogueLink(), detailsData );

			if (detailsData.childNodes.length === 0) {locationDetails = [];}
		}

		return locationDetails;
	};


	var that = this;
	var detailsDiv;

	if (data) {
		detailsDiv = document.createElement('div');
		jQuery(detailsDiv).addClass('pz2-details');
		detailsDiv.setAttribute('id', 'det_' + that.HTMLIDForRecordData(data));

		var detailsList = document.createElement('dl');
		detailsDiv.appendChild(detailsList);
		var clearSpan = document.createElement('span');
		detailsDiv.appendChild(clearSpan);
		jQuery(clearSpan).addClass('pz2-clear');

		/*	A somewhat sloppy heuristic to create cleaned up author and other-person
			lists to avoid duplicating names listed in the short title display already:
			* Do _not_ separately display authors and other-persons whose apparent
				surname appears in the title-reponsibility field to avoid duplication.
			* If no title-responsibility field is present, omit the first config.maxAuthors
				authors as they are displayed in the short title.
		*/
		var allResponsibility = '';
		if (data['md-title-responsibility']) {
			allResponsibility = data['md-title-responsibility'].join('; ');
			data['md-author-clean'] = [];
			for (var authorIndex in data['md-author']) {
				var authorName = jQuery.trim(data['md-author'][authorIndex].split(',')[0]);
				if (allResponsibility.match(authorName) === null) {
					data['md-author-clean'].push(data['md-author'][authorIndex]);
				}
			}
		}
		else if (data['md-author'] && data['md-author'].length > that.config.maxAuthors) {
			data['md-author-clean'] = data['md-author'].slice(that.config.maxAuthors);
		}
		data['md-other-person-clean'] = [];
		for (var personIndex in data['md-other-person']) {
			var personName = jQuery.trim(data['md-other-person'][personIndex].split(',')[0]);
			if (allResponsibility.match(personName) === null) {
				data['md-other-person-clean'].push(data['md-other-person'][personIndex]);
			}
		}

		that.appendInfoToContainer( detailLineAuto('author-clean'), detailsList );
		that.appendInfoToContainer( detailLineAuto('other-person-clean'), detailsList );
		that.appendInfoToContainer( detailLineAuto('abstract'), detailsList );
		that.appendInfoToContainer( detailLineAuto('description'), detailsList );
		that.appendInfoToContainer( detailLineAuto('series-title'), detailsList );
		that.appendInfoToContainer( ISSNsDetailLine(), detailsList );
		that.appendInfoToContainer( detailLineAuto('doi'), detailsList );
		that.appendInfoToContainer( detailLineAuto('creator'), detailsList );
		that.appendInfoToContainer( detailLineAuto('mapscale'), detailsList );
		that.appendInfoToContainer( MSCDetailLine(), detailsList );
		that.appendInfoToContainer( keywordsDetailLine(), detailsList);

		that.appendInfoToContainer( locationDetails(), detailsList );
		that.addZDBInfoIntoElement( data, detailsList );
		that.appendInfoToContainer( that.mapDetailLine(data), detailsList );
		that.appendGoogleBooksElementTo( data, detailsList );
		that.appendInfoToContainer( that.exportLinks(data), detailsDiv );
	}

	return detailsDiv;

};
