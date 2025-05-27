// ======= server.js (Node.js + Express + Socket.IO) =======
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const users = {}; // In-memory user store
const groups = {}; // { groupName: { password, users: Set<socket.id> } }

app.use(express.static(path.join(__dirname, "public")));

function broadcastGroupList() {
  const groupList = Object.keys(groups);
  io.emit("groupList", groupList);
}

function emitGroupUserList(groupName) {
  const groupUsers = Array.from(groups[groupName].users).map(id => users[id]?.username).filter(Boolean);
  for (let id of groups[groupName].users) {
    io.to(id).emit("userList", groupUsers);
  }
}

io.on("connection", (socket) => {
  console.log("New user connected");

  socket.on("join", ({ username }) => {
    users[socket.id] = { username, group: null };
    broadcastGroupList();
  });

  socket.on("createOrJoinGroup", ({ groupName, password }) => {
    const user = users[socket.id];
    if (!user) return;

    if (user.group && groups[user.group]) {
      groups[user.group].users.delete(socket.id);
      emitGroupUserList(user.group);
      if (groups[user.group].users.size === 0) delete groups[user.group];
    }

    if (!groups[groupName]) {
      groups[groupName] = { password, users: new Set() };
    } else if (groups[groupName].password !== password) {
      socket.emit("errorMessage", "Incorrect group password.");
      return;
    }

    groups[groupName].users.add(socket.id);
    users[socket.id].group = groupName;
    socket.emit("joinedGroup", groupName);
    emitGroupUserList(groupName);
    broadcastGroupList();
  });

  socket.on("message", (msg) => {
    const user = users[socket.id];
    if (!user || !user.group) return;
    const message = { username: user.username, text: msg };

    for (let id of groups[user.group].users) {
      io.to(id).emit("message", message);
    }
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user && user.group && groups[user.group]) {
      groups[user.group].users.delete(socket.id);
      emitGroupUserList(user.group);
      if (groups[user.group].users.size === 0) delete groups[user.group];
    }
    delete users[socket.id];
    broadcastGroupList();
    console.log("User disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
