/**
 * pz2-client.js
 * 
 * Inspired by Index Data’s js-client.js.
 * 2010-2014: Sven-S. Porst <ssp-web@earthlingsoft.net>
 *
 * JavaScript for running pazpar2 queries and displaying their results.
 *
 * Please refer to the Readme in the repository at:
 * https://github.com/ssp/pazpar2-js-client
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

	this.recPerPage = 100;
	this.curPage = 1;
	this.curSort = [];
	this.curFilter = null;
	this.curQuery = null;
	this.curQueryTerms = [];
	this.curAdditionalQueryTerms = [];
	this.curSource = 'query'; // 'query' for results, 'clipboard' for the clipboard

	this.facetData = {}; // stores faceting information as sent by pazpar2
	this.filterArray = {};

	this.hitList = {}; // local storage for the records sent from pazpar2
	this.displayHitList = []; // filtered and sorted list used for display
	this.displayHitListUpToDate = []; // list filtered for all conditions but the date used for drawing the date histogram
	this.targetStatus = {};
	
}



var pz2client = new pz2_client();
