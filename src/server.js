import merge from 'lodash.merge';
import Promise from 'bluebird';

// // Configuration

// declare exportable s3 object
export const s3 = {};

// use this function to initialize s3 bucket on previously declared object
export const initS3 = (awsSdk, options = {}) => {
  merge(s3, new awsSdk.S3(options));

  // promisifying used methods
  s3.getSignedUrlAsync = Promise.promisify(s3.getSignedUrl);
};

// default s3Bucket var held at this scope for library closure
let s3Bucket;

// vars required for s3 use
export const config = {
  get s3Bucket() {
    return s3Bucket || null;
  },
  get hostUrl() {
    return !s3.endpoint ? null : `${s3.endpoint.protocol}//${s3.endpoint.hostname}/`;
  }
};

// use this function to set s3 bucket
export const setBucket = bucket => {
  s3Bucket = bucket;
};

// genrates url for stored object to send to the front end
const getObjectUrl = (bucket, name) =>
  `${config.hostUrl}${(s3.config.s3BucketEndpoint ? '' : bucket)}/${name}`;

// // Helper Functions

// helper for uploading to S3
export const signUploadToS3 = (infoObj, {name, expires, bucket, isPrivate, acl} = {}) => {
  if(!s3.getSignedUrlAsync)
    return console.log('Need to run the \'initS3\' method prior to using helper functions');

  return s3.getSignedUrlAsync('putObject', {
    Bucket: bucket || config.s3Bucket || console.log(`Error: no bucket provided via 'setBucket' method or options object`) || null,
    Key: name || infoObj.name,
    Expires: expires || 60,
    ContentType: infoObj.type,
    ACL: acl || isPrivate ? 'authenticated-read' : 'public-read'
  })
  .then(data => Promise.resolve({
    signed_request: data,
    url: getObjectUrl(bucket || config.s3Bucket, name || infoObj.name)
  }))
  .catch(err => {
    console.log('Failed to get back end S3 signature for front end image upload to S3: ', err);
    return Promise.reject(err);
  });
};
