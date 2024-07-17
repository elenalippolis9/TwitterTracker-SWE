// WordCloud utility methods and related stuff
let WordCloud = require('wordcloud');

let count = {}
let tweetTotCount = 0;
let hashTotCount = 0;
let hashTotDiffCount = 0;
let wordCloudCanvas = null;
let $canvas = null;

function updateRes() {
    $canvas.attr('width', Math.round($canvas.width())).attr('height', Math.round($canvas.height()))
    updateWordCloud();
}

exports.initialize = function() {


    wordCloudCanvas = document.getElementById('word-cloud-canvas');
    $canvas = $('#word-cloud-canvas');
    window.addEventListener('resize', function() {
        updateRes();
    });
}


function updateWordCloud() {
    let list = [];
    for (let hash in count) {
        list.push([hash, count[hash]])
    }

    // console.log("Updating wordcloud from list: ", count)



    WordCloud( wordCloudCanvas, {
        list: list,
        gridSize: Math.round(22 * $canvas.width() / 1024),
        rotationSteps: 2,
        fontFamily: 'Poppins, serif',
        minSize: 1,
        weightFactor: function (size) {
            // console.log('size', size);
            let minDim = Math.min($('#word-cloud-canvas').width(), $('#word-cloud-canvas').height())
            let res = size /hashTotCount * minDim * 2;
            if (res<10) res = 10;
            return res;
        },
        // shuffle: false,
        shrinkToFit: true,
        drawOutOfBound: false,
        color: function(word, weight, fontSize) {
                if (weight>2) {
                    return 'rgb(29, 161, 242)'
                } else if ((weight<2) && (weight>1)) {
                    return 'rgb(6, 62, 96)'
                } else {
                  return 'rgb(20,23,26)'
                }
            } ,
    });
}

function countTweet(tweet) {
    tweetTotCount += 1;
    if (tweet.hashtags) {
        for (let hashtag of tweet.hashtags ){
            hashTotCount += 1;
            if (count[hashtag]) {
                count[hashtag] += 1 ;
            } else {
                count[hashtag] = 1;
                hashTotDiffCount += 1;
            }
        }
    }
}

const MIN_HASH_FACTOR = 0.005
function trimCount() {
    for (let hash in count) {
        if (count[hash]/hashTotCount < MIN_HASH_FACTOR) {
            hashTotCount -=count[hash];
            delete count[hash]
        }
    }
}


exports.updateCanvas = function() {
    updateRes();
}

// DATA CALLBACKS =====================================================================================================

exports.newChunkCallback = function (chunk) {
    for (let i in chunk.tweets) {
        countTweet(chunk.tweets[i]);
    }
    trimCount();
    updateWordCloud();
}

exports.newTweetCallback = function (newTweet) {
   countTweet(newTweet)
    updateWordCloud();

}

exports.resetCallback = function () {
    count = []
    tweetTotCount = 0;
    hashTotCount = 0;
    hashTotDiffCount = 0;
    updateWordCloud();
}
