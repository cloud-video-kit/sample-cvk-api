# Cloud Video Kit REST API integration

# Introduction

Cloud Video Kit follows a module architecture. Depending on your plan and needs, you will have access to all or only some of the modules. Each module has its own API. Cloud Video Kit provides APIs for the following modules:

- [VOD](https://docs.videokit.cloud/api-reference/api-reference#vod-1) - Upload video files, transcode them, and manage your VOD files
- [Live](https://docs.videokit.cloud/api-reference/api-reference#live-1) - Manage live channels and events
- [Recorder](https://docs.videokit.cloud/api-reference/api-reference#recorder-1) - Record live events and make highlights to build your video library out of live feed
- [Streaming](https://docs.videokit.cloud/api-reference/api-reference#streaming-1) - Guides on how to stream assets created in Cloud Video Kit
- DRM - Protect the video content with industry-leading encryption methods

# Installation

The sample requires Node version 18 or higher.

Installation:
```sh
npm install
npm run start
```

# Sample

The provided sample application demonstrates how to call the Cloud Video Kit REST API. The application includes an Express.js web server responsible for forwarding calls to the Cloud Video Kit API. The frontend part of the application is a simple HTML page with JavaScript code that calls the server-side API.

To call the service API, you will need the following information:

- API key - available at the [API Cheatsheet page](https://console.videokit.cloud/dashboard/api_cheatsheet)
- tenant name

Before starting the application, ensure that you have filled in your .env file.

# How it works:

- Inital setup:
  The server-side of the application works as a proxy and passes the request to the Cloud Video Kit API with the provided API key.

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

In the provided example, multiple file parts are uploaded simultaneously to expedite the process.

# Play vod example (`/vods`)

1. The application fetches the latest 5 VODs (full documentation for VOD API you can find here: https://docs.videokit.cloud/api-reference/api-reference#vod-1)

```js
async function getVods(token) {
  const response = await fetch(
    `https://TENANT_NAME.api.videokit.cloud/vod/v1/assets?limit=5&page=1&sort=lastModificationDate&desc=true`,
    { headers: { "X-Api-Key": API_KEY } }
  );

  const { items } = await response.json();

  return items;
}
```

2. The application looks for unprotected VODs with HLS manifests
3. If such a VOD is available, the VOD title and HLS manifest URL are added to the page returned by the server
