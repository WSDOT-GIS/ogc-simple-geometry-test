/*global require, dojo, ogc, esri*/
/*jslint white: true, browser: true */
require(["dojo/dom", "dojo/on", "esri/map", "esri/layers/agstiled", "esri/toolbars/draw", "ogc/SimpleGeometry"], 
	function(dom, on) {
		"use strict";

		var map, drawToolbar, pointLayer, polylineLayer, polygonLayer;
		
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
		
		function init() {
			var basemap;
			
			// Set up the map.
			map = new esri.Map("map");
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
				
				// Set up the draw toolbar.
				drawToolbar = new esri.toolbars.Draw(map);
				
				// Setup the clear button to clear all graphics from the map and text from the text area.
				on(dom.byId("clearButton"), "click", function() {
					pointLayer.clear();
					polylineLayer.clear();
					polygonLayer.clear();
					
					clearGraphicsFromLocalStorage();
				});
				
				// Set the select box to activate or deactivate the draw toolbar depending on selection.
				on(dom.byId("geometryTypeSelect"), "change", function() {
					// "this" is the select element.
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
