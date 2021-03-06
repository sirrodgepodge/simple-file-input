'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

var _simpleIsoFetch = require('simple-iso-fetch');

var _simpleIsoFetch2 = _interopRequireDefault(_simpleIsoFetch);

var _querystring = require('querystring');

var _isoPathJoin = require('iso-path-join');

var _isoPathJoin2 = _interopRequireDefault(_isoPathJoin);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// utilities


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

var SimpleFileInput = function (_Component) {
  _inherits(SimpleFileInput, _Component);

  function SimpleFileInput() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, SimpleFileInput);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = SimpleFileInput.__proto__ || Object.getPrototypeOf(SimpleFileInput)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      loadingState: _this.props.initialLoadState || 'pristine'
    }, _this.uniqueId = _shortid2.default.generate(), _this.getUnique = function () {
      return (Number(new Date()).toString() + '_' + _shortid2.default.generate()).replace(urlSafe, '_');
    }, _this.onChange = function (acceptableFileExtensions, event) {

      // handle cancel
      if (!event.target.files.length) return;

      // update loader state to loading
      _this.setLoading();

      // load in input asset
      _this.assetUpload(event, +new Date(), acceptableFileExtensions);
    }, _this.assetUpload = function (event, startTime, acceptableFileExtensions) {
      var fileArray = Array.from(event.target.files);

      // compose upload state handler
      var assetUploadStateHandler = _this.assetUploadStateHandlerGen(startTime, fileArray.length);
      var errorHandle = _this.errorHandle.bind(_this, assetUploadStateHandler);

      fileArray.forEach(function (file) {
        // file upload vars
        var fileObj = file,
            ext = fileObj.name.slice(fileObj.name.lastIndexOf('.')),
            name = (typeof _this.props.fileName !== 'undefined' ? _this.props.fileName : fileObj.name.slice(0, fileObj.name.lastIndexOf('.'))).replace(urlSafe, '_') + (typeof _this.props.fileAppend !== 'undefined' ? _this.props.fileAppend : '_' + _this.getUnique()) + ext,
            type = fileObj.type,
            size = fileObj.size;

        var fileInfoObj = {
          ext: ext,
          type: type,
          size: size,
          name: name,
          nameWithFolder: _this.props.remoteFolder ? (0, _isoPathJoin2.default)(_this.props.remoteFolder, name) : name
        };

        // clear input so that same file can be uploaded twice in a row
        if (global.document) {
          var domElem = document.getElementById(_this.uniqueId);
          if (domElem) {
            domElem.value = '';
            domElem.type = '';
            domElem.type = 'file';
          }
        }

        if (size > _this.props.maxSize) return errorHandle('upload is too large, upload size limit is ' + Math.round(size / 100) / 10 + 'KB');
        if (acceptableFileExtensions.indexOf(ext.toLowerCase()) === -1) return errorHandle('upload is not acceptable file type, acceptable extensions include ' + acceptableFileExtensions.join(', '));else {
          // trigger 'onLoadStart' function if provided
          if (_this.props.onLoadStart && typeof _this.props.onLoadStart === 'function') {
            _this.props.onLoadStart(null, fileInfoObj);
          }

          // // Handles immediate return of Data URI
          if (_this.props.onBlobLoad && typeof _this.props.onBlobLoad === 'function') {
            var reader = new FileReader();
            reader.readAsDataURL(fileObj);

            // send blob load error to callback
            reader.onerror = function (err) {
              if (!_this.props.onS3Load || !_this.props.signingRoute) assetUploadStateHandler(err, null);
              _this.props.onBlobLoad(err, null, fileInfoObj);
            };

            // sends blob to callback
            reader.onloadend = function (e) {
              if (!_this.props.onS3Load || !_this.props.signingRoute) assetUploadStateHandler(null, e.target.result);
              _this.props.onBlobLoad(null, e.target.result, fileInfoObj);
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
              _superagent2.default.put(res.body.signedRequest, fileObj).set('Content-Type', type).end(function (err, final) {
                var error = err || final.error;

                if (error) {
                  assetUploadStateHandler(error, null);
                  return _this.props.onS3Load(error, null, fileInfoObj);
                }

                // run state handler
                assetUploadStateHandler(null, res.body.url);

                // execute callback with S3 stored file name
                _this.props.onS3Load(null, res.body.url, fileInfoObj);
              });
            }).catch(function (err) {
              assetUploadStateHandler(err, null);
              _this.props.onS3Load(err, null, fileInfoObj);
            });
          }
        }
      });
    }, _this.assetUploadStateHandlerGen = function () {
      var startTime = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      var totalFileCount = arguments[1];

      var fileCounter = 0;
      return function (err, data) {
        if (err) {
          // update loader to failure
          _this.setState({
            loadingState: 'failure'
          });
        } else if (data) {
          fileCounter++;
          if (fileCounter === totalFileCount) {
            // update loader with success, wait a minimum amount of time if specified in order to smooth aesthetic
            var waitTime = Math.max(0, _this.props.minLoadTime - +new Date() + startTime);
            if (waitTime) {
              setTimeout(_this.setSuccess, waitTime);
            } else {
              _this.setSuccess();
            }
          }
        } else {
          // update loader to failure
          _this.setState({
            loadingState: 'failure'
          });
        }
      };
    }, _this.errorHandle = function (assetUploadStateHandler, err) {
      if (_this.props.onLoadStart) _this.props.onLoadStart(err, null);
      if (_this.props.onS3Load) _this.props.onS3Load(err, null);
      if (_this.props.onBlobLoad) _this.props.onBlobLoad(err, null);
      assetUploadStateHandler(err, null);
    }, _this.setLoading = function () {
      if (_this.state.loadingState !== 'loading') {
        _this.setState({
          loadingState: 'loading'
        });
      }
    }, _this.setSuccess = function () {
      if (_this.state.loadingState !== 'success') {
        _this.setState({
          loadingState: 'success'
        });
      }
    }, _this.setFailure = function () {
      if (_this.state.loadingState !== 'failure') {
        _this.setState({
          loadingState: 'failure'
        });
      }
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  // asset uploading function


  // callback fired when upload completes


  _createClass(SimpleFileInput, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          containerClass = _props.containerClass,
          containerStyle = _props.containerStyle,
          className = _props.className,
          style = _props.style,
          inputClass = _props.inputClass,
          inputStyle = _props.inputStyle,
          noMessage = _props.noMessage,
          messageClass = _props.messageClass,
          messageStyle = _props.messageStyle,
          multiple = _props.multiple,
          accept = _props.accept,
          type = _props.type,
          children = _props.children,
          pristineMessage = _props.pristineMessage,
          loadingMessage = _props.loadingMessage,
          successMessage = _props.successMessage,
          failureMessage = _props.failureMessage,
          pristineClass = _props.pristineClass,
          loadingClass = _props.loadingClass,
          successClass = _props.successClass,
          failureClass = _props.failureClass,
          remoteFolder = _props.remoteFolder,
          initialLoadState = _props.initialLoadState,
          minLoadTime = _props.minLoadTime,
          maxSize = _props.maxSize,
          onBlobLoad = _props.onBlobLoad,
          onS3Load = _props.onS3Load,
          signingRoute = _props.signingRoute,
          otherProps = _objectWithoutProperties(_props, ['containerClass', 'containerStyle', 'className', 'style', 'inputClass', 'inputStyle', 'noMessage', 'messageClass', 'messageStyle', 'multiple', 'accept', 'type', 'children', 'pristineMessage', 'loadingMessage', 'successMessage', 'failureMessage', 'pristineClass', 'loadingClass', 'successClass', 'failureClass', 'remoteFolder', 'initialLoadState', 'minLoadTime', 'maxSize', 'onBlobLoad', 'onS3Load', 'signingRoute']);

      var acceptableFileExtensions = (accept || acceptableExtensionsMap[type]).map(function (val) {
        return ("" + val)[0] !== '.' ? '.' + val : val;
      });

      return _react2.default.createElement(
        'div',
        {
          className: containerClass || '',
          style: containerStyle
        },
        _react2.default.createElement(
          'label',
          _extends({
            htmlFor: this.uniqueId,
            className: 'simple-file-input-label ' + (className || '') + ' ' + this.props[this.state.loadingState + 'Class'],
            style: style
          }, otherProps),
          !noMessage && _react2.default.createElement(
            'span',
            {
              className: 'simple-file-input-message ' + (messageClass || ''),
              style: messageStyle
            },
            this.props[this.state.loadingState + 'Message']
          ),
          children
        ),
        _react2.default.createElement('input', {
          className: 'simple-file-input-input ' + (inputClass || ''),
          style: _extends({}, !inputClass && { display: 'none' } || {}, inputStyle),
          type: 'file',
          multiple: multiple,
          accept: acceptableFileExtensions,
          onChange: this.onChange.bind(this, acceptableFileExtensions),
          name: this.uniqueId,
          id: this.uniqueId
        })
      );
    }
  }]);

  return SimpleFileInput;
}(_react.Component);

//
//
//
//
//
// // Just placing retrieval component here, worrying about getting webpack working later
//
//
//
//
//


SimpleFileInput.propTypes = {
  // styling
  containerClass: _react.PropTypes.string,
  containerStyle: _react.PropTypes.object,
  className: _react.PropTypes.string,
  style: _react.PropTypes.object,
  inputClass: _react.PropTypes.string,
  inputStyle: _react.PropTypes.object,
  messageClass: _react.PropTypes.string,
  messageStyle: _react.PropTypes.object,

  // hide success/failure message
  noMessage: _react.PropTypes.bool,
  pristineMessage: _react.PropTypes.string,
  loadingMessage: _react.PropTypes.string,
  successMessage: _react.PropTypes.string,
  failureMessage: _react.PropTypes.string,

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

  // triggered when upload begins
  onLoadStart: _react.PropTypes.func,

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
  // specifies S3 folder path inside of bucket
  remoteFolder: _react.PropTypes.string,

  // determines whether or not user can upload multiple files at once
  multiple: _react.PropTypes.bool,

  // specifies acceptable file types
  type: _react.PropTypes.oneOf(['image', 'video', 'document', 'spreadsheet']), // abstraction
  accept: _react.PropTypes.array };
SimpleFileInput.defaultProps = {
  // 100MB (unit is bytes)
  maxSize: 100000000,

  // sets minimum amount of time before loader clears
  minLoadTime: 125,

  // default style objects to empty object
  style: {},
  inputStyle: {},
  messageStyle: {},

  // default state-dependent messages
  pristineMessage: '',
  loadingMessage: '',
  successMessage: 'Upload Success!',
  failureMessage: 'Upload Failed - Please Try Again',

  // default to font awesome class names
  pristineClass: 'fa fa-upload',
  loadingClass: 'fa fa-spinner fa-spin',
  successClass: 'fa fa-thumbs-o-up',
  failureClass: 'fa fa-thumbs-o-down'
};

var RetrievalButton = function (_Component2) {
  _inherits(RetrievalButton, _Component2);

  function RetrievalButton() {
    var _ref2;

    var _temp2, _this2, _ret2;

    _classCallCheck(this, RetrievalButton);

    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    return _ret2 = (_temp2 = (_this2 = _possibleConstructorReturn(this, (_ref2 = RetrievalButton.__proto__ || Object.getPrototypeOf(RetrievalButton)).call.apply(_ref2, [this].concat(args))), _this2), _this2.state = {
      loadingState: _this2.props.initialLoadState || 'notLoading',
      loaded: false,
      fileLink: ''
    }, _this2.componentDidMount = function () {
      // load in fileName asset on mount
      if (_this2.props.autoLoad && _this2.props.fileName) {
        _this2.assetRetrieve();
      }
    }, _this2.componentWillReceiveProps = function (nextProps) {
      // hacky check for isMounted
      if (_this2.props.autoLoad && _this2.props.fileName !== nextProps.fileName) {
        _this2.assetRetrieve(nextProps.remoteFolder ? (0, _isoPathJoin2.default)(nextProps.remoteFolder, nextProps.fileName) : nextProps.fileName);
      }
    }, _this2.onClick = function () {
      if (!_this2.props.autoLoad) {
        // load in fileName asset
        _this2.assetRetrieve();
      }
    }, _this2.assetRetrieve = function (fileName) {
      fileName = fileName || (_this2.props.remoteFolder ? (0, _isoPathJoin2.default)(_this2.props.remoteFolder, _this2.props.fileName) : _this2.props.fileName);

      if (!fileName || !_this2.props.signingRoute) {
        console.error('need to add fileName prop and signingRoute prop in order to retrieve files');
        if (!fileName) console.error('fileName prop is missing');
        if (!_this2.props.signingRoute) console.error('signingRoute prop is missing');
      }

      var startTime = +new Date();

      // update loader state to loading
      _this2.setLoading(_this2.props.onLoadStart);

      // compose upload state handler
      var assetRetrievalStateHandler = _this2.assetRetrievalStateHandlerGen(startTime);
      var errorHandle = _this2.errorHandle.bind(_this2, assetRetrievalStateHandler);

      _simpleIsoFetch2.default.post({
        route: _this2.props.signingRoute,
        body: {
          name: fileName
        }
      }).then(function (res) {
        if (_this2.props.onS3Url) _this2.props.onS3Url(null, res.body.signedRequest);

        // update URL with fetched URL
        _this2.updateUrl(res.body.signedRequest, !_this2.props.autoLoad ? function () {
          return window.open(res.body.signedRequest, '_blank');
        } : null);

        // set Loaded to back to false once expired
        setTimeout(function () {
          return _this2.setNotLoaded(function () {
            return _this2.props.autoLoad && _this2.assetRetrieve();
          });
        }, Math.max(+(0, _querystring.parse)(res.body.signedRequest).Expires * 1000 - Date.now() - 100, 0) || 900000);

        if (!_this2.props.onS3Res) {
          assetRetrievalStateHandler(null, res.body.signedRequest);
        } else {
          _superagent2.default.get(res.body.signedRequest).end(function (err, fileRes) {
            var error = err || fileRes.error;

            // handle error and halt execution
            if (error) return errorHandle(error);

            // execute callback with S3 stored file name
            if (_this2.props.onS3Res) _this2.props.onS3Res(null, res.text);

            // update state
            assetRetrievalStateHandler(null, res.text);

            // @TODO handle blob retrieval
          });
        }
      }).catch(function (err) {
        return errorHandle(err);
      });
    }, _this2.assetRetrievalStateHandlerGen = function () {
      var startTime = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      return function (err, data) {
        if (err) {
          // update loader to failure
          _this2.setFailure();
        } else if (data) {
          // update loader with success, wait a minimum amount of time if specified in order to smooth aesthetic
          var waitTime = Math.max(0, _this2.props.minLoadTime - +new Date() + startTime);
          if (waitTime) {
            setTimeout(_this2.setNotLoading, waitTime);
          } else {
            _this2.setNotLoading();
          }
        } else {
          // update loader to failure
          _this2.setFailure();
        }
      };
    }, _this2.errorHandle = function (assetRetrievalStateHandler, err) {
      if (_this2.props.onS3Url) _this2.props.onS3Url(err, null);
      if (_this2.props.onS3Res) _this2.props.onS3Res(err, null);
      assetRetrievalStateHandler(err, null);
    }, _this2.updateUrl = function (fileLink, cb) {
      if (!_this2.props.href && !_this2.props.fileLink) {
        _this2.setState({
          fileLink: fileLink,
          loaded: true
        }, cb);
      }
    }, _this2.setNotLoaded = function (cb) {
      if (_this2.state.loaded) {
        _this2.setState({
          loaded: false
        }, cb);
      } else {
        cb();
      }
    }, _this2.setLoading = function (cb) {
      if (_this2.state.loadingState !== 'loading') {
        _this2.setState({
          loadingState: 'loading'
        }, cb);
      } else {
        cb();
      }
    }, _this2.setFailure = function () {
      if (_this2.state.loadingState !== 'failure') {
        _this2.setState({
          loadingState: 'failure'
        });
      }
    }, _this2.setNotLoading = function () {
      if (_this2.state.loadingState !== 'notLoading') {
        _this2.setState({
          loadingState: 'notLoading'
        });
      }
    }, _temp2), _possibleConstructorReturn(_this2, _ret2);
  }

  // asset uploading function


  // callback fired when upload completes


  _createClass(RetrievalButton, [{
    key: 'render',
    value: function render() {
      var _props2 = this.props,
          className = _props2.className,
          style = _props2.style,
          autoLoad = _props2.autoLoad,
          noMessage = _props2.noMessage,
          messageClass = _props2.messageClass,
          messageStyle = _props2.messageStyle,
          href = _props2.href,
          fileLink = _props2.fileLink,
          maxSize = _props2.maxSize,
          fileName = _props2.fileName,
          notLoadingMessage = _props2.notLoadingMessage,
          successMessage = _props2.successMessage,
          failureMessage = _props2.failureMessage,
          notLoadingClass = _props2.notLoadingClass,
          loadingClass = _props2.loadingClass,
          failureClass = _props2.failureClass,
          initialLoadState = _props2.initialLoadState,
          signingRoute = _props2.signingRoute,
          remoteFolder = _props2.remoteFolder,
          minLoadTime = _props2.minLoadTime,
          onLoadStart = _props2.onLoadStart,
          onS3Url = _props2.onS3Url,
          onS3Res = _props2.onS3Res,
          otherProps = _objectWithoutProperties(_props2, ['className', 'style', 'autoLoad', 'noMessage', 'messageClass', 'messageStyle', 'href', 'fileLink', 'maxSize', 'fileName', 'notLoadingMessage', 'successMessage', 'failureMessage', 'notLoadingClass', 'loadingClass', 'failureClass', 'initialLoadState', 'signingRoute', 'remoteFolder', 'minLoadTime', 'onLoadStart', 'onS3Url', 'onS3Res']);

      return _react2.default.createElement(
        'a',
        _extends({
          target: '_blank',
          className: 'retrieval-button ' + (className || '') + ' ' + this.props[(autoLoad && this.state.loadingState === 'loading' ? 'notLoading' : this.state.loadingState) + 'Class'],
          style: _extends({}, this.state.loadingState === 'loading' ? {
            cursor: 'default'
          } : {
            cursor: 'pointer'
          }, {
            textDecoration: 'none'
          }, style),
          onClick: !this.state.loaded && this.onClick,
          href: this.state.loaded && (fileLink || href || this.state.fileLink) || 'javascript:void(0)' // eslint-disable-line
        }, otherProps),
        !noMessage && _react2.default.createElement(
          'span',
          {
            className: 'retrieval-button-message ' + messageClass,
            style: messageStyle
          },
          this.props[this.state.loadingState + 'Message']
        ),
        this.props.children
      );
    }
  }]);

  return RetrievalButton;
}(_react.Component);

RetrievalButton.propTypes = {
  // styling
  className: _react.PropTypes.string,
  style: _react.PropTypes.object,
  messageClass: _react.PropTypes.string,
  messageStyle: _react.PropTypes.object,

  // loading state classes
  notLoadingClass: _react.PropTypes.string,
  loadingClass: _react.PropTypes.string,
  failureClass: _react.PropTypes.string,

  // loading state messages
  noMessage: _react.PropTypes.bool,
  notLoadingMessage: _react.PropTypes.string,
  successMessage: _react.PropTypes.string,
  failureMessage: _react.PropTypes.string,

  // initial icon state
  autoLoad: _react.PropTypes.bool, // loads fileName specified on mount and onchange
  openOnRetrieve: _react.PropTypes.bool, // determines if file is opened automatically
  initialLoadState: _react.PropTypes.oneOf(['notLoading', 'loading', '']),

  // helps smooth aesthetic
  minLoadTime: _react.PropTypes.number,

  // overrides uploaded file's name
  fileName: _react.PropTypes.string,
  // specifies S3 folder path inside of bucket
  remoteFolder: _react.PropTypes.string,
  // S3 signature getting route
  signingRoute: _react.PropTypes.string,

  // uploaded file link
  fileLink: _react.PropTypes.string,
  href: _react.PropTypes.string,

  // triggered when loading begins
  onLoadStart: _react.PropTypes.func,
  // triggered when s3 url retrieval is done
  onS3Url: _react.PropTypes.func,
  // triggered with s3 url get response
  onS3Res: _react.PropTypes.func
};
RetrievalButton.defaultProps = {
  // 100MB (unit is bytes)
  maxSize: 100000000,

  // sets minimum amount of time before loader clears
  minLoadTime: 0,

  // string to append to fileName
  remoteFolder: '',

  // default style objects to empty object
  style: {},
  messageStyle: {},

  // default state-dependent messages
  notLoadingMessage: '',
  successMessage: 'Download Success!',
  failureMessage: 'Download Failed - Please Try Again',

  // default to font awesome class names
  notLoadingClass: 'fa fa-download',
  loadingClass: 'fa fa-spinner fa-spin',
  failureClass: 'fa fa-thumbs-o-down'
};


SimpleFileInput.RetrievalButton = RetrievalButton;
module.exports = SimpleFileInput;