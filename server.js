'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.signGetFromS3 = exports.signUploadToS3 = exports.setBucket = exports.config = exports.initS3 = exports.s3 = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash.merge');

var _lodash2 = _interopRequireDefault(_lodash);

var _isoPathJoin = require('iso-path-join');

var _isoPathJoin2 = _interopRequireDefault(_isoPathJoin);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

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
  return (0, _isoPathJoin2.default)('' + config.hostUrl + (s3.config.s3BucketEndpoint ? '' : bucket), name);
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

  var otherOptions = _objectWithoutProperties(_ref2, ['name', 'expires', 'bucket', 'isPrivate', 'acl']);

  // catching argument errors
  if (typeof s3.getSignedUrlAsync !== 'function') return console.log(new Error('Need to run the \'initS3\' method prior to using helper functions'));

  if (typeof bucket !== 'string' && typeof config.s3Bucket !== 'string') return console.log(new Error('must provide \'bucket\' property as string either via \'setBucket\' method or options object (second argument)'));

  if (typeof reqName !== 'string' && typeof name !== 'string') return console.log(new Error('must provide \'name\' property as string in either request object (first argument) or options object (second argument)'));

  if (typeof type !== 'string') return console.log(new Error('must provide \'type\' property as mime type string in request object (first argument)'));

  // need to
  var fileName = name || reqName;
  fileName = fileName[0] === '/' ? fileName.slice(1) : fileName;

  // actual function execution
  return s3.getSignedUrlAsync('putObject', _extends({
    Bucket: bucket || config.s3Bucket || null,
    Key: fileName,
    Expires: expires || 60,
    ContentType: type,
    ACL: acl || isPrivate ? 'private' : 'public-read'
  }, otherOptions)).then(function (data) {
    return _bluebird2.default.resolve({
      signedRequest: data,
      url: getObjectUrl(bucket || config.s3Bucket, name || reqName)
    });
  }).catch(function (err) {
    console.log('Failed to get back end S3 signature for front end image upload to S3: ', err);
    return _bluebird2.default.reject(err);
  });
};

var signGetFromS3 = exports.signGetFromS3 = function signGetFromS3(name) {
  var _ref3 = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var bucket = _ref3.bucket;
  var expires = _ref3.expires;

  var otherOptions = _objectWithoutProperties(_ref3, ['bucket', 'expires']);

  // allow key to be provided as a string
  var Key = (typeof name === 'undefined' ? 'undefined' : _typeof(name)) === 'object' && name !== null ? name.name : name;

  // catching argument errors
  if (typeof s3.getSignedUrlAsync !== 'function') return console.log(new Error('Need to run the \'initS3\' method prior to using helper functions'));

  if (typeof bucket !== 'string' && typeof config.s3Bucket !== 'string') return console.log(new Error('must provide \'bucket\' property as string either via \'setBucket\' method or options object (second argument)'));

  if (typeof Key !== 'string') return console.log(new Error('must provide \'name\' as either string in first argument or string property on object in first argument'));

  return s3.getSignedUrlAsync('getObject', _extends({
    Bucket: bucket || config.s3Bucket || null,
    Key: Key,
    Expires: expires || 60
  }, otherOptions)).then(function (data) {
    return _bluebird2.default.resolve({
      signedRequest: data
    });
  }).catch(function (err) {
    console.log('Failed to get back end S3 signature for front end image upload to S3: ', err);
    return _bluebird2.default.reject(err);
  });
};