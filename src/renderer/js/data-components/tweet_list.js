const fs = require("fs");

const INITIAL_DISPLAYED_TWEETS = 5;
const TWEETS_PER_LOAD = 5;
let tweetCounter = 0;
let displayedCounter = 0;
let displayedTarget = INITIAL_DISPLAYED_TWEETS;
let tweetCache = [];

//Build the tweet via oembed API
function buildTweet(newTweet) {
    displayedCounter += 1;
    var urlGET = "https://publish.twitter.com/oembed?url=https://" + newTweet.embedLink;

    $.ajax(
        {
            dataType: "json",
            url: urlGET,
            success: function (data) {
                document.getElementById("tweetViewer").appendChild(document.createRange().createContextualFragment(data.html));
            },
            error: function (err) {
                console.log(err);
            }
        });
}

function updateTweetCounterUi() {
    $('#tweets-number-text').text(tweetCounter);
}

// DATA CALLBACKS =====================================================================================================

exports.initialize = function() {

    $('#load-more-btn').click(()=> {
        displayedTarget += TWEETS_PER_LOAD;
        displayMoreTweets();
        updateTweetCounterUi();
    })
}

exports.tweetCount = function () { return tweetCounter; }

function displayMoreTweets() {
    while (tweetCache.length>0 && displayedCounter < displayedTarget) {
        buildTweet(tweetCache.pop())
    }
}

exports.newTweetCallback = function (newTweet) {
    tweetCounter += 1;
    tweetCache.push(newTweet);
    displayMoreTweets();
    updateTweetCounterUi();
}

//CHECK
exports.resetCallback = function () {
    tweetCache = [];
    tweetCounter = 0;
    displayedCounter = 0;
    displayedTarget = INITIAL_DISPLAYED_TWEETS;
    updateTweetCounterUi();
    var tweetViewer = document.getElementById("tweetViewer");
    while (tweetViewer.hasChildNodes()) { tweetViewer.removeChild(tweetViewer.firstChild); }
}