import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {Server} from 'socket.io'
import { LobbyManager, Lobby } from './Lobby.js';
import chalk from 'chalk';

const app = express();
const server = createServer(app);
const io = new Server(server);

let lobbyManager;

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

server.listen(3000, () => {
  console.log(chalk.dim('server running at http://localhost:3000'));
  lobbyManager = new LobbyManager(server);
});

const successMsg = (text) => console.log(chalk.green(`Success: ${text}`));
const inprogMsg = (text) => console.log(chalk.yellow(`In Progress: ${text}`));
const errorMsg = (text) => console.log(chalk.red(`Error: ${text}`));
const chatMsg = (text, sender) => console.log(chalk.cyan(`Message: ${text} from ${sender}`));

io.on('connect', (socket) => {
  console.log(chalk.greenBright.dim('user connected'))

  socket.on('createLobby', async (data) => {
    inprogMsg(`${data.userName} creating lobby...`);
    
    const lobby = lobbyManager.createLobby(socket);
    await lobby.initializeDatabase();
    data.lobbyName = lobby.id;
    successMsg(`${data.userName} created lobby ${lobby.id}`);

    joinLobby(socket, data);
    io.to(lobby.id).emit('chat-message', `${socket.data.userName} created the lobby.`)
  })

  socket.on('joinGame', async (data) => {
    inprogMsg(`${data.userName} joining game...`); 
    joinLobby(socket, data);
    successMsg(`${data.userName} joined lobby ${data.lobbyName}`);
  }) 
  
  socket.on('disconnect', async () => {
    inprogMsg(`${socket.data.userName} disconnected...`);
    if (socket.data.lobbyName != null) {
      await leaveLobby(socket);
    }
    successMsg(`${socket.data.userName} disconnected`);
  })

  socket.on('leaveLobby', async () => {
    await leaveLobby(socket);
  })

  socket.on('chat-message', async (message, callback) => {
    chatMsg(message, socket.data.userName)

    const lobby = lobbyManager.getLobby(socket.data.lobbyName);
    await lobby.updateDatabase(socket, message, callback);

    io.to(socket.data.lobbyName).emit('chat-message', `${socket.data.userName}: ${message}`);
  })

  socket.on('setupGame', () => {
    const lobby = lobbyManager.getLobby(socket.data.lobbyName)
    lobby.setupGame();
    const gameData = lobby.game.getGameData();

    console.log(gameData)

    io.to(socket.data.lobbyName).emit('setupGame', gameData)
  })

  socket.on('startGame', () => {
    const lobby = lobbyManager.getLobby(socket.data.lobbyName);
    const gameData = lobby.game.getGameData();

    gameData.voteMap = JSON.stringify(Array.from(gameData.voteMap))
    console.log("Starting Game");

    io.to(socket.data.lobbyName).emit('continueGame', gameData);
  })

  socket.on('nominateChancellor', (username) => {
    console.log(`${socket.data.userName} is nominating ${username} as chancellor`);
    const lobby = lobbyManager.getLobby(socket.data.lobbyName);
    lobby.game.nominateChancellor(username);

    const gameData = lobby.game.getGameData();
    gameData.voteMap = JSON.stringify(Array.from(gameData.voteMap))
  
    console.log(gameData);

    io.to(socket.data.lobbyName).emit('continueGame', gameData);
  })

  socket.on('voteChancellor', (vote) => {
    console.log(`${socket.data.userName} is voting ${vote}`);
    const lobby = lobbyManager.getLobby(socket.data.lobbyName);
    lobby.game.registerVote(socket.data.userName, vote);

    const isGameOver = lobby.game.hasGameFinished();

    const gameData = lobby.game.getGameData();
    gameData.voteMap = JSON.stringify(Array.from(gameData.voteMap));
    console.log(gameData);

    if (isGameOver) {
      io.to(socket.data.lobbyName).emit('gameOver', gameData);
    } else {
      io.to(socket.data.lobbyName).emit('continueGame', gameData);
    }
  })

  socket.on('presidentDiscard', (index) => {
    console.log(`${socket.data.userName} discarding ${index}`);
    const lobby = lobbyManager.getLobby(socket.data.lobbyName);
    lobby.game.presidentDiscardPolicy(index);

    const gameData = lobby.game.getGameData();
    gameData.voteMap = JSON.stringify(Array.from(gameData.voteMap));
    console.log(gameData);
    io.to(socket.data.lobbyName).emit('continueGame', gameData);
  })

  socket.on('chancellorEnact', (index) => {
    console.log(`${socket.data.userName} enacting ${index}`);
    const lobby = lobbyManager.getLobby(socket.data.lobbyName);
    lobby.game.chancellorEnactPolicy(index);

    const gameData = lobby.game.getGameData();
    gameData.voteMap = JSON.stringify(Array.from(gameData.voteMap));
    console.log(gameData);
    io.to(socket.data.lobbyName).emit('continueGame', gameData);
  })

  socket.on('endPresidentialTerm', () => {
    console.log(`${socket.data.userName} ending presidential term`);
    const lobby = lobbyManager.getLobby(socket.data.lobbyName);
    lobby.game.endPresidentialTerm();
    lobby.game.checkIfGameOver();

    const isGameOver = lobby.game.hasGameFinished();

    const gameData = lobby.game.getGameData();
    gameData.voteMap = JSON.stringify(Array.from(gameData.voteMap));
    console.log(gameData);

    if (isGameOver) {
      io.to(socket.data.lobbyName).emit('gameOver', gameData);
    } else {
      io.to(socket.data.lobbyName).emit('continueGame', gameData);
    }
  })

  socket.on('endPresidentialPowerPeek', () => {
    console.log(`${socket.data.userName} ending presidential power peek`);
    const lobby = lobbyManager.getLobby(socket.data.lobbyName);
    lobby.game.endPeek();
    lobby.game.checkIfGameOver();

    const isGameOver = lobby.game.hasGameFinished();

    const gameData = lobby.game.getGameData();
    gameData.voteMap = JSON.stringify(Array.from(gameData.voteMap));
    console.log(gameData);

    if (isGameOver) {
      io.to(socket.data.lobbyName).emit('gameOver', gameData);
    } else {
      io.to(socket.data.lobbyName).emit('continueGame', gameData);
    }
  })
  
  socket.on('endPresidentialPowerExecution', (username) => {
    console.log(`${socket.data.userName} ending presidential power execution by killing ${username}`);
    const lobby = lobbyManager.getLobby(socket.data.lobbyName);
    lobby.game.executePlayer(username);
    lobby.game.checkIfGameOver();

    const isGameOver = lobby.game.hasGameFinished();

    const gameData = lobby.game.getGameData();
    gameData.voteMap = JSON.stringify(Array.from(gameData.voteMap));
    console.log(gameData);

    if (isGameOver) {
      io.to(socket.data.lobbyName).emit('gameOver', gameData);
    } else {
      io.to(socket.data.lobbyName).emit('continueGame', gameData);
    }
  })

  socket.on('returnToLogin', async () => {
    console.log(`${socket.data.userName} returning to login`);
    await leaveLobby(socket);
  })

  socket.on('returnToLobby', () => {
    console.log(`${socket.data.userName} returning to ${socket.data.lobbyName}`);

    const lobby = lobbyManager.getLobby(socket.data.lobbyName);

    socket.emit('joinedGame', socket.data);
    io.to(socket.data.lobbyName).emit('chat-message', `${socket.data.userName} rejoined the lobby.`)
    io.to(socket.data.lobbyName).emit('checkLobbySize', lobby.lobbySize, lobby.minClients)
  })


})


async function joinLobby(socket, data) {
  const lobby = lobbyManager.joinLobby(socket, data.lobbyName);
    if (lobby == null) {
      let error;
      if (lobbyManager.lobbies.get(data.lobbyName)) {
        error = `Lobby ${data.lobbyName} was full`;
      } else {
        error = `Lobby ${data.lobbyName} not found`;
      }
      errorMsg(error);
      socket.emit('failedToJoinGame', error);
      return;
    }    

    socket.data = Object.assign({}, socket.data, data);

    socket.emit('joinedGame', data);
    await lobby.sendDatabase(socket);

    io.to(socket.data.lobbyName).emit('chat-message', `${socket.data.userName} joined the lobby.`)
    io.to(socket.data.lobbyName).emit('checkLobbySize', lobby.lobbySize, lobby.minClients)
}

async function leaveLobby(socket) {
  inprogMsg(`${socket.data.userName} leaving lobby...`);
  const lobby = await lobbyManager.leaveLobby(socket, socket.data.lobbyName);
  successMsg(`${socket.data.userName} left lobby ${lobby.id}`);

  socket.emit('leftGame', socket.data);

  io.to(lobby.id).emit('checkLobbySize', lobby.lobbySize, lobby.minClients);
  io.to(lobby.id).emit('chat-message', `${socket.data.userName} left lobby ${lobby.id}`);
}