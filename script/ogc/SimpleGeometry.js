/*global define,dojo,esri*/
/// <reference path="http://serverapi.arcgisonline.com/jsapi/arcgis/?v=3.1compact"/>"
define(["dojo/_base/declare", "esri/geometry"], function (declare) {
	"use strict";

	/**
	 * Converts an array representing rings or paths (of a polygon or polyine) into OGC Simple Geometry string equivalent. 
	 * @param {Array} An array containing arrays containing arrays of numbers. 
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
		}

		return output.join("");
	}

	/**
	 * Converts and {@link esri.geometry.Multipoint} into an {@link OgcSimpleGeometry}
	 * @param {esri.geometry.Multipoint}
	 * @returns {OgcSimpleGeometry}
	 */
	function toOgcMultipoint(esriMultipoint) {
		var output = "MULTIPOINT(";
		dojo.forEach(esriMultipoint.points, function (point, index) {
			if (index > 0) {
				output += ",";
			}
			output += String(point[0]) + " " + String(point[1]);
		});
		output += ")";
		return output;
	}

	/**
	 * A class representing an Open-Geospatial Consortium (OGC) Simple Geometry.
	 * @param {string|esri.geometry.Geometry} g Either a simple geometry definition string or a JSON object containing a WKT string and spatial reference WKID.
	 * @param {number} [wkid] If the g parameter does not include spatial reference information, you must include a spatial reference WKID here.
	 * @property {string} wkt Well-Known Text (WKT) that defines an OGC Simple Geometry.
	 * @property {number} srid The spatial reference identifier or Well-known identifier (WKID) representing a spatial reference.
	 */
	function OgcSimpleGeometry(g, wkid) {
		// Matches a SQL geometry definition
		/*jslint regexp: true*/
		var sqlDefRe = /geo(?:(?:metr)|(?:raph))y\:\:\w+\('([^']+)'(?:,\s*(\d+))?\)/gi, match;
		/*jslint regexp: false*/

		if (typeof (g) === "string") {
			// Try to parse the input string as a SQL geometry creation statement.
			match = sqlDefRe.exec(g);
			if (match) {
				this.wkt = match[1];
				// First try to use the SRID from the SQL statement.  
				// If there is none, use the wkid parameter.
				// If that is not provided, set the srid property to null.  
				this.srid = match.length > 2 ? Number(match[2]) : wkid !== undefined && wkid !== null ? Number(wkid) : null;
			} else {
				this.wkt = g;
				this.srid = Number(wkid);
			}
		} else if (g.spatialReference !== undefined || (g.isInstanceOf !== undefined && g.isInstanceOf(esri.geometry.Geometry))) {
			if (g.type === "point" || (g.x !== undefined && g.y !== undefined)) {
				this.wkt = "POINT(" + g.x + " " + g.y + ")";
			} else if (g.type === "multipoint" || g.points) {
				this.wkt = toOgcMultipoint(g);
			} else if (g.type === "polyline" || g.paths) {
				// TODO: Detect if output could be LINESTRING.
				this.wkt = "MULTILINESTRING" + ringsOrPathsToOgc(g.paths);
			} else if (g.type === "polygon" || g.rings) {
				this.wkt = "POLYGON" + ringsOrPathsToOgc(g.rings);
			} else if (g.type === "extent" || (g.xmin !== undefined && g.ymin !== undefined && g.xmax !== undefined && g.ymax !== undefined)) {
				this.wkt = "POLYGON" + ringsOrPathsToOgc([[[g.xmin, g.ymin], [g.xmin, g.xmax], [g.xmax, g.ymax], [g.xmax, g.ymin], [g.xmin, g.ymin]]]);
			} else {
				throw new Error("Unknown geometry type");
			}
			this.srid = g.spatialReference !== null && g.spatialReference !== undefined ? g.spatialReference.wkid : null;
		} else {
			this.wkt = g.wkt || null;
			this.srid = g.srid || null;
		}
	}

	/**
	 * Converts an ogc.SimpleGeometry into an esri.geometry.Geometry.
	 * @param {OgcSimpleGeometry} ogcSimpleGeometry An ogc.SimpleGeometry object.
	 * @returns {esri.geometry.Geometry}
	 */
	function toEsriGeometry(ogcSimpleGeometry) {
		/// <summary>Converts an ogc.SimpleGeometry into an esri.geometry.Geometry.</summary>
		/// <param name="ogcSimpleGeometry" type="ogc.SimpleGeometry">An ogc.SimpleGeometry object.</param>
		/// <returns type="esri.geometry.Geometry" />
		var linestringRE, pointRE, json;
		linestringRE = /((?:(?:[\-\d+.]+\s+[\-\d+.]+),?)+)/;
		pointRE = /([\-\d+.]+)\s+([\-\d+.]+)/; // Captures x and y coordinates;

		function parsePoint() {
			// Capture the X and Y coordinates
			var coords = pointRE.exec(ogcSimpleGeometry.wkt);
			return {
				x: Number(coords[1]),
				y: Number(coords[2]),
				spatialReference: {
					wkid: ogcSimpleGeometry.srid
				}
			};
		}

		function parseToArrays() {
			var lineStrings = linestringRE.exec(ogcSimpleGeometry.wkt).slice(1), points;
			return dojo.map(lineStrings, function (ls) {
				points = ls.split(",");
				/*
				console.log({
					lineStrings: lineStrings,
					ls: ls,
					"points": points
				});
				*/
				return dojo.map(points, function (point) {
					return dojo.map(point.split(/\s+/), function (coord) {
						return Number(coord);
					});
				});
			});
		}

		if (/\bPOINT\b/i.test(ogcSimpleGeometry.wkt)) {
			json = parsePoint();
		} else if (/MULTIPOINT/i.test(ogcSimpleGeometry.wkt)) {
			json = {
				points: parseToArrays()
			};
		} else if (/MULTILINESTRING/i.test(ogcSimpleGeometry.wkt)) {
			json = {
				paths: parseToArrays()
			};
		} else if (/POLYGON/i.test(ogcSimpleGeometry.wkt)) {
			json = {
				rings: parseToArrays()
			};
		}

		return json;
	}

	function getSqlConstructor(ogcSimpleGeometry) {
		var output = null;
		if (ogcSimpleGeometry.srid !== undefined && ogcSimpleGeometry.srid !== null) {
			output = "geometry::STGeomFromText('" + ogcSimpleGeometry.wkt + "', " + ogcSimpleGeometry.srid + ")";
		} else {
			output = "geometry::STGeomFromText('" + ogcSimpleGeometry.wkt + "')";
		}
		return output;
	}

	return declare("ogc.SimpleGeometry", null, {
		constructor: OgcSimpleGeometry,
		getSqlConstructor: function () {
			return getSqlConstructor(this);
		},
		toEsriGeometry: function () {
			return toEsriGeometry(this);
		}
	});

});