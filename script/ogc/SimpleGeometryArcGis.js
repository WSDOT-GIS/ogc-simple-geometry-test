/**
 * Defines the ogc.SimpleGeometry class.
 * Copyright (C) 2012 Washington State Department of Transportation.  Licensed under The MIT License (http://opensource.org/licenses/MIT).  
 *@author Jeff Jacobson 
 */
/*global define,dojo,esri*/
define(["ogc/SimpleGeometry", "esri/geometry"
	/** @exports ogc/SimpleGeometryArcGis */
], function (SimpleGeometry) {
	"use strict";

	var exports;

	/**
	 * Converts an ogc.SimpleGeometry into an esri.geometry.Geometry.
	 * @param {SimpleGeometry} ogcg An SimpleGeometry object.
	 * @returns {esri.geometry.Geometry}
	 */
	function ogcToEsriGeometry(ogcg) {
		var json;
		if (ogcg) {
			if (ogcg.type === SimpleGeometry.TYPE_POINT) {
				json = {
					x: ogcg.geometry[0],
					y: ogcg.geometry[1]
				};
			} else if (ogcg.type === SimpleGeometry.TYPE_MULTIPOINT) {
				json = {
					points: ogcg.geometry
				};
			} else if (ogcg.type === SimpleGeometry.TYPE_LINESTRING) {
				json = {
					paths: [ogcg.geometry]
				};
			} else if (ogcg.type === SimpleGeometry.TYPE_MULTILINESTRING) {
				json = {
					paths: ogcg.geometry
				};
			} else if (ogcg.type === SimpleGeometry.TYPE_POLYGON) {
				json = {
					rings: ogcg.geometry
				};
			}
		}

		if (json && ogcg.srid) {
			json.spatialReference = {
				wkid: ogcg.srid
			};
		}

		json = esri.geometry.fromJson(json);

		return json;
	}


	/**
	 * Converts an array of features into a SQL table definition statement. 
	 * @param {esri.Graphic[]} features
	 * @param {String} [tableName] The name of the table in the output "CREATE TABLE" statement. Defaults to "Shapes".
	 * @return {string} Returns a SQL statement that creates a table containing the geometries. 
	 */
	function featuresToSql(features, tableName) {
		var output, feature, geometry, i, l;

		if (!tableName) {
			tableName = "Shapes";
		}

		// TODO: Get attributes from first feature and add in column definition.

		output = ["CREATE TABLE [", tableName, "] ( [Shape] geometry );\nGO\n" ];

		if (features && features.length) {
			output.push(["INSERT INTO [", tableName, "] ([Shape]) VALUES "].join(""));

			for (i = 0, l = features.length; i < l; i += 1) {
				feature = features[i];
				geometry = new SimpleGeometry(feature.geometry);
				geometry = geometry.toSqlConstructor();

				if (i > 0) {
					output.push(",");
				}
				output.push("(" + geometry + ")");
			}

			output.push(";");
		}

		return output.join("");
	}

	exports = {
		ogcToEsriGeometry: ogcToEsriGeometry,
		featuresToSql: featuresToSql
	};

	SimpleGeometry.prototype.toEsriGeometry = function () {
		return ogcToEsriGeometry(this);
	};

	return exports;
});