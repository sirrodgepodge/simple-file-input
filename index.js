'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _class, _temp2;

// utilities


var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

var _simpleIsoFetch = require('simple-iso-fetch');

var _simpleIsoFetch2 = _interopRequireDefault(_simpleIsoFetch);

var _isoPathJoin = require('iso-path-join');

var _isoPathJoin2 = _interopRequireDefault(_isoPathJoin);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// needed because I can't figure out how to make s3 work with fetch

// get rid of non-word characters
var urlSafe = /\W/g;

// file types
var acceptableExtensionsMap = {
  image: ['png', 'jpeg', 'gif', 'jpg', 'svg'],
  video: ['mp4', 'webm'],
  document: ['pdf', 'doc', 'docx', 'pages'],
  spreadsheet: ['xls', 'xlsx', 'numbers', 'csv']
};

module.exports = (_temp2 = _class = function (_Component) {
  _inherits(FileInput, _Component);

  function FileInput() {
    var _Object$getPrototypeO;

    var _temp, _this, _ret;

    _classCallCheck(this, FileInput);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_Object$getPrototypeO = Object.getPrototypeOf(FileInput)).call.apply(_Object$getPrototypeO, [this].concat(args))), _this), _this.state = {
      loadingState: _this.props.initialLoadState || 'pristine',
      loadMessage: ''
    }, _this.uniqueId = _shortid2.default.generate(), _this.getUnique = function () {
      return (Number(new Date()).toString() + '_' + _shortid2.default.generate()).replace(urlSafe, '_');
    }, _this.onChange = function (acceptableFileExtensions, event) {
      // handle cancel
      if (!event.target.files.length) return;

      // update loader state to loading
      _this.setState({
        loadingState: 'loading',
        loadMessage: ''
      });

      // load in input asset
      _this.assetUpload(event, +new Date(), acceptableFileExtensions);
    }, _this.assetUpload = function (event, startTime, acceptableFileExtensions) {
      // file upload vars
      var fileObj = event.target.files[0],
          ext = fileObj.name.slice(fileObj.name.lastIndexOf('.')),
          name = (typeof _this.props.fileName !== 'undefined' ? _this.props.fileName : fileObj.name.slice(0, fileObj.name.lastIndexOf('.'))).replace(urlSafe, '_') + (typeof _this.props.fileAppend !== 'undefined' ? _this.props.fileAppend : '_' + _this.getUnique()) + ext,
          type = fileObj.type,
          size = fileObj.size;

      // compose upload state handler
      var assetUploadStateHandler = _this.assetUploadStateHandlerGen(startTime);

      if (size > _this.props.maxSize) return assetUploadStateHandler(new Error('upload is too large, upload size limit is ' + Math.round(size / 100) / 10 + 'KB'), null);
      if (acceptableFileExtensions.indexOf(ext.toLowerCase()) === -1) return assetUploadStateHandler(new Error('upload is not acceptable file type, acceptable extensions include ' + acceptableFileExtensions.join(', ')), null);else {
        // // Handles immediate return of Data URI
        if (_this.props.onBlobLoad && typeof onBlobLoad === 'function') {
          var reader = new FileReader();
          reader.readAsDataURL(fileObj);

          // send blob load error to callback
          reader.onerror = function (err) {
            if (!_this.props.onS3Load || !_this.props.signingRoute) assetUploadStateHandler(err, null);
            _this.props.onBlobLoad(err, null);
          };

          // sends blob to callback
          reader.onloadend = function (e) {
            if (!_this.props.onS3Load || !_this.props.signingRoute) assetUploadStateHandler(null, e.target.result);
            _this.props.onBlobLoad(null, e.target.result);
          };
        }

        // // Handles S3 storage
        if (_this.props.onS3Load && typeof _this.props.onS3Load === 'function') {
          // warn if no upload string provided
          if (typeof _this.props.signingRoute !== 'string') return console.error('need to supply signing route to use s3!');

          _simpleIsoFetch2.default.post({
            route: _this.props.signingRoute,
            body: {
              name: _this.props.remoteFolder ? (0, _isoPathJoin2.default)(_this.props.remoteFolder, name) : name,
              type: type
            }
          }).then(function (res) {
            _superagent2.default.put(res.body.signed_request, fileObj).end(function (err, final) {
              var error = err || final.error;

              if (error) {
                assetUploadStateHandler(error, null);
                return _this.props.onS3Load(error, null);
              }

              // run state handler
              assetUploadStateHandler(null, res.body.url);

              // execute callback with S3 stored file name
              _this.props.onS3Load(null, res.body.url);

              // //// as soon as I figure out how to make fetch work with S3 I'll replace this
              // return simpleIsoFetch.put({
              //   route: res.body.signed_request,
              // headers: {
              //   'x-amz-acl': 'public-read'
              // },
              //   body: fileObj
              // });
            });
          }).catch(function (err) {
            console.log('Failed to upload file: ' + err);
            _this.props.onS3Load(err, null);
          });
        }
      }
    }, _this.assetUploadStateHandlerGen = function () {
      var startTime = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
      return function (err, data) {
        if (err) {
          // update loader to failure
          _this.setState({
            loadingState: 'failure',
            loadMessage: 'Upload Failed - ' + err.message
          });
        } else if (data) {
          // update loader with success, wait a minimum amount of time if specified in order to smooth aesthetic
          var waitTime = Math.max(0, _this.props.minLoadTime - +new Date() + startTime);
          if (waitTime) {
            setTimeout(_this.setSuccess, waitTime);
          } else {
            _this.setSuccess();
          }
        } else {
          // update loader to failure
          _this.setState({
            loadingState: 'failure',
            loadMessage: 'Upload Failed - Please Try Again'
          });
        }
      };
    }, _this.setSuccess = function () {
      _this.setState({
        loadingState: 'success',
        loadMessage: 'Upload Success!'
      });
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  // asset uploading function


  // callback fired when upload completes


  _createClass(FileInput, [{
    key: 'render',
    value: function render() {
      var _props = this.props;
      var className = _props.className;
      var style = _props.style;
      var inputClass = _props.inputClass;
      var inputStyle = _props.inputStyle;
      var messageClass = _props.messageClass;
      var messageStyle = _props.messageStyle;
      var pristineClass = _props.pristineClass;
      var loadingClass = _props.loadingClass;
      var successClass = _props.successClass;
      var failureClass = _props.failureClass;
      var initialLoadState = _props.initialLoadState;
      var minLoadTime = _props.minLoadTime;
      var maxSize = _props.maxSize;
      var onBlobLoad = _props.onBlobLoad;
      var onS3Load = _props.onS3Load;
      var signingRoute = _props.signingRoute;
      var accept = _props.accept;
      var type = _props.type;

      var otherProps = _objectWithoutProperties(_props, ['className', 'style', 'inputClass', 'inputStyle', 'messageClass', 'messageStyle', 'pristineClass', 'loadingClass', 'successClass', 'failureClass', 'initialLoadState', 'minLoadTime', 'maxSize', 'onBlobLoad', 'onS3Load', 'signingRoute', 'accept', 'type']);

      var acceptableFileExtensions = accept || acceptableExtensionsMap[type].map(function (val) {
        return '.' + val;
      });

      return _react2.default.createElement(
        'label',
        _extends({
          htmlFor: this.uniqueId,
          className: 'simple-file-input-container ' + (className || '') + ' ' + this.props[this.state.loadingState + 'Class'],
          style: style
        }, otherProps),
        _react2.default.createElement('input', {
          className: 'simple-file-input-input ' + (inputClass || ''),
          style: _extends({}, !inputClass && { display: 'none' } || {}, inputStyle),
          type: 'file',
          accept: acceptableFileExtensions,
          onChange: this.onChange.bind(this, acceptableFileExtensions),
          name: this.uniqueId,
          id: this.uniqueId
        }),
        _react2.default.createElement(
          'span',
          {
            className: 'simple-file-input-message ' + (messageClass || ''),
            style: messageStyle
          },
          this.state.loadMessage
        )
      );
    }
  }]);

  return FileInput;
}(_react.Component), _class.propTypes = {
  // styling
  className: _react.PropTypes.string,
  style: _react.PropTypes.object,
  inputClass: _react.PropTypes.string,
  inputStyle: _react.PropTypes.object,
  messageClass: _react.PropTypes.string,
  messageStyle: _react.PropTypes.object,

  // loading state classes
  pristineClass: _react.PropTypes.string,
  loadingClass: _react.PropTypes.string,
  successClass: _react.PropTypes.string,
  failureClass: _react.PropTypes.string,

  // initial icon state
  initialLoadState: _react.PropTypes.oneOf(['pristine', 'loading', 'success', 'failure']),

  // helps smooth aesthetic
  minLoadTime: _react.PropTypes.number,

  // maximum file size (in bytes)
  maxSize: _react.PropTypes.number,

  // triggered when blob is loaded if provided
  onBlobLoad: _react.PropTypes.func,

  // triggered when s3 upload is done, if function is provided
  onS3Load: _react.PropTypes.func,
  // S3 signature getting route
  signingRoute: _react.PropTypes.string,
  // overrides uploaded file's name
  fileName: _react.PropTypes.string,
  // overrides default string appended to file name
  fileAppend: _react.PropTypes.string,
  // folder to prepend to file name
  remoteFolder: _react.PropTypes.string,

  // specifies acceptable file types
  type: _react.PropTypes.oneOf(['image', 'video', 'document', 'spreadsheet']), // abstraction
  accept: _react.PropTypes.array }, _class.defaultProps = {
  // 100MB (unit is bytes)
  maxSize: 100000000,

  // sets minimum amount of time before loader clears
  minLoadTime: 125,

  // default style objects to empty object
  style: {},
  inputStyle: {},
  messageStyle: {},

  // default to font awesome class names
  pristineClass: 'fa fa-upload',
  loadingClass: 'fa fa-spinner fa-spin',
  successClass: 'fa fa-thumbs-o-up',
  failureClass: 'fa fa-thumbs-o-down'
}, _temp2);