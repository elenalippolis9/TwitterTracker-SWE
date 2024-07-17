// Metadata used to build filter controls.
// Mostly defines which filters are available and their functionality
const ISO6391 = require('iso-639-1');
const FeatherIcons = require('feather-icons');
const Geo = require("../data-components/geolocation");
const { StringDecoder } = require('string_decoder');

let filtersMetadata = {}
let activeFilters = [];

// Called when the query defined by the filter system changes
let newQueryCallback = null;

exports.initialize = function (newQueryCallbk) {
    this.buildInterface();
    newQueryCallback = newQueryCallbk;
}

exports.TWEETS_PER_SEARCH = 100;

// INTERFACE CONSTRUCTION =============================================================================================

exports.buildInterface = function () {
    filtersMetadata = {
        elems: {      // All the relevant elements
            addFilterButtonGroup: $('#add-filter-button-group'),
            activeFiltersCollapse: $('#active-filters-collapse'),
            filterFormCollapse: $('#filter-form-collapse')
        },
        filters: {
            text: {
                tooltip: 'Text',
                icon: FeatherIcons.icons['message-square'],
                allowsMultiple: true,
                // incompatibleWith for handling incompatibilities?,
                editCallback: textFilterEditorCallback,
                activeFilterLabel: (activeFilterData) => { return activeFilterData.string; },
                applyToQuery: (activeFilterData, query) => {
                    if (query.contains) { query.contains.push(activeFilterData.string) }
                    else { query.contains = [activeFilterData.string] }
                },
            },
            hashtag: {
                tooltip: 'Hashtag',
                icon: FeatherIcons.icons.hash,
                allowsMultiple: true,
                activeFilterLabel: (activeFilterData) => { return activeFilterData.hashtag },
                applyToQuery: (activeFilterData, query) => {
                    if (query.hashtags) { query.hashtags.push(activeFilterData.hashtag) }
                    else { query.hashtags = [activeFilterData.hashtag] }
                },
                editCallback(data) {
                    return new Promise((resolve, reject) => {
                        let container = filtersMetadata.elems.filterFormCollapse;

                        let sForm = `<input id="hashtag-filter-form" class="form-control" placeholder="Hashtag (without #)">`

                        let f = oneLineInputForm(sForm, filtersMetadata.filters.hashtag.icon,
                            function () {
                                let val = $('#hashtag-filter-form').val()
                                if (val !== "") { resolve({ hashtag: val }); }
                                else { reject(); }
                            },
                            function () {
                                reject();
                            })
                        container.append(f);

                        if (data.hashtag) {     // If data is not empty we show the data already present in the form
                            $('#string-filter-form').val( data.hashtag);
                        }

                    })
                }
            },
            user: {
                tooltip: "User",
                icon: FeatherIcons.icons.user,
                activeFilterLabel: (activeFilterData) => { return activeFilterData.user },
                applyToQuery(activeFilterData, query) { query.author = activeFilterData.user },
                editCallback(data) {
                    return inlineEditorTemplate(data, 'user', filtersMetadata.filters.user.icon, 'User id')
                }
            },
            mentions: {
                tooltip: "Mentions",
                icon: FeatherIcons.icons['at-sign'],
                allowsMultiple: true,
                editCallback(data) {
                    return inlineEditorTemplate(data, 'mentioning', filtersMetadata.filters.mentions.icon, 'Mentioning (without @)')
                },
                activeFilterLabel: (activeFilterData) => { return activeFilterData.mentioning; },
                applyToQuery: (activeFilterData, query) => {
                    if (query.mentioning) { query.mentioning.push(activeFilterData.mentioning) }
                    else { query.mentioning = [activeFilterData.mentioning] }
                }
            },
            sensitive: {
                tooltip: "Sensitive",
                icon: FeatherIcons.icons['eye-off'],
                editCallback(data) {
                    return new Promise((resolve, reject) => {
                        resolve({sensitive: true})
                    })
                },
                activeFilterLabel: (activeFilterData) => { return ""; },
                applyToQuery: (activeFilterData, query) => {
                    query.sensitive = activeFilterData.sensitive;
                }
            },
            media: {
                tooltip: "Media",
                icon: FeatherIcons.icons['image'],
                editCallback(data) {
                    return new Promise((resolve, reject) => {
                        resolve({media: true})
                    })
                },
                activeFilterLabel: (activeFilterData) => { return ""; },
                applyToQuery: (activeFilterData, query) => {
                    query.media = activeFilterData.media;
                }
            },
            language: {
                tooltip: "Language",
                icon: FeatherIcons.icons['globe'],
                editCallback(data) {
                    return new Promise((resolve, reject) => {

                        let names = ISO6391.getAllNames()
                        let s = '';
                        for(let i in names) {
                            if (names[i]==='English') {
                                s += '<option selected>' + names[i] + '</option>'
                            } else {
                                s += '<option>' + names[i] + '</option>'
                            }
                        }

                        let container = filtersMetadata.elems.filterFormCollapse;
                        let f = oneLineInputForm(`<select class="form-control lang-form">` + s + `</select>`, filtersMetadata.filters.language.icon,
                            function () {
                                resolve({ lang: f.find('.lang-form').val()})
                            },
                            function () {
                                reject();
                            })
                        container.append(f)
                    })
                },
                applyToQuery(activeFilterData, query) {
                                                        query.language = ISO6391.getCode(activeFilterData.lang) 
                                                        if (query.language === "") { query.language = activeFilterData.lang }
                                                      },
                activeFilterLabel: (activeFilterData) => { return activeFilterData.lang },
            },
            location: {
                tooltip: "Location",
                id: "geolocation",
                icon: FeatherIcons.icons['map-pin'],
                editCallback: locationFilterEditorCallback,
                activeFilterLabel: (activeFilterGeoData) => { return activeFilterGeoData; },
                applyToQuery: (activeFilterData, query) => {
                    
                    var geoData = activeFilterData["areaData"].split(",");

                    let geoObj = {
                                    latitude:  geoData[1],
                                    longitude: geoData[0],
                                    radius: geoData[2] + "km"
                                 };
                    
                    query.coordinates = geoObj;
                }
            }
        }
    }
    buildAddFilterButtonGroup();
}

exports.updateActiveFiltersFromQuery = function(query) {
    filtersMetadata.elems.activeFiltersCollapse.empty();
    if (query) {
        queryToActiveFilters(query);
    }
}

function queryToActiveFilters(query) {
    console.log("Query to active filters from query", query)
    activeFilters = []

    // String containsinterface
    for (let i in query.contains) {
        let s = query.contains[i];
        let sFilter = {filterType: 'text', filterData: { string: s}};
        addActiveFilter(sFilter)
    }
    // Hashtag
    for (let i in query.hashtags) {
        let s = query.hashtags[i];
        let hFilter = {filterType: 'hashtag', filterData: { hashtag: s}};
        addActiveFilter(hFilter)
    }
    // Author
    if (query.author) {
        addActiveFilter({filterType: 'user', filterData: { user: query.author}})
    }
    // Mentioning
    for (let i in query.mentioning) {
        let s = query.mentioning[i];
        let mFilter = {filterType: 'mentions', filterData: { mentioning: s}};
        addActiveFilter(mFilter)
    }
    // Sensitive
    if (query.sensitive) {
        addActiveFilter({filterType: 'sensitive', filterData: { sensitive: true}})
    }
    if (query.media) {
        addActiveFilter({filterType: 'media', filterData: { media: true}})
    }
    if (query.language) {
        addActiveFilter({filterType: 'language', filterData: { lang: query.language}})
    }
    if (query.coordinates) {
        var place = Geo.reverseGeo(query.coordinates.longitude + "," + query.coordinates.latitude);
        addActiveFilter({filterType: 'location', filterData: { 
                                                                areaData: query.coordinates.longitude + "," + query.coordinates.latitude + "," + query.coordinates.radius.split("km")[0],
                                                                areaName: place
                                                             }});
    }
}

exports.generateTweetString = function() {

    let dividedFilters = {}
    for (let i in activeFilters) {
        let targetFilter = activeFilters[i];
        let targetSlot = dividedFilters[targetFilter.filterType];
            if (targetSlot) { dividedFilters[targetFilter.filterType].push(targetFilter.filterData)}
        else { dividedFilters[targetFilter.filterType] = [targetFilter.filterData]}
    }
    let containsString = '';

    for (let i in dividedFilters['text']) {
        containsString += '"' + dividedFilters['text'][i].string + '", ';
    }
    for (let i in dividedFilters['hashtag']) {
        containsString += '#' + dividedFilters['hashtag'][i].hashtag + ', ';
    }
    if (dividedFilters['media']) { containsString+= '[media], '}


    let mentioningString = '';
    for (let i in dividedFilters['mentions']) {
        mentioningString += '@' + dividedFilters['mentions'][i].mentioning + ', ';
    }

    let ret = '';
    if (containsString) {
        ret+= '\t- containing: ' + containsString.slice(0, -2) + '\n';
    }
    if (dividedFilters['language']) {
        ret += '\t- language: ' + dividedFilters['language'][0].lang +'\n';
    }
    if (dividedFilters['user']) {
        ret += '\t- author: @' + dividedFilters['user'][0].user + '\n';
    }
    if (mentioningString) {
        ret += '\t- mentioning: ' + mentioningString.slice(0, -2) + '\n';
    }
    if (dividedFilters['sensitive']) {
        ret += '\t- excluding sensitive content\n'
    }
    if (dividedFilters['location']) {
        ret += '\t- located at: ' + dividedFilters['location'][0].areaName + '\n';
    }
    return ret;
}

function filterEditRoutine(filterMetadata, filterTypeId, initialFilterData) {
    return new Promise(((resolve, reject) => {
        filtersMetadata.elems.filterFormCollapse.empty();
        let editPromise = filterMetadata.editCallback(initialFilterData);
        filtersMetadata.elems.filterFormCollapse.collapse('show');
        editPromise.then((newFilterData) => {
            resolve(newFilterData);
            filtersMetadata.elems.filterFormCollapse.collapse('hide');
        }).catch((err) => {
            filtersMetadata.elems.filterFormCollapse.collapse('hide');
        });
    }))
}

// Builds a filter button given a filter metadata object
function buildAddFilterButton(filterMetadata, filterTypeId) {

    let addButtonId = 'add-filter-button-' + filterTypeId;

    let filterButton = $('<button id="' + addButtonId + '" type="button" class="btn btn-primary" data-toggle="tooltip" data-placement="top" title="' + filterMetadata.tooltip + '"></button>')
        .append(buildIcon(filterMetadata.icon))

    // Add a filter of the type defined in filterData when clicking the button
    filterButton.click(function () {
        filterEditRoutine(filterMetadata, filterTypeId, {}).then(
            (newFilterData) => {
                if(!filterMetadata.allowsMultiple) {$('#' + addButtonId).attr('disabled', true);}

                activeFilters.push({ filterType: filterTypeId, filterData: newFilterData})
                if (newQueryCallback) {     // Build again the query object since the active filters have changed
                    newQueryCallback(buildQueryFromActiveFilters());
                }
            }
        )
    })
    return filterButton;
}


function buildIcon(featherIcon) {
    return $(featherIcon.toSvg())
}

function buildActiveFilterButton(filter) {

    let correspondingMetadata = filtersMetadata.filters[filter.filterType];
    if (correspondingMetadata) {
        let form;
        if(filter.filterData["areaData"])
        {
            var radiusArea = "";
            if(filter.filterData["areaData"].split(",").length > 2) { radiusArea = " - Area's radius : " + filter.filterData["areaData"].split(",")[2] + " km"; }
            form = $(`
            <div class="btn-group btn-group-sm active-filter-btn-group" role="group">
                <button class="btn btn-primary active-filter-btn-main" name=` + filter.filterData["areaData"] + ` >` + correspondingMetadata.icon.toSvg({class: "active-filter-icon"}) + "Area's center : " + correspondingMetadata.activeFilterLabel(filter.filterData["areaName"]) + radiusArea + `</button>
                <button class="btn btn-danger filter-badge-delete-button">` + FeatherIcons.icons.x.toSvg({ class: "filter-badge-delete-icon" }) + `</button>
            </div>`)
        }
        else
        {
            form = $(`
            <div class="btn-group btn-group-sm" role="group">
                <button class="btn btn-primary active-filter-btn-main" >` + correspondingMetadata.icon.toSvg({class: "active-filter-icon"})+ correspondingMetadata.activeFilterLabel(filter.filterData) +`</button>
                <button class="btn btn-danger filter-badge-delete-button" >` + FeatherIcons.icons.x.toSvg({ class: "filter-badge-delete-icon" }) + `</button>
            </div>`);
            // form.click(() => {
                // filterEditRoutine(correspondingMetadata, filter.filterType, filter.filterData).then((newData) => {
                //     filter.filterData = newData;
                // })
            // })
        }

        form.find('.filter-badge-delete-button').click(() => {
            $('#add-filter-button-' + filter.filterType).attr('disabled', false);
            if(filter.filterType == "location") { Geo.resetAreaCallback(); }
            for (let filterIndex in activeFilters) {
                if (activeFilters[filterIndex] === filter) {
                    activeFilters.splice(filterIndex, 1);
                    break;
                }
            }
            form.remove()
            if (newQueryCallback) {     // Build again the query object since the active filters have changed
                newQueryCallback(buildQueryFromActiveFilters());
            }
            console.log("Updated active filter list: ", activeFilters)
        })
        return form;
    } else {
        throw error("Unexpected filter type");
    }
}

function addActiveFilter(activeFilter) {
        activeFilters.push(activeFilter);

        let activeFilterButton = buildActiveFilterButton(activeFilters[activeFilters.length-1]);
        filtersMetadata.elems.activeFiltersCollapse.append(activeFilterButton);

    if (activeFilters.length > 0) {
        filtersMetadata.elems.activeFiltersCollapse.collapse('show');
    }
}

function updateActiveFilters() {
    // Empty the active filters container
    filtersMetadata.elems.activeFiltersCollapse.empty();
}

// Builds the filter buttons taking all the relevant information from the filterMetadata object.
function buildAddFilterButtonGroup() {
    console.log('Building filter')
    for (let filterId in filtersMetadata.filters) {
        let filterData = filtersMetadata.filters[filterId];
        let newFilterButton = buildAddFilterButton(filterData, filterId);
        filtersMetadata.elems.addFilterButtonGroup.append(newFilterButton);
    }
}

function getMetadata(activeFilter) {
    let meta = filtersMetadata[activeFilter.filterType];
    if (meta) return meta
    else throw new Error("The corresponding metadata doesn't exists")
}

// CONTROLS ===========================================================================================================

function inlineEditorTemplate(data, dataFieldName, icon, placeholderString) {
    return new Promise((resolve, reject) => {
        let container = filtersMetadata.elems.filterFormCollapse;
        let inputElemId = dataFieldName + "-input-filter-form";
        if (!placeholderString) {
            placeholderString = 'Insert a filter string'
        }
        let sForm = `<input id="` + inputElemId + `" class="form-control" placeholder="`+ placeholderString + `">`

        let f = oneLineInputForm(sForm, icon,
            function () {
                let val = $('#' + inputElemId).val()
                if (val) {
                    let newData = {};
                    newData[dataFieldName] = val;
                    resolve(newData); }
                else { reject(); }
            },
            function () {
                reject();
            })
        container.append(f);

        if (data[dataFieldName]) {     // If data is not empty we show the data already present in the form
            $('#' + inputElemId).val( data[dataFieldName]);
        }

    })
}

function textFilterEditorCallback(data) {
    return new Promise((resolve, reject) => {
        let container = filtersMetadata.elems.filterFormCollapse;

        let sForm = `<input id="string-filter-form" class="form-control" placeholder="Contains a string">`

        let f = oneLineInputForm(sForm, filtersMetadata.filters.text.icon,
            function () {
                let val = $('#string-filter-form').val()
                if (val !== "") { resolve({ string: val }); }
                else { reject(); }
            },
            function () {
                reject();
            })
        container.append(f);

        if (data.string) {     // If data is not empty we show the data already present in the form
            $('#string-filter-form').val( data.string);
        }

    })
}

//Update user interface when the location button was pressed
function locationFilterEditorCallback(geoData) {
    return new Promise((resolve, reject) => {
        let container = filtersMetadata.elems.filterFormCollapse;
        document.getElementById("add-filter-button-location").setAttribute("value", "true");
        let gForm = "<div id='geocoder-container'></div>";

        let f = oneLineInputForm(gForm, filtersMetadata.filters.location.icon,
            function () {
                document.getElementById("add-filter-button-location").setAttribute("value", "false");
                var geoName = document.getElementsByClassName("mapboxgl-ctrl-geocoder--input")[0].name;
                var geoValue = document.getElementsByClassName("mapboxgl-ctrl-geocoder--input")[0].value;
                if (geoName) {  resolve({ 
                                            areaName: geoValue,
                                            areaData: geoName
                                        });
                             }
                else
                {   
                    if(geoValue)
                    {   
                        if(geoValue.split(",").length > 1)
                        {
                            geoValue = geoValue.split(",")[0]
                        }

                        $.ajax(
                        {
                            url: "https://api.mapbox.com/geocoding/v5/mapbox.places/" + geoValue + ".json?access_token=" + Geo.getMapboxgl().accessToken,
                            success: function (placeCoordinates)
                            {
                                const tmpMapboxgl = Geo.getMapboxgl();
                                var tmpCenterLngLat = new tmpMapboxgl.LngLat(placeCoordinates.features[0].geometry.coordinates[0], placeCoordinates.features[0].geometry.coordinates[1])
                                var tmpEndPointLngLat = new tmpMapboxgl.LngLat(placeCoordinates.features[0].bbox[0], placeCoordinates.features[0].bbox[3]);
                                var radius = (tmpCenterLngLat.distanceTo(tmpEndPointLngLat) / 1000).toFixed(2);
                                Geo.drawArea(turf.point(tmpCenterLngLat.toArray()), radius);
                                geoName = placeCoordinates.features[0].geometry.coordinates[0].toString() + "," + placeCoordinates.features[0].geometry.coordinates[1].toString() + "," + radius.toString();
                                resolve({
                                         areaName: geoValue,
                                         areaData: geoName
                                        })
                            },
                            error: function(placeError)
                            {
                                console.log(placeError);
                            }
                        });
                    }
                    else { reject(); }
                }
            },
            function () {
                Geo.resetAreaCallback();
                reject();
            });

        container.append(f);
        Geo.createGeocoder();
    })
}

function userFilterEditorCallback() {
    return new Promise((resolve, reject) => {
        // TODO
    })
}
// UTILITY FUNCTIONS ==================================================================================================

function oneLineInputForm(inputElem, icon, confirmCallback, cancelCallback) {
   let form = $(`
        <div class="input-group">
              <div class="input-group-prepend">
                  <div class="input-group-text">`
                    + icon.toSvg({ class: "input-group-icon" }) +
       `          </div>
              </div>` + inputElem + `
        </div>`)


    let submitButton = $("<button class='btn-primary btn'>Confirm</button>")
    submitButton.click( confirmCallback);
    form.append(submitButton);

    let cancelButton = $("<button class='btn-danger btn'>Cancel</button>")
    cancelButton.click(cancelCallback);
    form.append(cancelButton);
    return form;
}

function buildNormalForm(buttonCallback, cancelCallback) {
    let submitButton = $("<button class='btn-primary btn'>Confirm</button>")
    submitButton.click(buttonCallback);
    filtersMetadata.elems.filterFormCollapse.append(submitButton);


    let cancelButton = $("<button class='btn-danger btn'>Cancel</button>")
    cancelButton.click(cancelCallback);
    filtersMetadata.elems.filterFormCollapse.append(cancelButton);

}

function buildQueryFromActiveFilters() {
    let query = {}
    var areaSelection = false;
    for (let activeFilter of activeFilters) {
        let metadata = filtersMetadata.filters[activeFilter.filterType];
        if(activeFilter.filterType == "location"){ areaSelection = true; }
        if (metadata.applyToQuery) {
            metadata.applyToQuery(activeFilter.filterData, query);
        } else {
            console.warn("You are using a filter of type ", activeFilter.filterType, " , which doesn't have a applyToQuery callback, probably because it still needs to be completely implemented.")
        }
    }
    if(!areaSelection){ Geo.resetAreaCallback(); }

    query.count = 500;

    return query;
}