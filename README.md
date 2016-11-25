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
I've included helpers to configure AWS+S3 server-side and for generating S3 signatures needed to upload to S3 from the front end, enjoy!
<br><br>
*Note:* Server-side set up is only needed for uploading to S3, if you wanted to just use the blob upload on the above React component no server-side configuration would be necessary.

### AWS Initializing
*Note:* Make SURE you don't upload your AWS credentials to Github, malicious programs are constantly crawling Github to find people who have done this and use their creds to spin up tons of EC2 Instances to mine bitcoin or other nasty things.

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
simpleFileInput.setBucket(process.env.AWS_BUCKET);
```

### Express route set up

```js
// importing Express and middlewate
import Express from 'express';
import bodyParser from 'body-parser';

// importing server-side helper promise for sending s3 signature to front end
import {signUploadToS3} from 'simple-file-input/server';

// create express instance, set request body parsing middleware
const app = Express();
app.use(bodyParser.json())); // parses JSON objects sent in request bodies

// receive the post request to '/sign' that will come from our client-side component here and respond with s3 signature
app.post('/sign', (req, res, next) =>
  signUploadToS3(req.body) // helper function handles creation of S3 signature for you
    .then(data => res.json(data))
    .catch(err => next(err))
);
```

### S3 Bucket set up
*Note*: In order for S3 uploading to work you with or without simple-file-input you will also need to set a bucket policy and CORS configuration (needed to allow API interaction) that will allow uploads and (presumably) retrievals to happen from your site.  You can set these after creating an S3 bucket by selecting "Properties" and then "Permissions" on that bucket.  Here are AWS's tools and docs for these two things:
* S3 bucket policy generator: <a href="https://awspolicygen.s3.amazonaws.com/policygen.html">https://awspolicygen.s3.amazonaws.com/policygen.html</a>
* S3 bucket policy documentation: <a href="http://docs.aws.amazon.com/AmazonS3/latest/dev/example-bucket-policies.html">http://docs.aws.amazon.com/AmazonS3/latest/dev/example-bucket-policies.html</a>
* CORS policy documentation: <a href="http://docs.aws.amazon.com/AmazonS3/latest/dev/cors.html">http://docs.aws.amazon.com/AmazonS3/latest/dev/cors.html</a>

If you just want to get something working, feel free to use the following (replace "YOUR_BUCKET_NAME_GOES_HERE" with your actual bucket name):
* Bucket Policy (makes uploaded files' i.e. bucket objects' URLs public):
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
* CORS Policy (allows API interaction from any origin):
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



# Component Props API
Here are all the available props with corresponding descriptions of what they do in the comment to their right

```js
static propTypes = {
  // styling
  containerClass: PropTypes.string    // sets className of the root <div/> element
  containerStyle: PropTypes.object,   // styling object passed to the root <div/> element
  className: PropTypes.string,        // sets className of the <label/> element
  style: PropTypes.object,            // styling object passed to the <label/> element
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
  minLoadTime: PropTypes.number,    // sets the minimum amount of time the loading status will be displayed (in milliseconds), used to prevent flashing between status icons/classes for really quick uploads, 125 by default

  // max file size (in bytes)
  maxSize: PropTypes.number,          // sets the maximum file upload size (in bytes), default is 100000000 (100 MB)

  // triggered when blob is loaded if this prop is provided
  onBlobLoad: PropTypes.func,         // callback executed as soon as blob becomes available to front end, callback has the signature: function (error, dataURI) {...}

  // triggered when s3 upload is done, if this prop is provided
  onS3Load: PropTypes.func,           // callback executed as soon as file is uploaded to S3, callback has the signature: function (error, s3FileUrl) {...}
  // S3 signature getting route
  signingRoute: PropTypes.string,     // (Required if OnS3Load function is Supplied) determines the back end route that will get hit in order to get an S3 signature for uploading to S3 from front end
  // overrides uploaded file's name
  fileName: PropTypes.string,         // by default the uploaded file's name will be used as the name stored in S3, this can be overridden with this property, nonword characters will be removed from the a provided string to avoid URL issues (note that the generated unique-ifying string will still be appended unless you overwrite the 'fileAppend' property below with an empty string)
  // overrides default string appended to file name
  fileAppend: PropTypes.string,       // by default a string combining a timestamp and a shortid and will be appended to the file's name to ensure uniqueness, this can be overridden with a different string or empty string via this prop, nonword characters will be removed from the a provided string to avoid URL issues
  // specifies S3 folder path inside of bucket
  remoteFolder: PropTypes.string,     // optional prop used to specify a file path inside of your S3 bucket, e.g. '/folder1/folder2' will save your upload to '<S3 host route>/folder1/folder2/<file name>', the forward slash at the beginning of this string is not required

  // specifies acceptable file extensions
  accept: PropTypes.array,            // sets the file extensions which the file uploader will accept, e.g. ['pdf', 'jpeg']
  type: PropTypes.oneOf(['image', 'video', 'document', 'spreadsheet']), // abstraction for the 'accept' property, lets user specify a set of extensions via specifying the type of file, e.g. 'image', 'video'.  The map of file types to corresponding extensions is listed here:
  // const acceptableExtensionsMap = {
  //  image: ['png', 'jpeg', 'gif', 'jpg', 'svg'],
  //  video: ['mp4', 'webm'],
  //  document: ['pdf', 'doc', 'docx', 'pages'],
  //  spreadsheet: ['xls', 'xlsx', 'numbers', 'csv']
  // }

  // any other props provided will be applied to root <label/> component
}
```

# Server-Side Set-Up/Helper Function Docs
Here is a thorough explanation of all functions contained in `simple-file-input/server`

## simpleFileInput.initS3(aws_sdk_instance, [options])
The "initS3()" method takes in an instance of 'aws-sdk' and gives `simple-file-input/server` access to it throughout the rest of your application, allowing it to determine the S3 endpoint based on the 'aws-sdk' configuration.  

This should be run during the initialization of your app.

*Important:* This must be run after your aws configuration has been set!

### Example Usage
```js
import awsSdk from 'aws-sdk';
import {initS3} from 'simple-file-input/server';

awsSdk.config.update({
  accessKeyId: <YOUR_AWS_CLIENT_ID>,
  secretAccessKey: <YOUR_AWS_SECRET>,
  region: <YOUR_AWS_REGION>
});

initS3(awsSdk, <YOUR_AWS_SDK_S3_INSTANCE_OPTIONS_OBJECT); // after running this, 'simple-file-input/server' will have an initialized sdk S3 instance to use in other helper functions
```

### Options object spec
Options object will be passed directly to the constructor for the aws-sdk S3 instance like so:
```js
new awsSdk.S3(<YOUR_AWS-SDK_S3_INSTANCE_OPTIONS_OBJECT>)
```

See aws-sdk S3 instance "Options Hash" under Constructor Detail in docs <a href="http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor_details">here</a>

## simpleFileInput.setBucket(s3_bucket_key)
The "setBucket()" method takes in a string which will be used as the default s3 bucket key (barring override via options) for all simpleFileInput helper functions throughout your application.

This should be run during the initialization of your app.  This step is not required if you would like to instead specify your bucket via the options object when using methods.

```js
import {setBucket} from 'simple-file-input/server';

setBucket(<YOUR_AWS_BUCKET>); // after running this, 'simple-file-input/server' methods will use this bucket by default (can be overridden per method use with options object)
```

## simpleFileInput.s3
The "s3" property gives users access to the aws-sdk s3 instance being used internally by the 'simple-file-input/server' library that was initialized by 'initS3()'.

### Example Usage
```js
import awsSdk from 'aws-sdk';
import simpleFileInput from 'simple-file-input/server';

awsSdk.config.update({
  accessKeyId: <YOUR_AWS_CLIENT_ID>,
  secretAccessKey: <YOUR_AWS_SECRET>,
  region: <YOUR_AWS_REGION>
});

simpleFileInput.initS3(awsSdk);

// gives access to s3 instance created by 'initS3' and being used by library
const rawS3 = simpleFileInput.s3;
```

### Properties
See aws-sdk S3 instance "Methods Summary" and "Property Summary" sections in docs <a href="http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html">here</a>


## simpleFileInput.config
The "config" property gives users access to the configuration object used internally by the 'simple-file-input/server' library.

*Note:* properties on this object are not directly writable, they are set indirectly via the "initS3" and "setBucket" methods.

### Example Usage
```js
import awsSdk from 'aws-sdk';
import simpleFileInput from 'simple-file-input/server';

awsSdk.config.update({
  accessKeyId: <YOUR_AWS_CLIENT_ID>,
  secretAccessKey: <YOUR_AWS_SECRET>,
  region: <YOUR_AWS_REGION>
});

simpleFileInput.initS3(awsSdk);
simpleFileInput.setBucket(<YOUR_AWS_BUCKET>);

// gives access to configuration object being used by library with properties set by 'initS3' and 'setBucket'
const config = simpleFileInput.config;
```

### Properties
```js
{
  s3Bucket: <string>, // the s3 bucket set by 'setBucket' method, used as default bucket for helper functions
  hostUrl: <string>   // the base url which will be returned along with the 's3Bucket' string and file name to the front end to achieve the full s3 file path for bucket uploads
}
```

## simpleFileInput.signUploadToS3(component_request_body, [options])
The "signUploadToS3" helper method as it's first argument takes in the body from this library's React component's request (could of course come from anywhere else) which will have the following properties:
```js
{
  name: <string>, // the name of file to be uploaded
  type: <string>  // mime type string, e.g. 'application/pdf', 'image/png'
}
```
It also takes in an optional "options" object as a second argument as discussed in the sub-section below.

The method returns a promise with the following object, which can be passed directly to the front end if you are using the <SimpleFileInput/> React component included in this package to complete the S3 upload:
```js
{
  signed_request: <string>, // the url which the upload request can be made to from the front end
  url:            <string>  // the url which the uploaded file will be located at
}
```

### Example Usage
```js
// importing Express and middlewate
import Express from 'express';
import bodyParser from 'body-parser';

// importing server-side helper promise for sending s3 signature to front end
import {signUploadToS3} from 'simple-file-input/server';

// create express instance, set request body parsing middleware
const app = Express();
app.use(bodyParser.json())); // parses JSON objects sent in request bodies

// receive the post request to '/sign' that will come from our client-side component here and respond with s3 signature
app.post('/sign', (req, res, next) =>
  signUploadToS3(req.body) // helper function handles creation of S3 signature for you
    .then(data => res.json(data))
    .catch(err => next(err))
);
```

### Options object spec
```js
{
  name:      <string>,  // override name passed in by request, note that the file extension will not be added onto a name you provide here
  expires:   <number>,  // set the number of seconds before the signed url expires (defaults to 60)
  bucket:    <string>,  // set the bucket to upload to, overrides the s3 bucket set with the 'setBucket' method (you could also just use this option on every method instead of using 'setBucket' at set-up)
  isPrivate: <boolean>, // if set to true will make file reads by other AWS users require s3 authentication by setting ACL to 'authenticated-read', default is false which sets ACL to 'public-read', meaning all requests to the file's URL can view/download the uploaded file
  acl:       <string>,  // specify the ACL(Access Control List) for your upload (affects permissions of other AWS users, i.e. other apps with different AWS creds trying to access your bucket), see docs on ACLs here:
  http://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html#canned-acl
  ...otherOptions       // additional properties will be passed into the params for the 'getSignedUrl' method, these params correspond to 'putObject' as this is the operation we are signing for, params are documented here:
  http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
}
```

## License

  [MIT](LICENSE)

[nodei-image]: https://nodei.co/npm/simple-file-input.png?downloads=true&downloadRank=true&stars=true
[nodei-url]: https://www.npmjs.com/package/simple-file-input
