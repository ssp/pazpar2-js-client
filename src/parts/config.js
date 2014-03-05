/**
 * Main configuration object.
 *
 * @type {object}
 */
pz2_client.prototype.config = {
	pazpar2Path: '/pazpar2/search.pz2',
			
	useServiceProxy: false,
	serviceProxyPath: '/service-proxy',
	serviceProxyAuthPath: '/service-proxy-auth',

	serviceID: null,

	/**
	 * List of all facet types to loop over.
	 * Do not forget to also set termlist and limitmap attributes for the fields
	 * in the pazpar2 metadata configuration.
	 *
	 * @type object
	 */
	termLists: {
		xtargets: {'maxFetch': 25, 'minDisplay': 1},
		medium: {'maxFetch': 12, 'minDisplay': 1},
		language: {'maxFetch': 5, 'minDisplay': 1}, // excluding the unknown item and with +2 'wiggle room'
		filterDate: {'maxFetch': 10, 'minDisplay': 5}
	},
	// Use facet data as provided by pazpar2 or create our own?
	usePazpar2Facets: false,
	// Display year facets using a histogram graphic?
	useHistogramForYearFacets: true,

	// Use Google Books for cover art when an ISBN or OCLC number is known?
	useGoogleBooks: false,
	// Use Google Maps to display the region covered by records?
	useMaps: false,

	// Query ZDB-JOP for availability information based for items with ISSN?
	// ZDB-JOP needs to be reverse-proxied to /zdb/ (passing on the client IP)
	// or /zdb-local/ (passing on the server’s IP) depending on ZDBUseClientIP.
	useZDB: false,
	ZDBUseClientIP: true,

	// List of export formats we provide links for. An empty list suppresses the
	// creation of export links. Supported list items are: 'ris', 'bibtex',
	// 'ris-inline' and 'bibtex-inline'.
	exportFormats: [],
	// Offer submenus with items for each location in the export links?
	showExportLinksForEachLocation: false,
	// Name of the site that can be used, e.g. for file names of downloaded files.
	siteName: undefined,
	// Add COinS elements to our results list for the benefit of zotero >= 3?
	provideCOinSExport: true,
	// Whether to include a link to Karlsruher Virtueller Katalog along with the export links.
	showKVKLink: false,
	// Whether to include an OpenURL link (base URL can be set in localisation)
	showOpenURLLink: false,

	// Function used to trigger search (to be overwritten by pazpar2-neuwerbungen).
	triggerSearchFunction: undefined,

	// Show keywords field in extended search and display linked keywords in detail view?
	useKeywords: false,

	// Object of URLs for form field autocompletion.
	autocompleteURLs: {},
	// Function called to set up autocomplete for form fields.
	autocompleteSetupFunction: this.autocompleteSetupArray,
	// Number of recent searches to store.

	historyItems: 99,
	// Whether to show the link to display the history
	addHistoryLink: false,
	// Whether to offer storing results in the clipboard
	useClipboard: false,
	// Whether to show the link to display the clipboard
	addClipboardLink: false,

	// Whether to highlight the search terms in result display
	highlightSearchTerms: false
};



/**
 * Return the number of records to fetch from pazpar2.
 * When using pazpar2’s facets, this is the number of results per page.
 * When building our own, it is a large number.
 *
 * @type {object}
 */
pz2_client.prototype.fetchRecords = function () {
	var result = 1500;
	if (this.config.usePazpar2Facets) {
		result = this.currentView.recPerPage;
	}
	return result;
};
