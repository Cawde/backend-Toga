const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
    region: process.env.BUCKET_REGION, // Your AWS region
    credentials: {
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
    },
});

module.exports = s3;