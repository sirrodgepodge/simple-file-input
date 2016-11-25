'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

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

var RetrievalButton = function (_Component) {
  _inherits(RetrievalButton, _Component);

  function RetrievalButton() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, RetrievalButton);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = RetrievalButton.__proto__ || Object.getPrototypeOf(RetrievalButton)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      loadingState: _this.props.initialLoadState || 'notLoading',
      loaded: false,
      fileLink: ''
    }, _this.componentDidMount = function () {
      // load in fileName asset on mount
      if (_this.props.autoLoad && _this.props.fileName) {
        _this.assetRetrieve();
      }
    }, _this.componentWillReceiveProps = function (nextProps) {
      // hacky check for isMounted
      if (_this.props.autoLoad && _this.props.fileName !== nextProps.fileName) {
        _this.assetRetrieve(nextProps.remoteFolder ? (0, _isoPathJoin2.default)(nextProps.remoteFolder, nextProps.fileName) : nextProps.fileName);
      }
    }, _this.onClick = function () {
      if (!_this.props.autoLoad) {
        // load in fileName asset
        _this.assetRetrieve();
      }
    }, _this.assetRetrieve = function (fileName) {
      fileName = fileName || (_this.props.remoteFolder ? (0, _isoPathJoin2.default)(_this.props.remoteFolder, _this.props.fileName) : _this.props.fileName);

      if (!fileName || !_this.props.signingRoute) {
        console.error('need to add fileName prop and signingRoute prop in order to retrieve files');
        if (!fileName) console.error('fileName prop is missing');
        if (!_this.props.signingRoute) console.error('signingRoute prop is missing');
      }

      var startTime = +new Date();

      // update loader state to loading
      _this.setLoading(_this.props.onLoadStart);

      // compose upload state handler
      var assetRetrievalStateHandler = _this.assetRetrievalStateHandlerGen(startTime);
      var errorHandle = _this.errorHandle.bind(_this, assetRetrievalStateHandler);

      _simpleIsoFetch2.default.post({
        route: _this.props.signingRoute,
        body: {
          name: fileName
        }
      }).then(function (res) {
        if (_this.props.onS3Url) _this.props.onS3Url(null, res.body.signedRequest);

        // update URL with fetched URL
        _this.updateUrl(res.body.signedRequest, !_this.props.autoLoad ? function () {
          return window.open(res.body.signedRequest, '_blank');
        } : null);

        // set Loaded to back to false once expired
        setTimeout(function () {
          return _this.setNotLoaded(function () {
            return _this.props.autoLoad && _this.assetRetrieve();
          });
        }, Math.max(+(0, _querystring.parse)(res.body.signedRequest).Expires * 1000 - Date.now() - 100, 0) || 900000);

        if (!_this.props.onS3Res) {
          assetRetrievalStateHandler(null, res.body.signedRequest);
        } else {
          _superagent2.default.get(res.body.signedRequest).end(function (err, fileRes) {
            var error = err || fileRes.error;

            // handle error and halt execution
            if (error) return errorHandle(error);

            // execute callback with S3 stored file name
            if (_this.props.onS3Res) _this.props.onS3Res(null, res.text);

            // update state
            assetRetrievalStateHandler(null, res.text);

            // @TODO handle blob retrieval
          });
        }
      }).catch(function (err) {
        return errorHandle(err);
      });
    }, _this.assetRetrievalStateHandlerGen = function () {
      var startTime = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      return function (err, data) {
        if (err) {
          // update loader to failure
          _this.setFailure();
        } else if (data) {
          // update loader with success, wait a minimum amount of time if specified in order to smooth aesthetic
          var waitTime = Math.max(0, _this.props.minLoadTime - +new Date() + startTime);
          if (waitTime) {
            setTimeout(_this.setNotLoading, waitTime);
          } else {
            _this.setNotLoading();
          }
        } else {
          // update loader to failure
          _this.setFailure();
        }
      };
    }, _this.errorHandle = function (assetRetrievalStateHandler, err) {
      if (_this.props.onS3Url) _this.props.onS3Url(err, null);
      if (_this.props.onS3Res) _this.props.onS3Res(err, null);
      assetRetrievalStateHandler(err, null);
    }, _this.updateUrl = function (fileLink, cb) {
      if (!_this.props.href && !_this.props.fileLink) {
        _this.setState({
          fileLink: fileLink,
          loaded: true
        }, cb);
      }
    }, _this.setNotLoaded = function (cb) {
      if (_this.state.loaded) {
        _this.setState({
          loaded: false
        }, cb);
      } else {
        cb();
      }
    }, _this.setLoading = function (cb) {
      if (_this.state.loadingState !== 'loading') {
        _this.setState({
          loadingState: 'loading'
        }, cb);
      } else {
        cb();
      }
    }, _this.setFailure = function () {
      if (_this.state.loadingState !== 'failure') {
        _this.setState({
          loadingState: 'failure'
        });
      }
    }, _this.setNotLoading = function () {
      if (_this.state.loadingState !== 'notLoading') {
        _this.setState({
          loadingState: 'notLoading'
        });
      }
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  // asset uploading function


  // callback fired when upload completes


  _createClass(RetrievalButton, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          className = _props.className,
          style = _props.style,
          autoLoad = _props.autoLoad,
          noMessage = _props.noMessage,
          messageClass = _props.messageClass,
          messageStyle = _props.messageStyle,
          href = _props.href,
          fileLink = _props.fileLink,
          maxSize = _props.maxSize,
          fileName = _props.fileName,
          notLoadingMessage = _props.notLoadingMessage,
          successMessage = _props.successMessage,
          failureMessage = _props.failureMessage,
          notLoadingClass = _props.notLoadingClass,
          loadingClass = _props.loadingClass,
          failureClass = _props.failureClass,
          initialLoadState = _props.initialLoadState,
          signingRoute = _props.signingRoute,
          remoteFolder = _props.remoteFolder,
          minLoadTime = _props.minLoadTime,
          onLoadStart = _props.onLoadStart,
          onS3Url = _props.onS3Url,
          onS3Res = _props.onS3Res,
          otherProps = _objectWithoutProperties(_props, ['className', 'style', 'autoLoad', 'noMessage', 'messageClass', 'messageStyle', 'href', 'fileLink', 'maxSize', 'fileName', 'notLoadingMessage', 'successMessage', 'failureMessage', 'notLoadingClass', 'loadingClass', 'failureClass', 'initialLoadState', 'signingRoute', 'remoteFolder', 'minLoadTime', 'onLoadStart', 'onS3Url', 'onS3Res']);

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


module.exports = RetrievalButton;