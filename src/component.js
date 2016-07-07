import React, { Component, PropTypes } from 'react';

// utilities
import shortId from 'shortid';
import simpleIsoFetch from 'simple-iso-fetch';
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

// class lookup based on state
const classLookup = {
  pristine: 'fa-upload',
  loading: 'fa-spinner fa-spin',
  success: 'fa-thumbs-o-up',
  failure: 'fa-thumbs-down'
};


module.exports = class FileInput extends Component {
  static propTypes = {
    className: PropTypes.string,
    style: PropTypes.object,

    // initial icon state
    initialLoadState: PropTypes.string,

    // helps smooth aesthetic
    minLoadLength: PropTypes.number,

    // maximum file size (in bytes)
    maxSize: PropTypes.number,

    // triggered when blob is loaded if provided
    onBlobLoad: PropTypes.func,

    // triggered when s3 upload is done, if function is provided
    onS3Load: PropTypes.func,
    // S3 signature getting route
    signingRoute: PropTypes.string,

    // specifies acceptable file types
    type: PropTypes.oneOf(['image', 'video', 'document']), // abstraction
    accept: PropTypes.array, // allow user to specify extensions
  }

  static defaultProps = {
    // 20MB I believe??
    maxSize: 41943040 * 20,

    // sets minimum amount of time before loader clears
    minLoadLength: 125
  }

  constructor(props, context) {
    super(props, context);

    this.uniqueId = shortId.generate();
  }

  state = {
    loadingState: this.props.initialLoadState || 'pristine',
    loadMessage: ''
  }

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
      name = fileObj.name.slice(0, fileObj.name.lastIndexOf('.')).replace(urlSafe, '_') + '_' + (Number(new Date()).toString() + '_' + shortId.generate()).replace(urlSafe, '_') + ext,
      type = fileObj.type,
      size = fileObj.size;

    if(size > this.props.maxSize) this.assetUploadStateHandler(startTime)(new Error('upload is not acceptable file type'), null);
    if(acceptableFileExtensions.indexOf(ext.toLowerCase()) === -1) this.assetUploadStateHandler(startTime)(new Error('upload is not acceptable file type'), null);
    else {
      // // Handles immediate display of images/videos with 'blob'
      if(this.onBlobLoad && ~['image', 'video'].indexOf(this.props.type)) {
        const reader = new FileReader();
        reader.readAsDataURL(fileObj);

        // send blob load error to callback
        reader.onerror = err => {
          if(!this.props.onS3Load || !this.props.signingRoute)
            this.assetUploadStateHandler(startTime)(err, null);
          this.onBlobLoad(err, null);
        };

        // sends blob to callback
        reader.onloadend = e => {
          if(!this.props.onS3Load || !this.props.signingRoute)
            this.assetUploadStateHandler(startTime)(null, e.target.result);
          this.onBlobLoad(null, e.target.result);
        };
      }

      // // Handles S3 storage
      if(this.props.onS3Load) {
        // warn if no upload string provided
        if(typeof this.props.signingRoute !== 'string')
          return console.error('need to supply signing route to use s3!');

        simpleIsoFetch.post({
          route: this.props.signingRoute,
          body: {
            name,
            type
          }
        })
        .then(res => {
          request.put(res.body.signed_request, fileObj)
            .set({
              'x-amz-acl': 'public-read'
            })
            .end(err => {
              if(err) {
                return this.props.onS3Load(err, null);
              }
              // run state handler
              this.assetUploadStateHandler(startTime)(null, res.body.url);

              // execute callback with S3 stored file name
              this.props.onS3Load(null, res.body.url);

              // //// as soon as I figure out how to make fetch work with S3 I'll replace this
              // return simpleIsoFetch.put({
              //   route: res.body.signed_request,
              //   headers: {
              //     'x-amz-acl': 'public-read'
              //   },
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
  assetUploadStateHandler = (startTime = 0) => (err, data) => {
    if (err) {
      // update loader to failure
      this.setState({
        loadingState: 'failure',
        loadMessage: `Upload Failed - ${err.message}`
      });
    } else if (data) {
      // update loader with success, wait a minimum amount of time if specified in order to smooth aesthetic
      setTimeout(() => {
        this.setState({
          loadingState: 'success',
          loadMessage: 'Upload Success!'
        });
      }, Math.min(+new Date - startTime, this.props.minLoadLength));
    } else {
      // update loader to failure
      this.setState({
        loadingState: 'failure',
        loadMessage: `Upload Failed - Please Try Again`
      });
    }
  };

  getLoaderClass(loadingState) {
    const propsClass = this.props[`${loadingState}Class`];
    return propsClass || `fa ${classLookup[this.state.loadingState]}`;
  }

  render() {
    const acceptableFileExtensions = this.props.accept || acceptableExtensionsMap[this.props.type].map(val => `.${val}`);

    return (
      <label
        htmlFor={this.uniqueId}
        className={`${this.props.className} ${this.getLoaderClass(this.state.loadingState)}`}
      >
        <input
          className={this.props.inputClassName}
          style={!this.props.inputClassName && {display: 'none'}}
          type='file'
          accept={acceptableFileExtensions}
          onChange={this.onChange.bind(this, acceptableFileExtensions)}
          style={this.props.style}
          name={this.uniqueId}
          id={this.uniqueId}
        />
      <span className={this.props.loaderMessageClassName}>
          {this.state.loadMessage}
        </span>
      </label>
    );
  }
}
