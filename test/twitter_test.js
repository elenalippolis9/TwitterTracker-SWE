var assert = require('assert');
const { step } = require('mocha-steps');
const tweet_tracker = require('../src/main/js/tweet_tracker')
const twitter_account = require('../src/main/js/twitter_account')
const fs = require('fs')
var twitter_client = twitter_account.login(twitter_account);
var twitter_media_client = twitter_account.mediaLogin();
let tempTweet;
let status_text = "TweetTracker Mocha Test #swe2020";
let media_id;
let test_img = fs.readFileSync('src/renderer/img/twitter.png')

describe('TwitterAPI', function () {
  describe('Test Information', function () {
    step('Beware that running this mocha test will count towards twitter rate-limit', function () {
    });
    step('#uploadMedia(): Uploading an image to be set as media for the post', async function () {
      this.timeout(10000)
      await twitter_media_client.uploadMedia('image', test_img).then(id => {
        media_id = id.media_id_string;
      })
        .catch(err => {
          assert.fail(err.errors[0].message)
        })
    })
    step('#twitterPost(): Should post a new tweet. This tweet will have all optional fields(place,geo,hashtags,profileImg,media) set', async function () {
      await twitter_client.post('statuses/update', { status: status_text, media_ids: media_id, lat: 44.49381, long: 11.33875, place_id: "df51dec6f4ee2b2c", display_coordinates: true })
        .then(status => {
          tempTweet = status;
        })
        .catch(err => {
          assert.fail(err.errors[0].message)
        })
    })
    step('#twitterSearch(): Should retrieve some tweets', async function () {
      await twitter_client.get("search/tweets", { q: "youtube" })
        .catch((err, headers) => {
          assert.fail(err.errors[0].message)
        })
    });
    step('#twitterDelete(): Should destroy the tweet sent before.', async function () {
      await twitter_client.post("statuses/destroy", { id: tempTweet.id_str })
        .catch((err, headers) => {
          assert.fail(err.errors[0].message)
        })
    });
    step('#tweetConverter: Conversion to ad-hoc structure: "created_at, text, type, tweetLink, embedLink, username"  should be present(required fields)', function () {
      let convertedTweet = tweet_tracker.tweetConverter(tempTweet)
      if (!(convertedTweet.created_at && convertedTweet.text && convertedTweet.type && convertedTweet.tweetLink && convertedTweet.embedLink && convertedTweet.username)) {
        assert.fail("Conversion to ad-hoc structure(required fields) failed for some field.")
      }
    });
    step('#tweetConverter: Conversion to ad-hoc structure: "geo, hashtags, profileImg, imgLink"  should be present(optional fields)', function () {
      let convertedTweet = tweet_tracker.tweetConverter(tempTweet)
      if (!(convertedTweet.geo && convertedTweet.hashtags && convertedTweet.profileImg && convertedTweet.imgLink)) {
        assert.fail("Conversion to ad-hoc structure(optional fields) failed for some field.")
      }
    });

  });
});



