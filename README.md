# simple-file-input
working with S3 sucks! Let this nifty little library handle it for you with a React component and server side helper function :) 

[![NPM][nodei-image]][nodei-url]

# 'Hello World' Example
## Client Side
```js
import SimpleFileInput from 'simple-file-input';

<SimpleFileInput
  type='document'
  signingRoute='/sign'
  onS3Load={(err, fileName) => this.handleChange('documentFile', fileName)}
/>
```

## Server Side



# Client side
To make requests you just need to need to make an instance of SimpleIsoFetch and then can use your standard 'get', 'put', 'post', 'del', and 'patch' methods.  If you're server-side you need to set the host because node-fetch can't determine the base route


# Full Component Props API
Here are all the available props with corresponding descriptions of what they do in the comment to their right

```js
static propTypes = {
  // styling
  className: PropTypes.string,        // sets className of the root <label/> element
  style: PropTypes.object,            // styling object passed to the root <label/> element
  inputClass: PropTypes.string,       // sets className of the <input/> element
  inputStyle: PropTypes.object,       // styling object passed to the <input/> element
  messageClass: PropTypes.string,     // sets className of the <span/> element containing the success/error message
  messageStyle: PropTypes.object,     // styling object passed to the <span/> element containing the success/error message
  
  // loading state classes
  pristineClass: PropTypes.string,    // sets className added to the root <label/> element prior to any uploads (defaults to "fa fa-upload")
  loadingClass: PropTypes.string,     // sets className added to the root <label/> element while in loading state (defaults to "fa fa-spinner fa-spin")
  successClass: PropTypes.string,     // sets className added to the root <label/> element upon loading success (defaults to "fa fa-thumbs-o-up")
  failureClass: PropTypes.string,     // sets className added to the root <label/> element upon loading failure (defaults to "fa fa-thumbs-down")
  
  // initial loading state
  initialLoadState: PropTypes.string.oneOf(['pristing', 'loading', 'success', 'failure']), // sets the initial state of the loading element (only determines which of the classes will be added at the beginning, "pristine" by default)
  
  // helps smooth aesthetic
  minLoadLength: PropTypes.number,    // sets the minimum amount of time the loading status will be displayed (in milliseconds), used to prevent flashing between status icons/classes for really quick uploads, 125 by default
  
  // max file size (in bytes)
  maxSize: PropTypes.number,          // sets the maximum file upload size (in bytes), default is 100000000 (100 MB)
  
  // triggered when blob is loaded if this prop is provided
  onBlobLoad: PropTypes.func,         // callback executed as soon as blob becomes available to front end, callback has the signature: function (error, dataURI) {...}
  
  // triggered when s3 upload is done, if this prop is provided
  onS3Load: PropTypes.func,           // callback executed as soon as file is uploaded to S3, callback has the signature: function (error, s3FileUrl) {...}
  // S3 signature getting route
  signingRoute: PropTypes.string,     // determines the back end route that will get hit in order to get an S3 signature for uploading to S3 from front end
  
  // specifies acceptable file extensions
  accept: PropTypes.array,            // sets the file extensions which the file uploader will accept, e.g. ['pdf', 'jpeg']
  type: PropTypes.oneOf(['image', 'video', 'document', 'spreadsheet']), // abstraction for the 'accept' property, lets user specify a set of extensions via specifying the type of file, e.g. 'image', 'video'.  The map of file types to corresponding extensions is listed here:
  // const acceptableExtensionsMap = {
  //  image: ['png', 'jpeg', 'gif', 'jpg', 'svg'],
  //  video: ['mp4', 'webm'],
  //  document: ['pdf', 'doc', 'docx', 'pages'],
  //  spreadsheet: ['xls', 'xlsx', 'numbers', 'csv']
  // }
}
```

## License

  [MIT](LICENSE)

[nodei-image]: https://nodei.co/npm/simple-file-input.png?downloads=true&downloadRank=true&stars=true
[nodei-url]: https://www.npmjs.com/package/simple-file-input
