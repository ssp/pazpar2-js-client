/**
 * Main configuration object.
 *
 * @type {object}
 */
pz2_client.prototype.config = {
	pazpar2Path: '/pazpar2/search.pz2',

	serviceID: null,

	showResponseType: '',

	// number of records to fetch from pazpar2
	fetchRecords: 1500,

	/*	List of all facet types to loop over.
		Don't forget to also set termlist attributes in the corresponding
		metadata tags for the service.

		It is crucial for the date histogram that 'filterDate' is the last item in this list.
	*/
	termLists: {
		xtargets: {'maxFetch': 25, 'minDisplay': 1},
		medium: {'maxFetch': 12, 'minDisplay': 1},
		language: {'maxFetch': 5, 'minDisplay': 1}, // excluding the unknown item and with +2 'wiggle room'
		// 'author': {'maxFetch': 10, 'minDisplay': 1},
		filterDate: {'maxFetch': 10, 'minDisplay': 5}
	},

	// Default sort order.
	displaySort: [],
	// Use Google Books for cover art when an ISBN or OCLC number is known?
	useGoogleBooks: false,
	// Use Google Maps to display the region covered by records?
	useMaps: false,
	// Query ZDB-JOP for availability information based for items with ISSN?
	// ZDB-JOP needs to be reverse-proxied to /zdb/ (passing on the client IP)
	// or /zdb-local/ (passing on the server’s IP) depending on ZDBUseClientIP.
	useZDB: false,
	ZDBUseClientIP: true,
	// The maximum number of authors to display in the short result.
	maxAuthors: 3,
	// Display year facets using a histogram graphic?
	useHistogramForYearFacets: true,
	// Name of the site that can be used, e.g. for file names of downloaded files.
	siteName: undefined,
	// Add COinS elements to our results list for the benefit of zotero >= 3?
	provideCOinSExport: true,
	// Whether to include a link to Karlsruher Virtueller Katalog along with the export links.
	showKVKLink: false,
	// List of export formats we provide links for. An empty list suppresses the
	// creation of export links. Supported list items are: 'ris', 'bibtex',
	// 'ris-inline' and 'bibtex-inline'.
	exportFormats: [],
	// Offer submenus with items for each location in the export links?
	showExportLinksForEachLocation: false,
	// Function used to trigger search (to be overwritten by pazpar2-neuwerbungen).
	triggerSearchFunction: undefined,
	// Show keywords field in extended search and display linked keywords in detail view?
	useKeywords: false,
	// Object of URLs for form field autocompletion.
	autocompleteURLs: {},
	// Function called to set up autocomplete for form fields.
	autocompleteSetupFunction: this.autocompleteSetupArray
};
