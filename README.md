# Cloud Video Kit REST Api integration

# Introduction

Cloud Video Kit follows a module architecture. Depending on your plan and needs, you will have access to all or only some of the modules. Each module has its own API. Cloud Video Kit provides APIs for the following modules:

- [VOD](https://developers.videokit.cloud/vod/API-vod) - Upload video files, transcode them, and manage your VOD files
- [Live](https://developers.videokit.cloud/live/API-live) - Manage live channels and events
- [Recorder](https://developers.videokit.cloud/recorder/API-recorder) - Record live events and make highlights to build your video library out of live feed
- [Player](https://developers.videokit.cloud/player/API-player) - Guides on how to stream assets created in Cloud Video Kit
- DRM - Protect the video content with industry best encryption methods

# Installation

Sample require node in version 18 or higher

Installation steps:

1. Type npm install in terminal
2. Run `npm run start command`

# Sample

The provided sample application demonstrates how to call the Cloud Video Kit REST api. The application includes an Express.js web server responsible for generating a Cloud Video Kit access token for the REST API and serving the VOD details webpage.

To call the service API, you will need the following information:

- Client ID and Client Secret (required for generating an access token)
- Client subdomain

This data will be sent by Cloud Video Kit team.

Before starting the application, ensure that you have filled in your .env file.

# How it works:

- Inital setup:
  The server-side of the application generates an access token required for communication with the Cloud Video Kit REST API and then passes it to the front-end of the application.

```js
async function getAccessToken() {
  const urlSearchParams = new URLSearchParams();
  urlSearchParams.set("client_id", "CLIENT_ID");
  urlSearchParams.set("client_secret", "CLIENT_SECRET");
  urlSearchParams.set("grant_type", "client_credentials");

  const body = urlSearchParams.toString();
  const response = await fetch("https://auth.videokit.cloud/oauth/token", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const responseJson = await response.json();

  return responseJson.access_token;
}
```

# Upload File Example (`/upload`)

1. The application retrieves a list of acceptable file extensions from Cloud Video Kit (`/vod/filetypes`).
2. The uploading process begins on the frontend side by sending a `/vod/start` request with the file size, file name, and friendly name. In response, the frontend receives:
   - `fileId`: a unique identifier for the file
   - `partsCount`: the number of parts the file needs to be uploaded in
   - `multipartUrls`: a list of URLs for uploading file parts. If the list is shorter than the `partsCount`, additional URLs need to be fetched from another endpoint.
   - `uploadId`: a unique identifier for the upload
   - `partSize`: the size of each file chunk to upload
3. File parts are uploaded based on the initial request (`multipartUrls` field from `/vod/start` request).
4. If `partsCount` is greater than the number of parts provided in the `multipartUrls` field, the missing URLs need to be downloaded from another endpoint. Fetch the missing URLs from `/files/FILE_ID/part/PART_NUMBER`.
5. Upon uploading every part of the file, complete the process by sending a POST request to `/vod/files/complete/` with:
   - `fileId`: the file ID
   - `parts`: an array of objects containing properties `partNumber` and `eTag` from the response of every uploaded part.

In the provided example, to expedite the process, multiple file parts are uploaded simultaneously.

# Play vod example (/vods)

1. The application fetches the latest 5 VODs (full documentation for VOD api you can find here: https://developers.videokit.cloud/vod/API-vod)

```js
async function getVods(token) {
  const response = await fetch(
    `https://CLIENT_SUBDOMAIN.api.videokit.cloud/vod/v1/assets?limit=5&page=1&sort=lastModificationDate&desc=true`,
    { headers: { authorization: `Bearer ${token}` } }
  );

  const { items } = await response.json();

  return items;
}
```

2. The application looks for unprotected VODs with HLS manifests
3. If such a VOD is available, the VOD title and HLS manifest URL are added to the page returned by the server
