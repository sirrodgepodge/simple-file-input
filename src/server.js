import Promise from 'bluebird';

// sharing instance so utility functions don't need to each make their own
import s3, {config} from './sharedS3Instance';
const {
  s3Bucket,
  hostUrl
} = config;
s3.getSignedUrlAsync = Promise.promisify(s3.getSignedUrl);

export default infoObj =>
  s3.getSignedUrlAsync('putObject', {
    Bucket: s3Bucket || infoObj.bucket,
    Key: infoObj.name,
    Expires: 60,
    ContentType: infoObj.type,
    ACL: 'public-read'
  })
  .then(data => Promise.resolve({
    signed_request: data,
    url: `${hostUrl}${(s3Bucket || infoObj.bucket)}/${infoObj.name}`
  }))
  .catch(err => {
    console.log('Failed to get back end S3 signature for front end image upload to S3: ', err);
    return Promise.reject(err);
  });
