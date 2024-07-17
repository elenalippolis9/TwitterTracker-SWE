// Module that handles the application data, mediating the interfacing with the backend and keeping cached the session data
const {ipcRenderer} = require('electron');
const Session = require('../../common/js/session_utils')
const Geolocation = require('../js/data-components/geolocation');
const FilterController = require('./filter-controls/filter_controls')

var dataListeners = [];
var currentSession = {}


exports.readyForData = function () {
    // signals that the frontend is ready for receiving data
    ipcRenderer.send('jhfsdjfbksdffb')
}


// Adds a new data listener to the internal list
exports.addNewDataListener = function(dataListener) {
    if (dataListener.newTweetCallback && dataListener.resetCallback) {
        dataListeners.push(dataListener);
    } else {
        throw new Error("To subscribe the module as data listener it needs to expose at least a newTweetCallback function taking a new tweet and a resetCallback with data reset logic")
    }
}

function newChunk(chunk) {

    // FIXME right now just appending chunks randomly, probably we want them in order
    currentSession.tweetChunks.push(chunk);

    for (let listener of dataListeners) {
        if (listener.newChunkCallback) {
            listener.newChunkCallback(chunk);
        } else {                                             // If the data listener has no newChunkCallback call a newTweetCallback for every tweet instead
            for (let tweet of chunk.tweets) {
                listener.newTweetCallback(tweet);
            }
        }
    }
}

function newSession(session) {

    console.log('New session: ', session);
    ipcRenderer.send('discarded-previous-session');
    if (session) 
    {  
        currentSession = session;
    }
    else { currentSession = Session.buildEmptySession({
        language: 'it'
    }); }

    
    for (let listener of dataListeners) {
            listener.resetCallback();                   // Every visualizazion component receives first of all a reset callback
    }
    for(let chunkIndex in currentSession.tweetChunks) {
        console.log("Loading chunk", chunkIndex)
        newChunk(currentSession.tweetChunks[chunkIndex]);
    }

    FilterController.updateActiveFiltersFromQuery(currentSession.query)
}

exports.initialize = function () {

    FilterController.initialize((newQuery) => {
        console.log("New query generated: ", newQuery)
        // Create a new session when the query is changed
        newSession(Session.buildEmptySession(newQuery));
    });

    $('#save-session-btn').click(() => {
        ipcRenderer.send('save-session', currentSession);
    })
    $('#load-session-btn').click(() => {
        ipcRenderer.send('load-session');
    })


    $('#one-shot-search-button').click(()=> {
        console.log("Triggering one shot search")
        this.searchOneShot();
    })
    $('#stream-search-button').click(() => {
        console.log('Activating stream');
        activateStream();
    })

    // Signals that the old session needs to be discarded and a new session needs to be loaded.
    // Session can contain the new session data or be null, meaning that a new empty session needs to be crated
    ipcRenderer.on('new-session', (event, session) => {
        newSession(session);
        Geolocation.resetAreaCallback();
    })


    ipcRenderer.on('new-tweet-list', (event, newTweetList) => {
        console.log("new-tweet-list event triggered, with list", newTweetList)
        let chunk = Session.buildChunkFromTweetList(newTweetList);
        newChunk(chunk);
    })

    ipcRenderer.on('new-streamed-tweet', (event, tweet) => {
        // TODO add tweet to current session/stream chunk

        for (let listener of dataListeners) {
            console.log(tweet);
            listener.newTweetCallback(tweet);
        }
    })
}

exports.searchOneShot = function () {
   
   let query = currentSession.query;
   // if (!query.contains) {query.contains = ['test']; query.count = FilterController.TWEETS_PER_SEARCH}
    ipcRenderer.send('search-tweets', query);
}

function activateStream() {
    ipcRenderer.send('stream-tweets', currentSession.query);
}


exports.generateSessionString = FilterController.generateTweetString
