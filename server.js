const path = require("path");
const fs = require("fs");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const { PORT, CLIENT_ID, CLIENT_SECRET, CLIENT_SUBDOMAIN, OAUTH_ENDPOINT } =
  process.env;

const app = express();
const port = PORT || 8080;

if (!CLIENT_ID || !CLIENT_SECRET || !CLIENT_SUBDOMAIN || !OAUTH_ENDPOINT) {
  console.log("fill .env file");

  return;
}

let accessTokenCached;
let accessTokenCacheExpiration;

async function getAccessToken() {
  if (
    accessTokenCached &&
    accessTokenCacheExpiration &&
    accessTokenCacheExpiration > new Date()
  ) {
    console.log("cached token");

    return accessTokenCached;
  }

  const urlSearchParams = new URLSearchParams();
  urlSearchParams.set("client_id", CLIENT_ID);
  urlSearchParams.set("client_secret", CLIENT_SECRET);
  urlSearchParams.set("grant_type", "client_credentials");

  const body = urlSearchParams.toString();
  const reqTimestamp = new Date();
  const response = await fetch(OAUTH_ENDPOINT, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const responseJson = await response.json();

  const expirationSeconds = responseJson.expires_in;
  accessTokenCacheExpiration = reqTimestamp.setSeconds(
    reqTimestamp.getSeconds() + expirationSeconds
  );
  console.log({ expirationSeconds, accessTokenCacheExpiration });
  accessTokenCached = responseJson.access_token;

  return accessTokenCached;
}

async function getVods(token) {
  const response = await fetch(
    `https://${CLIENT_SUBDOMAIN}.api.videokit.cloud/vod/v1/assets?limit=5&page=1&sort=lastModificationDate&desc=true`,
    { headers: { authorization: `Bearer ${token}` } }
  );

  const { items } = await response.json();

  return items;
}

function getFirstNonProtectedVod(vods) {
  return vods.find((vod) =>
    vod.outputs.find(
      (output) =>
        output.endpoints.every((endpoint) => endpoint.protection === "None") &&
        output.endpoints.some((endpoint) => endpoint.format === "HLS")
    )
  );
}

function getHlsManifest(vod) {
  return vod.outputs[0].endpoints.find(
    (endpoint) => endpoint.accessType === "Http" && endpoint.format === "HLS"
  )?.url;
}

app.get("/", async function (req, res) {
  const index = fs.readFileSync(path.join(__dirname, "index.html"), {
    encoding: "utf8",
  });

  return res.send(index);
});

app.get("/vod", async function (req, res) {
  const accessToken = await getAccessToken();
  const vods = await getVods(accessToken);

  const nonProtectedVod = getFirstNonProtectedVod(vods);
  const title = nonProtectedVod.title;

  const hlsManifestUrl = getHlsManifest(nonProtectedVod);

  let index = fs.readFileSync(path.join(__dirname, "vod.html"), {
    encoding: "utf8",
  });

  if (hlsManifestUrl && title) {
    index = index.replace("%HLS_MANIFEST_URL%", hlsManifestUrl);
    index = index.replaceAll("%TITLE%", title);
  }

  return res.send(index);
});

app.get("/upload", async function (req, res) {
  const accessToken = await getAccessToken();

  let index = fs.readFileSync(path.join(__dirname, "upload.html"), {
    encoding: "utf8",
  });

  if (accessToken) {
    index = index.replace("%ACCESS_TOKEN%", accessToken);
    index = index.replace("%CLIENT_SUBDOMAIN%", CLIENT_SUBDOMAIN);
  }

  return res.send(index);
});

app.listen(port);

console.log("Server started at http://localhost:" + port);
