const path = require("path");
const fs = require("fs");
const express = require("express");
const dotenv = require("dotenv");
const proxy = require('express-http-proxy');

dotenv.config();

const { PORT, TENANT_NAME, API_KEY } = process.env;

const app = express();
const port = PORT || 8080;

if (!TENANT_NAME || !API_KEY) {
  console.log("fill .env file");

  return;
}

async function getVods() {
  const response = await fetch(
    `https://${TENANT_NAME}.api.videokit.cloud/vod/v1/assets?limit=5&page=1&sort=lastModificationDate&desc=true`,
    { headers: { "X-Api-Key": API_KEY } }
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
  const vods = await getVods();

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
  let index = fs.readFileSync(path.join(__dirname, "upload.html"), {
    encoding: "utf8",
  });

  return res.send(index);
});

app.use('/api', proxy(`https://${TENANT_NAME}.api.videokit.cloud`, {
  proxyReqOptDecorator: function(proxyReqOpts, srcReq) {
    proxyReqOpts.headers['X-Api-Key'] = API_KEY;

    return proxyReqOpts;
  }
}));

app.listen(port);

console.log("Server started at http://localhost:" + port);
