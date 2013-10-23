/*global require */
/*jslint white: true, browser: true */
require([
	"dojo/dom",
	"dojo/on",
	"ogc/SimpleGeometry",
	"ogc/SimpleGeometryArcGis",
	"dijit/Dialog",
	"esri/map",
	"esri/toolbars/draw",
	"esri/graphic",
	"esri/geometry/Extent",
	"esri/layers/GraphicsLayer",
	"esri/renderers/SimpleRenderer",
	"esri/symbols/SimpleMarkerSymbol",
	"esri/symbols/SimpleLineSymbol",
	"esri/symbols/SimpleFillSymbol"
], function(dom, on, SimpleGeometry, ogcAgs, Dialog, Map, Draw, Graphic, Extent, GraphicsLayer, SimpleRenderer, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol) {
		"use strict";

		var map, drawToolbar, pointLayer, polylineLayer, polygonLayer, sqlDialog;
		
		function addGraphicToTextArea(e) {
			var graphic = e.graphic, simpleGeometry, textArea;
			textArea = dom.byId("textArea");
			simpleGeometry = new SimpleGeometry(graphic.geometry);
		}
		
		/** Saves a graphic to the localStorage "graphics" item. 
		* @param {Graphic} graphic
		*/
		function saveGraphicToLocalStorage(graphic) {
			var graphics;
			if (localStorage !== undefined) {
				if (localStorage.graphics) {
					graphics = JSON.parse(localStorage.graphics);
				} else {
					graphics = [];
				}
				
				graphics.push(graphic.toJson());
				
				localStorage.setItem("graphics", JSON.stringify(graphics));
			}
		}
		
		/**
		 * Removes the localStorage.graphics item. 
		 */
		function clearGraphicsFromLocalStorage() {
			if (localStorage !== undefined && localStorage.graphics) {
				localStorage.removeItem("graphics");
			}
		}
		/**
		 * Loads the graphics from local storage and adds them to the appropriate graphics layers. 
		 */
		function loadGraphicsFromLocalStorage() {
			var graphics, graphic, i, l, layer, pointRe = /point$/i, polygonRe = /^(?:(?:polygon)|(?:extent))$/i, polylineRe = /line$/i;
			if (localStorage !== undefined) {
				
				// Get previously saved graphics.  If available this will be a JSON representation of array of objects.
				graphics = localStorage.getItem("graphics");
				if (graphics !== null && graphics !== undefined) {
					graphics = JSON.parse(graphics);
					
					// Loop through all of the objects in the "graphics" array.
					for (i = 0, l = graphics.length; i < l; i += 1) {
						try {
							graphic = graphics[i];
							graphic = new Graphic(graphic);
							if (pointRe.test(graphic.geometry.type)) {
								pointLayer.add(graphic);
							} else if (polygonRe.test(graphic.geometry.type)) {
								polygonLayer.add(graphic);
							} else if (polylineRe.test(graphic.geometry.type)) {
								polylineLayer.add(graphic);
							} else {
								layer = null;
								/*jslint devel:true*/
								if (console !== undefined) {
									console.warn("Unknown geometry type", graphic);
								}
								/*jslint devel:false*/
							}
						} catch (e) {
							console.error(e);
						}
					}
				}
			}
		}
		
		/**
		 * Gets the saved extent from localStorage. 
		 */
		function getSavedExtent() {
			var extent = null;
			if (localStorage !== undefined && localStorage.extent) {
				extent = new Extent(JSON.parse(localStorage.extent));
			}
			return extent;
		}
		
		function showSql() {
			var output = [], layers = [pointLayer, polylineLayer, polygonLayer], i, l, layer;
			
			for (i = 0, l = layers.length; i < l; i+=1) {
				layer = layers[i];
				if (layer.graphics.length > 0) {
					
					output.push(ogcAgs.featuresToSql(layer.graphics, layer.id));
				}
			}
			
			output = output.join("\n\n");
			
			output = "<textarea style='width: 640px; height:480px;'>" + output + "</textarea>";
			
			if (!sqlDialog) {
				sqlDialog = new Dialog({
					title: "SQL",
					content: output
				});
			} else {
				sqlDialog.set("content", output);
			}
			
			sqlDialog.show();
			
			
			
			//return output;
		}
		
		function init() {
			// Set up the map.
			map = new Map("map", {
				basemap: "gray",
				extent: getSavedExtent()
			});
			
			// infoTemplate = new InfoTemplate("Attributes", "${*}");
			
			// Setup graphics layers for the various geometry types.
			pointLayer = new GraphicsLayer({
				id: "points"
			});
			polylineLayer = new GraphicsLayer({
				id: "polylines"
			});
			polygonLayer = new GraphicsLayer({
				id: "polygons"
			});
			
			// Setup the renderers
			pointLayer.setRenderer(new SimpleRenderer(new SimpleMarkerSymbol().setStyle("circle")));
			polylineLayer.setRenderer(new SimpleRenderer(new SimpleLineSymbol().setStyle("solid")));
			polygonLayer.setRenderer(new SimpleRenderer(new SimpleFillSymbol().setStyle("solid")));
			
			// Add the graphics layers to the map and connect the layer event handlers.
			(function(){
				var layers = [pointLayer, polylineLayer, polygonLayer], i, l, layer;
				
				for (i = 0, l = layers.length; i < l; i += 1) {
					layer = layers[i];
					// layer.setInfoTemplate(infoTemplate);
					map.addLayer(layer);
					layer.on("graphic-add", addGraphicToTextArea);
				}
			}());
			
			map.on("load", function () {
				
				if (window.localStorage && window.JSON) {
					map.on("extent-change", function (e) {
						var extent = e.extent;
						// Save the extent when the map's extent changes.
						localStorage.setItem("extent", JSON.stringify(extent.toJson()));
					});
				}
				
				// Set up the draw toolbar.
				drawToolbar = new Draw(map);
				
				// Setup the clear button to clear all graphics from the map and text from the text area.
				on(dom.byId("clearButton"), "click", function() {
					pointLayer.clear();
					polylineLayer.clear();
					polygonLayer.clear();
					
					clearGraphicsFromLocalStorage();
				});
				
				// Setup the SQL button
				on(dom.byId("toSqlButton"), "click", showSql);
				
				// Set the select box to activate or deactivate the draw toolbar depending on selection.
				on(dom.byId("geometryTypeSelect"), "change", function() {
					// "this" is the select element.
					// Change the "select a geometry" text to "Off", now that the user knows what to do.
					this[0].text = "Off";
					var geometryType = this.value;
					if (geometryType !== null && geometryType !== "") {
						pointLayer.disableMouseEvents();
						polylineLayer.disableMouseEvents();
						polygonLayer.disableMouseEvents();
						drawToolbar.activate(geometryType);
					} else {
						pointLayer.enableMouseEvents();
						polylineLayer.enableMouseEvents();
						polygonLayer.enableMouseEvents();
						drawToolbar.deactivate();
					}
				});
				
				// Add a graphic to the map when the user has finished drawing a geometry.
				drawToolbar.on("draw-end", function(e) {
					var geometry = e.geometry, graphic;
					if (geometry) {
						graphic = new Graphic(geometry);
						if (geometry.type === "point" || geometry.type === "multipoint") {
							pointLayer.add(graphic);
						} else if (geometry.type === "polyline") {
							polylineLayer.add(graphic);
						} else if (geometry.type === "polygon" || geometry.type === "extent") {
							polygonLayer.add(graphic);
						}
						
						saveGraphicToLocalStorage(graphic);

					}
				});
				
				loadGraphicsFromLocalStorage();

				//Setup the OGC Simple Geometry entry text area and button.
				document.getElementById("addOgcButton").onclick = function () {
					var simpleGeometryText, simpleGeometry, esriGeometry, layer, graphic;
					simpleGeometryText = document.getElementById("ogcSimpleGeometryTextArea").value;

					try {
						simpleGeometry = new SimpleGeometry(simpleGeometryText, map.spatialReference.wkid);
						esriGeometry = simpleGeometry.toEsriGeometry();
					} catch (e) {
						console.error(e);
					}

					////console.debug({ ogc: simpleGeometry, esri: esriGeometry });

					if (esriGeometry) {
						if (esriGeometry.type === "point" || esriGeometry.type === "multipoint") {
							layer = pointLayer;
						}
						else if (esriGeometry.type === "polyline") {
							layer = polylineLayer;
						}
						else if (esriGeometry.type === "polygon" || esriGeometry.type === "extent") {
							layer = polygonLayer;
						}
						graphic = new Graphic(esriGeometry);
						layer.add(graphic);
						saveGraphicToLocalStorage(graphic);
					}
				};
			});
			
	
		}
		
		init();
	}
);
