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
      if (players[0].sign !== "" && players[1].sign !== "")
        socket.emit("start-game-for-mid-game-spec");
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
    if (players[0].sign !== "" && players[1].sign !== "") {
      const winner = whoIsWinner();
      socket.emit("start-game", winner);
      socket.broadcast.emit("start-game", winner);
      // da bi stigo broadcast pre uklananja
      setTimeout(() => {
        for (let i = 0; i < players.length; i++) {
          players[i].sign = "";
        }
      }, 1000);
    }
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

function whoIsWinner() {
  const player1 = players[0];
  const player2 = players[1];
  let winner;
  if (player1.sign === player2.sign) {
    winner = "tie";
    return winner;
  } else if (player1.sign === "paper") {
    if (player2.sign === "rock") {
      winner = player1.name;
      return winner;
    } else {
      if (player2.sign === "scissors") {
        winner = player2.name;
        return winner;
      }
    }
  }
  if (player1.sign === "scissors") {
    if (player2.sign === "rock") {
      winner = player2.name;
      return winner;
    } else {
      if (player2.sign === "paper") {
        winner = player1.name;
        return winner;
      }
    }
  }
}
