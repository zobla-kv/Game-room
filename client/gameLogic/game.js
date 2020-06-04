import socket from "../index.js";
import { user } from "../index.js";
const signBoxes = document.getElementsByClassName("sign");
const choices = document.getElementsByClassName("playerChoice"); // sign box
const choice1Img = document.getElementById("choice1Img");
const choice2Img = document.getElementById("choice2Img");

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

// [].forEach.call(signBoxes, (e, i) => {
//   e.addEventListener("click", () => {
//     const sign = signs[i].name;
//     choice1Img.src = signs[i].src;
//     socket.emit("self-choose-sign", {user, sign});
//   });
// });

socket.on("player-chose-sign", ({ chosenSign, playersInGame }) => {
  const signIndex = signs.findIndex((e) => e.name === chosenSign);
  if (!playersInGame.includes(user)) {
    choice1Img.src = signs[signIndex].src;
  } else choice2Img.src = signs[signIndex].src;
});
