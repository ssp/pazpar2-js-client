/**
 * Converts a given list of data to thes list used for display by:
 *  1. applying filters
 *  2. sorting
 * according to the setup in the displaySort and filters configuration.
 *
 * @param {type} list
 * @returns {array}
 */
pz2_client.prototype.displayLists = function (list) {

	/*	filter
		Returns filtered lists of pazpar2 records according to the current
		filters. The first list are the results to display. The second list
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
				for (var filterIndex in that.currentView.filters[facetType]) {
					matches = false;
					matchesEverythingNotTheDate = false;
					var filterValue = that.currentView.filters[facetType][filterIndex];
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



	var that = this;

	var result = filteredLists(list);
	result[0] = result[0].sort(sortFunction);
	return result;
	
};
