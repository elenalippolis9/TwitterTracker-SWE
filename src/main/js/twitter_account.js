const Twitter = require('twitter-lite')
const config = require('../../../data/secrets/config.json')
const TwitterMedia = require('twitter-media');

exports.login = () => {
    let twitter_account = new Twitter({
        subdomain: "api", // "api" is the default (change for other subdomains)
        version: "1.1", // version "1.1" is the default (change for other subdomains)
        consumer_key: config.consumer_key,
        consumer_secret: config.consumer_secret,
        access_token_key: config.access_token_key,
        access_token_secret: config.access_token_secret
    });
    return twitter_account;
}

exports.mediaLogin = () => {
    let twitter_media = new TwitterMedia({
        consumer_key: config.consumer_key,
        consumer_secret: config.consumer_secret,
        token: config.access_token_key,
        token_secret: config.access_token_secret
    })
    return twitter_media;
}