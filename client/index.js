const chat = document.getElementById("chat");
const message = document.getElementById("message");
const msgInput = document.getElementById("messageInput");
const sendMsg = document.getElementById("messageSend");
const msgWrapper = document.getElementById("messageWrapper");
const usersOnline = document.getElementById("usersOnline");
const userslistWrapper = document.getElementById("usersOnlineListWrapper");
const leftNameBox = document.getElementById("player1"); // name box
const rightNameBox = document.getElementById("player2");
const leaveGame = document.getElementById("leaveGame");
const signWrapper = document.getElementById("signWrapper");
const startGameButton = document.getElementById("startGameButton");
const signBoxes = document.getElementsByClassName("sign");
const leftPlayerChoice = document.getElementById("choice1Img");
const rightPlayerChoice = document.getElementById("choice2Img");
const lockEffectLeft = document.getElementById("leftPlayerChooseEffect");
const lockEffectRight = document.getElementById("rightPlayerChooseEffect");
const walls = document.getElementsByClassName("walls");
const wallSound = new Audio("./assets/sound/wall-lifting.wav");
const scoreBoxes = document.getElementsByClassName("scoreBox");
const timer = document.getElementById("timer");
const info = document.getElementById("info");

const socket = io("http://localhost:4000");

let user = "";
while (user === "" || user === null) {
  user = prompt("Enter your name");
}

socket.emit("new-user", user);

socket.on("users-connected", (users) => {
  printUsers(users);
});

socket.on("print-message", ({ user, message }) => {
  printMessage(`${user}: ${message}`);
});

window.onbeforeunload = () => {
  // socket.emit("self-leave-game", user); // ukloni ga iz gejma al ne iz chata
  socket.emit("self-leave", user); //! koji stoji ovde ne emituje se svaki put
};

socket.on("user-disconnected", ({ usersOnline, removedUser }) => {
  socket.emit("self-leave-game", removedUser); // ukloni ga s chata al ne iz gejma, //! svaki emituje ovo, a treba samo jedan, ne valjda da bude ovde
  printUsers(usersOnline);
});

leftNameBox.addEventListener("click", () => {
  if (leftNameBox.innerHTML !== "JOIN") return;
  socket.emit("self-join-game", user);
  leftNameBox.innerHTML = user;
  leaveGame.style.display = "block";
  signWrapper.style.display = "flex";
});

socket.on("player-joined-game", ({ player, playersInGame }) => {
  rightNameBox.innerHTML === "JOIN"
    ? (rightNameBox.innerHTML = player)
    : (leftNameBox.innerHTML = player);
  if (playersInGame.length === 2 && playersInGame.includes(user))
    startGameButton.style.display = "block";
});

leaveGame.addEventListener("click", () => {
  socket.emit("self-leave-game", user);
  leftNameBox.innerHTML = "JOIN";
  leaveGame.style.display = "none";
  signWrapper.style.display = "none";
  startGameButton.style.display = "none";
});

socket.on("players-in-game", (playersInGame) => {
  if (playersInGame.length === 1) {
    rightNameBox.innerHTML = playersInGame[0];
  }
  if (playersInGame.length === 2) {
    leftNameBox.innerHTML = playersInGame[0];
    rightNameBox.innerHTML = playersInGame[1];
  }
});

socket.on("player-left-game", ({ player, playersInGame }) => {
  // dal je korisnik koji je izaso bio igrac, ako nije preskace se sve
  if (playersInGame.includes(player)) {
    // dal je trenutni korisnik igrac
    if (playersInGame.includes(user)) rightNameBox.innerHTML = "JOIN";
    else {
      // ovaj blok se prikazuje spectatoru
      if (playersInGame.length === 2) {
        const index =
          playersInGame.findIndex((e) => e === player) === 0 ? 1 : 0;
        rightNameBox.innerHTML = playersInGame[index];
        leftNameBox.innerHTML = "JOIN";
      } else if (playersInGame.length === 1) {
        leftNameBox.innerHTML = "JOIN";
        rightNameBox.innerHTML = "JOIN";
      }
    }
    startGameButton.style.display = "none";
  }
});

// for users that join mid-game
socket.on("show-signs", (players) => {
  showPlayerSigns(players);
});

//////////////////// ** game **////////////////////////////
const signs = [
  {
    name: "rock",
    src: "/client/assets/img/rock-lg.PNG",
  },
  {
    name: "paper",
    src: "/client/assets/img/paper-lg.PNG",
  },
  {
    name: "scissors",
    src: "/client/assets/img/scissors-lg.PNG",
  },
];

let leftPlayer = {},
  rightPlayer = {};

startGameButton.addEventListener("click", () => {
  const players = [];
  players.push(
    { name: leftNameBox.innerHTML, role: "player1", sign: "" },
    { name: rightNameBox.innerHTML, role: "player2", sign: "" }
  );
  showScoreBoxes();
  showTimer();
  enableEffect();
  enableSignChoose();
  assignSignBoxesToPlayersNormal(players);
  socket.emit("players-set", players);
  startGameButton.style.display = "none";
});

socket.on("show-players", (players) => {
  showScoreBoxes();
  showTimer();
  enableEffect();
  const isSpectator = isUserSpectator(players);
  if (isSpectator) {
    if (leftNameBox.innerHTML === players[0].name)
      assignSignBoxesToPlayersNormal(players);
    else assignSignBoxesToPlayersInverted(players);
  } else {
    assignSignBoxesToPlayersNormal(players);
    enableSignChoose();
  }
});

socket.on("player-chose-sign", ({ player, players }) => {
  // player is guy who chose sign
  const signIndex = signs.findIndex((sign) => sign.name === player.sign);
  const isSpectator = isUserSpectator(players);
  if (isSpectator) {
    if (leftPlayer.name === player.name) {
      leftPlayer.choice.src = signs[signIndex].src;
      triggerLockEffect(lockEffectLeft);
    } else {
      rightPlayer.choice.src = signs[signIndex].src;
      triggerLockEffect(lockEffectRight);
    }
  } else {
    rightPlayer.choice.src = signs[signIndex].src;
    triggerLockEffect(lockEffectRight);
  }
});

function SetSign() {
  triggerLockEffect(lockEffectLeft);
  const { name, src } = signs[this.dataset.index];
  const sign = name;
  const Img = src;
  leftPlayerChoice.src = Img;
  disableSignChoose();
  socket.emit("self-choose-sign", { user, sign });
}

socket.on("start-game", async (winner) => {
  await startCountdown();
  await liftWalls();
  await displayWinner(winner);
  await dropWalls();
  enableSignChoose();
});

socket.on("start-game-for-mid-game-spec", (winner) => {
  liftWalls();
});

////////////////// **  ** ///////////////////////////

sendMsg.addEventListener("click", () => {
  const message = msgInput.value;
  socket.emit("new-message", { user: user, message: message });
  printMessage(`You: ${message}`);
  msgInput.value = "";
});

function printUsers(users) {
  userslistWrapper.innerHTML = "";
  for (let i = 0; i < users.length; i++) {
    const user = document.createElement("li");
    const span = document.createElement("span"); // da bi mogo da primaknem text blize bulletu
    span.innerHTML = users[i].name;
    span.innerHTML = span.innerHTML.padEnd(8);
    user.appendChild(span);
    userslistWrapper.appendChild(user);
  }
}

let msgCounter = 0;
function printMessage(message) {
  const newMessage = document.createElement("div");
  newMessage.setAttribute("id", "message");
  newMessage.innerHTML = message;
  msgWrapper.appendChild(newMessage);
  msgCounter++;
  if (msgCounter > 6) chat.scrollTop += 40;
}

function enableSignChoose() {
  [].forEach.call(signBoxes, (e, i) => {
    e.dataset.index = i;
    e.addEventListener("click", SetSign);
  });
}

function disableSignChoose() {
  [].forEach.call(signBoxes, (e, i) => {
    e.removeEventListener("click", SetSign);
  });
}

function isUserSpectator(players) {
  let isSpectator;
  for (let i = 0; i < players.length; i++) {
    isSpectator = players[i].name === user;
    if (isSpectator) break;
  }
  return !isSpectator;
}

function assignSignBoxesToPlayersNormal(players) {
  leftPlayer.name = leftNameBox.innerHTML;
  leftPlayer.choice = leftPlayerChoice;
  rightPlayer.name = rightNameBox.innerHTML;
  rightPlayer.choice = rightPlayerChoice;
}

function assignSignBoxesToPlayersInverted(players) {
  rightPlayer.name = leftNameBox.innerHTML;
  rightPlayer.choice = leftPlayerChoice;
  leftPlayer.name = rightNameBox.innerHTML;
  leftPlayer.choice = rightPlayerChoice;
}

function showPlayerSigns(players) {
  const sign1Index = signs.findIndex((sign) => sign.name === players[0].sign);
  const sign2Index = signs.findIndex((sign) => sign.name === players[1].sign);
  // if both players selected sign
  if (sign1Index !== -1 && sign2Index !== -1)
    assignSignToBoth(sign1Index, sign2Index, players);
  else if (
    (sign1Index !== -1 && sign2Index === -1) ||
    (sign1Index === -1 && sign2Index !== -1)
  )
    assignSignToOne(sign1Index, sign2Index, players);
  else return;
}

function assignSignToBoth(sign1Index, sign2Index, players) {
  if (leftPlayer.name === players[0].name)
    leftPlayer.choice.src = signs[sign1Index].src;
  else leftPlayer.choice.src = signs[sign2Index].src;
  if (rightPlayer.name === players[0].name)
    rightPlayer.choice.src = signs[sign1Index].src;
  else rightPlayer.choice.src = signs[sign2Index].src;
}

function assignSignToOne(sign1Index, sign2Index, players) {
  // check which player has selected sign and assign it based on his position
  if (players[0].sign !== "") {
    if (leftPlayer.name === players[0].name)
      leftPlayer.choice.src = signs[sign1Index].src;
    else rightPlayer.choice.src = signs[sign1Index].src;
  } else if (players[1].sign !== "") {
    if (leftPlayer.name === players[1].name)
      leftPlayer.choice.src = signs[sign2Index].src;
    else rightPlayer.choice.src = signs[sign2Index].src;
  }
}

function enableEffect() {
  lockEffectLeft.style.display = "block";
  lockEffectRight.style.display = "block";
}

function triggerLockEffect(element) {
  element.style.transform = "scale(1.2)";
  element.style.opacity = 0;
  setTimeout(() => {
    element.style.transform = "scale(1)";
    setTimeout(() => {
      element.style.opacity = 1;
    }, 300);
  }, 500);
}

function liftWalls() {
  wallSound.play();
  let wallPosition = 0;
  return new Promise((resolve, reject) => {
    const lift = setInterval(() => {
      wallPosition -= 1;
      for (let i = 0; i < walls.length; i++)
        walls[i].style.marginTop = wallPosition + "px";
      if (wallPosition < -260) {
        clearInterval(lift);
        resolve();
      }
    }, 8);
  });
}

function dropWalls() {
  wallSound.play();
  let wallPosition = -260;
  return new Promise((resolve, reject) => {
    const lift = setInterval(() => {
      wallPosition += 1;
      for (let i = 0; i < walls.length; i++)
        walls[i].style.marginTop = wallPosition + "px";
      if (wallPosition > 0) {
        clearInterval(lift);
        resolve();
      }
    });
  }, 8);
}

function showScoreBoxes() {
  for (let i = 0; i < scoreBoxes.length; i++) {
    scoreBoxes[i].style.display = "block";
  }
}

function showTimer() {
  timer.style.display = "block";
}

function startCountdown() {
  let timerValue = 3;
  timer.innerHTML = timerValue;
  return new Promise((resolve, reject) => {
    let count = setInterval(() => {
      timerValue--;
      timer.innerHTML = timerValue;
      if (timerValue === 0) {
        clearInterval(count);
        resolve();
      }
    }, 1000);
  });
}

function displayWinner(winner) {
  if (winner === "tie") info.innerHTML = "NOBODY WON THIS TIME";
  else info.innerHTML = `${winner} WON THIS TIME`;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 3000);
  });
}
