/**
 * pz2-client.js
 *
 * JavaScript for running pazpar2 queries and displaying their results.
 * Inspired by Index Data’s js-client.js.
 *
 * Please refer to the Readme in the repository at:
 * https://github.com/ssp/pazpar2-js-client
 *
 * 2010-2015: Sven-S. Porst <ssp-web@earthlingsoft.net>
 */
function pz2_client () {

	/**
	 * Status variables.
	 */
	this.my_paz = undefined; // client from pz2.js

	this.pz2InitRequestStartTime = 0;
	this.pz2Initialised = false;
	this.errorCount = 0;
	this.pz2InitTimeout = undefined;

	this.pageLanguage = undefined;

	this.institutionName = undefined;
	this.allTargetsActive = true;

	this.viewSettings = {
		'query': {
			'type': 'query',
			'recPerPage': 100,
			'page': 1,
			'sort': '',
			'filters': {},
			'limit': null,
			'filter': null,
			'query': null,
			'queryTerms': [],
			'additionalQueryTerms': [],
			'resultCount': 0
		},
		'clipboard': {
			'type': 'clipboard',
			'recPerPage': 100,
			'page': 1,
			'sort': 'timeAddedToClipboard:0',
			'filters': {},
			'limit': null,
			'filter': null,
			'query': null,
			'queryTerms': [],
			'additionalQueryTerms': [],
			'resultCount': 0
		}
	};
	this.currentView = this.viewSettings.query;

	this.facetData = {}; // stores faceting information as sent by pazpar2
	this.hitList = {}; // locally store the records sent from pazpar2
	this.currentHits = []; // IDs of the current pazpar2 reply
	this.targetStatus = {};

	this.displayHitList = []; // filtered and sorted list used for display
	this.displayHitListUpToDate = []; // list filtered for all conditions but the date used for drawing the date histogram
}



var pz2client = new pz2_client();
