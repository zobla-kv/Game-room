const io = require("socket.io")(3000);

const users = {};
users.online = [];
const playersInGame = [];
let players;
let gameRunning = false;
let gameStartTime;
let roundWinner;
let gameWinner;

io.on("connection", (socket) => {
  socket.on("new-user", (name) => {
    users.online.push({ name, inGame: false, onlineSince: Date.now() });
    socket.emit("users-connected", users.online);
    socket.broadcast.emit("users-connected", users.online);
    socket.emit("players-in-game", playersInGame);
    if (players !== undefined) {
      socket.emit("start-game", players);
      socket.emit("show-signs", players);
      // for spec that join mid-game
      if (users.online[users.online.length - 1].onlineSince > gameStartTime) {
        socket.emit(
          "adjust-for-mid-game-spec",
          roundWinner,
          gameWinner,
          players,
          gameRunning
        );
      }
    }
  });

  socket.on("new-message", (message) => {
    socket.broadcast.emit("print-message", message);
  });

  socket.on("self-join-game", (player) => {
    updateInGameStatus(player, "add");
    socket.broadcast.emit("player-joined-game", { player, playersInGame });
  });

  socket.on("self-leave-game", ({ player, type }) => {
    socket.broadcast.emit("player-left-game", { player, playersInGame });
    gameRunning = false;
    // broadcast before removal
    setTimeout(() => {
      updateInGameStatus(player, "remove");
      if (type == "left-site") removeUserFromSite(player, socket);
    }, 10);
  });

  socket.on("self-leave", ({ user, type }) => {
    removeUserFromSite(user, socket);
  });

  socket.on("players-set", (playersArray) => {
    gameWinner = null;
    players = playersArray;
    gameStartTime = Date.now();
    gameRunning = true;
    socket.broadcast.emit("start-game", players);
  });

  socket.on("self-choose-sign", ({ user, sign }) => {
    const playerIndex = players.findIndex((e) => e.name === user);
    players[playerIndex].sign = sign;
    socket.broadcast.emit("player-chose-sign", {
      player: players[playerIndex],
      players: players,
    });
    // if both players chose sign
    if (players[0].sign !== "" && players[1].sign !== "") {
      roundWinner = whoWonRound();
      updateScore(roundWinner);
      socket.emit("start-round", roundWinner, gameWinner, players);
      socket.broadcast.emit("start-round", roundWinner, gameWinner, players);
      // broadcast before removal
      setTimeout(() => {
        for (let i = 0; i < players.length; i++) {
          players[i].sign = "";
        }
      }, 1000);
    }
  });
});

function updateInGameStatus(player, action) {
  if (action === "add") playersInGame.push(player);
  else {
    const inGameIndex = playersInGame.findIndex((e) => e === player);
    if (inGameIndex !== -1) playersInGame.splice(inGameIndex, 1);
  }
}

function whoWonRound() {
  const player1 = players[0];
  const player2 = players[1];
  if (player1.sign === player2.sign) return "nobody";
  if (player1.sign === "rock")
    if (player2.sign === "paper") return player2.name;
    else return player1.name;
  else if (player1.sign === "paper")
    if (player2.sign === "rock") return player1.name;
    else return player2.name;
  else if (player1.sign === "scissors") {
    if (player2.sign === "rock") return player2.name;
    else return (winner = player1.name);
  }
}

function updateScore(winner) {
  for (let i = 0; i < players.length; i++)
    if (players[i].name === winner) {
      players[i].score++;
      players[i].score === 3 && (gameWinner = players[i].name);
    }
}

function removeUserFromSite(user, socket) {
  const userIndex = users.online.findIndex((e) => e.name === user);
  let removedUser = users.online.splice(userIndex, 1);
  socket.broadcast.emit("user-disconnected", {
    usersOnline: users.online,
    removedUser: removedUser[0].name,
  });
}

module.exports = io;
