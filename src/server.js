import Promise from 'bluebird';
import merge from 'lodash.merge';
import pathJoin from 'iso-path-join';

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
  pathJoin(`${config.hostUrl}${s3.config.s3BucketEndpoint ? '' : bucket}`, name);

// // Helper Functions

// helper for uploading to S3
export const signUploadToS3 = ({name: reqName, type} = {}, {name, expires, bucket, isPrivate, acl, ...otherOptions} = {}) => {
  // catching argument errors
  if(typeof s3.getSignedUrlAsync !== 'function')
    return console.log(new Error(`Need to run the 'initS3' method prior to using helper functions`));

  if(typeof bucket !== 'string' && typeof config.s3Bucket !== 'string')
    return console.log(new Error(`must provide 'bucket' property as string either via 'setBucket' method or options object (second argument)`));

  if(typeof reqName !== 'string' && typeof name !== 'string')
    return console.log(new Error(`must provide 'name' property as string in either request object (first argument) or options object (second argument)`));

  if(typeof type !== 'string')
    return console.log(new Error(`must provide 'type' property as mime type string in request object (first argument)`));

  // need to
  let fileName = name || reqName;
  fileName = fileName[0] === '/' ? fileName.slice(1) : fileName;

  // actual function execution
  return s3.getSignedUrlAsync('putObject', {
    Bucket: bucket || config.s3Bucket || null,
    Key: fileName,
    Expires: expires || 60,
    ContentType: type,
    ACL: acl || isPrivate ? 'private' : 'public-read',
    ...otherOptions
  })
  .then(data => Promise.resolve({
    signed_request: data,
    url: getObjectUrl(bucket || config.s3Bucket, name || reqName)
  }))
  .catch(err => {
    console.log('Failed to get back end S3 signature for front end image upload to S3: ', err);
    return Promise.reject(err);
  });
};

export const signGetFromS3 = (name, {bucket, expires, ...otherOptions} = {}) => {
  // allow key to be provided as a string
  const Key = typeof name === 'object' && name !== null ? name.name : name;

  // catching argument errors
  if(typeof s3.getSignedUrlAsync !== 'function')
    return console.log(new Error(`Need to run the 'initS3' method prior to using helper functions`));

  if(typeof bucket !== 'string' && typeof config.s3Bucket !== 'string')
    return console.log(new Error(`must provide 'bucket' property as string either via 'setBucket' method or options object (second argument)`));

  if(typeof Key !== 'string')
    return console.log(new Error(`must provide 'name' as either string in first argument or string property on object in first argument`));

  return s3.getSignedUrlAsync('getObject', {
    Bucket: bucket || config.s3Bucket || null,
    Key,
    Expires: expires || 60,
    ...otherOptions
  })
  .then(data => Promise.resolve({
    signed_request: data
  }))
  .catch(err => {
    console.log('Failed to get back end S3 signature for front end image upload to S3: ', err);
    return Promise.reject(err);
  });
};
