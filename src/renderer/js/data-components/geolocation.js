const mapboxgl = require('mapbox-gl');

var map;
var radius = 0;
var markers = [];
var imgMarkers = [];
var clickNumber = 0;
var clickNumberCopy = 1;
var selectedPoints = [];

//Create a map inside the specified HTML's container
$(function () {
    mapboxgl.accessToken = 'pk.eyJ1IjoicmFmZmFlbGVkb25hdG9uZSIsImEiOiJja2h1b3ltMjc0dnI3MnNsNndvYXdmbjI1In0.9VCnP7GEH-5Qbhv-vYKcTQ';

    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v10',
        zoom: 0,
        preserveDrawingBuffer: true
    });

    map.addControl(new mapboxgl.FullscreenControl());
        
    //When the geo button is clicked and is value is setted to "true" and the user click on the map, save the lat and lng of the first and second click inside a array
    map.on("click", function (event) {
        if (document.getElementById("add-filter-button-location").getAttribute("value") == "true") {
            if (!(clickNumber % 2)) {
                selectedPoints[0] = event.lngLat;
            }
            else {
                selectedPoints[1] = event.lngLat;

                //Distance is calculated in meters
                radius = (selectedPoints[0].distanceTo(selectedPoints[1]) / 1000).toFixed(2);
                triggerArea(turf.point(selectedPoints[0].toArray()), radius);

                // console.log(selectedPoints);
                var tmpcenter = selectedPoints[0].lng.toString() + "," + selectedPoints[0].lat.toString();
                var place = decodeLocation(tmpcenter);
                document.getElementsByClassName("mapboxgl-ctrl-geocoder--input")[0].setAttribute("value", place);
                document.getElementsByClassName("mapboxgl-ctrl-geocoder--input")[0].setAttribute("name", tmpcenter + "," + radius);
                document.getElementById("add-filter-button-location").setAttribute("value", "false");
            }
            clickNumber++;
        }
    });
});

function decodeLocation(Center)
{
    //Send a request to mapbox places API to do reverse geocoding of a point (the center of the selected area)
    var data = $.ajax(
    {   
        async: false,
        url: "https://api.mapbox.com/geocoding/v5/mapbox.places/" + Center + ".json?access_token=" + mapboxgl.accessToken,
        success: function(response)
        {
            return response
        },
        error: (decodeErr) => { console.log(decodeErr); }         
    });

    if(data.responseJSON.features.length > 0)
    { 
        return data.responseJSON.features[0].place_name;
    }
    else
    {
        return data.responseJSON.query.toString();
    }
}

//Calculate the perimeter coordinates to create a circle
function triggerArea(centerPoint, newRadius) {

    var circle = turf.circle(centerPoint, newRadius, {units: "kilometers"});

    map.addLayer({
                    "id": "polygonFill" + clickNumber.toString(),
                    "type": "fill",
                    "source": {
                                "type": "geojson",
                                "data": circle
                              },
                    "paint": {
                                "fill-color": " #1DA1F2",
                                "fill-opacity": 0.2
                             }
                });
}

exports.resizeMap = () => { map.resize(); }

exports.getMapboxgl = () => { return mapboxgl }

exports.drawArea = (tmpCenter, tmpRadius) => {
    clickNumber += 1;
    triggerArea(tmpCenter, tmpRadius);
    clickNumber += 1;
}

exports.enableMap = function(oldActiveData)
{
    // console.log(oldActiveData)
    oldActiveData.style.display = "none";
    var geoImg = document.getElementById("button-container");
    var mapContainer = document.getElementById("map-container");
    mapContainer.style.display = "inline";
    geoImg.style.display = "absolute";
}

exports.createGeocoder = function()
{
    var geocoder = new MapboxGeocoder(
    {
        accessToken: mapboxgl.accessToken,
        types: 'country,region,place,postcode,locality,neighborhood'
    });
             
    geocoder.addTo('#geocoder-container');
}

exports.setMarkerView = function(visTweet, visImg)
{
    for(let tweetMarker of document.getElementsByClassName("geo-tweet"))
    {
        tweetMarker.style.visibility = visTweet;
    }

    for(let imgMarker of document.getElementsByClassName("geo-img"))
    {
        imgMarker.style.visibility = visImg;
    }    
}

exports.reverseGeo = (tmpCoordinates) => { return decodeLocation(tmpCoordinates); }

// DATA CALLBACKS =====================================================================================================

exports.newTweetCallback = function (newTweet) {
    if (newTweet.geo) 
    {
        var markerDiv = document.createElement("div");
        markerDiv.setAttribute("class", "geo-tweet");
        markerDiv.addEventListener("click", function()
        {
            map.flyTo({
                center: newTweet.geo,
                essential: true,
                });
        });
        markerDiv.style.width = "48px";
        markerDiv.style.height = "48px";
        markerDiv.style.borderRadius = "50%";
        markerDiv.style.backgroundImage = "url(" + newTweet.profileImg + ")";
        markerDiv.style.cursor = "pointer";
        var markerPopup = new mapboxgl.Popup({ anchor: "bottom", offset: [0, -54] }).setText(newTweet.username.split(":")[1] + "\n" + newTweet.text);
        var marker = new mapboxgl.Marker(markerDiv, { anchor: "bottom", offset: [0, 6] }).setLngLat(newTweet.geo).setPopup(markerPopup).addTo(map);
        markers.push(marker);
        if(newTweet.imgLink)
        {
            var imgMarkerDiv = document.createElement("div");
            imgMarkerDiv.setAttribute("class", "geo-img")
            imgMarkerDiv.addEventListener("click", function()
            {
                map.flyTo({
                    center: newTweet.geo,
                    essential: true,
                    });
            });
            imgMarkerDiv.style.width = "100px";
            imgMarkerDiv.style.height = "100px";
            imgMarkerDiv.style.backgroundImage = "url(" + newTweet.imgLink + ")";
            imgMarkerDiv.style.visibility = "hidden";
            imgMarkerDiv.style.backgroundSize = "contain";
            imgMarkerDiv.style.backgroundRepeat = "no-repeat";
            var imgMarkerYo = new mapboxgl.Marker(imgMarkerDiv, { anchor: "bottom", offset: [0, 6] }).setLngLat(newTweet.geo).addTo(map);
            imgMarkers.push(imgMarkerYo);
        }
    }
}

//Remove all selected areas from the map
exports.resetCallback = function () {
    $( ".geo-tweet" ).remove();
    $( ".geo-img" ).remove();
}

exports.resetAreaCallback = function () {
    //Clean the map from the selected areas
    for (clickNumberCopy; clickNumberCopy < clickNumber; clickNumberCopy += 2) {
        map.removeLayer("polygonFill" + clickNumberCopy.toString());
    }

    clickNumberCopy = clickNumber + 1;
}