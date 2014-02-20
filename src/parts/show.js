/**
 * Callback for pazpar2 when data become available.
 * Go through the records and adds them to hitList.
 * Regenerate displayHitList(UpToDate) and trigger redisplay.
 *
 * @param {object} data
 * @returns {undefined}
 */
pz2_client.prototype.onshow = function (data) {

	/*	extractNewestDates
		Looks for the md-date array in the passed record and returns an array
		of integers containing the numbers represented by the last four
		consecutive digits in each member.
		input:	array (a pazpar2 record or a record’s location element)
		output:	array of integers
	*/
	var extractNewestDates = function (record) {
		var result = [];

		if (record['md-date']) {
			for (var dateIndex in record['md-date']) {
				var dateParts = record['md-date'][dateIndex].match(/[0-9]{4}/g);
				if (dateParts && dateParts.length > 0) {
					var parsedDate = parseInt(dateParts[dateParts.length - 1], 10);
					if (!isNaN(parsedDate)) {
						result.push(parsedDate);
					}
				}
			}
		}
		return result;
	};

	var sortNewestFirst = function (a, b) {
		var aDates = extractNewestDates(a);
		var bDates = extractNewestDates(b);

		if (aDates.length > 0 && bDates.length > 0) {
			return bDates[0] - aDates[0];
		}
		else if (aDates.length > 0 && bDates.length === 0) {
			return -1;
		}
		else if (aDates.length === 0 && bDates.length > 0) {
			return -1;
		}
		else {
			return 0;
		}
	};



	for (var hitNumber in data.hits) {
		var hit = data.hits[hitNumber];
		var hitID = hit.recid[0];
		if (hitID) {
			var oldHit = this.hitList[hitID];
			if (oldHit) {
				hit.detailsDivVisible = oldHit.detailsDivVisible;
				if (oldHit.location.length === hit.location.length) {
					// Preserve existing LI and details DIV, if the location info
					// has not changed. Otherwise they will be recreated using
					// the updated data.
					hit.li = oldHit.li;
					hit.detailsDiv = oldHit.detailsDiv;
				}
			}

			if (!this.config.usePazpar2Facets) {
				// Make sure the 'medium' field exists by setting it to 'other' if necessary.
				if (!hit['md-medium']) {
					hit['md-medium'] = ['other'];
				}

				// If there is no language information, set the language code to zzz
				// (undefined) to ensure we get a facet for this case as well.
				if (!hit['md-language']) {
					hit['md-language'] = ['zzz'];
				}
			}

			// Create the integer 'filterDate' field for faceting.
			hit['md-filterDate'] = extractNewestDates(hit);

			// If there is no title information but series information, use the
			// first series field for the title.
			if (!(hit['md-title'] || hit['md-multivolume-title']) && hit['md-series-title']) {
				hit['md-multivolume-title'] = [hit['md-series-title'][0]];
			}

			// Sort the location array to have the newest item first
			hit.location.sort(sortNewestFirst);

			this.hitList[hitID] = hit;
		}
	}

	if (this.curSource === 'query') {
		this.updateAndDisplay(this.hitList);
	}
};



/**
 * Update displayHitList and displayHitListUpToDate, then redraw.
 *
 * @returns {undefined}
 */
pz2_client.prototype.updateAndDisplay = function () {
	/**
	 * Converts a given list of data to thes list used for display by:
	 *  1. applying filters
	 *  2. sorting
	 * according to the setup in the displaySort and filterArray configuration.
	 *
	 * @param {type} list
	 * @returns {array}
	 */
	var displayLists = function (list) {

		/*	filter
			Returns filtered lists of pazpar2 records according to the current
			filterArray. The first list are the results to display. The second list
			are the results satisfying all filters except the date ones. It is used
			for drawing the date histogram.

			input:	list - list of pazpar2 records
			output:	list of 2 items:
						* list of pazpar2 records matching all filters
						* list of pazpar2 records matching all non-date filters
		*/
		var filteredLists = function (listToFilter) {

			/*	matchesFilters
				Returns how the passed record passes the filters.
				input:	record - pazpar2 record
				output: integer - 0 if no match, 1 if matching, 2 if matching everything but date
			*/
			var matchesFilters = function (record) {
				var matches = true;
				var matchesEverythingNotTheDate = true;
				for (var facetType in that.config.termLists) {
					for (var filterIndex in that.filterArray[facetType]) {
						matches = false;
						matchesEverythingNotTheDate = false;
						var filterValue = that.filterArray[facetType][filterIndex];
						if (facetType === 'xtargets') {
							for (var locationIndex in record.location) {
								matches = (record.location[locationIndex]['@name'] === filterValue);
								if (matches) {break;}
							}
						}
						else if (facetType === 'filterDate' && filterValue.constructor === Object) {
							matchesEverythingNotTheDate = true;
							for (var dateIndex in record['md-filterDate']) {
								var recordDate = record['md-filterDate'][dateIndex];
								// The filterValue for date contains two years, both are assumed to
								// to designate January 1st. I.e. {from:2009, to:2010} gives
								// all records from 2009.
								matches = (filterValue.from <= recordDate) && (recordDate < filterValue.to);
								if (matches) {break;}
							}
						}
						else {
							var contents = that.fieldContentsInRecord(facetType, record);
							for (var index in contents) {
								matches = (String(contents[index]).toLowerCase() === filterValue.toLowerCase());
								if (matches) {break;}
							}
						}

						if (!matches) {break;}
					}

					if (!matches) {break;}
				}

				var result = (matches) ? 1 : 0;
				if (!matches && matchesEverythingNotTheDate) result = 2;
				return result;
			};


			var filteredList = [];
			var filteredUpToDateList = [];
			for (var index in listToFilter) {
				var item = listToFilter[index];
				var matchState = matchesFilters(item);
				if (matchState === 1) {
					filteredList.push(item);
				}
				if (matchState >= 1) {
					filteredUpToDateList.push(item);
				}
			}

			return [filteredList, filteredUpToDateList];
		};



		/*	sortFunction
			Sort function for pazpar2 records.
			Sorts by date or author according to the current setup in the displaySort configuration.
			input:	record1, record2 - pazpar2 records
			output: negative/0/positive number
		*/
		var sortFunction = function(record1, record2) {
			/*	dateForRecord
				Returns the year / last year of a date range of the given pazpar2 record.
				If no year is present, the year 1000 is used to make records look old.
				input:	record - pazpar2 record
				output: Date object with year found in the pazpar2 record
			*/
			function dateForRecord (record) {
				var year;
				var dateArray = record['md-date'];
				if (dateArray) {
					var dateString = dateArray[0];
					if (dateString) {
						var yearsArray = dateString.split('-');
						var lastYear = yearsArray[yearsArray.length - 1];
						year = parseInt(lastYear, 10);
					}
				}

				// Records without a date are treated as very old.
				if (!year) {
					year = 1000;
				}

				return year;
			}



			/*	fieldContentForSorting
				Returns a record's md-fieldName field, suitable for sorting.
					* Concatenated when several instances of the field are present.
					* All lowercase.
				input:	fieldName - name of the field to use
						record - pazpar2 record
				output: string with content of the field in the record
			*/
			function fieldContentForSorting (fieldName, record) {
				var result = String(that.fieldContentsInRecord(fieldName, record));
				result = result.replace(/^\W*/,'');
				result = result.toLowerCase();

				return result;
			}


			var result = 0;

			for (var sortCriterionIndex in that.config.displaySort) {
				var sortCriterion = that.config.displaySort[sortCriterionIndex];
				var fieldName = sortCriterion.fieldName;
				var direction = (sortCriterion.direction === 'ascending') ? 1 : -1;

				if (fieldName === 'date') {
					var date1 = dateForRecord(record1);
					var date2 = dateForRecord(record2);

					result = (date1 - date2) * direction;
				}
				else {
					var string1 = fieldContentForSorting(fieldName, record1);
					var string2 = fieldContentForSorting(fieldName, record2);

					if (string1 === string2) {
						result = 0;
					}
					else if (string1 === undefined) {
						result = 1;
					}
					else if (string2 === undefined) {
						result = -1;
					}
					else {
						result = ((string1 < string2) ? -1 : 1) * direction;
					}
				}

				if (result !== 0) {
					break;
				}
			}

			return result;
		};


		var result = filteredLists(list);
		result[0] = result[0].sort(sortFunction);
		return result;
	};



	var that = this;
	var hitList;
	if (that.curSource === 'query') {
		// Use the query results.
		hitList = that.hitList;
	}
	else {
		// Use a copy of the clipboard.
		hitList = jQuery.extend(true, {}, that.getClipboard());
	}

	var filterResults = displayLists(hitList);
	that.displayHitList = filterResults[0];
	that.displayHitListUpToDate = filterResults[1];
	that.display();
	if (!that.config.usePazpar2Facets || that.config.curSource === 'history') {
		that.updateFacetLists();
	}
};
