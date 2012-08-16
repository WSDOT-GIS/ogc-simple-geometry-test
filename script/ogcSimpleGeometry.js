/*global dojo,esri*/
/// <reference path="http://serverapi.arcgisonline.com/jsapi/arcgis/?v=3.1compact"/>
(function () {
	"use strict";

	function ringsOrPathsToOgc(paths) {
		var output = "";
		dojo.forEach(paths, function (path, index) {
			if (index > 0) {
				output += ",";
			} else {
				output += "(";
			}
			dojo.forEach(path, function (point, pIndex) {
				if (pIndex > 0) {
					output += ",";
				} else {
					output += "(";
				}

				dojo.forEach(point, function (coord, cIndex) {
					if (cIndex > 0) {
						output += " ";
					}
					output += String(coord);
				});

				if (pIndex === path.length - 1) {
					output += ")";
				}
			});

			if (index === paths.length - 1) {
				output += ")";
			}
		});
		return output;
	}

	function toOgcMultipoint(esriMultipoint) {
		/// <summary>Converts and esri.geometry.Multipoint into an OgcSimpleGeometry</summary>
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

	function OgcSimpleGeometry(g, wkid) {
		/// <summary>A class representing an Open-Geospatial Consortium (OGC) Simple Geometry.</summary>
		/// <param name="g" type="String|esri.geometry.Geometry">
		/// Either a simple geometry definition string or a JSON object containing a WKT string and spatial reference WKID.
		/// </param>
		/// <param name="wkid" type="Number">
		/// If the first parameter is a string, then this parameter will be the spatial reference WKID.  Otherwise, this parameter will be ignored.
		/// </param>


		if (typeof (g) === "string") {
			this.wkt = g;
			this.srid = Number(wkid);
		} else if (g.spatialReference !== undefined || (g.isInstanceOf !== undefined && g.isInstanceOf(esri.geometry.Geometry))) {
			if (g.type === "point" || (g.x !== undefined && g.y !== undefined)) {
				this.wkt = "POINT(" + g.x + " " + g.y + ")";
			} else if (g.type === "multipoint" || g.points) {
				this.wkt = toOgcMultipoint(g);
			} else if (g.type === "polyline" || g.paths) {
				this.wkt = "MULTILINESTRING" + ringsOrPathsToOgc(g.paths);
			} else if (g.type === "polygon" || g.rings) {
				this.wkt = "POLYGON" + ringsOrPathsToOgc(g.rings);
			} else if (g.type === "extent" || (g.xmin !== undefined && g.ymin !== undefined && g.xmax !== undefined && g.ymax !== undefined)) {
				this.wkt = "POLYGON" + ringsOrPathsToOgc([[g.xmin, g.ymin], [g.xmin, g.xmax], [g.xmax, g.ymax], [g.xmax, g.ymin], [g.xmin, g.ymin]]);
			} else {
				throw new Error("Unknown geometry type");
			}
			this.srid = g.spatialReference !== null && g.spatialReference !== undefined ? g.spatialReference.wkid : null;
		} else {
			this.wkt = g.wkt || null;
			this.srid = g.srid || null;
		}
	}

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



	function init() {
		dojo.declare("ogc.SimpleGeometry", null, {
			constructor: OgcSimpleGeometry,
			getSqlConstructor: function () {
				return "geometry::STGeomFromText('" + this.wkt + "', " + this.srid + ")";
			},
			toEsriGeometry: function () {
				return toEsriGeometry(this);
			}
		});
	}

	dojo.addOnLoad(init);


}());