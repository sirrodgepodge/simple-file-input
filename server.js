'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.signS3 = exports.setBucket = exports.initS3 = exports.s3 = undefined;

var _lodash = require('lodash.merge');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// concatenate 'prod' for production bucket
///// @TODO use webpack to put this in a separate file

var s3 = exports.s3 = {};
var initS3 = exports.initS3 = function initS3(awsSdk) {
  (0, _lodash2.default)(s3, new awsSdk.S3());

  // promisifying used methods
  s3.getSignedUrlAsync = _bluebird2.default.promisify(s3.getSignedUrl);
};

// vars required for s3 use
var config = {
  s3Bucket: null,
  get hostUrl() {
    return s3.endpoint && s3.endpoint.protocol + '//' + s3.endpoint.hostname + '/' || null;
  }
};

var setBucket = exports.setBucket = function setBucket(bucket) {
  config.s3Bucket = bucket;
};

/////

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