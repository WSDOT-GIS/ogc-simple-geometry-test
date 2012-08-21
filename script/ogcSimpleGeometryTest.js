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
			if (textArea.value.length > 0) {
				textArea.value += "\n";
			}
			textArea.value += simpleGeometry.getSqlConstructor();
		}
		
		function init() {
			var basemap, infoTemplate;
			
			// Set up the map.
			map = new esri.Map("map");
			basemap = new esri.layers.ArcGISTiledMapServiceLayer("http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer");
			map.addLayer(basemap);
			
			infoTemplate = new esri.InfoTemplate("Attributes", "${*}");
			
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
					layer.setInfoTemplate(infoTemplate);
					map.addLayer(layer);
					dojo.connect(layer, "onGraphicAdd", addGraphicToTextArea);
				}
			}());
			
			on(dom.byId("saveButton"), "click", function() {
				var text;
				if (localStorage === undefined) {
					window.alert("Your browser does not support this feature.");
				} else {
					text = dom.byId("textArea").value;
					if (text.length > 0) {
						localStorage.setItem("geometry", text);
					} else {
						localStorage.removeItem("geometry");
					}
					
				}
			});
			
			// Setup event handler to style the textarea differently if there is an invalid JSON string in the box.
			on(dom.byId("attributesTextArea"), "keyup", function() {
				var textArea = this, attributes = null;
				try {
					if (textArea.value.length > 0) {
						attributes = JSON.parse(textArea.value);
					}
					dojo.removeClass(textArea, "error");
				} catch (SyntaxError) {
					dojo.addClass(textArea, "error");
				}
			});
			
			dojo.connect(map, "onLoad", function(map) {
				// Set up the draw toolbar.
				drawToolbar = new esri.toolbars.Draw(map);
				
				// Setup the clear button to clear all graphics from the map and text from the text area.
				on(dom.byId("clearButton"), "click", function() {
					pointLayer.clear();
					polylineLayer.clear();
					polygonLayer.clear();
					dom.byId("textArea").value = "";
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
					var graphic, attributes, jsonText;
					if (geometry) {
						graphic = new esri.Graphic(geometry);
						try {
							jsonText = dom.byId("attributesTextArea").value;
							if (jsonText) {
								attributes = JSON.parse(jsonText);
								graphic.setAttributes(attributes);
							}
						} catch (SyntaxError) {
							/*jslint devel: true */
							if (console) {
								console.warn("Invalid attributes JSON was specified.");
							}
							/*jslint devel: false */
						}
						if (geometry.type === "point" || geometry.type === "multipoint") {
							pointLayer.add(graphic);
						} else if (geometry.type === "polyline") {
							polylineLayer.add(graphic);
						} else if (geometry.type === "polygon" || geometry.type === "extent") {
							polygonLayer.add(graphic);
						}
					}
				});
			});
			
	
		}
		
		init();
	}
);
