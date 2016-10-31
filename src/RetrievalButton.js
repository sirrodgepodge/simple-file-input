import React, { Component, PropTypes } from 'react';

// utilities
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

    // triggered when loading begins
    onLoadStart: PropTypes.func,
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
    this.setLoading(this.props.onLoadStart);

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
      this.updateUrl(res.body.signedRequest, !this.props.autoLoad ?
        () => window.open(res.body.signedRequest, '_blank') : null);

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
    if(this.state.loaded) {
      this.setState({
        loaded: false
      }, cb);
    } else {
      cb();
    }
  }

  setLoading = cb => {
    if(this.state.loadingState !== 'loading') {
      this.setState({
        loadingState: 'loading'
      }, cb);
    } else {
      cb();
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
      href,
      fileLink,

      // props not fed to UI
      maxSize,
      fileName,         // eslint-disable-line no-unused-vars
      notLoadingMessage,
      successMessage,   // eslint-disable-line no-unused-vars
      failureMessage,   // eslint-disable-line no-unused-vars
      notLoadingClass,  // eslint-disable-line no-unused-vars
      loadingClass,     // eslint-disable-line no-unused-vars
      failureClass,     // eslint-disable-line no-unused-vars
      initialLoadState, // eslint-disable-line no-unused-vars
      signingRoute,     // eslint-disable-line no-unused-vars
      remoteFolder,     // eslint-disable-line no-unused-vars
      minLoadTime,      // eslint-disable-line no-unused-vars
      onLoadStart,      // eslint-disable-line no-unused-vars
      onS3Url,          // eslint-disable-line no-unused-vars
      onS3Res,          // eslint-disable-line no-unused-vars
      ...otherProps
    } = this.props;

    return (
      <a
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


module.exports = RetrievalButton;
