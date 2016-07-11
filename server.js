'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.signUploadToS3 = exports.setBucket = exports.initS3 = exports.s3 = undefined;

var _lodash = require('lodash.merge');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// // Configuration

// declare exportable s3 object
var s3 = exports.s3 = {};

// use this function to initialize s3 bucket on previously declared object
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

// use this function to set s3 bucket
var setBucket = exports.setBucket = function setBucket(bucket) {
  config.s3Bucket = bucket;
};

// // Helper Functions

// helper for uploading to S3
var signUploadToS3 = exports.signUploadToS3 = function signUploadToS3(infoObj) {
  var _ref = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var name = _ref.name;
  var expires = _ref.expires;
  var bucket = _ref.bucket;
  var isPrivate = _ref.isPrivate;
  var acl = _ref.acl;
  return s3.getSignedUrlAsync('putObject', {
    Bucket: config.s3Bucket || bucket || console.log('Error: no bucket provided via \'setBucket\' helper or options object') || null,
    Key: name || infoObj.name,
    Expires: expires || 60,
    ContentType: infoObj.type,
    ACL: acl || isPrivate ? 'authenticated-read' : 'public-read'
  }).then(function (data) {
    return _bluebird2.default.resolve({
      signed_request: data,
      url: '' + config.hostUrl + (config.s3Bucket || bucket) + '/' + infoObj.name
    });
  }).catch(function (err) {
    console.log('Failed to get back end S3 signature for front end image upload to S3: ', err);
    return _bluebird2.default.reject(err);
  });
};