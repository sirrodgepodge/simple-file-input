'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.signUploadToS3 = exports.setBucket = exports.config = exports.initS3 = exports.s3 = undefined;

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
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  (0, _lodash2.default)(s3, new awsSdk.S3(options));

  // promisifying used methods
  s3.getSignedUrlAsync = _bluebird2.default.promisify(s3.getSignedUrl);
};

// default s3Bucket var held at this scope for library closure
var s3Bucket = void 0;

// vars required for s3 use
var config = exports.config = {
  get s3Bucket() {
    return s3Bucket || null;
  },
  get hostUrl() {
    return !s3.endpoint ? null : s3.endpoint.protocol + '//' + s3.endpoint.hostname + '/';
  }
};

// use this function to set s3 bucket
var setBucket = exports.setBucket = function setBucket(bucket) {
  s3Bucket = bucket;
};

// genrates url for stored object to send to the front end
var getObjectUrl = function getObjectUrl(bucket, name) {
  return '' + config.hostUrl + (s3.config.s3BucketEndpoint ? '' : bucket) + '/' + name;
};

// // Helper Functions

// helper for uploading to S3
var signUploadToS3 = exports.signUploadToS3 = function signUploadToS3() {
  var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var reqName = _ref.name;
  var type = _ref.type;

  var _ref2 = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var name = _ref2.name;
  var expires = _ref2.expires;
  var bucket = _ref2.bucket;
  var isPrivate = _ref2.isPrivate;
  var acl = _ref2.acl;

  // catching argument errors
  if (!s3.getSignedUrlAsync) return console.log(new Error('Error: Need to run the \'initS3\' method prior to using helper functions'));

  if (!bucket && !config.s3Bucket) return console.log(new Error('Error: no bucket provided via \'setBucket\' method or options object'));

  if (!reqName && !name) return console.log(new Error('Error: must provide \'name\' property in either request object (first argument) or options object (second argument)'));

  if (!type) return console.log(new Error('Error: must provide \'type\' property in request object (first argument)'));

  // actual function execution
  return s3.getSignedUrlAsync('putObject', {
    Bucket: bucket || config.s3Bucket || null,
    Key: name || reqName,
    Expires: expires || 60,
    ContentType: type,
    ACL: acl || isPrivate ? 'authenticated-read' : 'public-read'
  }).then(function (data) {
    return _bluebird2.default.resolve({
      signed_request: data,
      url: getObjectUrl(bucket || config.s3Bucket, name || reqName)
    });
  }).catch(function (err) {
    console.log('Failed to get back end S3 signature for front end image upload to S3: ', err);
    return _bluebird2.default.reject(err);
  });
};