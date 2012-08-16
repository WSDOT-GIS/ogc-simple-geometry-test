(function(){
	"use strict";
	
	dojo.require("esri.map");
	dojo.require("esri.toolbars.draw");
	
	var map, drawToolbar, pointLayer, polylineLayer, polygonLayer;
	
	function addGraphicToTextArea(graphic) {
		var simpleGeometry, textArea;
		textArea = dojo.byId("textArea");
		simpleGeometry = ogc.SimpleGeometry(graphic.geometry);
		if (textArea.value.length > 0) {
			textArea.value += "\n";
		}
		textArea.value += simpleGeometry.getSqlConstructor();
	}
	
	function init() {
		var basemap;
		
		// Set up the map.
		map = new esri.Map("map");
		basemap = new esri.layers.ArcGISTiledMapServiceLayer("http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer");
		map.addLayer(basemap);
		
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
				map.addLayer(layer);
				dojo.connect(layer, "onGraphicAdd", addGraphicToTextArea);
			}
		}());
		
		dojo.connect(dojo.byId("saveButton"), "onclick", function() {
			var text;
			if (localStorage === undefined) {
				alert("Your browser does not support this feature.");
			} else {
				text = dojo.byId("textArea").value;
				localStorage.setItem("geometry", text);
			}
		});
		
		dojo.connect(map, "onLoad", function(map) {
			// Set up the draw toolbar.
			drawToolbar = new esri.toolbars.Draw(map);
			
			// Setup the clear button to clear all graphics from the map and text from the text area.
			dojo.connect(dojo.byId("clearButton"), "onclick", function() {
				pointLayer.clear();
				polylineLayer.clear();
				polygonLayer.clear();
				dojo.byId("textArea").value = "";
			});
			
			// Set the select box to activate or deactivate the draw toolbar depending on selection.
			dojo.connect(dojo.byId("geometryTypeSelect"), "onchange", function(evt) {
				// "this" is the select element.
				var geometryType = this.value;
				if (geometryType !== null && geometryType !== "") {
					drawToolbar.activate(geometryType);
				} else {
					drawToolbar.deactivate();
				}
			});
			
			// Add a graphic to the map when the user has finished drawing a geometry.
			dojo.connect(drawToolbar, "onDrawEnd", function(geometry) {
				var graphic;
				if (geometry) {
					graphic = new esri.Graphic(geometry)
					if (geometry.type === "point" || geometry.type === "multipoint") {
						pointLayer.add(graphic);
					} else if (geometry.type === "polyline") {
						polylineLayer.add(graphic);
					} else if (geometry.type === "polygon" || geometry.type === "extent") {
						polygonLayer.add(graphic);
					}
				}
			});
		})
		

	}
	
	dojo.addOnLoad(init);
}());
