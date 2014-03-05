# pazpar2-js-client
A JavaScript client to interact with [Index Data’s pazpar2](http://www.indexdata.com/pazpar2) metasearch software and to display its search results.

2010-2014 by [Sven-S. Porst](http://earthlingsoft.net/ssp/) [<ssp-web@earthlingsoft.net>](mailto:ssp-web@earthlingsoft.net?subject=pz2-client)



## Examples
An example implementation of the markup for use in the TYPO3 content management system is provided by the »pazpar2« TYPO3 extension, available via the [TYPO3 Extension Repository](http://typo3.org/extensions/repository/view/pazpar2/current/) as well as [github](https://github.com/ssp/typo3-pazpar2).

This extension and the markup it creates can be seen in use on the [Lib AAC](http://aac.sub.uni-goettingen.de/) or [vifanord](http://vifanord.de/) website.

## Build
Source code is inside the `src` folder.

[Grunt](http://gruntjs.com/) is used to assemble the files into the `pz-client.js` or `pz-client.min.js` files you should include on your site.


## Setup
Include `pz2-client.min.js `and `pz2.css` in your HTML file to load the resources provided by pz-client.

For the scripts to operate successfully, you will need:

* __for direct pazpar2 use:__ a pazpar2 server (or a reverse proxy forwarding to it) set up at the path `/pazpar2/search.pz2` of your web server [[example apache configuration]](https://raw.github.com/ssp/vlibs-pazpar2/blob/master/fileadmin/apache/pazpar2.conf). This can be overriden by setting the JavaScript variable `pazpar2Path` before loading pz2-client.js.
* __for pazpar2 use through Service Proxy:__ Service Proxy (or a reverse proxy forwarding to it) set up at the path `/service-proxy/` and Service Proxy Authentication set up at the path `/service-proxy-auth`. This can be overriden by setting the JavaScript variables `serviceProxyPath` and `serviceProxyAuthPath` before loading pz2-client.js.
* your results will be best if you use the same metadata fields we do. These are based on the ones provided by `tmarc.xsl `and augmented with additional fields in a few areas. The full list of fields can be found in the Readme of the [pazpar2 TYPO3 Extension](https://github.com/ssp/typo3-pazpar2).
* [jQuery ≥ 1.7.1](http://jquery.com/) included in your site
* [flot](http://www.flotcharts.org/) with its selection module included in your site if you set the `useHistogramForYearFacets` option to true; the script is included in the repository as a submodule at `flot`, a minified version of both is in `jquery.flot+selection.js`
* [jQuery Storage API](https://github.com/julien-maurel/jQuery-Storage-API) included in your site if you want to use the clipboard or search history features; the script is included in the repository as a submodule at `jquery-storage`
* for the optional usage of ZDB journal availability information (mainly useful in Germany), you are expected to proxy [ZDB’s Journals Online & Print](http://www.zeitschriftendatenbank.de/services/journals-online-print/) service to the /zdb/ and /zdb-local/ paths of your server [[example apache configuration]](https://github.com/ssp/vlibs-typo3/blob/aac/fileadmin/apache/zdb.conf).
* your web page to initialise pz-client on domReady with your settings; e.g. using `jQuery.ready(function () { pz2_client.init(yourSettings) })`

A number of parameters can be configured in the `yourSettings` object passed to `pz2_client.init()`. Essential service specific ones are:

### Service

* when querying pazpar2 directly:
	* `serviceID` (string): the pazpar2 service to use
	* `pazpar2Path` (string, default: `/pazpar2/search.pz2): the path of the pazpar2 service on the web server
* when querying pazpar2 through Service Proxy:
	* `useServiceProxy` (boolean, default: `false`): whether or not to use Service Proxy instead of pazpar2 sessions
	* `serviceProxyPath` (string, default: `/service-proxy`): the path of Service Proxy on the web server
	* `serviceProxyAuthPath` (string, default: `/service-proxy-auth`): the path of Service Proxy’s authentication URL on the server

The following options are available to adjust the details of pz2-client’s operation and display:


### Facets
* `termLists` (object, default: `{xtargets: {maxFetch: 25, minDisplay: 1}, medium: {maxFetch: 12, minDisplay: 1}, language: {maxFetch: 5, minDisplay: 1}, filterDate: {maxFetch: 10, minDisplay: 5}}`): facet configuration; `maxFetch` is the maximum number of facet items displayed by default (the rest is hidden), `minDisplay` is the minimum number of facet items required for the facet to be displayed at all
* `usePazpar2Facets` (boolean, default: `false`): whether to use pazpar2’s native facets; native facets work better with large result sets, our own facets give better in-browser performance otherwise; you probably need to replace the `filterDate` termList setting with one for `date` when using native facets
* `useHistogramForYearFacets` (boolean, default: `true`): if true, year facets are displayed as a histogram rather than as a list

### Detail Display
* `useKeywords`: (boolean, default: `false`): whether to use subject information; if `true` the subject field will be expected in the search form and a `subject` index configuration in pazpar2; Subject names will be displayed in detail view as links that trigger subject searches
* `useGoogleBooks` (boolean, default: `false`): whether to use Google Books cover art and preview for items with ISBN or OCLC number; if set to true, you also need to include Google loader
* `useMaps` (boolean, default: `false`): whether to use Google Maps to display a map with a highlight for the region covered by the item; if set to true, you also need to include Google loader
* `useZDB` (boolean, default: `false`): whether to look up journal availability at the user’s IP (in German university networks) using ZDB’s Journals Online and Print service
* `ZDBUseClientIP` (boolean, default: `true`): if true, the ZDB-JOP proxy is expected to be at `/zdb/`, if false, the ZDB-JOP proxy is expected to be at `/zdb-local/`

### Detail Display Export features
* `exportFormats` (array of strings, default: `[]`): format names for export links, allowed values are `ris`, `bibtex`, `ris-inline` and `bibtex-inline`.
* `siteName` (string, default: `undefined`): name of the site that can be used for export file names
* `provideCOinSExport` (boolean, default: `true`): if true, COinS tags are embedded with the results (for Zotero 3 and above)
* `showKVKLink` (boolean, default: `false`): if true, a link to [Karlsruher Virtueller Katalog](http://www.ubka.uni-karlsruhe.de/kvk.html) for searching German union catalogues is included with the export links
* `showOpenURLLink` (boolean, default: `false`): if true, a link to an OpenURL resolver is included with the export links; you can set its baseURL using the `openURLBaseURL` key of the `export` localisation dictionary

### Autocompletion
* `autocompleteURLs` (object, default: `{}`): keys are search field names (e.g. all, title, person), values are URLs that can be queried for autocomplete terms
* `autocompleteSetupFunction` (function, default: `undefined`): function (URL, fieldName) that is run when setting up the autocomplete feature. Returns an object for configuring [jQuery UI’s autocomplete widget](http://api.jqueryui.com/autocomplete/). Functions `pz2client.autocompleteSetupArray` for sources that return JSON arrays, `pz2client.autocompleteSolrSpellcheck` for querying a Solr spellcheck component and `pz2client.autocompleteSetupHistory` for using recent search terms (see the next section) are predefined.

### Search History
* `historyItems` (integer, default: `99`): Number of recent search queries to store when local storage is available; set to `0` to deactivate
* `addHistoryLink` (boolean, default: `false`): whether to add a link for showing the recent search terms inside `div.pz2-featureLinks` at the beginning of `#pazpar2` (alternatively you can use `pz2client.autocompleteSetupHistory` as `autocompleteSetupFunction` to expose recent search terms via autocompletion)

### Clipboard
* `useClipboard` (boolean, default: `false`): whether to offer storing results in the clipboard when local storage is available
* `addClipboardLink` (boolean, default: `false`): whether to add a link for showing the clipboard inside `div.pz2-featureLinks` at the beginning of `#pazpar2`

### Highlighting
* `highlightSearchTerms` (boolean, default: `false`): whether to try and highlight the search terms found in the results’ fields


## Localisation
For localisation to work, pz2-client expects the language to be set in the document’s `<html>` tag.

Localisation is stored in the `pz2client.localisations` object. Its keys are dictionary names with objects as values. These objects have ISO 639-1 language codes as keys and objects as values. These final objects have the localisation strings as keys and the localised versions as values.

To overwrite localisation values, prepare your own localisation object and use `jQuery.extend()` after the document is ready. E.g.:

	jQuery().ready( function () {
		'facet-xtargets': {
			'en': {
				'sru.gbv.de/fachopac-vifanord': 'Special Subject Catalogue vifanord',
				'swb/wao-vifanord': 'World Affairs Online',
				'se-kb/libris-vifanord': 'NB Sweden LIBRIS'
			},
			'de': {
				'sru.gbv.de/fachopac-vifanord': 'Fachkatalog vifanord',
				'swb/wao-vifanord': 'World Affairs Online',
				'se-kb/libris-vifanord': 'NB Schweden LIBRIS',
				'no-bibsys/NBO': 'NB Norwegen BIBSYS'
			}
		}
	});

Things you may want to commonly override:

* facet names in the `facet` dictionary
* target names in the `facet-xtargets` dictionary; keys in that dictionary are the `target` attributes from the pazpar2 configurations; it may be beneficial to make these independent from the target’s URL using `pz:url`


## Example page head

The configuration of the [vifanord](http://vifanord.de/?id=16) site can be used as an example:

	<html lang="de">
	<head>
	  <title>vifanord</title>
	  <script src="uploads/tx_t3jquery/jquery-1.8.x-1.10.x.js" type="text/javascript"/>
	  <script src="typo3conf/ext/pazpar2/Resources/Public/pz2-client/pz2-client.min.js" type="text/javascript"/>
	  <script src="typo3conf/ext/pazpar2/Resources/Public/pz2-client/jquery-storage/jquery.storageapi.min.js" type="text/javascript"/>
	  <script src="https://www.google.com/jsapi" type="text/javascript"/>
	  <script src="typo3conf/ext/pazpar2/Resources/Public/pz2-client/jquery.flot+selection.js" type="text/javascript"/>
	  <script type="text/javascript">/*<![CDATA[*/
	  <!--
		jQuery(document).ready(function() {pz2client.init(
			{
				"serviceID": "vifanord",
				"pazpar2Path": "/pazpar2/search.pz2",
				"useGoogleBooks": true,
				"useMaps": true,
				"useZDB": true,
				"ZDBUseClientIP": true,
				"usePazpar2Facets": true,
				"useHistogramForYearFacets": true,
				"provideCOinSExport": true,
				"showExportLinksForEachLocation": false,
				"showKVKLink": true,
				"showOpenURLLink": true,
				"useKeywords": true,
				"historyItems": 99,
				"addHistoryLink": true,
				"useClipboard": true,
				"addClipboardLink": true,
				"highlightSearchTerms": true,
				"exportFormats": [
					"ris",
					"bibtex"
				],
				"termLists": {
					"region": {
						"maxFetch": "5",
						"minDisplay": "1"
					},
					"xtargets": {
						"maxFetch": "6",
						"minDisplay": "1"
					},
					"medium": {
						"maxFetch": "20",
						"minDisplay": "1"
					},
					"language": {
						"maxFetch": "5",
						"minDisplay": "1"
					},
					"date": {
						"maxFetch": "6",
						"minDisplay": "5"
					}
				}
			}
		);
	  // -->
	  /*]]>*/</script>
	  <link rel="stylesheet" type="text/css" href="typo3conf/ext/pazpar2/Resources/Public/pz2-client/pz2.css" media="all"/>
	</head>



## DOM Elements
The script expects specific DOM Elements containing its search form and serving as a container for search results. These should have the following structure:

	<div id="pazpar2">
		<div class="pz2-JSNote">No JavaScript Notice</div>
		<div class="pz2-accessNote"></div>
		<form method="get" class="pz2-searchForm pz2-basic">
			<div class="pz2-mainForm">
				<div class="pz2-fieldContainer pz2-field-all">
					<label class="pz2-textFieldLabel" for="pz2-field-all">Alle Felder</label>
					<input placeholder="" class="pz2-searchField" id="pz2-field-all" type="text" value="">
					<span class="pz2-formControls">
						<input class="pz2-submitButton" type="submit" name="submit" value="Search">
						<a class="pz2-extendedLink" href="#">extended Search</a>
					</span>
					<span class="pz2-checkbox pz2-fulltext">
						<input id="pz2-checkbox-fulltext" type="checkbox" name="querySwitchFulltext" value="1">
						<label for="pz2-checkbox-fulltext">include tables of contents</label>
					</span>
				</div>
				<div class="pz2-extraFields">
					<div class="pz2-fieldContainer pz2-field-title">
						<label class="pz2-textFieldLabel" for="pz2-field-title">Title</label>
						<input class="pz2-searchField" id="pz2-field-title" type="text" name="queryStringTitle" value="1">
						<span class="pz2-checkbox pz2-journal-only">
							<input id="pz2-checkbox-journal" type="checkbox" name="querySwitchJournalOnly" value="1">
							<label for="pz2-checkbox-journal">journal titles only</label>
						</span>
					</div>
					<div class="pz2-fieldContainer pz2-field-person">
						<label class="pz2-textFieldLabel" for="pz2-field-person">Person, Author</label>
						<input placeholder="e.g. Lincoln or Wilde, Oscar" class="pz2-searchField" id="pz2-field-person" type="text" name="queryStringPerson" value="">
					</div>
					<div class="pz2-fieldContainer pz2-field-date">
						<label class="pz2-textFieldLabel" for="pz2-field-date">Year</label>
						<input placeholder="e.g. 2004, 2004-, -2004 oder 2004-2008" class="pz2-searchField" id="pz2-field-date" type="text" name="queryStringDate" value="">
					</div>
				</div>
			</div>

			<div class="pz2-ranking">
				<select class="pz2-perPage" name="perpage" onchange="onSelectDidChange">
					<option value="10">10</option>
					<option value="20">20</option>
					<option value="50">50</option>
					<option value="100" selected="selected">100</option>
				</select>
			</div>

			<input type="hidden" name="useJS" value="no">
		</form>

		<div class="pz2-clear"></div>

		<div id="pz2-recordView">
			<div class="pz2-pager pz2-top">
				<div class="pz2-progressIndicator"></div>
				<div class="pz2-pageNumbers"></div>
				<span class="pz2-recordCount" onclick="toggleStatus();"></span>
				<div id="pz2-targetView" style="display: none">No information available yet.</div>
			</div>

			<div id="pz2-termLists"></div>
			<div id="pz2-results"></div>

			<div class="pz2-pager pz2-bottom">
				<div class="pz2-pageNumbers"></div>
			</div>
		</div>
	</div>


The markup consists of the following blocks inside the div#pazpar2:

* `.pz2-JSNote`: contains a note that is hidden by JavaScript on DOM Ready (giving a chance to inform users about JavaScript not being available)
* `.pz2-accessNote`: information about the access privilegs as supplied by the [pazpar2-access](https://github.com/ssp/pazpar2-access) script is displayed here
* `form.pz2-searchForm`: The search form:
	* pz2.css hides the »extended« fields initially and the script will handle expanding/collapsing of the form
	* `.pz2-ranking`: Hidden by default, in principle the number of records could be controlled here
* `.pz2-recordView`: The dynamic results appear in here:
	* `.pz2-pager.pz2-top`: Status information
		* `.pz2-progressIndicator`: An element that expands from nearly zero width to full width to reflect the process of the pazpar2 search
		* `.pz2-pageNumbers`: Links for paging appear in here`
		* `.pz2-recordCount`: The number of results with a hint of status information appear in here
		* `#pz2-targetView`: Extended status infomration that is revealed/hidden by clicking `.pz2-recordCount`
	* `#pz2-termLists`: Facets will appear in here
	* `#pz2-results`: The result list will appear in here
	* `.pz2-pager.pz2-bottom`: The pager is repeated at the bottom of the page
		* `.pz2-pageNumbers`



## Acknowledgements

* Index Data’s [`pz2.js`](http://git.indexdata.com/?p=pazpar2.git;a=blob_plain;f=js/pz2.js) script from the pazpar2 repository is included in pz2-client with tiny modifications.
* The [https://github.com/subugoe/sub-iconfont](media type icon font) and button graphics that included with the scripts were created by [Henrik Cederblad](http://cederbladdesign.com/).
