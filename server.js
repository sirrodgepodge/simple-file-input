'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.signS3 = exports.setBucket = undefined;

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

var _merge = require('lodash/merge');

var _merge2 = _interopRequireDefault(_merge);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// concatenate 'prod' for production bucket
///// @TODO use webpack to put this in a separate file

var s3 = new _awsSdk2.default.S3();

var config = {
  s3Bucket: null,
  hostUrl: s3.endpoint.protocol + '//' + s3.endpoint.hostname + '/'
};

var setBucket = exports.setBucket = function setBucket(bucket) {
  config.s3Bucket = bucket;
};

/////

// sharing instance so utility functions don't need to each make their own
s3.getSignedUrlAsync = _bluebird2.default.promisify(s3.getSignedUrl);

var signS3 = exports.signS3 = function signS3(infoObj) {
  return s3.getSignedUrlAsync('putObject', {
    Bucket: config.s3Bucket || infoObj.bucket,
    Key: infoObj.name,
    Expires: 60,
    ContentType: infoObj.type,
    ACL: 'public-read'
  }).then(function (data) {
    return _bluebird2.default.resolve({
      signed_request: data,
      url: '' + config.hostUrl + (config.s3Bucket || infoObj.bucket) + '/' + infoObj.name
    });
  }).catch(function (err) {
    console.log('Failed to get back end S3 signature for front end image upload to S3: ', err);
    return _bluebird2.default.reject(err);
  });
};