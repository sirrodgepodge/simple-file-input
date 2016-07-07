import awsSdk from 'aws-sdk';
import merge from 'lodash/merge';

// concatenate 'prod' for production bucket
const s3 = new awsSdk.S3();

export default s3

export const config = {
  s3Bucket: null,
  hostUrl: `${s3.endpoint.protocol}//${s3.endpoint.hostname}/`
}

export const setBucket = bucket => {
  config.s3Bucket = bucket;
};
