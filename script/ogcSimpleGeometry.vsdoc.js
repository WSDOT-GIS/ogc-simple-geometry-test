ogc = function() {
	/// <summary>The namespace for OGC Spatial Geometry classes and utility functions.</summary>
}

ogc.SimpleGeometry = function(g, wkid) {
	/// <summary>A class representing an Open-Geospatial Consortium (OGC) Simple Geometry.</summary>
	/// <param name="g" type="String|esri.geometry.Geometry">
	/// Either a simple geometry definition string or a JSON object containing a WKT string and spatial reference WKID.
	/// </param>
	/// <param name="wkid" type="Number">
	/// If the <paramref name="g"/> does not include spatial reference information, you must include a spatial reference WKID here.
	/// </param>
};

ogc.SimpleGeometry.prototype = {
	getSqlConstructor: function() {
	},
	toEsriGeometry: function() {
		/// <summary>Converts an ogc.SimpleGeometry into an esri.geometry.Geometry.</summary>
		/// <returns type="esri.geometry.Geometry" />
	}
};