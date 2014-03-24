/**
 * Return links for exporting result data or providing further information on it.
 *
 * @param {object} data
 * @param {boolean} exportLinksOnly - create export links only (no clipboard, OpenURL etc.)
 * @returns {DOMElement} - div element containing the additional links
 */
pz2_client.prototype.exportLinks = function (data, exportLinksOnly) {
	/**
	 * Non-recursively copy the data content of the JavaScript object to
	 * the XML target.
	 *
	 * @param {object} object - whose content to copy
	 * @param {XMLElement} target - XML element to copy the content to
	 */
	var copyObjectContentTo = function (object, target) {
		for (var fieldName in object) {
			if (fieldName[0] === '@') {
				// We are dealing with an attribute.
				target.setAttribute(fieldName.substr(1), object[fieldName]);
			}
			else if (fieldName === '#text') {
				target.appendChild(target.ownerDocument.createTextNode(child));
			}
			else {
				// We are dealing with a sub-element.
				if (object[fieldName].nodeType === undefined) {
					// Only work on non-nodes.
					var fieldArray = object[fieldName];
					for (var index in fieldArray) {
						var child = fieldArray[index];
						var targetChild = target.ownerDocument.createElement(fieldName);
						target.appendChild(targetChild);
						if (typeof(child) === 'object') {
							for (var childPart in child) {
								if (childPart === '#text') {
									targetChild.appendChild(target.ownerDocument.createTextNode(child[childPart]));
								}
								else if (childPart[0] === '@' && childPart[1] !== '@') {
									// childs with names like '@@...' are not attributes!
									targetChild.setAttribute(childPart.substr(1), child[childPart]);
								}
							}
						}
						else {
							targetChild.appendChild(target.ownerDocument.createTextNode(child));
						}
					}
				}
			}
		}
	};



	/*	newXMLDocument
		Helper function for creating an XML Document in proper browsers as well as IE.

		Taken from Flanagan: JavaScript, The Definitive Guide
		http://www.webreference.com/programming/javascript/definitive2/

		Create a new Document object. If no arguments are specified,
		the document will be empty. If a root tag is specified, the document
		will contain that single root tag. If the root tag has a namespace
		prefix, the second argument must specify the URL that identifies the
		namespace.

		inputs:	rootTagName - string
				namespaceURL - string [optional]
		output:	XMLDocument
	*/
	newXMLDocument = function(rootTagName, namespaceURL) {
		if (!rootTagName) rootTagName = "";
		if (!namespaceURL) namespaceURL = "";
		if (document.implementation && document.implementation.createDocument) {
			// This is the W3C standard way to do it
			return document.implementation.createDocument(namespaceURL, rootTagName, null);
		}
		else {
			// This is the IE way to do it
			// Create an empty document as an ActiveX object
			// If there is no root element, this is all we have to do
			var doc = new ActiveXObject("MSXML2.DOMDocument");
			// If there is a root tag, initialize the document
			if (rootTagName) {
				// Look for a namespace prefix
				var prefix = "";
				var tagname = rootTagName;
				var p = rootTagName.indexOf(':');
				if (p !== -1) {
					prefix = rootTagName.substring(0, p);
					tagname = rootTagName.substring(p+1);
				}
				// If we have a namespace, we must have a namespace prefix
				// If we don't have a namespace, we discard any prefix
				if (namespaceURL) {
					if (!prefix) prefix = "a0"; // What Firefox uses
				}
				else prefix = "";
				// Create the root element (with optional namespace) as a
				// string of text
				var text = "<" + (prefix?(prefix+":"):"") +	tagname +
					(namespaceURL ? (" xmlns:" + prefix + '="' + namespaceURL +'"') : "") + "/>";
				// And parse that text into the empty document
				doc.loadXML(text);
			}
			return doc;
		}
	};



	/*	dataConversionForm
		Returns the form needed to submit data for converting the pazpar2
		record for exporting in an end-user bibliographic format.
		inputs:	locations - pazpar2 location array
				exportFormat - string
				labelFormat - string
		output:	DOMElement - form
	*/
	var dataConversionForm = function (locations, exportFormat, labelFormat) {

		/*	serialiseXML
			Serialises the passed XMLNode to a string.
			input:	XMLNode
			ouput:	string - serialisation of the XMLNode or null
		*/
		var serialiseXML = function (XMLNode) {
			var result = null;
			try {
				// Gecko- and Webkit-based browsers (Firefox, Chrome), Opera.
				result = (new XMLSerializer()).serializeToString(XMLNode);
			}
			catch (e) {
				try {
					// Internet Explorer.
					result = XMLNode.xml;
				}
				catch (f) {
					//Other browsers without XML Serializer
					//alert('XMLSerializer not supported');
				}
			}
			return result;
		};


		// Convert location data to XML and serialise it to a string.
		var recordXML = newXMLDocument('locations');
		var locationsElement = recordXML.childNodes[0];
		for (var locationIndex in locations) {
			var location = locations[locationIndex];
			var locationElement = recordXML.createElement('location');
			locationsElement.appendChild(locationElement);
			copyObjectContentTo(location, locationElement);
		}
		var XMLString = serialiseXML(locationsElement);

		var form;
		if (XMLString) {
			form = document.createElement('form');
			form.method = 'POST';
			var scriptPath = 'typo3conf/ext/pazpar2/Resources/Public/pz2-client/converter/convert-pazpar2-record.php';
			var scriptGetParameters = {'format': exportFormat};
			if (this.pageLanguage !== undefined) {
				scriptGetParameters.language = this.pageLanguage;
			}
			if (that.config.siteName !== undefined) {
				scriptGetParameters.filename = that.config.siteName;
			}
			form.action = scriptPath + '?' + jQuery.param(scriptGetParameters);

			var qInput = document.createElement('input');
			qInput.name = 'q';
			qInput.setAttribute('type', 'hidden');
			qInput.setAttribute('value', XMLString);
			form.appendChild(qInput);

			var submitButton = document.createElement('input');
			submitButton.setAttribute('type', 'submit');
			form.appendChild(submitButton);
			var buttonText = that.localise('format-' + exportFormat, 'export');
			submitButton.setAttribute('value', buttonText);
			if (labelFormat) {
				var labelText = labelFormat.replace(/\*/, buttonText);
				submitButton.setAttribute('title', labelText);
			}

			var trackOnSubmit = function () {
				setTimeout(function(){that.trackPiwik('export/' + exportFormat);}, 500);
				return true;
			};
			jQuery(form).submit(trackOnSubmit);
		}

		return form;
	};



	/*	exportItem
		Returns a list item containing the form for export data conversion.
		The parameters are passed to dataConversionForm.

		inputs:	locations - pazpar2 location array
				exportFormat - string
				labelFormat - string
		output:	DOMElement - li containing a form
	*/
	var exportItem = function (locations, exportFormat, labelFormat) {
		var form = dataConversionForm(locations, exportFormat, labelFormat);
		var item;
		if (form) {
			item = document.createElement('li');
			item.appendChild(form);
			item.setAttribute('class', 'pz2-exportItem');
		}

		return item;
	};



	/*	appendExportItemsTo
		Appends list items with an export form for each exportFormat to the container.
		inputs:	locations - pazpar2 location array
				labelFormat - string
				container - DOMULElement the list items are appended to
	*/
	var appendExportItemsTo = function (locations, labelFormat, container) {
		for (var formatIndex in that.config.exportFormats) {
			container.appendChild(exportItem(locations, that.config.exportFormats[formatIndex], labelFormat));
		}
	};



	/*	exportItemSubmenu
		Returns a list item containing a list of export forms for each location in exportFormat.
		inputs:	locations - pazpar2 location array
				exportFormat - string
		output:	DOMLIElement
	*/
	var exportItemSubmenu = function (locations, exportFormat) {
		var submenuContainer = document.createElement('li');
		jQuery(submenuContainer).addClass('pz2-extraLinks-hasSubmenu');
		var formatName = that.localise(exportFormat, 'export');
		var submenuName = that.localise('submenu-format', 'export').replace(/\*/, formatName);
		submenuContainer.appendChild(document.createTextNode(submenuName));
		var submenuList = document.createElement('ul');
		submenuContainer.appendChild(submenuList);
		for (var locationIndex in locations) {
			var itemLabel = that.localise('submenu-index-format', 'export').replace(/\*/, parseInt(locationIndex, 10) + 1);
			submenuList.appendChild(exportItem([locations[locationIndex]], exportFormat, itemLabel));
		}

		return submenuContainer;
	};



	/**
	 * Return a list item with a link for KVK catalogue search for the record
	 * passed in data.
	 * Uses ISBN or title/author data for the search.
	 *
	 * @param {object} data - pazpar2 record
	 * @returns {DOMElement} - li element
	 */
	var KVKItem = function (data) {
		var KVKItem;

		// Check whether there are ISBNs and use the first one we find.
		// (KVK does not seem to support searches for multiple ISBNs.)
		var ISBN;
		for (var locationIndex in data.location) {
			var location = data.location[locationIndex];
			if (location['md-isbn']) {
				ISBN = location['md-isbn'][0];
				// Trim parenthetical information from ISBN which may be in
				// Marc Field 020 $a
				ISBN = ISBN.replace(/(\s*\(.*\))/, '');
				break;
			}
		}

		var query = '';
		if (ISBN) {
			// Search for ISBN if we found one.
			query += '&SB=' + ISBN;
		}
		else {
			// If there is no ISBN only proceed when we are dealing with a book
			// and create a search for the title and author.
			var wantKVKLink = false;
			for (var mediumIndex in data['md-medium']) {
				var medium = data['md-medium'][mediumIndex];
				if (medium === 'book') {
					wantKVKLink = true;
					break;
				}
			}

			if (wantKVKLink) {
				if (data['md-title']) {
					query += '&TI=' + encodeURIComponent(data['md-title'][0]);
				}
				if (data['md-author']) {
					var authors = [];
					for (var authorIndex in data['md-author']) {
						var author = data['md-author'][authorIndex];
						authors.push(author.split(',')[0]);
					}
					query += '&AU=' + encodeURIComponent(authors.join(' '));
				}
			}
		}

		if (query !== '') {
			var KVKLink = document.createElement('a');
			var KVKLinkURL = 'http://kvk.ubka.uni-karlsruhe.de/hylib-bin/kvk/nph-kvk2.cgi?maske=kvk-last&input-charset=utf-8&Timeout=120';
			KVKLinkURL += that.localise('&lang=de', 'export');
			KVKLinkURL += '&kataloge=SWB&kataloge=BVB&kataloge=NRW&kataloge=HEBIS&kataloge=KOBV_SOLR&kataloge=GBV';
			KVKLink.href = KVKLinkURL + query;
			var label = that.localise('KVK', 'export');
			KVKLink.appendChild(document.createTextNode(label));
			var title = that.localise('deutschlandweit im KVK suchen', 'export');
			KVKLink.setAttribute('title', title);
			that.turnIntoNewWindowLink(KVKLink);

			KVKItem = document.createElement('li');
			KVKItem.setAttribute('class', 'pz2-KVKSearch');
			KVKItem.appendChild(KVKLink);
		}

		return KVKItem;
	};




	/**
	 * Return a list item with a link for an OpenURL search for record.
	 * The OpenURL base URL can be set in localisation.
	 *
	 * @param {object} record - pazpar2 record
	 * @returns {DOMElement} - li element
	 */
	var openURLItem = function (record) {
		var openURLItem;

		var parameterString = that.OpenURLParameterStringForRecord(record);
		if (parameterString) {
			openURLItem = document.createElement('li');
			openURLItem.setAttribute('class', 'pz2-openURLSearch');

			var a = document.createElement('a');
			openURLItem.appendChild(a);
			var URL = that.localise('openURLBaseURL', 'export') + parameterString;
			a.setAttribute('href', URL);

			a.appendChild(document.createTextNode(that.localise('In Bibliothek finden', 'export')));
			that.turnIntoNewWindowLink(a);
		}

		return openURLItem;
	};



	var that = this;
	var extraLinkList = document.createElement('ul');

	if (that.config.useClipboard && !exportLinksOnly) {
		that.appendInfoToContainer(that.addToClipboardItem(data), extraLinkList);
	}

	if (that.config.showKVKLink && !exportLinksOnly) {
		that.appendInfoToContainer(KVKItem(data), extraLinkList);
	}

	if (that.config.showOpenURLLink && !exportLinksOnly) {
		that.appendInfoToContainer(openURLItem(data), extraLinkList);
	}

	if (data.location.length === 1) {
		var labelFormat = that.localise('simple', 'export');
		appendExportItemsTo(data.location, labelFormat, extraLinkList);
	}
	else {
		var labelFormatAll = that.localise('all', 'export');
		appendExportItemsTo(data.location, labelFormatAll, extraLinkList);

		if (that.config.showExportLinksForEachLocation) {
			for (var formatIndex in exportFormats) {
				extraLinkList.appendChild(exportItemSubmenu(data.location, exportFormats[formatIndex]));
			}
		}
	}

	var exportLinks;
	if (extraLinkList.childNodes.length > 0) {
		exportLinks = document.createElement('div');
		jQuery(exportLinks).addClass('pz2-extraLinks');
		var exportLinksLabel = document.createElement('span');
		exportLinks.appendChild(exportLinksLabel);
		jQuery(exportLinksLabel).addClass('pz2-extraLinksLabel');
		exportLinksLabel.appendChild(document.createTextNode(that.localise('mehr Links', 'export')));
		exportLinks.appendChild(extraLinkList);
	}

	return exportLinks;
};
