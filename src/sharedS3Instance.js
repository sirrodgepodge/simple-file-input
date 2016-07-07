import awsSdk from 'aws-sdk';
import merge from 'lodash/merge';

// concatenate 'prod' for production bucket
const s3 = new awsSdk.S3();

merge(s3, {
  setBucket: bucket => {
    s3.config.s3Bucket = bucket;
  },
  config: {
    s3Bucket: null,
    hostUrl: `${s3.endpoint.protocol}//${s3.endpoint.hostname}/`
  }
});

module.exports = s3;
