/**
 * Converts a given list of data to the list used for display by:
 * 1. applying filters
 * 2. sorting
 * according to the setup in the displaySort and filters configuration.
 * This is only necessary when not using pazpar2’s facet information.
 *
 * @param {type} list
 * @returns {array}
 */
pz2_client.prototype.displayLists = function (list) {

	/**
	 * Return filtered lists of pazpar2 records according to the current
	 * filters. The first list are the results to display. The second list
	 * contains the results satisfying all filters except the date ones.
	 * It is used for drawing the date histogram.
	 *
	 * @param {array} listToFilter
	 * @returns {array} - 2 items: list of pazpar2 records matching all/all non-date filters
	 */
	var filteredLists = function (listToFilter) {

		/**
		 * Return how record matches the filters.
		 *
		 * @param {object} record - pazpar2 record
		 * @returns {integer} - 0 if no match, 1 if matching, 2 if matching everything but date
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
					else if (filterValue.constructor === Object) {
						matchesEverythingNotTheDate = true;
						var fieldContent = record['md-' + facetType];
						for (var dateIndex in fieldContent) {
							var recordDate = fieldContent[dateIndex];
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



	/**
	 * Sort function for pazpar2 records.
	 * Sorts by date or author according to the current setup in the displaySort configuration.
	 *
	 * @param {object} record1 - pazpar2 record
	 * @param {object} record2 - pazpar2 record
	 * @returns {number}
	 */
	var sortFunction = function(record1, record2) {

		/**
		 * Return the year / last year of date range in record.
		 * If no year is present, the year 1000 is used to make records look old.
		 *
		 * @param {object} record
		 * @returns {number} - the year found in record
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



		/**
		 * Return a record’s md-fieldName field, suitable for sorting.
		 * * Concatenated when several instances of the field are present.
		 * * All lowercase.
		 * 
		 * @param {string} fieldName
		 * @param {object} record - pazpar2 record
		 * @returns {string} - content of field fieldName in record
		 */
		function fieldContentForSorting (fieldName, record) {
			var result = String(that.fieldContentsInRecord(fieldName, record));
			result = result.replace(/^\W*/,'');
			result = result.toLowerCase();

			return result;
		}



		/**
		 * Return an array of search criteria based on the current setup and selection.
		 *
		 * @returns {array} - of objects with fields 'fieldName' and 'direction'
		 */
		function currentSortConfiguration () {
			var sortArray = [];

			if (that.currentView.sort) {
				var sortCriteria = that.currentView.sort.split(',');

				for (var criterionIndex in sortCriteria) {
					var criterionParts = sortCriteria[criterionIndex].split(':');
					if (criterionParts.length === 2) {
						sortArray.push({
							'fieldName': criterionParts[0],
							'direction': criterionParts[1]
						});
					}
				}
			}

			return sortArray;
		}



		var result = 0;

		var sortConfig = currentSortConfiguration();
		for (var sortCriterionIndex in sortConfig) {
			var sortCriterion = sortConfig[sortCriterionIndex];
			var fieldName = sortCriterion.fieldName;
			var direction = (sortCriterion.direction ? -1 : 1);

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
