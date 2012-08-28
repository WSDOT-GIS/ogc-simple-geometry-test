/*global require, dojo, ogc, esri*/
/*jslint white: true, browser: true */
require(["dojo/dom", "dojo/on", "dijit/Dialog", "esri/map", "esri/layers/agstiled", "esri/toolbars/draw", "ogc/SimpleGeometry"], 
	function(dom, on, Dialog) {
		"use strict";

		var map, drawToolbar, pointLayer, polylineLayer, polygonLayer, sqlDialog;
		
		function addGraphicToTextArea(graphic) {
			var simpleGeometry, textArea;
			textArea = dom.byId("textArea");
			simpleGeometry = ogc.SimpleGeometry(graphic.geometry);
		}
		
		/** Saves a graphic to the localStorage "graphics" item. 
		* @param {esri.Graphic} graphic
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
							graphic = new esri.Graphic(graphic);
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
				extent = new esri.geometry.Extent(JSON.parse(localStorage.extent));
			}
			return extent;
		}
		
		function showSql() {
			var output = [], layers = [pointLayer, polylineLayer, polygonLayer], i, l, layer, sql;
			
			for (i = 0, l = layers.length; i < l; i+=1) {
				layer = layers[i];
				if (layer.graphics.length > 0) {
					
					output.push(ogc.featuresToSql(layer.graphics, layer.id));
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
			var basemap;
			
			// Set up the map.
			map = new esri.Map("map", {
				extent: getSavedExtent()
			});
			basemap = new esri.layers.ArcGISTiledMapServiceLayer("http://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer");
			map.addLayer(basemap);
			
			// infoTemplate = new esri.InfoTemplate("Attributes", "${*}");
			
			// Setup graphics layers for the various geometry types.
			pointLayer = new esri.layers.GraphicsLayer({
				id: "points"
			});
			polylineLayer = new esri.layers.GraphicsLayer({
				id: "polylines"
			});
			polygonLayer = new esri.layers.GraphicsLayer({
				id: "polygons"
			});
			
			// Setup the renderers
			pointLayer.setRenderer(new esri.renderer.SimpleRenderer(new esri.symbol.SimpleMarkerSymbol().setStyle("circle")));
			polylineLayer.setRenderer(new esri.renderer.SimpleRenderer(new esri.symbol.SimpleLineSymbol().setStyle("solid")));
			polygonLayer.setRenderer(new esri.renderer.SimpleRenderer(new esri.symbol.SimpleFillSymbol().setStyle("solid")));
			
			// Add the graphics layers to the map and connect the layer event handlers.
			(function(){
				var layers = [pointLayer, polylineLayer, polygonLayer], i, l, layer;
				
				for (i = 0, l = layers.length; i < l; i += 1) {
					layer = layers[i];
					// layer.setInfoTemplate(infoTemplate);
					map.addLayer(layer);
					dojo.connect(layer, "onGraphicAdd", addGraphicToTextArea);
				}
			}());
			
			dojo.connect(map, "onLoad", function(map) {
				//resize the map when the browser resizes
				on(window, 'resize', function() {
					map.resize();
				});
				
				dojo.connect(map, "onExtentChange", function(extent) {
					// Save the extent when the map's extent changes.
					if (localStorage !== undefined) {
						localStorage.setItem("extent", JSON.stringify(extent.toJson()));
					}
				});
				
				// Set up the draw toolbar.
				drawToolbar = new esri.toolbars.Draw(map);
				
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
				dojo.connect(drawToolbar, "onDrawEnd", function(geometry) {
					var graphic;
					if (geometry) {
						graphic = new esri.Graphic(geometry);
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
			});
			
	
		}
		
		init();
	}
);
