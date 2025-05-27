const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const users = {}; // In-memory user store
const messages = {}; // Store messages per user

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log("New user connected");

  socket.on("join", (username) => {
    users[socket.id] = username;
    messages[socket.id] = [];
    io.emit("userList", Object.values(users));
  });

  socket.on("message", (msg) => {
    const username = users[socket.id];
    const message = { username, text: msg };
    messages[socket.id].push(message);
    io.emit("message", message);
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    delete messages[socket.id];
    io.emit("userList", Object.values(users));
    console.log("User disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});