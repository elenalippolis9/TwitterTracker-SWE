// http://aminsep.disi.unibo.it/innometrics/api
let warnings = [];
let err_array = [];
function convertQuery(query_obj) {
  let apiQuery = {
    q: ""
  }
 if(query_obj){
  if (query_obj.contains) {
    let keywords = query_obj.contains.join(" ");
    apiQuery.q = keywords;
  }
  if(query_obj.media)//no control needed assuming there are just two options for the user
    apiQuery.q += " filter:media";
  if(query_obj.sensitive)////no control needed assuming there are just two options for the user
    apiQuery.q += " filter:safe";
  if(query_obj.mentioning)
    query_obj.mentioning.forEach( mention => {if(mention.trim())apiQuery.q += " @"+mention});
  if(query_obj.hashtags)
    query_obj.hashtags.forEach( hashtag => {if(hashtag.trim())apiQuery.q += " #"+hashtag});
  if(query_obj.author && query_obj.author.trim()){
    apiQuery.q += " from:"+ query_obj.author;
  console.log("trim", query_obj.author.replace(/\s/g,''))
  }
  if ( apiQuery.q == "" )//q field is required
    err_array.push("at least one keyword must be specified")
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
    if(err_array.length > 0) {
      console.log(err_array)
      reject(err_array)
      err_array = [];
    }
    else {
      if(warnings.length > 0) {
        console.log(warnings)
        warnings = [];
      }
      console.log("Received query: ", searchQuery, '\nConverted into: ', apiQuery);
      twitter_client.get("search/tweets", apiQuery).then(tweets => {
        if (convert) {
          let tweetObjects = [];
          tweets.statuses.forEach(tweet => {
          tweetObjects.push(tweetConverter(tweet));
          });
          tweets = tweetObjects;
        }
        console.log("tweets: ",tweets)
        resolve(tweets, tweets._headers);
      }).catch(err => {
      reject(err)
      })
     }
   })
  }


function twitterPost(twitter_client, postQuery) {
  return new Promise((resolve, reject) => {
    twitter_client.post("statuses/update", postQuery).then(statuses => {
      resolve(statuses, statuses._headers)
    }).catch(err => {
      reject(err.errors, err._headers)
    })
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
  /*tweetObject.created_at = tweet.created_at;
  if(tweet.id_str)
    tweetObject.id = tweet.id_str;*/
  if (tweet.retweeted_status) {
    tweetObject.text = tweet.retweeted_status.text;
  //  tweetObject.type = "RT";
  //  tweetObject.embedLink = "twitter.com/" + tweet.retweeted_status.user.screen_name + "/status/" + tweet.retweeted_status.id_str
  }
  else {
    tweetObject.text = tweet.text;
  //  tweetObject.type = "T";
  //  tweetObject.embedLink = "twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str
  }/*
  tweetObject.tweetLink = 'twitter.com/i/web/status/' + tweet.id_str;
  tweetObject.profileImg = tweet.user.profile_image_url_https;*/
  tweetObject.username = tweet.user.name + ":" + tweet.user.screen_name;
  /*if (tweet.place) {
    tweetObject.place = { name: tweet.place.name, full_name: tweet.place.full_name, country_code: tweet.place.country_code, country: tweet.place.country }
  }
  if (tweet.coordinates) {
    tweetObject.geo = [tweet.coordinates.coordinates[0], tweet.coordinates.coordinates[1]]
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
  }*/
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
