// This module exposes a few utility function to work with Session objects


exports.buildEmptySession = function (query) {
    return {
        query: query,              // The data of the query
        tweetChunks: [          // A list of tweetChunks, with a start and end time, in order to keep track of the time periods we already tried to scrape
        ]
    }
}


exports.buildChunkFromTweetList = function (tweetList, startTime, endTime) {
    let newChunk = {
        startTime: startTime,
        endTime: endTime,
        tweets: tweetList,
        startId: 0,
        endId: NaN
    }
    if (tweetList.length>0) {
        newChunk.startId = tweetList[tweetList.length-1].id;
        newChunk.endId = tweetList[0].id;
    }
    return newChunk;
}