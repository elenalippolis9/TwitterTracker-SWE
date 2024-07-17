// This file specifies the interface from the main process and the renderer process from the main process side,
// basically setting up a bunch of events that can be used by the renderer process.

const { ipcMain, dialog, app } = require('electron');
const fs = require('fs');
const TwitterAPI = require('./tweet_tracker.js')
const twitter_account = require('./twitter_account') //astrazione del log-in di twitter


var twitterClient = twitter_account.login(twitter_account); //creazione dell'account per il bot
var mediaClient = twitter_account.mediaLogin();
let tweetStreamBuffer = [];
let tweetStreamSecondsCount = 0;
let tweetStream = null;
let mainWindow;
let CACHED_SESSION_FILE_PATH = ''
exports.cacheMainWindow = function (win) { mainWindow = win; }

exports.errorPopup = function (msg) {
    mainWindow.webContents.send('error-popup', msg);
}
exports.empty_rspPopup = function (msg) {
    mainWindow.webContents.send('empty_rsp-popup', msg);
}
exports.successPopup = function (msg) {
    mainWindow.webContents.send('success-popup', msg);
}
// Initializes all the ipc events that need to be exposed to the renderer process.
//
// This function will be called during the app initialization,
// so if for example here we declare an event through ipcMain.on('save-tweets'...),
// in the renderer process we will be able to call ipcRenderer.send('save-tweets')
exports.initializeIpcEvents = function () {

    if (app) {
        CACHED_SESSION_FILE_PATH = app.getAppPath() + '/data/cachedSession.json'
    }
    // Load the startup session (if cached a session, else returns null)
    ipcMain.on('load-startup-session', (event) => {
        // TODO decide what to do at startup (blank page, load last session saved on file, ...)

        // For now load the session from a cache file
        // If there's no cache file create a new session
        let initialSession = {}
        // if (!fs.existsSync(CACHED_SESSION_FILE_PATH)) {
        initialSession = null;
        // } else {
        //     initialSession = JSON.parse(fs.readFileSync(CACHED_SESSION_FILE_PATH, 'utf-8'));
        // }

        // Send the loaded session, null if no session was loaded, a new one will be created on the client side
        event.reply('new-session', initialSession);
    })

    ipcMain.on('discarded-previous-session', (event) => {
        if (tweetStream) {
            tweetStreamBuffer = []
            tweetStream.destroy();
            tweetStream = null;
        }
    })
    ipcMain.on('stream-tweets', (event, query) => {
        console.log('Creating stream from query: ', query);
        tweetStream = TwitterAPI.createTweetStream(twitterClient, query);
        tweetStream.on('data', (tweet) => {
            try {
                let convertedTweet = TwitterAPI.tweetConverter(tweet);
                if (tweetStreamBuffer.length && convertedTweet.created_at !== tweetStreamBuffer[tweetStreamBuffer.length - 1].created_at) {
                    tweetStreamSecondsCount += 1;
                    if (tweetStreamSecondsCount>=5) {
                        tweetStreamSecondsCount = 0;
                        event.reply('new-tweet-list', tweetStreamBuffer)
                        tweetStreamBuffer = []
                    }
                }
                tweetStreamBuffer.push(convertedTweet);
            } catch (e) {
                console.warn('Not adding a tweet because of a conversion error')
            }
        })
    })
    ipcMain.on('search-tweets', (event, query) => {
        TwitterAPI.twitterSearch(twitterClient, query, true)
            .then((tweetList) => {
                event.reply('new-tweet-list', tweetList);
            }).catch((err) => {
                if (typeof err == "object") {
                    if (err.hasOwnProperty("errors") && Array.isArray(err.errors)) {
                        let err_array = []
                        err.errors.forEach(error => {
                            if (error.code != 195)//if Api's error is different from the (useless) standard one, then show it
                                err_array.push("Error from Twitter server: " + error.message);
                            else
                                err_array.push("Error from Twitter servers, probably there are some mistakes in your request")
                        });
                        this.errorPopup(err_array)
                    }
                }
                else {
                    this.errorPopup(err)
                }
            })
    })

    // Saves the tweets in a file
    ipcMain.on('save-session', (event, session) => {

        const options = {
            defaultPath: CACHED_SESSION_FILE_PATH,
        };

        dialog.showSaveDialog(null, options)
            .then((ret) => {
                if (!ret.canceled) { // If the file was correctly chosen
                    if (!ret.canceled) {
                        fs.writeFileSync(ret.filePath, JSON.stringify(session, null, 2), { encoding: 'utf-8' });
                    }
                }
            });
    });

    ipcMain.on('load-session', (event) => {

        const options = {
            defaultPath: CACHED_SESSION_FILE_PATH,
        };

        dialog.showOpenDialog(null, options)
            .then((ret) => {
                if (!ret.canceled) { // If the file was correctly chosen
                    if (!ret.canceled) {
                        if (ret.filePaths.length === 1) {
                            let loadedSession = JSON.parse(fs.readFileSync(ret.filePaths[0], 'utf-8'));
                            event.reply('new-session', loadedSession);
                        } else {
                            console.error("Shouldn't be able to select more than one session file")
                        }
                    }
                }
            });
    });

    ipcMain.on('post-image', (event, dataURI, tweetText) => {
        var regex = /^data:.+\/(.+);base64,(.*)$/;
        var matches = dataURI.match(regex);
        var data = matches[2];
        var buffer = Buffer.from(data, 'base64');
        TwitterAPI.twitterUpload(mediaClient, 'image', buffer).then(res => {
            TwitterAPI.twitterPost(twitterClient, {media_ids: res, status: tweetText}).then((tweet) => {
                console.log('Twitter post successful: ', tweet);
                this.successPopup("Your tweet was posted successfully");
            }).catch( err =>
                this.errorPopup("Posting failed")
            )
            console.log('Twitter media upload response: ', res);
        }).catch( err =>
            this.errorPopup("Posting failed")
        )
    })
}






