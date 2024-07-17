// Entry point for the renderer process (meaning the first script to be loaded by index.html)
require('bootstrap');
let $ = require('jquery');
const {ipcRenderer} = require('electron');
let Html2Canvas = require('html2canvas')
const FeatherIcons = require('feather-icons')


const DataManager = require('./js/data_manager')
const ErrorHandler = require('./js/utils/error_interface')

const TweetList = require('./js/data-components/tweet_list');
const Geolocation = require('./js/data-components/geolocation');
const TimeGraph = require('./js/data-components/time_graph');
const WordCloudYo = require('./js/data-components/word_cloud');
//const ResizeSensor = require('css-element-queries/src/ResizeSensor')

$(document).ready(function()
{
    // INITIALIZATION =================================================================================================

    // Visualization components initialization
    TimeGraph.initialize();
    WordCloudYo.initialize();
    TweetList.initialize();

    // Here the callbacks for when new data arrives are defined (it should be done only one time at initialization)
    DataManager.initialize()
    ErrorHandler.initialize();

    // Subscribe all the data visualization modules ad data listeners.
    // They will receive the new data in different ways depending on the callbacks they expose
    DataManager.addNewDataListener(TimeGraph);
    DataManager.addNewDataListener(WordCloudYo);
    DataManager.addNewDataListener(Geolocation);
    DataManager.addNewDataListener(TweetList);

    // Signals to the main process that the frontend is ready for data
    ipcRenderer.send('load-startup-session');

    navInitialize();

    window.addEventListener("resize", function()
    {
        Geolocation.resizeMap();
        document.getElementById("timeChart").style.height = '1px';
        console.log('Resize event')
    });

    /*new ResizeSensor($('#controls-header'), function(){
        window.dispatchEvent(new Event('resize'))
    });*/


    let postBtn = $('#post-btn');
    postBtn.click(() => {
        $('#wait_modal').modal('show');
        let screenshotTarget = document.getElementById('dataVisualization')
        Html2Canvas(screenshotTarget, {useCORS: true}).then((canvas) => {
            console.log(canvas)
            let s = DataManager.generateSessionString();
            s = "#TweetTracker by #sweteam18 found " + TweetList.tweetCount() + " tweets:\n" + s;
            
            ipcRenderer.send('post-image', canvas.toDataURL("image/png"), s)
        })
    })

    postBtn.append(FeatherIcons.icons['upload-cloud'].toSvg())
});

//Adds to each button of data shortcuts visualization an events listener that allows to switch the data visualization
function navInitialize()
{
    var buttonContainer = document.getElementById("button-container");

    $('.data-vis-content').hide();
    $('#map-container').show();

    $('#map-tab').click(() => {
        $('.data-vis-content').hide();
        $('#map-container').show();
    })

    $('#word-cloud-tab').click(() => {
        $('.data-vis-content').hide();
        $('#word-cloud-container').show();
        WordCloudYo.updateCanvas();
    })
    $('#time-chart-tab').click(() => {
        $('.data-vis-content').hide();
        $('#time-chart-container').show();
    })


    buttonContainer.addEventListener("click", function (node)
    {
        if(!(document.getElementById("button-container").getAttribute("value") % 2))
        {
            Geolocation.setMarkerView("hidden", "visible");
        }
        else
        {
            Geolocation.setMarkerView("visible", "hidden");
        }

        var newValue = Number(document.getElementById("button-container").getAttribute("value")) + 1;
        document.getElementById("button-container").setAttribute("value", newValue.toString());
    })
}