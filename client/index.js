const chat = document.getElementById("chat");
const message = document.getElementById("message");
const msgInput = document.getElementById("messageInput");
const sendMsg = document.getElementById("messageSend");
const msgWrapper = document.getElementById("messageWrapper");
const usersOnline = document.getElementById("usersOnline");
const userslistWrapper = document.getElementById("usersOnlineListWrapper");
const player1Box = document.getElementById("player1"); // name box
const player2Box = document.getElementById("player2");
const leaveGame = document.getElementById("leaveGame");
const signWrapper = document.getElementById("signWrapper");
const startGameButton = document.getElementById("startGameButton");

const socket = io("http://localhost:4000");
export default socket;

let user = "";
while (user === "" || user === null) {
  user = prompt("Enter your name");
}
export { user };

socket.emit("new-user", user);

socket.on("users-connected", (users) => {
  printUsers(users);
});

socket.on("print-message", ({ user, message }) => {
  printMessage(`${user}: ${message}`);
});

socket.on("user-disconnected", ({ usersOnline, removedUser }) => {
  // socket.emit("test", usersOnline);
  socket.emit("self-leave-game", removedUser);
  printUsers(usersOnline);
});

window.onbeforeunload = () => {
  socket.emit("self-leave", user);
};

player1Box.addEventListener("click", () => {
  if (player1Box.innerHTML !== "JOIN") return;
  socket.emit("self-join-game", user);
  player1Box.innerHTML = user;
  leaveGame.style.display = "block";
  signWrapper.style.display = "flex";
});

socket.on("player-joined-game", ({ player, playersInGame }) => {
  player2Box.innerHTML === "JOIN"
    ? (player2Box.innerHTML = player)
    : (player1Box.innerHTML = player);
  if (playersInGame.length === 2 && playersInGame.includes(user))
    startGameButton.style.display = "block";
});

leaveGame.addEventListener("click", () => {
  socket.emit("self-leave-game", user);
  player1Box.innerHTML = "JOIN";
  leaveGame.style.display = "none";
  signWrapper.style.display = "none";
  startGameButton.style.display = "none";
});

socket.on("players-in-game", (playersInGame) => {
  if (playersInGame.length === 1) {
    player2Box.innerHTML = playersInGame[0];
  }
  if (playersInGame.length === 2) {
    player1Box.innerHTML = playersInGame[0];
    player2Box.innerHTML = playersInGame[1];
  }
});

socket.on("player-left-game", (playersInGame) => {
  // check if user is spectator (not in game)
  if (!playersInGame.includes(user)) {
    playersInGame.length === 1
      ? (player2Box.innerHTML = playersInGame[0])
      : (player2Box.innerHTML = "JOIN");
    player1Box.innerHTML = "JOIN";
  } else player2Box.innerHTML = "JOIN"; // ovo treba da se trigeruje samo kad igrac izadje, ne spectator. Ispravi !
  startGameButton.style.display = "none";
});

startGameButton.addEventListener("click", () => {
  startGameButton.style.display = "none";
});

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
