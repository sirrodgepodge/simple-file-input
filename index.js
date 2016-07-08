'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _class, _temp;

// utilities


var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

var _lodash = require('lodash.merge');

var _lodash2 = _interopRequireDefault(_lodash);

var _simpleIsoFetch = require('simple-iso-fetch');

var _simpleIsoFetch2 = _interopRequireDefault(_simpleIsoFetch);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

module.exports = (_temp = _class = function (_Component) {
  _inherits(FileInput, _Component);

  function FileInput(props, context) {
    _classCallCheck(this, FileInput);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(FileInput).call(this, props, context));

    _this.state = {
      loadingState: _this.props.initialLoadState || 'pristine',
      loadMessage: ''
    };

    _this.onChange = function (acceptableFileExtensions, event) {
      // handle cancel
      if (!event.target.files.length) return;

      // update loader state to loading
      _this.setState({
        loadingState: 'loading',
        loadMessage: ''
      });

      // load in input asset
      _this.assetUpload(event, +new Date(), acceptableFileExtensions);
    };

    _this.assetUpload = function (event, startTime, acceptableFileExtensions) {
      // file upload vars
      var fileObj = event.target.files[0],
          ext = fileObj.name.slice(fileObj.name.lastIndexOf('.')),
          name = fileObj.name.slice(0, fileObj.name.lastIndexOf('.')).replace(urlSafe, '_') + '_' + (Number(new Date()).toString() + '_' + _shortid2.default.generate()).replace(urlSafe, '_') + ext,
          type = fileObj.type,
          size = fileObj.size;

      if (size > _this.props.maxSize) _this.assetUploadStateHandler(startTime)(new Error('upload is not acceptable file type'), null);
      if (acceptableFileExtensions.indexOf(ext.toLowerCase()) === -1) _this.assetUploadStateHandler(startTime)(new Error('upload is not acceptable file type'), null);else {
        // // Handles immediate display of images/videos with 'blob'
        if (_this.onBlobLoad && ~['image', 'video'].indexOf(_this.props.type)) {
          var reader = new FileReader();
          reader.readAsDataURL(fileObj);

          // send blob load error to callback
          reader.onerror = function (err) {
            if (!_this.props.onS3Load || !_this.props.signingRoute) _this.assetUploadStateHandler(startTime)(err, null);
            _this.onBlobLoad(err, null);
          };

          // sends blob to callback
          reader.onloadend = function (e) {
            if (!_this.props.onS3Load || !_this.props.signingRoute) _this.assetUploadStateHandler(startTime)(null, e.target.result);
            _this.onBlobLoad(null, e.target.result);
          };
        }

        // // Handles S3 storage
        if (_this.props.onS3Load) {
          // warn if no upload string provided
          if (typeof _this.props.signingRoute !== 'string') return console.error('need to supply signing route to use s3!');

          _simpleIsoFetch2.default.post({
            route: _this.props.signingRoute,
            body: {
              name: name,
              type: type
            }
          }).then(function (res) {
            _superagent2.default.put(res.body.signed_request, fileObj).set({
              'x-amz-acl': 'public-read'
            }).end(function (err) {
              if (err) {
                return _this.props.onS3Load(err, null);
              }
              // run state handler
              _this.assetUploadStateHandler(startTime)(null, res.body.url);

              // execute callback with S3 stored file name
              _this.props.onS3Load(null, res.body.url);

              // //// as soon as I figure out how to make fetch work with S3 I'll replace this
              // return simpleIsoFetch.put({
              //   route: res.body.signed_request,
              //   headers: {
              //     'x-amz-acl': 'public-read'
              //   },
              //   body: fileObj
              // });
            });
          }).catch(function (err) {
            console.log('Failed to upload file: ' + err);
            _this.props.onS3Load(err, null);
          });
        }
      }
    };

    _this.assetUploadStateHandler = function () {
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
          setTimeout(function () {
            _this.setState({
              loadingState: 'success',
              loadMessage: 'Upload Success!'
            });
          }, Math.min(+new Date() - startTime, _this.props.minLoadLength));
        } else {
          // update loader to failure
          _this.setState({
            loadingState: 'failure',
            loadMessage: 'Upload Failed - Please Try Again'
          });
        }
      };
    };

    _this.uniqueId = _shortid2.default.generate();
    return _this;
  }

  // asset uploading function


  // callback fired when upload completes


  _createClass(FileInput, [{
    key: 'getLoaderClass',
    value: function getLoaderClass(loadingState) {
      var propsClass = this.props[loadingState + 'Class'];
      return propsClass || 'fa ' + classLookup[this.state.loadingState];
    }
  }, {
    key: 'render',
    value: function render() {
      var acceptableFileExtensions = this.props.accept || acceptableExtensionsMap[this.props.type].map(function (val) {
        return '.' + val;
      });

      console.log(this.props.inputClass, !this.props.inputClass);

      return _react2.default.createElement(
        'label',
        {
          htmlFor: this.uniqueId,
          className: 'simple-file-input-container ' + (this.props.className || '') + ' ' + this.props[this.state.loadingState + 'Class'],
          style: this.props.style
        },
        _react2.default.createElement('input', {
          className: 'simple-file-input-input ' + (this.props.inputClass || ''),
          style: _extends({}, !this.props.inputClass && { display: 'none' } || {}, this.props.inputStyle),
          type: 'file',
          accept: acceptableFileExtensions,
          onChange: this.onChange.bind(this, acceptableFileExtensions),
          name: this.uniqueId,
          id: this.uniqueId
        }),
        _react2.default.createElement(
          'span',
          {
            className: 'simple-file-input-message ' + (this.props.messageClass || ''),
            style: this.props.messageStyle
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
  initialLoadState: _react.PropTypes.string,

  // helps smooth aesthetic
  minLoadLength: _react.PropTypes.number,

  // maximum file size (in bytes)
  maxSize: _react.PropTypes.number,

  // triggered when blob is loaded if provided
  onBlobLoad: _react.PropTypes.func,

  // triggered when s3 upload is done, if function is provided
  onS3Load: _react.PropTypes.func,
  // S3 signature getting route
  signingRoute: _react.PropTypes.string,

  // specifies acceptable file types
  type: _react.PropTypes.oneOf(['image', 'video', 'document']), // abstraction
  accept: _react.PropTypes.array }, _class.defaultProps = {
  // 20MB I believe??
  maxSize: 41943040 * 20,

  // sets minimum amount of time before loader clears
  minLoadLength: 125,

  // default style objects to empty object
  style: {},
  inputStyle: {},
  messageStyle: {},

  // default to font awesome class names
  pristineClass: 'fa fa-upload',
  loadingClass: 'fa fa-spinner fa-spin',
  successClass: 'fa fa-thumbs-o-up',
  failureClass: 'fa fa-thumbs-down'
}, _temp);