# simple-file-input
working with S3 sucks! Let this nifty little library handle it for you with a React component and server side helper function :) 

[![NPM][nodei-image]][nodei-url]

## License

  [MIT](LICENSE)

[nodei-image]: https://nodei.co/npm/simple-file-input.png?downloads=true&downloadRank=true&stars=true
[nodei-url]: https://www.npmjs.com/package/simple-file-input

# 'Hello World' Example
## Client Side
```js
import SimpleFileInput from 'simple-file-input';

<SimpleFileInput
  type='document'
  signingRoute='/sign'
  onS3Load={(err, fileName) => this.handleChange('documentFile', fileName)}
/>

## Server Side



# Client side
To make requests you just need to need to make an instance of SimpleIsoFetch and then can use your standard 'get', 'put', 'post', 'del', and 'patch' methods.  If you're server-side you need to set the host because node-fetch can't determine the base route


# Full Component Props API
Here are all the available props with corresponding descriptions of what they do in the comment to their right

```js
propTypes = {
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

simpleIsoFetch = new SimpleIsoFetch(); // SimpleIsoFetch must be instantiated before use, this allows for cookie session handling in universal apps, discussed late

// example usage for get request to 'http://locahost:3000'
simpleIsoFetch.get({
  route: '/'
})
.then(res => {
  console.log(res); // => all html returned from 'http://locahost:3000'
});

// identical to the above, convenience default for when no body/customization is needed (just uses string passed as route)
simpleIsoFetch.get('/').then(res => {
  console.log(res); // => all html returned from 'http://locahost:3000'
});
```
## A More Thorough Example
```js
// set to your app's hostname + port, (if hostname not provided, defaults to localhost, if hostname provided without port, 80 is assumed, if neither hostname nor port provided, http://localhost: + (process.env.PORT || 3000) used, function returns resulting base URL (note this is a static method, on class itself not instance)
SimpleIsoFetch.setBaseUrl('http://localhost', 3000);

// normal usage
const aJsonObject = {
  prop: 'example'
}

const exampleParam = 'paramparamparam';

// the below will make a POST request to:
// 'http://localhost:3000/api/paramparamparam?prop=valvalval&prop2=anotherVal'
simpleIsoFetch.post({
  route: '/api',
  params: exampleParam,
  query: {
    prop: 'valvalval',
    prop2: 'anotherVal'
  },
  body: aJsonObject
})
.then(res => console.log(res)) // console.logs whatever the response is
.catch(err => console.log(err)); // console.logs whatever the error is

// there is flexibility built in to allow you to provide the route as the first argument and additional options as the second
// the below will make a PUT request to:
// 'http://localhost:3000/api/paramparamparam?prop=valvalval&prop2=anotherVal'
simpleIsoFetch.put('/api', {
  params: exampleParam,
  query: {
    prop: 'valvalval',
    prop2: 'anotherVal'
  },
  body: aJsonObject
})
.then(res => console.log(res)) // console.logs whatever the response is
.catch(err => console.log(err)); // console.logs whatever the error is

// the below will make a DELETE request to:
// 'http://localhost:3000/api/paramparamparam?prop=valvalval&prop2=anotherVal'
// (note that DELETE and GET requests can't have a 'body' property per W3C spec)
simpleIsoFetch.del({
  route: '/api',
  params: exampleParam,
  query: {
    prop: 'valvalval',
    prop2: 'anotherVal'
  }
})
.then(res => console.log(res)) // console.logs whatever the response is
.catch(err => console.log(err)); // console.logs whatever the error is


// full configurable options exposed below
//// dummy body
const blogPost = {
  title: 'Hey Guys',
  body: 'I\'m o simple!'
}

//// dummy params
const id = '1234';
const location = 'place';

// the below will make a POST request to:
// 'http://localhost:3000/api/posts/1234/place/?anAnalyticsThing={"aDeeplyNestedProperty":"example"}&anotherProperty=example2'
simpleIsoFetch.makeRequest({
  // instead of 'makeRequest method + 'method' property you just use simpleFetch.<lowercase method> instead of
  // simpleFetch.makeRequest for GET, PUT, and POST, DELETE uses the simpleFetch 'del' method as 'delete'
  // is a reserved word.  The makeRequest method allows you to specify the method and therefore allows
  // for less common methods.
  method: 'post',
  route: '/api/posts',
  params: [id, location],
  query: {
      anAnalyticsThing: {
        // must be using bodyParser middleware with urlencoded method's extended property set to true
        // for nested objects in 'query' to work (it's the default but many examples set this to false):
        // 'bodyParser.urlencoded();' or 'bodyParser.urlencoded({ extended: true});'
        aDeeplyNestedProperty: 'example'
      },
      anotherProperty: 'example2'
  },
  body: blogPost,
  headers: {
    // note you should not set the 'Content-Type' header yourself unless you really think you have to
    // as this is being inferred for you by simple-iso-fetch
    aHeadersProperty: 'value'
  },
  // when 'includeCreds' property is set to true, credentials will be included in the request no matter
  // where the request is being made to, if this is set to false only 'same-origin' (internal to app) requests
  // will include credentials which means they'll never be included in requests coming from server until Node.js
  // implements native Fetch API. 'credentials' must be included for authentication
  includeCreds: true,
  // FOR ALL RESPONSE TYPES OTHER THAN ARRAYBUFFER YOU DON'T NEED TO USE 'responseType' PROPERTY AS TYPE WILL BE INFERRED.  
  // For an 'arrayBuffer' response this is needed however, as there's no way (that I've found)
  // to infer that a response is an arrayBuffer vs. a blob
  responseType: 'arrayBuffer'
})
.then(res => console.log(res)) // console.logs whatever the response is
.catch(err => console.log(err)); // console.logs whatever the error is
```
