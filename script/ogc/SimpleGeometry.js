/*global define, require*/
/*jslint white:true, regexp:true, plusplus:true */

define(function () {
	/**
	 * @exports ogc/SimpleGeometry
	*/
	"use strict";
	var coordsRe, pathRe, TYPE_POINT, TYPE_MULTIPOINT, TYPE_LINESTRING, TYPE_MULTILINESTRING, TYPE_POLYGON;

	/** @constant {string}
	@default
*/
	TYPE_POINT = "POINT";
	/** @constant {string}
	    @default
	*/
	TYPE_MULTIPOINT = "MULTIPOINT";
	/** @constant {string}
	    @default
	*/
	TYPE_LINESTRING = "LINESTRING";
	/** @constant {string}
	    @default
	*/
	TYPE_MULTILINESTRING = "MULTILINESTRING";
	/** @constant {string}
	    @default
	*/
	TYPE_POLYGON = "POLYGON";

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

	/**
	 * Converts an array representing rings or paths (of a polygon or polyine) into OGC Simple Geometry string equivalent. 
	 * @param {Number[][][]} An array containing arrays containing arrays of numbers. 
	 * @returns {String} The string equivalent of the input array.  Note that the geometry type (e.g., "POLYGON") will not be included in this string.
	 */
	function ringsOrPathsToOgc(paths) {
		var output = [], path, i, l, point, pi, pl, coord, ci, cl;

		// Loop through the paths.
		for (i = 0, l = paths.length; i < l; i += 1) {
			path = paths[i];
			if (i > 0) {
				output.push(",");
			} else {
				output.push("(");
			}

			// Loop through the points.
			for (pi = 0, pl = path.length; pi < pl; pi += 1) {
				point = path[pi];
				if (pi > 0) {
					output.push(",");
				} else {
					output.push("(");
				}

				// Loop through the coordinates of the point.
				for (ci = 0, cl = point.length; ci < cl; ci += 1) {
					coord = point[ci];
					if (ci > 0) {
						output.push(" ");
					}
					output.push(String(coord));
				}

				if (pi === path.length - 1) {
					output.push(")");
				}
			}

			output.push(")");
		}

		return output.join("");
	}

	function pointsToOgc(/* Number[][] */ points) {
		var output = ["("];
		for (var i = 0, l = points.length; i < l; i += 1) {
			output.push(points[i].join(" "));
		}
		output.push(")");
		return output.join("");
	}

	/**
	@param {String} wkt
	@param {Number} srid
	*/
	function SimpleGeometry(wkt, srid) {
		var pointRe, multiPointRe, lineStringRe, multiLineStringRe, polygonRe, singleDepthRe, geometry, typeRe = /^\w+\b/, type;

		if (typeof wkt === "string") {

			// define regexps.
			pointRe = /^POINT\b/i;
			multiPointRe = /^MULTIPOINT\b/i;
			lineStringRe = /^LINESTRING\b/i;
			multiLineStringRe = /^MULTILINESTRING\b/i;
			polygonRe = /^POLYGON\b/i;

			// Get the type.  Force to uppercase.
			type = wkt.match(typeRe)[0].toUpperCase();

			if (wkt.match(pointRe)) {
				geometry = coordsRe.exec(wkt);
				geometry = [Number(geometry[1]), Number(geometry[2])];
			} else {
				geometry = toArrays(wkt);
				singleDepthRe = /^(?:(?:MULTI)?POINT)|(?:\bLINESTRING)\b/;
				if (wkt.match(singleDepthRe) && geometry.length === 1) {
					geometry = geometry[0];
				}
			}
		} else {
			if (wkt.spatialReference) {
				srid = wkt.spatialReference.wkid || null;
			}
			if (wkt.x) {
				type = TYPE_POINT;
				geometry = [wkt.x, wkt.y];
			} else if (wkt.points) {
				type = TYPE_MULTIPOINT;
				geometry = wkt.points;
			} else if (wkt.paths) {
				type = TYPE_MULTILINESTRING;
				geometry = wkt.paths;
			} else if (wkt.rings) {
				type = TYPE_POLYGON;
				geometry = wkt.rings;
			} else if (typeof wkt.xmin === "number" && typeof wkt.ymin === "number" && typeof wkt.xmax === "number" && typeof wkt.ymax === "number") {
				// OGC Simple Feature access does not have an "ENVELOPE" or "EXTENT" type, so we'll use polygon.
				type = TYPE_POLYGON;
				geometry = [
					[
						[wkt.xmin, wkt.ymin],
						[wkt.xmin, wkt.ymax],
						[wkt.xmax, wkt.ymax],
						[wkt.xmax, wkt.ymin],
						[wkt.xmin, wkt.ymin]
					]
				];
			}
		}

		/** @member {String} The type of geometry. */
		this.type = type;
		/** @member {Array} */
		this.geometry = geometry;
		/** @member {Number} */
		this.srid = srid || null;
	}

	/**
	Returns the WKT representation of the SimpleGeometry.
	@returns {String}
	*/
	SimpleGeometry.prototype.toString = function () {
		var wkt;
		if (this.geometry) {
			if (this.type === TYPE_POINT) {
				wkt = ["(", this.geometry[0], " ", this.geometry[1], ")"].join("");
			} else if (this.type === TYPE_MULTIPOINT) {
				wkt = pointsToOgc(this.geometry);
			} else {
				wkt = ringsOrPathsToOgc(this.geometry);
			}
		} else {
			throw new Error("geometry property is not defined.");
		}
		
		return [this.type, wkt].join("");
	};

	/**
	Returns a SQL Server constructor that will create a geometry object.
	@returns {String}
	*/
	SimpleGeometry.prototype.toSqlConstructor = function () {
		var output = null;
		if (this.srid) {
			output = ["geometry::STGeomFromText('", this.toString(), "', ", this.srid, ")"].join("");
		} else {
			output = ["geometry::STGeomFromText('", this.toString(), "')"].join("");
		}
		return output;
	};

	// Add type constants.

	/** @constant {string}
	    @default
	*/
	SimpleGeometry.TYPE_POINT = TYPE_POINT;
	/** @constant {string}
	    @default
	*/
	SimpleGeometry.TYPE_MULTIPOINT = TYPE_MULTIPOINT;
	/** @constant {string}
	    @default
	*/
	SimpleGeometry.TYPE_LINESTRING = TYPE_LINESTRING;
	/** @constant {string}
	    @default
	*/
	SimpleGeometry.TYPE_MULTILINESTRING = TYPE_MULTILINESTRING;
	/** @constant {string}
	    @default
	*/
	SimpleGeometry.TYPE_POLYGON = TYPE_POLYGON;

	return SimpleGeometry;
});