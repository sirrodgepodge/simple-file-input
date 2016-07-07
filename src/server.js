import Promise from 'bluebird';

// sharing instance so utility functions don't need to each make their own
import s3, {config, setBucket as setBucketFunc} from './sharedS3Instance';
s3.getSignedUrlAsync = Promise.promisify(s3.getSignedUrl);

export const setBucket = setBucketFunc;

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
