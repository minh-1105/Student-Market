# Student Market S3-compatible configuration

Local development bucket: `student-market-local-images`  
Endpoint: `http://localhost:4566`  
Region used for request signing: `ap-southeast-1`

The bucket is private and uses two logical prefixes:

- `raw/users/{userId}/items/{itemId}/{uploadId}.{ext}` for direct presigned uploads.
- `processed/items/{itemId}/{uploadId}/{variant}.webp` for image-processor output.

Configuration files:

- `cors.dev.json`: permits presigned POST uploads from the two local frontend origins.
- `lifecycle.dev.json`: aborts incomplete multipart uploads after seven days. It does not expire raw images while the image processor is not deployed.
- The LocalStack initializer reuses the CORS and lifecycle files. Production security controls such as Block Public Access, Bucket Owner Enforced, default encryption and TLS-only bucket policies must be applied by production IaC rather than copied from local emulation.

Do not create placeholder objects for `raw/` or `processed/`; S3 prefixes appear when the first real object is written.

CloudTrail S3 data events, server access logging, and CloudWatch request metrics do not apply to this local emulator. Enable the appropriate controls when a shared AWS staging or production environment is intentionally provisioned.
