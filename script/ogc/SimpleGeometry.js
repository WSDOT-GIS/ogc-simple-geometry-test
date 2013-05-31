/*global require*/
/*jslint white:true, regexp:true, plusplus:true */
require(function () {
	"use strict";
	var coordsRe, pathRe;

	pathRe = /\([^()]+\)/g;
	coordsRe = /([\-\d+\.]+)\s+([\-\d+\.]+)/g;

	function toArrays( /**{string}*/ wkt) {
		var paths, points, output = [], i, l;



		function pathWktToArray( /** {string[]} */ pathWkt) {
			var match, output = [];
			match = coordsRe.exec(pathWkt);
			while (match) {
				output.push([
				Number(match[1]),
				Number(match[2])]);
				match = coordsRe.exec(pathWkt);
			}
			return output;
		}

		if (!wkt) {
			throw new Error("wkt not provided");
		}

		paths = wkt.match(pathRe);

		if (paths) {
			for (i = 0, l = paths.length; i < l; i++) {
				output.push(pathWktToArray(paths[i]));
			}
		} else {
			points = wkt.match(coordsRe);
		}
		return output;
	}

	function OgcSimpleGeometry(wkt, srid) {
		var pointRe, multiPointRe, lineStringRe, multiLineStringRe, polygonRe, singleDepthRe, geometry, typeRe = /^\w+\b/, type;

		// define regexps.
		pointRe = /^POINT\b/i;
		multiPointRe = /^MULTIPOINT\b/i;
		lineStringRe = /^LINESTRING\b/i;
		multiLineStringRe = /^MULTILINESTRING\b/i;
		polygonRe = /^POLYGON\b/i;

		if (wkt.match(pointRe)) {
			geometry = coordsRe.exec(wkt);
			geometry = [Number(geometry[1]), Number(geometry[2])];
		} else {
			geometry = toArrays(wkt);
			singleDepthRe = /^(?:(?:MULTI)POINT)|(?:LINESTRING)\b/;
			if (wkt.match(singleDepthRe) && geometry.length === 1) {
				geometry = geometry[0];
			}
		}
		// Get the type.  Force to uppercase.
		type = wkt.match(typeRe)[0].toUpperCase();

		this.wkt = wkt;
		this.type = type;
		this.geometry = geometry;
		this.srid = srid;
	}

	// Add type constants.

	/** @constant {string}
	    @default
	*/
	OgcSimpleGeometry.TYPE_POINT = "POINT";
	/** @constant {string}
	    @default
	*/
	OgcSimpleGeometry.TYPE_MULTIPOINT = "MULTIPOINT";
	/** @constant {string}
	    @default
	*/
	OgcSimpleGeometry.TYPE_LINESTRING = "LINESTRING";
	/** @constant {string}
	    @default
	*/
	OgcSimpleGeometry.TYPE_MULTILINESTRING = "MULTILINESTRING";
	/** @constant {string}
	    @default
	*/
	OgcSimpleGeometry.TYPE_POLYGON = "POLYGON";
	/** @constant {string}
	    @default
	*/
	OgcSimpleGeometry.TYPE_MULTIPOLYGON = "MULTIPOLYGON";

	return OgcSimpleGeometry;
});