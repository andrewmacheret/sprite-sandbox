# sprite-sandbox

[![Deploy](https://github.com/andrewmacheret/sprite-sandbox/actions/workflows/deploy.yml/badge.svg)](https://github.com/andrewmacheret/sprite-sandbox/actions/workflows/deploy.yml) [![License](https://img.shields.io/badge/license-MIT-lightgray.svg)](https://github.com/andrewmacheret/sprite-sandbox/blob/master/LICENSE.md)

Move 2d characters with arrow keys in a sandbox. Uses [PixiJS](https://pixijs.com/) 8, loaded from a CDN.

See it running at [https://andrewmacheret.com/projects/sprite-sandbox/](https://andrewmacheret.com/projects/sprite-sandbox/).

## Run it locally

```
cd www
python3 -m http.server
```

Then open [http://localhost:8000](http://localhost:8000). You should see several characters on a tiled floor. Click one, then use the arrow keys (or the on-screen arrow buttons on a phone) to move it, and Space to jump.

The buttons under the play area pick a random character, let everyone else wander around, line everyone up in a conga line behind you, or start a dance party. Characters bump into each other instead of walking through, and they'll tell you about it.

## Deploy

Pushing to `master` runs [GitHub Actions](.github/workflows/deploy.yml), which syncs `www/` to `s3://andrewmacheret.com/projects/sprite-sandbox` and clears the CloudFront cache. It signs in to AWS with GitHub OIDC using the role in the `AWS_ROLE_ARN` repo variable.
