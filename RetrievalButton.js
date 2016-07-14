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

var RetrievalButton = function (_Component) {
  _inherits(RetrievalButton, _Component);

  function RetrievalButton() {
    var _Object$getPrototypeO;

    var _temp, _this, _ret;

    _classCallCheck(this, RetrievalButton);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_Object$getPrototypeO = Object.getPrototypeOf(RetrievalButton)).call.apply(_Object$getPrototypeO, [this].concat(args))), _this), _this.state = {
      loadingState: _this.props.initialLoadState || 'notLoading',
      loaded: false,
      fileLink: ''
    }, _this.uniqueId = _shortid2.default.generate(), _this.componentDidMount = function () {
      // load in fileName asset on mount
      if (_this.props.autoLoad && _this.props.fileName) {
        _this.assetRetrieve();
      }
    }, _this.componentWillReceiveProps = function (nextProps) {
      // hacky check for isMounted
      if (_this.props.autoLoad && _this.props.fileName !== nextProps.fileName) {
        _this.assetRetrieve(nextProps.fileName);
      }
    }, _this.onClick = function () {
      if (!_this.props.autoLoad) {
        // load in fileName asset
        _this.assetRetrieve();
      }
    }, _this.assetRetrieve = function (fileName) {
      fileName = fileName || _this.props.fileName;

      if (!fileName || !_this.props.signingRoute) {
        console.error('need to add fileName prop and signingRoute prop in order to retrieve files');
        if (!fileName) console.error('fileName prop is missing');
        if (!_this.props.signingRoute) console.error('signingRoute prop is missing');
      }

      var startTime = +new Date();

      // update loader state to loading
      _this.setLoading();

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
        _this.updateUrl(res.body.signedRequest, function () {
          return !_this.props.autoLoad && document.getElementById(_this.uniqueId).click();
        });

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
      var startTime = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
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
      _this.setState({
        loaded: false
      }, cb);
    }, _this.setLoading = function () {
      if (_this.state.loadingState !== 'loading') {
        _this.setState({
          loadingState: 'loading'
        });
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
      var _props = this.props;
      var className = _props.className;
      var style = _props.style;
      var autoLoad = _props.autoLoad;
      var noMessage = _props.noMessage;
      var messageClass = _props.messageClass;
      var messageStyle = _props.messageStyle;
      var notLoadingClass = _props.notLoadingClass;
      var loadingClass = _props.loadingClass;
      var failureClass = _props.failureClass;
      var initialLoadState = _props.initialLoadState;
      var minLoadTime = _props.minLoadTime;
      var onS3Url = _props.onS3Url;
      var signingRoute = _props.signingRoute;
      var href = _props.href;
      var fileLink = _props.fileLink;

      var otherProps = _objectWithoutProperties(_props, ['className', 'style', 'autoLoad', 'noMessage', 'messageClass', 'messageStyle', 'notLoadingClass', 'loadingClass', 'failureClass', 'initialLoadState', 'minLoadTime', 'onS3Url', 'signingRoute', 'href', 'fileLink']);

      return _react2.default.createElement(
        'a',
        _extends({
          id: this.uniqueId,
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
        )
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
  // S3 signature getting route
  signingRoute: _react.PropTypes.string,

  // uploaded file link
  fileLink: _react.PropTypes.string,
  href: _react.PropTypes.string,

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

  // default style objects to empty object
  style: {},
  inputStyle: {},
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