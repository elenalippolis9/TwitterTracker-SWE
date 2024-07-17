// http://aminsep.disi.unibo.it/innometrics/api
const { ipcMain } = require('electron')
const crypto = require('crypto');
const win = require('electron').BrowserWindow;
const config = require('../../../data/secrets/config.json')
const Interface = require('./interface')
var turf_helpers = require('@turf/helpers');
var turf_bbox = require('@turf/bbox').default;
var turf_random = require('@turf/random');
var any_error = false;

exports.createTweetStream = function (client, query) {
  let streamQuery = {}
  if (query.contains) {
    streamQuery.track = ''
    for (let i in query.contains) {
      streamQuery.track += query.contains[i] + ' '
    }
  }
  console.log('Converted stream query', streamQuery);
  return client.stream('statuses/filter', streamQuery);
}

function convertQuery(query_obj) {
  let apiQuery = {
    q: ""
  }
  if (query_obj) {
    if (query_obj.contains) {
      let keywords = query_obj.contains.join(" ");
      apiQuery.q = keywords;
    }
    if (query_obj.sensitive)////no control needed assuming there are just two options for the user
      apiQuery.q += " filter:safe";
    if (query_obj.mentioning)//how does it work from front-end?
      query_obj.mentioning.forEach(mention => { apiQuery.q += " @" + mention });
    if (query_obj.hashtags)
      query_obj.hashtags.forEach(hashtag => { apiQuery.q += " #" + hashtag });
    if (query_obj.media)//no control needed assuming there are just two options for the user
      apiQuery.q += " filter:media";
    if (query_obj.language)//no control needed since library on the front-end
      apiQuery.lang = query_obj.language;
    /* Exposed no more RIP
    if(query_obj.time_span && query_obj.time_span.date && query_obj.time_span.date.since)//needs to be wprking in the first place
      apiQuery.q += " since:" + query_obj.time_span.date.since;
    if(query_obj.result_type)//no control needed assuming only three options aviable for the user
      apiQuery.result_type = query_obj.result_type;*/
    //Exposed no more but left for testing reasons
    if (query_obj.count) {
      if (Number(query_obj.count) > 0)
        apiQuery.count = query_obj.count;
    }
    //coordinates are expected to be correct and well-formatted from the front-end
    if (query_obj.coordinates && query_obj.coordinates.latitude && query_obj.coordinates.longitude && query_obj.coordinates.radius)
      apiQuery.geocode = query_obj.coordinates.latitude + ',' + query_obj.coordinates.longitude + ',' + query_obj.coordinates.radius;
    /*Exposed no more RIP
    if (query_obj.time_span) {//no control needed assuming the user can only select dates in the first place
      if (query_obj.time_span.tweets) {
      //warning if values are fucked up(because they won't be evaluated by the api itself, but request is fine)
      //or intersection is empty(request would fail, so fields are not submitted)
        //if( esistono entrambi)//assuming we get strings as input, which may not be the case
          //fai sottrazione e vedi se compatibile
          if (query_obj.time_span.tweets.since) { apiQuery.since_id = query_obj.time_span.tweets.since; }
          if (query_obj.time_span.tweets.up_to) { apiQuery.max_id = query_obj.time_span.tweets.up_to; }
  
        }
        if (query_obj.time_span.date) {//no warnings about
          //absurd dates because the user(hopefully) is not that stupid
          if (query_obj.time_span.date.up_to) {
            apiQuery.until = query_obj.time_span.date.up_to;
            //if( )
          }
  
        }
      }
    }
  }*/
    //syntactic/semantic formulas check?
    if (query_obj.author) {
      apiQuery.q += " from:" + query_obj.author;
      //if( query_obj.author != query_obj.author.replace(/\s/g,''))
    }
    if (apiQuery.q == "")//q field is required
      any_error = true;//as long as we handle just this error
    apiQuery.q = encodeURI(apiQuery.q).replace(/\(/g, "%28").replace(/\)/g, "%29");

  }
  return apiQuery
}

function twitterSearch(twitter_client, searchQuery, conversion) {
  let convert;
  if (typeof conversion == "undefined" || conversion == true) {
    convert = true;
  }
  else {
    convert = false;
  }
  return new Promise((resolve, reject) => {
    let apiQuery = convertQuery(searchQuery);
    if (any_error) {
      any_error = false;
      reject("at least one of the first six filters(from left) must be specified")
    }
    else {
      console.log("Received query: ", searchQuery, '\nConverted into: ', apiQuery);
      twitter_client.get("search/tweets", apiQuery).then(tweets => {
        if (convert) {
          let tweetObjects = [];
          tweets.statuses.forEach(tweet => {
            tweetObjects.push(tweetConverter(tweet));
          });
          tweets = tweetObjects;
        }
        console.log("tweets ", tweets)
        if ((convert && tweets.length == 0) || (!convert && tweets.statuses.length == 0)) {
          Interface.empty_rspPopup("no tweets found")
        }
        resolve(tweets, tweets._headers);//tweets._headers should be deleted when unconverted tweets
        //are used no more
      }).catch(err => {
        reject(err)
      })
    }
  })
}

/*let query_obj = {//what i get as input
  author: string, //operator,who posted the tweets
  sentiment: string,//operator,either "good" or "bad"
  contains:[string],//array of words within the tweet
  sensitive: boolean,//operator,true to allow sensitive content
  mentioning: [string],//operator,no @ needed
  hashtags:[string],//operator,no # needed
  coordinates: {
      latitude: number,
      longitude: number,
      radius: string//must end with km or mi for kilometers and miles respectively
      },
  language: string,// ISO 639-1 code
  result_type: string,//popular, recent or both
  count: number, //lo includiamo?
  time_span: { //definible in terms of tweets or dates,only one of them should be defined each time
      tweets: {
          since: number,
          up_to: number
      }
      date: {
          since: date(yyyy-mm-dd),//operator
          up_to: date(yyyy-mm-dd)
      }
  }
  media: boolean//operator,contains images/videos or not
};*/
/*
//sentences as filters problem
//is the failure callback well placed and defined?
//author name length  <= 50, well yes, but actually no
//max 10 keywords and operators? the guide says so,
//tried with 27 between keywords and operators and
//it still works fine
//sentiment is not working probably because there's
//some more work to do, dunno if it's worth it though
//relaxed philosophy, aka bother controlling only the bare minimum
//also because the api itself usually uses default values
//when you send fucked up shit
//check coodinates, if at least one of them is not correct
//then discard them(whilst sending the request)
//and notify that to the user
//it seems like count can't be a negative number,but
//fortunately the api itself tells us that, so no need to worry
//if max_id and since_id are positive numbers but detect no range,
//then there's error, but the api message is vague,it may be
//useful to notify the error to the user instead of a blind request
//date field doesn't accept strings(vague error message)
//and it doesn't seem to work even with the correct format,
//maybe the since operator should be used in pair with
//until operator instead of until query parameter
//detailed feedback may be a feature/user story, since the api
//is often vague
//can date and tweets be defined simultaneously?who knows
*/

function twitterPost(twitter_client, postQuery) {
  return new Promise((resolve, reject) => {
    twitter_client.post("statuses/update", postQuery).then(status => {
      resolve(tweetConverter(status), status._headers)
    }).catch(err => {
      reject(err.errors, err._headers)
    })
  })
}

function twitterUpload(media_client, type, buffer) {
  return new Promise((resolve, reject) => {
    if (type == 'image' || type == 'video') {
      media_client.uploadMedia(type, buffer).then(media => {
        resolve(media.media_id_string)
      })
        .catch(err => {
          reject(err)
        })
    }
    else { reject(new Object({ errors: [{ message: 'Wrong "type" parameter. Received: ' + type + ' Expected: "image" OR "video"' }] })) }
  })
}

function twitterDelete(twitter_client, deleteQuery) {
  return new Promise((resolve, reject) => {
    twitter_client.post("statuses/destroy", deleteQuery).then(deletedTweet => {
      resolve(deletedTweet, deletedTweet._headers)
    }).catch(err => {
      reject(err.errors, err._headers)
    })
  })
}

function tweetConverter(tweet) {
  var tweetObject = new Object();
  tweetObject.created_at = tweet.created_at;
  if (tweet.id_str)
    tweetObject.id = tweet.id_str;
  if (tweet.retweeted_status) {
    tweetObject.text = tweet.retweeted_status.text;
    tweetObject.type = "RT";
    tweetObject.embedLink = "twitter.com/" + tweet.retweeted_status.user.screen_name + "/status/" + tweet.retweeted_status.id_str
  }
  else {
    tweetObject.text = tweet.text;
    tweetObject.type = "T";
    tweetObject.embedLink = "twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str
  }
  tweetObject.tweetLink = 'twitter.com/i/web/status/' + tweet.id_str;
  tweetObject.profileImg = tweet.user.profile_image_url_https;
  tweetObject.username = tweet.user.name + ":" + tweet.user.screen_name;
  if (tweet.coordinates) {
    tweetObject.geo = [tweet.coordinates.coordinates[0], tweet.coordinates.coordinates[1]]
  }
  else if (tweet.place) {
    console.log("Place => Geo handling")
    let tweet_bbox = tweet.place.bounding_box.coordinates;
    console.log('tweet_bbox', tweet_bbox[0])
    let line = turf_helpers.lineString(tweet_bbox[0]);
    let bbox = turf_bbox(line);
    console.log('bbox', bbox)
    let random_point = turf_random.randomPoint(1, { bbox: bbox }).features[0].geometry
    console.log("random point", random_point.coordinates)
    tweetObject.geo = [random_point.coordinates[0], random_point.coordinates[1]]
  }
  if (tweet.entities.media) {
    let images_link_array = [];
    tweet.entities.media.forEach(media => {
      if (media.type == 'photo') {
        images_link_array.push(media.media_url_https)
      }
    })
    if (images_link_array.length > 0) {
      tweetObject.imgLink = images_link_array;
    }
  }
  if (tweet.entities.hashtags.length > 0) {
    let twitter_hashtags = tweet.entities.hashtags;
    let hashtags = [];
    twitter_hashtags.forEach(hashtag => {
      hashtags.push(hashtag.text)
    })
    tweetObject.hashtags = hashtags;
  }
  return tweetObject;
}

module.exports.twitterSearch = twitterSearch;
module.exports.twitterPost = twitterPost;
module.exports.tweetConverter = tweetConverter;
module.exports.twitterDelete = twitterDelete;
module.exports.twitterUpload = twitterUpload;

//twitter_client.stream('statuses/filter', { track: "biden", stall_warnings: "true" }, function (stream) {
//    stream.on('data', function (tweet) {
//        if (tweet.place != null) {
//            console.log(tweet.place)
//        }
//        //Raccolta tweet geolocalizzati
//        // if (tweet.coordinates != null) {
//        //     console.log(tweet)
//        // }
//        // swag yolo
//        //Raccolta tweet in una determinata area geografica
//        //=> Aggiungere il filtro 'locations: longitudine,latitudine', separati da virgola nel caso di più coppie (esempio: -122.75,36.8,-121.75,37.8)
//        //
//        //Raccolta tweet in un determinato punto di interesse
//        //Check dei parametri di places (name,country_code,bounding_box)
//        //Obbligo comunque di avere un filtro attivo, sarebbe meglio usare direttamente locations
//        //
//        //Raccolta tweet contenenti una certa parola chiave
//        //=> Aggiungere il filtro 'track: string'
//        //
//        //Raccolta tweet geolocalizzati da una persona specifica
//        // if (tweet.coordinates != null) {
//        //     console.log(tweet)
//        // }
//        // In più aggiungere il filtro 'follow: id' dove ID è l'user_ID di twitter di uno specifico user(separati da virgola nel caso di più di uno)
//    })
//    stream.on('error', function (error) {
//        console.log(error);
//    });
//    stream.on('warning', function (warning) {
//        console.log("Twitter Stream WARNING!\n" + warning.code + "\n" + warning.message + "\n" + warning.percent_full);
//    })
//    stream.on('disconnect', function (disconnect) {
//        console.log("Twitter Stream was disconnected: " + disconnect.code);
//    })
//});
