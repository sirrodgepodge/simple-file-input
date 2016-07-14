import React, { Component, PropTypes } from 'react';

// utilities
import shortId from 'shortid';
import simpleIsoFetch from 'simple-iso-fetch';
import {parse as parseQueryString} from 'querystring';
import pathJoin from 'iso-path-join';
import request from 'superagent'; // needed because I can't figure out how to make s3 work with fetch

// get rid of non-word characters
const urlSafe = /\W/g;

// file types
const acceptableExtensionsMap = {
  image: ['png', 'jpeg', 'gif', 'jpg', 'svg'],
  video: ['mp4', 'webm'],
  document: ['pdf', 'doc', 'docx', 'pages'],
  spreadsheet: ['xls', 'xlsx', 'numbers', 'csv']
};


class SimpleFileInput extends Component {
  static propTypes = {
    // styling
    className: PropTypes.string,
    style: PropTypes.object,
    inputClass: PropTypes.string,
    inputStyle: PropTypes.object,
    messageClass: PropTypes.string,
    messageStyle: PropTypes.object,

    // hide success/failure message
    noMessage: PropTypes.bool,
    pristineMessage: PropTypes.string,
    loadingMessage: PropTypes.string,
    successMessage: PropTypes.string,
    failureMessage: PropTypes.string,

    // loading state classes
    pristineClass: PropTypes.string,
    loadingClass: PropTypes.string,
    successClass: PropTypes.string,
    failureClass: PropTypes.string,

    // initial icon state
    initialLoadState: PropTypes.oneOf(['pristine', 'loading', 'success', 'failure']),

    // helps smooth aesthetic
    minLoadTime: PropTypes.number,

    // maximum file size (in bytes)
    maxSize: PropTypes.number,

    // triggered when blob is loaded if provided
    onBlobLoad: PropTypes.func,

    // triggered when s3 upload is done, if function is provided
    onS3Load: PropTypes.func,
    // S3 signature getting route
    signingRoute: PropTypes.string,
    // overrides uploaded file's name
    fileName: PropTypes.string,
    // overrides default string appended to file name
    fileAppend: PropTypes.string,
    // specifies S3 folder path inside of bucket
    remoteFolder: PropTypes.string,

    // specifies acceptable file types
    type: PropTypes.oneOf(['image', 'video', 'document', 'spreadsheet']), // abstraction
    accept: PropTypes.array, // allow user to specify extensions
  }

  static defaultProps = {
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
  }

  state = {
    loadingState: this.props.initialLoadState || 'pristine'
  }

  uniqueId = shortId.generate()

  getUnique = () => (`${Number(new Date()).toString()}_${shortId.generate()}`).replace(urlSafe, '_')

  onChange = (acceptableFileExtensions, event) => {
    // handle cancel
    if(!event.target.files.length) return;

    // update loader state to loading
    this.setState({
      loadingState: 'loading'
    });

    // load in input asset
    this.assetUpload(event, +new Date(), acceptableFileExtensions);
  }

  // asset uploading function
  assetUpload = (event, startTime, acceptableFileExtensions) => {
    // file upload vars
    const fileObj = event.target.files[0],
      ext = fileObj.name.slice(fileObj.name.lastIndexOf('.')),
      name = (typeof this.props.fileName !== 'undefined' ? this.props.fileName : fileObj.name.slice(0, fileObj.name.lastIndexOf('.'))).replace(urlSafe, '_') + (typeof this.props.fileAppend !== 'undefined' ? this.props.fileAppend : `_${this.getUnique()}`) + ext,
      type = fileObj.type,
      size = fileObj.size;

    const fileInfoObj = {
      ext,
      type,
      size,
      name,
      nameWithFolder: this.props.remoteFolder ? pathJoin(this.props.remoteFolder, name) : name
    };

    // compose upload state handler
    const assetUploadStateHandler = this.assetUploadStateHandlerGen(startTime);

    if(size > this.props.maxSize) return assetUploadStateHandler(new Error(`upload is too large, upload size limit is ${Math.round(size/100)/10}KB`), null);
    if(acceptableFileExtensions.indexOf(ext.toLowerCase()) === -1) return assetUploadStateHandler(new Error(`upload is not acceptable file type, acceptable extensions include ${acceptableFileExtensions.join(', ')}`), null);
    else {
      // // Handles immediate return of Data URI
      if(this.props.onBlobLoad && typeof this.props.onBlobLoad === 'function') {
        const reader = new FileReader();
        reader.readAsDataURL(fileObj);

        // send blob load error to callback
        reader.onerror = err => {
          if(!this.props.onS3Load || !this.props.signingRoute)
            assetUploadStateHandler(err, null);
          this.props.onBlobLoad(err, null, fileInfoObj);
        };

        // sends blob to callback
        reader.onloadend = e => {
          if(!this.props.onS3Load || !this.props.signingRoute)
            assetUploadStateHandler(null, e.target.result);
          this.props.onBlobLoad(null, e.target.result, fileInfoObj);
        };
      }

      // // Handles S3 storage
      if(this.props.onS3Load && typeof this.props.onS3Load === 'function') {
        // warn if no upload string provided
        if(typeof this.props.signingRoute !== 'string')
          return console.error('need to supply signing route to use s3!');

        simpleIsoFetch.post({
          route: this.props.signingRoute,
          body: {
            name: this.props.remoteFolder ? pathJoin(this.props.remoteFolder, name) : name,
            type
          }
        })
        .then(res => {
          request.put(res.body.signedRequest, fileObj)
            .end((err, final) => {
              const error = err || final.error;

              if(error) {
                assetUploadStateHandler(error, null);
                return this.props.onS3Load(error, null, fileInfoObj);
              }

              // run state handler
              assetUploadStateHandler(null, res.body.url);

              // execute callback with S3 stored file name
              this.props.onS3Load(null, res.body.url, fileInfoObj);
            });
        })
        .catch(err => {
          assetUploadStateHandler(err, null);
          this.props.onS3Load(err, null, fileInfoObj);
        });
      }
    }
  }

  // callback fired when upload completes
  assetUploadStateHandlerGen = (startTime = 0) => (err, data) => {
    if (err) {
      // update loader to failure
      this.setState({
        loadingState: 'failure'
      });
    } else if (data) {
      // update loader with success, wait a minimum amount of time if specified in order to smooth aesthetic
      const waitTime = Math.max(0, this.props.minLoadTime - +new Date + startTime);
      if(waitTime) {
        setTimeout(this.setSuccess, waitTime);
      } else {
        this.setSuccess();
      }
    } else {
      // update loader to failure
      this.setState({
        loadingState: 'failure'
      });
    }
  };

  setSuccess = () => {
    this.setState({
      loadingState: 'success'
    });
  }

  render() {
    const {
      className,
      style,
      inputClass,
      inputStyle,
      messageClass,
      messageStyle,
      pristineClass,    // eslint-disable-line no-unused-vars
      loadingClass,     // eslint-disable-line no-unused-vars
      successClass,     // eslint-disable-line no-unused-vars
      failureClass,     // eslint-disable-line no-unused-vars
      initialLoadState, // eslint-disable-line no-unused-vars
      minLoadTime,      // eslint-disable-line no-unused-vars
      maxSize,          // eslint-disable-line no-unused-vars
      onBlobLoad,       // eslint-disable-line no-unused-vars
      onS3Load,         // eslint-disable-line no-unused-vars
      signingRoute,     // eslint-disable-line no-unused-vars
      accept,
      type,
      ...otherProps
    } = this.props;

    const acceptableFileExtensions = accept || acceptableExtensionsMap[type].map(val => `.${val}`);

    return (
      <label
        htmlFor={this.uniqueId}
        className={`simple-file-input-container ${className || ''} ${this.props[`${this.state.loadingState}Class`]}`}
        style={style}
        {...otherProps}
      >
        <input
          className={`simple-file-input-input ${inputClass || ''}`}
          style={{
            ...(!inputClass && {display: 'none'} || {}),
            ...inputStyle
          }}
          type='file'
          accept={acceptableFileExtensions}
          onChange={this.onChange.bind(this, acceptableFileExtensions)}
          name={this.uniqueId}
          id={this.uniqueId}
        />
        {
          !this.props.noMessage
          &&
          <span
            className={`simple-file-input-message ${messageClass || ''}`}
            style={messageStyle}
          >
            {this.props[`${this.state.loadingState}Message`]}
          </span>
        }
        {
          this.props.children
        }
      </label>
    );
  }
}

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
class RetrievalButton extends Component {
  static propTypes = {
    // styling
    className: PropTypes.string,
    style: PropTypes.object,
    messageClass: PropTypes.string,
    messageStyle: PropTypes.object,

    // loading state classes
    notLoadingClass: PropTypes.string,
    loadingClass: PropTypes.string,
    failureClass: PropTypes.string,

    // loading state messages
    noMessage: PropTypes.bool,
    notLoadingMessage: PropTypes.string,
    successMessage: PropTypes.string,
    failureMessage: PropTypes.string,

    // initial icon state
    autoLoad: PropTypes.bool, // loads fileName specified on mount and onchange
    openOnRetrieve: PropTypes.bool, // determines if file is opened automatically
    initialLoadState: PropTypes.oneOf(['notLoading', 'loading', '']),

    // helps smooth aesthetic
    minLoadTime: PropTypes.number,

    // overrides uploaded file's name
    fileName: PropTypes.string,
    // specifies S3 folder path inside of bucket
    remoteFolder: PropTypes.string,
    // S3 signature getting route
    signingRoute: PropTypes.string,

    // uploaded file link
    fileLink: PropTypes.string,
    href: PropTypes.string,

    // triggered when s3 url retrieval is done
    onS3Url: PropTypes.func,
    // triggered with s3 url get response
    onS3Res: PropTypes.func
  }

  static defaultProps = {
    // 100MB (unit is bytes)
    maxSize: 100000000,

    // sets minimum amount of time before loader clears
    minLoadTime: 0,

    // string to append to fileName
    remoteFolder: '',

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
  }

  state = {
    loadingState: this.props.initialLoadState || 'notLoading',
    loaded: false,
    fileLink: ''
  }

  uniqueId = shortId.generate()

  componentDidMount = () => {
    // load in fileName asset on mount
    if(this.props.autoLoad && this.props.fileName) {
      this.assetRetrieve();
    }
  }

  componentWillReceiveProps = nextProps => {
    // hacky check for isMounted
    if(this.props.autoLoad && this.props.fileName !== nextProps.fileName) {
      this.assetRetrieve(nextProps.remoteFolder ? pathJoin(nextProps.remoteFolder, nextProps.fileName) : nextProps.fileName);
    }
  }

  onClick = () => {
    if(!this.props.autoLoad) {
      // load in fileName asset
      this.assetRetrieve();
    }
  }

  // asset uploading function
  assetRetrieve = fileName => {
    fileName = fileName || (this.props.remoteFolder ? pathJoin(this.props.remoteFolder, this.props.fileName) : this.props.fileName);

    if(!fileName || !this.props.signingRoute) {
      console.error('need to add fileName prop and signingRoute prop in order to retrieve files');
      if(!fileName) console.error('fileName prop is missing');
      if(!this.props.signingRoute) console.error('signingRoute prop is missing');
    }

    const startTime = +new Date();

    // update loader state to loading
    this.setLoading();

    // compose upload state handler
    const assetRetrievalStateHandler = this.assetRetrievalStateHandlerGen(startTime);
    const errorHandle = this.errorHandle.bind(this, assetRetrievalStateHandler);

    simpleIsoFetch.post({
      route: this.props.signingRoute,
      body: {
        name: fileName,
      }
    })
    .then(res => {
      if(this.props.onS3Url) this.props.onS3Url(null, res.body.signedRequest);

      // update URL with fetched URL
      this.updateUrl(res.body.signedRequest, () =>
        window.open(res.body.signedRequest, '_blank'));

      // set Loaded to back to false once expired
      setTimeout(() =>
        this.setNotLoaded(() => this.props.autoLoad && this.assetRetrieve()),
          Math.max(+parseQueryString(res.body.signedRequest).Expires * 1000 - Date.now() - 100, 0) || 900000);

      if(!this.props.onS3Res) {
        assetRetrievalStateHandler(null, res.body.signedRequest);
      } else {
        request.get(res.body.signedRequest)
          .end((err, fileRes) => {
            const error = err || fileRes.error;

            // handle error and halt execution
            if(error) return errorHandle(error);

            // execute callback with S3 stored file name
            if(this.props.onS3Res) this.props.onS3Res(null, res.text);

            // update state
            assetRetrievalStateHandler(null, res.text);

            // @TODO handle blob retrieval
          });
      }
    })
    .catch(err =>
      errorHandle(err));
  }

  // callback fired when upload completes
  assetRetrievalStateHandlerGen = (startTime = 0) => (err, data) => {
    if (err) {
      // update loader to failure
      this.setFailure();
    } else if (data) {
      // update loader with success, wait a minimum amount of time if specified in order to smooth aesthetic
      const waitTime = Math.max(0, this.props.minLoadTime - +new Date + startTime);
      if(waitTime) {
        setTimeout(this.setNotLoading, waitTime);
      } else {
        this.setNotLoading();
      }
    } else {
      // update loader to failure
      this.setFailure();
    }
  };

  errorHandle = (assetRetrievalStateHandler, err) => {
    if(this.props.onS3Url) this.props.onS3Url(err, null);
    if(this.props.onS3Res) this.props.onS3Res(err, null);
    assetRetrievalStateHandler(err, null);
  }

  updateUrl = (fileLink, cb) => {
    if(!this.props.href && !this.props.fileLink) {
      this.setState({
        fileLink,
        loaded: true
      }, cb);
    }
  }

  setNotLoaded = cb => {
    this.setState({
      loaded: false
    }, cb);
  }

  setLoading = () => {
    if(this.state.loadingState !== 'loading') {
      this.setState({
        loadingState: 'loading'
      });
    }
  }

  setFailure = () => {
    if(this.state.loadingState !== 'failure') {
      this.setState({
        loadingState: 'failure'
      });
    }
  }

  setNotLoading = () => {
    if(this.state.loadingState !== 'notLoading') {
      this.setState({
        loadingState: 'notLoading'
      });
    }
  }

  render() {
    const {
      className,
      style,
      autoLoad,
      noMessage,
      messageClass,
      messageStyle,
      notLoadingClass,    // eslint-disable-line no-unused-vars
      loadingClass,     // eslint-disable-line no-unused-vars
      failureClass,     // eslint-disable-line no-unused-vars
      initialLoadState, // eslint-disable-line no-unused-vars
      minLoadTime,      // eslint-disable-line no-unused-vars
      onS3Url,         // eslint-disable-line no-unused-vars
      signingRoute,     // eslint-disable-line no-unused-vars
      href,
      fileLink,
      ...otherProps
    } = this.props;

    return (
      <a
        id={this.uniqueId}
        target='_blank'
        className={`retrieval-button ${className || ''} ${this.props[`${autoLoad && this.state.loadingState === 'loading' ? 'notLoading' : this.state.loadingState}Class`]}`}
        style={{...(this.state.loadingState === 'loading' ? {
          cursor: 'default'
        } : {
          cursor: 'pointer'
        }),
          textDecoration: 'none',
        ...style}}
        onClick={!this.state.loaded && this.onClick}
        href={this.state.loaded && (fileLink || href || this.state.fileLink) || 'javascript:void(0)'}  // eslint-disable-line
        {...otherProps}
      >
        {
          !noMessage
          &&
          <span
            className={`retrieval-button-message ${messageClass}`}
            style={messageStyle}
          >
            {this.props[`${this.state.loadingState}Message`]}
          </span>
        }
        {
          this.props.children
        }
      </a>
    );
  }
}


SimpleFileInput.RetrievalButton = RetrievalButton;
module.exports = SimpleFileInput;
