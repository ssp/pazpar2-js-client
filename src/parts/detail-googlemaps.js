/**
 * Add a graphical map displaying the region covered by a record if
 * location metadata exist and we are configured to do so.
 *
 * @param {object} data
 * @returns {array} - contains 2 elements:
 *			0:	DT element with title Map Location
 *			1:	DD element with the graphical map and a markers for the
 *					regions covered by the record
 */
pz2_client.prototype.mapDetailLine = function (data) {
	/*	mapsLoaded
		Callback function for Google Loader.
		Creates and configures the Map object once it is available.
	*/
	var mapsLoaded = function () {
		var options = {
			'mapTypeId': google.maps.MapTypeId.TERRAIN,
			'mapTypeControl': false,
			'scrollwheel': false,
			'streetViewControl': false
		};
		var map = new google.maps.Map(mapContainer, options);

		var containingBounds = new google.maps.LatLngBounds();
		var markersOnMap = [];
		var highlightColour = jQuery('.pz2-termList-xtargets a').css('color');

		for (var markerID in markers) {
			var marker = markers[markerID];
			var rect = marker.rect;
			var newBounds = new google.maps.LatLngBounds(
				new google.maps.LatLng(rect[1][0], rect[1][1]),
				new google.maps.LatLng(rect[3][0], rect[3][1])
			);

			// Determine whether this rectangle has already been added to the map
			// and avoid drawing duplicates.
			var drawThisMarker = true;
			for (var markerOnMapID in markersOnMap) {
				var markerOnMap = markersOnMap[markerOnMapID];
				if (newBounds.equals(markerOnMap.getBounds())) {
					drawThisMarker = false;
					markerOnMap.pz2Locations.push(marker.location);
					break;
				}
			}

			if (drawThisMarker) {
				containingBounds.union(newBounds);
				// Use zIndexes to avoid smaller rects being covered by larger ones.
				// Ideally events would be passed on to all rects beneath the cursor,
				// but that does not seem to happen.
				var areaSpan = newBounds.toSpan();
				var zIndex = 1 / (areaSpan.lat() + areaSpan.lng());

				var mapMarker;
				if (Math.abs(rect[1][1] - rect[3][1]) > 1/60) {
					// Rect is wider than 1″: display as a rectangle.
					mapMarker = new google.maps.Rectangle({
						'map': map,
						'bounds': newBounds,
						'strokeColor': highlightColour,
						'fillColor': highlightColour,
						'zIndex': zIndex
					});
				}
				else {
					// Rect is narrower than 1″: display as a point.
					var markerLatitude = rect[3][0] + (rect[3][0] - rect[1][0]) / 2;
					var markerLongitude = rect[1][1] + (rect[1][1] - rect[3][1]) / 2;
					mapMarker = new google.maps.Marker({
						'map': map,
						'position': new google.maps.LatLng(markerLatitude, markerLongitude)
					});
				}
				mapMarker.pz2Locations = [marker.location];
				google.maps.event.addListener(mapMarker, 'mouseover', markerMouseOver);
				google.maps.event.addListener(mapMarker, 'mouseout', markerMouseOut);
				markersOnMap.push(mapMarker);
			}
		}

		map.fitBounds(containingBounds);
		that.trackPiwik('map');
	};



	/*	markerMouseOver, markerMouseOut
		Handlers for marker mouse events.
	*/
	var markerMouseOver = function (event) {
		for (var itemID in this.pz2Locations) {
			var recordLocation = this.pz2Locations[itemID];
			jQuery(recordLocation.element).addClass('pz2-highlight');
		}
	};

	var markerMouseOut = function () {
		for (var itemID in this.pz2Locations) {
			var recordLocation = this.pz2Locations[itemID];
			jQuery(recordLocation.element).removeClass('pz2-highlight');
		}
	};



	/*	borderNumbersForString
		Converts a ISBD-style geographical range string (e.g.
		»E 009 30--E 009 40/N 051 42--N 051 36« or
		»E 93°0'00"-E 94°0'00"/N 514°2'00"-N 51°36'00"«)
		into an array of floating point numbers.

		input:	ISBD-style coordinate range string
		output:	Array of floating point numbers
	*/
	var borderNumbersForString = function (borderString) {
		/*	degreeStringToDecimal
			Takes an ISBD-style geographical degree string and converts it into
			a floating point number:
				* North/East -> +, South/West -> -
				* Degrees[/Minutes[/Seconds]] -> Decimal numbers
				* Takes into account different Symbols for Degrees/Minutes/Seconds
					(proper Unicode, ASCII equivalents, spaces)

			input:	ISBD-style coordinate string
			output:	floating point number
		*/
		var degreeStringToDecimal = function (degreeString) {
			var degrees;

			var degreeComponents = degreeString.replace(/[°'"′″]/g, ' ').replace(/^([EWNS])(\d)/, '$1 $2').replace(/  /g, ' ').split(' ');
			if (degreeComponents.length >= 2) {
				degrees = parseFloat(degreeComponents[1], 10);
				if (degreeComponents.length >= 3 && !isNaN(degrees)) {
					var minutes = parseFloat(degreeComponents[2], 10);
					if (!isNaN(minutes)) {
						degrees += minutes / 60;
					}
					if (degreeComponents.length >= 4) {
						var seconds = parseFloat(degreeComponents[3]);
						if (!isNaN(seconds)) {
							degrees +=  seconds / 3600;
						}
					}
				}
				var direction = degreeComponents[0];

				// Slightly tweak numbers around the poles and datelines to avoid
				// problems Google maps has in those regions.
				if ((direction === 'N' || direction === 'S') && degrees >= 90) {
					degrees = 85;
				}
				else if ((direction === 'W' || direction === 'E') && degrees >= 180) {
					degrees = 179.9;
				}

				// Encode W/S directions as negative numbers.
				if (direction === 'W' || direction === 'S') {
					degrees *= -1;
				}
			}

			return degrees;
		};

		var result;
		var components = borderString.replace(/[–-]/, '-').replace('--', '-').split('-');
		if (components.length === 2) {
			var component0 = degreeStringToDecimal(components[0]);
			var component1 = degreeStringToDecimal(components[1]);

			if (!isNaN(component0) && !isNaN(component1)) {
				result = [component0, component1];
			}
		}

		return result;
	};



	/*	rectangleVerticesForCoordinatesString
		Converts ISBD-style coordinate string into an array with coordinate
		pairs (Array of [latitude, longitude] numbers) of the vertices of
		the rectangle it describes.

		input:	ISBD-style coordinates string
		output:	Array containing the [top-left, bottom-left, bottom-right, top-right] coordinate pairs
	*/
	var rectangleVerticesForCoordinatesString = function (coordinatesString) {
		var coordinates;
		var longLatArray = coordinatesString.split('/');
		if (longLatArray.length === 2) {
			var longitudeNumbers = borderNumbersForString(longLatArray[0]);
			var latitudeNumbers = borderNumbersForString(longLatArray[1]);
			if (latitudeNumbers && longitudeNumbers) {
				coordinates = [
					[latitudeNumbers[0], longitudeNumbers[0]],
					[latitudeNumbers[1], longitudeNumbers[0]],
					[latitudeNumbers[1], longitudeNumbers[1]],
					[latitudeNumbers[0], longitudeNumbers[1]]];
			}
		}

		return coordinates;
	};



	var that = this;
	var line;
	
	if (that.config.useMaps === true) {
		var markers = [];
		for (var locationID in data.location) {
			var location = data.location[locationID];
			if (location['md-mapscale']) {
				for (var mapscaleID in location['md-mapscale']) {
					var mapscale = location['md-mapscale'][mapscaleID];
					if (mapscale['@coordinates']) {
						var rect = rectangleVerticesForCoordinatesString(mapscale['@coordinates']);
						if (rect) {
							markers.push({'rect': rect, 'location': location});
						}
					}
				}
			}
		}

		if (markers.length > 0) {
			var mapContainer = document.createElement('div');
			mapContainer.setAttribute('class', 'pz2-mapContainer');
			google.load('maps', '3', {'callback': mapsLoaded, 'other_params': 'sensor=false'});

			var title = document.createTextNode(that.localise('map', 'detail-label') + ':');
			line = that.detailLineBasic(title, mapContainer);
		}
	}

	return line;
};
