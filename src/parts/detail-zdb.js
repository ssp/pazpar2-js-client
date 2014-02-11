/**
 * Load XML journal availability information  from ZDB-JOP (via a proxy on our
 * own server to avoid cross-domain load problems) and inster the resulting
 * information into the DOM.
 * 
 * @param {object} data - pz2 object for the item
 * @param {DOMElement} element - DOM element that the resulting information is inserted into.
 * @returns {undefined}
 */
pz2_client.prototype.addZDBInfoIntoElement = function (data, element) {

	/**
	 * @param {object} data - pz2 object
	 * @returns {object} - parameters for query URL
	 */
	var ZDBJOPQueryParameters = function (data) {
		var ISSN;
		if (data['md-issn'] && data['md-issn'].length > 0) {
			ISSN = data['md-issn'][0];
		}
		else if (data['md-pissn'] && data['md-pissn'].length > 0) {
			ISSN = data['md-pissn'][0];
		}
		var eISSN;
		if (data['md-eissn'] && data['md-eissn'].length > 0) {
			eISSN = data['md-eissn'][0];
		}
		var ZDBID;
		if (data['md-zdb-number'] && data['md-zdb-number'].length > 0) {
			ZDBID = data['md-zdb-number'][0];
			// ZDB-JOP expects the ZDB-ID to be of the form XXXXXXX-Y: Insert the »-« if it is not there.
			if (ZDBID[ZDBID.length - 2] !== '-') {
				ZDBID = ZDBID.slice(0, ZDBID.length - 1) + '-' + ZDBID[ZDBID.length - 1];
			}
		}

		// Do nothing if there are no ISSNs or we do not want to use ZDB-JOP.
		if ( !(ISSN || eISSN || ZDBID) || !that.config.useZDB ) {
			return;
		}

		var parameters = {};

		if (ISSN) {	parameters['issn'] = ISSN; }
		if (eISSN) { parameters['eissn'] = eISSN; }
		if (!(ISSN || eISSN) && ZDBID) { parameters['pid'] = 'zdbid=' + ZDBID; }

		if (data['md-medium'] === 'article') {
			parameters['genre'] = 'article';

			// Add additional information to request to get more precise result and better display.
			var year = parseInt(data['md-date'], 10);
			if (year && year.length) {	parameters['date'] = year[0]; }

			var volume = parseInt(data['md-volume-number'], 10);
			if (volume && volume.length) { parameters['volume'] = volume[0]; }

			var issue = parseInt(data['md-issue-number'], 10);
			if (issue && issue.length > 0) { parameters['issue'] = issue[0]; }

			var pages = data['md-pages-number'];
			if (pages && pages.length > 0) { parameters['pages'] = pages[0]; }

			var title = data['md-title'];
			if (title && title.length > 0) { parameters['atitle'] = title[0]; }
		}
		else {
			// it’s a journal
			parameters['genre'] = 'journal';

			var journalTitle = data['md-title'];
			if (journalTitle && journalTitle.length > 0) { parameters['title'] = journalTitle[0]; }
		}

		return parameters;
	};



	/**
	 * jQuery.get() callback.
	 *
	 * @param {object} resultData - XML from ZDB server
	 * @returns {undefined}
	 */
	var processZDBResult = function (resultData) {

		/*	ZDBInfoItemForResult
			Turns XML of a single ZDB Result a DOM element displaying the relevant information.
			input:	ZDBResult - XML Element with a Full/(Print|Electronic)Data/ResultList/Result element
			output:	DOM Element for displaying the information in ZDBResult that's relevant for us
		*/
		var ZDBInfoItemForResult = function (ZDBResult) {
			var statusElement;
			var statusText;
			var status = parseInt(ZDBResult.getAttribute('state'), 10);

			// Determine the access status of the result.
			if (status === 0) {
				statusText = that.localise('frei verfügbar', 'detail-zdb');
			}
			else if (status === 1) {
				statusText = that.localise('teilweise frei verfügbar', 'detail-zdb');
			}
			else if (status === 2) {
				statusText = that.localise('verfügbar', 'detail-zdb');
			}
			else if (status === 3) {
				statusText = that.localise('teilweise verfügbar', 'detail-zdb');
			}
			else if (status === 4) {
				statusText = that.localise('nicht verfügbar', 'detail-zdb');
			}
			else if (status === 5) {
				statusText = that.localise('diese Ausgabe nicht verfügbar', 'detail-zdb');
			}
			else {
				/*	Remaining cases are:
						status == -1: non-unique ISSN
						status == 10: unknown
				*/
			}

			// Only display detail information if we do have access.
			if (statusText) {
				statusElement = document.createElement('span');
				jQuery(statusElement).addClass('pz2-ZDBStatusInfo');

				var accessLinkURL = jQuery('AccessURL', ZDBResult);
				if (accessLinkURL.length > 0) {
					// Having an AccessURL implies this is inside ElectronicData.
					statusElement.appendChild(document.createTextNode(statusText));
					var accessLink = document.createElement('a');
					statusElement.appendChild(document.createTextNode(' – '));
					statusElement.appendChild(accessLink);
					accessLink.setAttribute('href', accessLinkURL[0].textContent);
					var linkTitle = jQuery('Title', ZDBResult);
					if (linkTitle && linkTitle.length > 0) {
						linkTitle = linkTitle[0].textContent;
					}
					else {
						linkTitle = that.localise('Zugriff', 'detail-zdb');
					}
					that.turnIntoNewWindowLink(accessLink);

					var additionals = [];
					var ZDBAdditionals = jQuery('Additional', ZDBResult);
					ZDBAdditionals.each( function (index) {
							additionals.push(this.textContent);
						}
					);
					if (additionals.length > 0) {
						accessLink.appendChild(document.createTextNode(additionals.join('; ') + '. '));
					}
					else {
						accessLink.appendChild(document.createTextNode(linkTitle));
					}
				}
				else if (status < 4) {
					// Absence of an AccessURL implies this is inside PrintData.
					// status > 3 means the volume is not available. Don't print info then.
					var locationInfo = document.createElement('span');
					var infoText = '';

					var period = jQuery('Period', ZDBResult)[0];
					if (period) {
						infoText += period.textContent + ': ';

					}
					var jLocation = jQuery('Location', ZDBResult);
					var locationText = '';
					if (jLocation.length > 0) {
						locationText = jLocation.text();
						infoText += locationText;
					}

					var signature = jQuery('Signature', ZDBResult)[0];
					if (signature) {
						infoText += ' ' + signature.textContent;
					}

					if (locationText.search('Göttingen SUB') !== -1 && locationText.search('LS2') !== -1) {
						infoText += ' ' + that.localise('[neuere Bände im Lesesaal 2]', 'detail-zdb');
					}

					locationInfo.appendChild(document.createTextNode(infoText));
					statusElement.appendChild(locationInfo);
				}
				else {
					statusElement = undefined;
				}
			}
			return statusElement;
		};



		/*	appendLibraryNameFromResultDataTo
			If we there is a Library name, insert it into the target container.
			input:	* data: ElectronicData or PrintData element from ZDB XML
					* target: DOM container to which the marked up library name is appended
		*/
		var appendLibraryNameFromResultDataTo = function (data, target) {
			var libraryName = jQuery('Library', data)[0];
			if (libraryName) {
				var libraryNameSpan = document.createElement('span');
				jQuery(libraryNameSpan).addClass('pz2-ZDBLibraryName');
				libraryNameSpan.appendChild(document.createTextNode(libraryName.textContent));
				target.appendChild(libraryNameSpan);
			}
		};



		/*	ZDBInfoElement
			Coverts ZDB XML data for electronic or print journals
				to DOM elements displaying their information.
			input:	data - ElectronicData or PrintData element from ZDB XML
			output:	DOM element containing the information from data
		*/
		var ZDBInfoElement = function (data) {
			var infos;
			var results = jQuery('Result', data);

			if (results.length > 0) {
				var infoItems = [];
				results.each( function(index) {
						var ZDBInfoItem = ZDBInfoItemForResult(this);
						if (ZDBInfoItem) {
							infoItems.push(ZDBInfoItem);
						}
					}
				);

				if (infoItems.length > 0) {
					infos = document.createElement('span');
					infos.appendChild(that.markupInfoItems(infoItems));
				}
			}

			return infos;
		};



		/*	ZDBInformation
			Converts complete ZDB XML data to DOM element containing information about them.
			input:	data - result from ZDB XML request
			output: DOM element displaying information about journal availability.
						If ZDB figures out the local library and the journal
							is accessible there, we display:
							* its name
							* electronic journal information with access link
							* print journal information
		*/
		var ZDBInformation = function (data) {
			var container;

			var electronicInfos = ZDBInfoElement( jQuery('ElectronicData', data) );
			var printInfos = ZDBInfoElement( jQuery('PrintData', data) );

			if (electronicInfos || printInfos) {
				container = document.createElement('div');
				if (that.config.ZDBUseClientIP) {
					appendLibraryNameFromResultDataTo(data, container);
				}
			}

			if (electronicInfos) {
				var electronicHeading = document.createElement('h5');
				container.appendChild(electronicHeading);
				electronicHeading.appendChild(document.createTextNode(that.localise('elektronisch')));
				container.appendChild(electronicInfos);
			}

			if (printInfos) {
				var printHeading = document.createElement('h5');
				container.appendChild(printHeading);
				printHeading.appendChild(document.createTextNode(that.localise('gedruckt')));
				container.appendChild(printInfos);
			}

			return container;
		};



		var availabilityLabel = document.createElement('a');
		var ZDBLinkURL = 'http://services.d-nb.de/fize-service/gvr/html-service.htm?';
		ZDBLinkURL += jQuery.param(parameters);
		availabilityLabel.setAttribute('href', ZDBLinkURL);
		availabilityLabel.title = that.localise('Informationen bei der Zeitschriftendatenbank', 'detail-zdb');
		that.turnIntoNewWindowLink(availabilityLabel);
		availabilityLabel.appendChild(document.createTextNode(that.localise('verfügbarkeit', 'detail-label') + ':'));

		var infoBlock = ZDBInformation(resultData);

		var infoLineElements = that.detailLineBasic(availabilityLabel, infoBlock, {'class':'pz2-ZDBInfo'});
		var jInfoLineElements = jQuery(infoLineElements);
		jInfoLineElements.hide();
		that.appendInfoToContainer(infoLineElements, element);
		if (!that.MSIEVersion() || that.MSIEVersion() >= 8) {
			jInfoLineElements.slideDown('fast');
		}
		else {
			jInfoLineElements.show();
		}
	};



	var that = this;

	var ZDBPath = (that.config.ZDBUseClientIP ? '/zdb' : '/zdb-local');
	ZDBPath += '/full.xml';

	var parameters = ZDBJOPQueryParameters(data);
	if (parameters) {
		jQuery.get(ZDBPath, parameters, processZDBResult);
	}
};
