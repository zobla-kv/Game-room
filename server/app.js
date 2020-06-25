const io = require("./webSocket");
const path = require("path");
const express = require("express");
const app = express();

const server = app.listen(4000);

io.listen(server);

app.use(express.static(path.join(__dirname, "..", "/public")));
