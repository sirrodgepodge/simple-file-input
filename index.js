'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

var _simpleIsoFetch = require('simple-iso-fetch');

var _simpleIsoFetch2 = _interopRequireDefault(_simpleIsoFetch);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _index = require('./index.scss');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// utilities
// needed because I can't figure out how to make s3 work with fetch

// bring in styling


// eslint-disable-line import/default

// get rid of non-word characters
var urlSafe = /\W/g;

// file types
var acceptableExtensionsMap = {
  image: ['png', 'jpeg', 'gif', 'jpg', 'svg'],
  video: ['mp4', 'webm'],
  document: ['pdf', 'doc', 'docx', 'pages'],
  spreadsheet: ['xls', 'xlsx', 'numbers', 'csv']
};

// class lookup based on state
var classLookup = {
  pristine: 'fa-upload',
  loading: 'fa-spinner fa-spin',
  success: 'fa-thumbs-o-up',
  failure: 'fa-thumbs-down'
};

var FileInput = function (_Component) {
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
      var _React$createElement;

      var acceptableFileExtensions = this.props.accept || acceptableExtensionsMap[this.props.type].map(function (val) {
        return '.' + val;
      });

      return _react2.default.createElement(
        'label',
        {
          htmlFor: this.uniqueId,
          className: (0, _classnames2.default)(this.props.className, this.getLoaderClass(this.state.loadingState))
        },
        _react2.default.createElement('input', (_React$createElement = {
          className: this.props.inputClassName,
          style: !this.props.inputClassName && { display: 'none' },
          type: 'file',
          accept: acceptableFileExtensions,
          onChange: this.onChange.bind(this, acceptableFileExtensions)
        }, _defineProperty(_React$createElement, 'style', this.props.style), _defineProperty(_React$createElement, 'name', _index2.default.fileUploader), _defineProperty(_React$createElement, 'id', _index2.default.fileUploader), _React$createElement)),
        _react2.default.createElement(
          'span',
          { className: _index2.default.loaderMessage },
          this.state.loadMessage
        )
      );
    }
  }]);

  return FileInput;
}(_react.Component);

FileInput.propTypes = {
  className: _react.PropTypes.string,
  style: _react.PropTypes.object,

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
  accept: _react.PropTypes.array };
FileInput.defaultProps = {
  // 20MB I believe??
  maxSize: 41943040 * 20,

  // sets minimum amount of time before loader clears
  minLoadLength: 125
};
exports.default = FileInput;