import React, { Component, PropTypes } from 'react';

// utilities
import shortId from 'shortid';
import simpleIsoFetch from 'simple-iso-fetch';
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


module.exports = class FileInput extends Component {
  static propTypes = {
    // styling
    className: PropTypes.string,
    style: PropTypes.object,
    inputClass: PropTypes.string,
    inputStyle: PropTypes.object,
    messageClass: PropTypes.string,
    messageStyle: PropTypes.object,

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
    // folder to prepend to file name
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

    // default to font awesome class names
    pristineClass: 'fa fa-upload',
    loadingClass: 'fa fa-spinner fa-spin',
    successClass: 'fa fa-thumbs-o-up',
    failureClass: 'fa fa-thumbs-o-down'
  }

  state = {
    loadingState: this.props.initialLoadState || 'pristine',
    loadMessage: ''
  }

  uniqueId = shortId.generate()

  getUnique = () => (`${Number(new Date()).toString()}_${shortId.generate()}`).replace(urlSafe, '_')

  onChange = (acceptableFileExtensions, event) => {
    // handle cancel
    if(!event.target.files.length) return;

    // update loader state to loading
    this.setState({
      loadingState: 'loading',
      loadMessage: ''
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

    // compose upload state handler
    const assetUploadStateHandler = this.assetUploadStateHandlerGen(startTime);

    if(size > this.props.maxSize) return assetUploadStateHandler(new Error(`upload is too large, upload size limit is ${Math.round(size/100)/10}KB`), null);
    if(acceptableFileExtensions.indexOf(ext.toLowerCase()) === -1) return assetUploadStateHandler(new Error(`upload is not acceptable file type, acceptable extensions include ${acceptableFileExtensions.join(', ')}`), null);
    else {
      // // Handles immediate return of Data URI
      if(this.props.onBlobLoad && typeof onBlobLoad === 'function') {
        const reader = new FileReader();
        reader.readAsDataURL(fileObj);

        // send blob load error to callback
        reader.onerror = err => {
          if(!this.props.onS3Load || !this.props.signingRoute)
            assetUploadStateHandler(err, null);
          this.props.onBlobLoad(err, null);
        };

        // sends blob to callback
        reader.onloadend = e => {
          if(!this.props.onS3Load || !this.props.signingRoute)
            assetUploadStateHandler(null, e.target.result);
          this.props.onBlobLoad(null, e.target.result);
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
          request.put(res.body.signed_request, fileObj)
            .end((err, final) => {
              const error = err || final.error;

              if(error) {
                assetUploadStateHandler(error, null);
                return this.props.onS3Load(error, null);
              }

              // run state handler
              assetUploadStateHandler(null, res.body.url);

              // execute callback with S3 stored file name
              this.props.onS3Load(null, res.body.url);

              // //// as soon as I figure out how to make fetch work with S3 I'll replace this
              // return simpleIsoFetch.put({
              //   route: res.body.signed_request,
                // headers: {
                //   'x-amz-acl': 'public-read'
                // },
              //   body: fileObj
              // });
            });
        })
        .catch(err => {
          console.log(`Failed to upload file: ${err}`);
          this.props.onS3Load(err, null);
        });
      }
    }
  }

  // callback fired when upload completes
  assetUploadStateHandlerGen = (startTime = 0) => (err, data) => {
    if (err) {
      // update loader to failure
      this.setState({
        loadingState: 'failure',
        loadMessage: `Upload Failed - ${err.message}`
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
        loadingState: 'failure',
        loadMessage: 'Upload Failed - Please Try Again'
      });
    }
  };

  setSuccess = () => {
    this.setState({
      loadingState: 'success',
      loadMessage: 'Upload Success!'
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
      <span
        className={`simple-file-input-message ${messageClass || ''}`}
        style={messageStyle}
      >
          {this.state.loadMessage}
        </span>
      </label>
    );
  }
}
