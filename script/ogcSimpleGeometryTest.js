(function(){
	"use strict";
	
	dojo.require("esri.map");
	dojo.require("esri.toolbars.draw");
	
	var map, drawToolbar, pointLayer, polylineLayer, polygonLayer;
	
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
		
		
		map.addLayer(pointLayer);
		map.addLayer(polylineLayer);
		map.addLayer(polygonLayer);
		
		dojo.connect(map, "onLoad", function(map) {
			// Set up the draw toolbar.
			drawToolbar = new esri.toolbars.Draw(map);
			
			dojo.connect(dojo.byId("drawButton"), "onclick", function() {
				var geometryType = dojo.byId("geometryTypeSelect").value;
				drawToolbar.activate(geometryType);
			});
			
			dojo.connect(dojo.byId("clearButton"), "onclick", function() {
				pointLayer.clear();
				polylineLayer.clear();
				polygonLayer.clear();
			});
			
			dojo.connect(drawToolbar, "onDrawEnd", function(geometry) {
				var graphic = new esri.Graphic(geometry);
				if (geometry.type === "point" || geometry.type === "multipoint") {
					pointLayer.add(graphic);
				} else if (geometry.type === "polyline") {
					polylineLayer.add(graphic);
				} else if (geometry.type === "polygon" || geometry.type === "extent") {
					polygonLayer.add(graphic);
				} else {
					if (console !== undefined) {
						console.error("Unknown geometry type.");
					}
				}
			});
		})
		

	}
	
	dojo.addOnLoad(init);
}());
