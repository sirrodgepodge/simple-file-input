# simple-file-input
working with the file API and S3 sucks! Let this nifty little library handle it for you with a React component and server side helper function :) 

[![NPM][nodei-image]][nodei-url]

# 'Hello World' Example
## Client Side
The client-side set up just involves dropping in the SimpleFileInput component, and setting functions to be fired in response to either blob upload completion, s3 upload completion (if used must specify the "signingRoute" to hit for S3 signature, see helper below), or both.
```js
import SimpleFileInput from 'simple-file-input';

class YourReactComponentWhichIncludesAnUploader {
  state = {
    imageSrc: ''
  }

  handleChange = (newImageSrc) {
    this.setState({
      imageSrc: newImageSrc
    });
  }
  
  render() {
    return <div>
      <img
        src={this.state.imageSrc}
      />
      <SimpleFileInput
        type='image'
        signingRoute='/sign'
        onBlobLoad={(err, dataURI) => this.handleChange(dataURI)}
        onS3Load={(err, fileName) => this.handleChange(fileName)}
      />
    </div>;
  }
}
```

## Server Side
*Note:* Server-side set up is only needed for uploading to S3, if you wanted to just use the blob upload on the component no server-side configuration would be necessary.

### AWS Config
You must start by configuring AWS as always when working with it, I'm using 'dotenv' here for environmental variables and storing them in a separate '.env' file but you can use whatever you'd like of course.
``` js
// attach environmental vars from ".env" file to process.env
require('dotenv').config();

import awsSdk from 'aws-sdk';
import simpleFileInput from 'simple-file-input/server';

// Configure AWS SDK (Using simple-file-input will depend on you having provided these three configuration properties)
awsSdk.config.update({
  accessKeyId: process.env.AWS_CLIENT_ID,
  secretAccessKey: process.env.AWS_SECRET,
  region: process.env.AWS_REGION
});

// initialize simple-file-input's S3 instance by passing in your current aws-sdk instance
simpleFileInput.initS3(awsSdk);

// set the name of the bucket to be used by S3
require('simple-file-input/server').setBucket(process.env.AWS_BUCKET);
```

### Express route set up

```
// importing Express and middlewate
import Express from 'express';
import bodyParser from 'body-parser';

// importing server-side helper promise for sending s3 signature to front end
import {signS3} from 'simple-file-input/server';

// create express instance, set request body parsing middleware
const app = Express();
app.use(bodyParser.json())); // parses JSON objects sent in request bodies

// receive the post request to '/sign' that will come from our client-side component here and respond with s3 signature
app.post('/sign', (req, res, next) =>
  signS3(req.body) // helper function handles creation of S3 signature for you
    .then(data => res.json(data))
    .catch(err => next(err))
);
```
*Note*: In order for S3 uploading to work you will also need to set a bucket policy and CORS configuration that will allow uploads and (presumably) retrievals to happen from your site.  Here are AWS's tools and docs for these two things:
* S3 bucket policy generator: <a href="https://awspolicygen.s3.amazonaws.com/policygen.html">https://awspolicygen.s3.amazonaws.com/policygen.html</a>
* S3 bucket policy documentation: <a href="http://docs.aws.amazon.com/AmazonS3/latest/dev/example-bucket-policies.html">http://docs.aws.amazon.com/AmazonS3/latest/dev/example-bucket-policies.html</a>
* CORS policy documentation: <a href="http://docs.aws.amazon.com/AmazonS3/latest/dev/cors.html">http://docs.aws.amazon.com/AmazonS3/latest/dev/cors.html</a>

If you just want to get something working, feel free to use the following (replace "YOUR_BUCKET_NAME_GOES_HERE" with your actual bucket name):
* Bucket Policy:
```
{
	"Version": "2012-10-17",
	"Id": "Policy1442337235961",
	"Statement": [
		{
			"Sid": "Stmt1442337233076",
			"Effect": "Allow",
			"Principal": "*",
			"Action": "s3:*",
			"Resource": "arn:aws:s3:::YOUR_BUCKET_NAME_GOES_HERE/*"
		}
	]
}
```
* CORS Policy:
```
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedMethod>DELETE</AllowedMethod>
        <AllowedHeader>*</AllowedHeader>
    </CORSRule>
</CORSConfiguration>
```



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
