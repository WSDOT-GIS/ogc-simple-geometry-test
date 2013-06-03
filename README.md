OGC Simple Geometry for ArcGIS JavaScript API
=============================================

This library adds support for conversion between [OGC Simple Geometry] and [ArcGIS Server API for Javascript geometry].

## Usage ##
See `index.html` for an example.

## Supported ##

* Well-Known Text definitions

### Geometry Types ###

* POINT
* MULTIPOINT
* LINESTRING
* MULTILINESTRING
* POLYGON


## Sample ##
The sample application can be viewed at http://wsdot-gis.github.com/ogcsimplegeometry/.

## License ##
Licensed under [The MIT License](http://opensource.org/licenses/MIT).

## Files ##

### `ogc/SimpleGeometry.js` ###
This file defines the ogc.SimpleGeometry class.

### `ogcSimpleGeometry.vsdoc.js` ###
This file provides code completion for `ogcSimpleGeometry.js` in Visual Studio.  It does not actually provide any functionality and should not be referenced by HTML.

### `ogcSimpleGeometryTest.js` ###
This file is used by the `default.html` sample page, demonstrating how the ogc.SimpleGeomtry class can be used by an application.

## Acknowlegments ##
* [CSS GitHub Ribbon](http://unindented.org/articles/2009/10/github-ribbon-using-css-transforms/)

[ArcGIS Server API for Javascript geometry]:http://developers.arcgis.com/en/javascript/jsapi/geometry-amd.html
[OGC Simple Geometry]:http://www.opengeospatial.org/standards/sfa