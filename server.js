'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _sharedS3Instance = require('./sharedS3Instance');

var _sharedS3Instance2 = _interopRequireDefault(_sharedS3Instance);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var s3Bucket = _sharedS3Instance.config.s3Bucket;

// sharing instance so utility functions don't need to each make their own

var hostUrl = _sharedS3Instance.config.hostUrl;

_sharedS3Instance2.default.getSignedUrlAsync = _bluebird2.default.promisify(_sharedS3Instance2.default.getSignedUrl);

exports.default = function (infoObj) {
  return _sharedS3Instance2.default.getSignedUrlAsync('putObject', {
    Bucket: s3Bucket || infoObj.bucket,
    Key: infoObj.name,
    Expires: 60,
    ContentType: infoObj.type,
    ACL: 'public-read'
  }).then(function (data) {
    return _bluebird2.default.resolve({
      signed_request: data,
      url: '' + hostUrl + (s3Bucket || infoObj.bucket) + '/' + infoObj.name
    });
  }).catch(function (err) {
    console.log('Failed to get back end S3 signature for front end image upload to S3: ', err);
    return _bluebird2.default.reject(err);
  });
};