# sprite-sandbox

[![Deploy](https://github.com/andrewmacheret/sprite-sandbox/actions/workflows/deploy.yml/badge.svg)](https://github.com/andrewmacheret/sprite-sandbox/actions/workflows/deploy.yml) [![License](https://img.shields.io/badge/license-MIT-lightgray.svg)](https://github.com/andrewmacheret/sprite-sandbox/blob/master/LICENSE.md)

Move 2d characters with arrow keys in a sandbox. Uses [PixiJS](https://pixijs.com/) 8, loaded from a CDN.

See it running at [https://andrewmacheret.com/projects/sprite-sandbox/](https://andrewmacheret.com/projects/sprite-sandbox/).

## Run it locally

```
cd www
python3 -m http.server
```

Then open [http://localhost:8000](http://localhost:8000). You should see several characters in an orange box. Click one, then use the arrow keys to move it.

## Deploy

Pushing to `master` runs [GitHub Actions](.github/workflows/deploy.yml), which syncs `www/` to `s3://andrewmacheret.com/projects/sprite-sandbox` and clears the CloudFront cache. It signs in to AWS with GitHub OIDC using the role in the `AWS_ROLE_ARN` repo variable.
