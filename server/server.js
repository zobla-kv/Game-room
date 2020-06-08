const http = require("http");
const io = require("socket.io")(4000);
const express = require("express");
const app = express();

const users = {};
users.online = [];
const playersInGame = [];
let players;

io.on("connection", (socket) => {
  socket.on("new-user", (name) => {
    users.online.push({ name, inGame: false });
    socket.emit("users-connected", users.online);
    socket.broadcast.emit("users-connected", users.online);
    socket.emit("players-in-game", playersInGame);
    // for users that join mid-game
    if (players !== undefined) {
      socket.emit("show-players", players);
      socket.emit("show-signs", players);
    }
  });

  socket.on("new-message", (message) => {
    socket.broadcast.emit("print-message", message);
  });

  socket.on("self-join-game", (player) => {
    updateInGameStatus(player, "add");
    socket.broadcast.emit("player-joined-game", { player, playersInGame });
  });

  socket.on("self-leave-game", (player) => {
    // broadcast ne radi lepo kad ostane 1 na stranici O.o' !
    socket.broadcast.emit("player-left-game", { player, playersInGame });
    // timeout da bi stiglo svima da emituje pre nego sto ga ukloni
    setTimeout(() => {
      updateInGameStatus(player, "remove");
    }, 1000);
  });

  socket.on("self-leave", (user) => {
    const userIndex = users.online.findIndex((e) => e.name === user);
    let removedUser = users.online.splice(userIndex, 1);
    socket.broadcast.emit("user-disconnected", {
      usersOnline: users.online,
      removedUser: removedUser[0].name,
    });
  });

  socket.on("test", (p) => {
    console.log(p);
  });

  socket.on("players-set", (playersArray) => {
    players = playersArray;
    socket.broadcast.emit("show-players", players);
  });

  socket.on("self-choose-sign", ({ user, sign }) => {
    const playerIndex = players.findIndex((e) => e.name === user);
    players[playerIndex].sign = sign;
    socket.broadcast.emit("player-chose-sign", {
      player: players[playerIndex],
      players: players,
    });
  });
});

function updateInGameStatus(player, action) {
  const playerIndex = users.online.findIndex((e) => e.name === player);
  if (playerIndex !== -1)
    users.online[playerIndex].inGame = !users.online[playerIndex].inGame;
  if (action === "add") playersInGame.push(player);
  else {
    const inGameIndex = playersInGame.findIndex((e) => e === player);
    if (inGameIndex !== -1) playersInGame.splice(inGameIndex, 1);
  }
}
