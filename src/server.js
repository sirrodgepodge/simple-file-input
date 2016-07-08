///// @TODO use webpack to put this in a separate file

import merge from 'lodash.merge';

// concatenate 'prod' for production bucket
export const s3 = {};
export const initS3 = awsSdk => merge(s3, new awsSdk.S3());


// vars required for s3 use
const config = {
  s3Bucket: null,
  get hostUrl() {
    return s3.endpoint && `${s3.endpoint.protocol}//${s3.endpoint.hostname}/` || null;
  }
}

export const setBucket = bucket => {
  config.s3Bucket = bucket;
};

/////


import Promise from 'bluebird';

// sharing instance so utility functions don't need to each make their own
s3.getSignedUrlAsync = Promise.promisify(s3.getSignedUrl);

export const signS3 = infoObj =>
  s3.getSignedUrlAsync('putObject', {
    Bucket: config.s3Bucket || infoObj.bucket,
    Key: infoObj.name,
    Expires: 60,
    ContentType: infoObj.type,
    ACL: 'public-read'
  })
  .then(data => Promise.resolve({
    signed_request: data,
    url: `${config.hostUrl}${(config.s3Bucket || infoObj.bucket)}/${infoObj.name}`
  }))
  .catch(err => {
    console.log('Failed to get back end S3 signature for front end image upload to S3: ', err);
    return Promise.reject(err);
  });
