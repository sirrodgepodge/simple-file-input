import merge from 'lodash.merge';
import Promise from 'bluebird';

// // Configuration

// declare exportable s3 object
export const s3 = {};

// use this function to initialize s3 bucket on previously declared object
export const initS3 = awsSdk => {
  merge(s3, new awsSdk.S3());

  // promisifying used methods
  s3.getSignedUrlAsync = Promise.promisify(s3.getSignedUrl);
};

// vars required for s3 use
const config = {
  s3Bucket: null,
  get hostUrl() {
    return s3.endpoint && `${s3.endpoint.protocol}//${s3.endpoint.hostname}/` || null;
  }
};

// use this function to set s3 bucket
export const setBucket = bucket => {
  config.s3Bucket = bucket;
};


// // Helper Functions

// helper for uploading to S3
export const signUploadToS3 = (infoObj, {name, expires, bucket, isPrivate, acl}) =>
  s3.getSignedUrlAsync('putObject', {
    Bucket: config.s3Bucket || bucket || console.log(`Error: no bucket provided via 'setBucket' helper or options object`) || null,
    Key: name || infoObj.name,
    Expires: expires || 60,
    ContentType: infoObj.type,
    ACL: acl || isPrivate ? 'authenticated-read' : 'public-read'
  })
  .then(data => Promise.resolve({
    signed_request: data,
    url: `${config.hostUrl}${(config.s3Bucket || bucket)}/${infoObj.name}`
  }))
  .catch(err => {
    console.log('Failed to get back end S3 signature for front end image upload to S3: ', err);
    return Promise.reject(err);
  });
