import TextField from './TextField.js'
const socket = io();

const PAGE = {
    LOGIN: "login",
    LOBBY: "lobby",
    GAME: "game",
}

class App {

    constructor() {
        this.state = {
            userName: "",
            lobbyName: "",
            page: PAGE.LOGIN,
        };
        this.gameState = {};
    }

    renderLoginPage() {
        const joinGameText = $('<h2>').text("JOIN A GAME");
        const lobbyField = new TextField({
            label: "LOBBY NAME",
            maxLength: 4,
            forceUpperCase: true,
            showCharCount: false,
            className: "joinGame",
        })
        const nameField = new TextField({
            label: "YOUR NAME",
            maxLength: 12,
            className: "joinGame",
            value: this.state.userName,
        })
        const joinError = $('<p>').attr("class", "error-message").css({'color': 'red'})
        const joinGameButton = $('<button>').text("JOIN").prop("disabled", !(lobbyField.value.length == 4 && nameField.value.length > 0));
        
        const createLobbyText = $('<h2>').text("CREATE A LOBBY");
        const nameField2 = new TextField({
            label: "YOUR NAME",
            maxLength: 12,
            className: "createLobby",
            value: this.state.userName,
        })
        const createError = $('<p>').attr("class", "error-message").css({'color': 'red'})
        const createLobbyButton = $('<button>').text("CREATE").prop("disabled", !(nameField2.value.length > 0));
    
        const joinDiv = $('<div>').append(joinGameText, lobbyField.render(), nameField.render(), joinError, joinGameButton);
        const createDiv = $('<div>').append(createLobbyText, nameField2.render(), createError, createLobbyButton);
        $('#root').append(joinDiv, createDiv);
    
        const enableJoinButton = () => {
            joinGameButton.prop("disabled", !(lobbyField.value.length == 4 && nameField.value.length > 0));
        }
        const enableCreateButton = () => {
            createLobbyButton.prop("disabled", !(nameField2.value.length > 0));
        }
        const joinGame = () => {
            console.log('clicked join game');
            const data = {lobbyName:lobbyField.value, userName:nameField.value}
            socket.emit('joinGame', data);
        }
        const createLobby = () => {
            console.log('clicked create lobby');
            const data = {userName:nameField2.value}
            socket.emit('createLobby', data);
        }
        $('#root').find('.joinGame').on('input', enableJoinButton);
        $('#root').find('.createLobby').on('input', enableCreateButton);
        joinGameButton.on('click', joinGame);
        createLobbyButton.on('click', createLobby);

        socket.on('failedToJoinGame', (msg) => {
            console.log('Failed to Join Game');
            joinError.text(msg);
        })

    }

    renderLobbyPage() {
        $('#root').append($('<p>').text(`${this.state.userName}`));
        $('#root').append($('<p>').text(`${this.state.lobbyName}`));

        const messages = $('<ul>').attr("class", "lobby-messages");
        const leaveLobby = $('<button>').text("LEAVE LOBBY");
        const startGame = $('<button>').text("START GAME").prop('disabled', true);
        const form = $(`
            <form id="form" action="">
                <input id="input" autocomplete="off" /><button>Send</button>
            </form>
        `);
        const input = form.find('input');

        form.on('submit', (e) => {
            e.preventDefault();
            if (input.val()) {
                console.log('lasdjf');
                socket.emit('chat-message', input.val());
                input.val('');
            }
        })

        leaveLobby.on('click', () => {
            socket.emit('leaveLobby', )
        })

        startGame.on('click', () => {
            socket.emit('setupGame', )
        })

        $('#root').append(messages);
        $('#root').append(leaveLobby);
        $('#root').append(startGame);
        $('#root').append(form);

        socket.on('chat-message', msg => {
            console.log("ajsdflk");
            const li = $('<li>').text(msg);
            messages.append(li);
        })

        socket.on('checkLobbySize', (lobbySize, lobbyMin) => {
            console.log(lobbySize, lobbyMin)
            startGame.prop('disabled', !(lobbySize >= lobbyMin))
        })
    } 

    renderGamePage() {
        const liberalPolicies = $('<p>');
        const fascistPolicies = $('<p>');
        const round = $('<p>');
        
        const drawSize = $('<p>');
        const discardSize = $('<p>');

        const playerIdentity = $('<p>');
        const otherFascists = $('<div>');

        const action = $('<p>');

        const playerList = $('<ul>').attr("class", "player-list");
        for (const player of this.gameState.players) {
            const playerButton = $('<button>').text(player.username).prop('disabled', true)
            playerButton.attr("class", "playerButton");
            playerButton.attr("id", `${player.username}-${this.gameState.players.indexOf(player)}`);
            const playerTag = $('<li>').append(playerButton);
            playerList.append(playerTag);
        }

        const clickPlayerButton = (event) => {
            console.log($(event.target).text());
            switch (this.gameState.state) {
                case "CHANCELLOR_NOMINATION":
                    if (this.state.userName == this.gameState.currPresident) {
                        console.log(`Nominating: ${$(event.target).text()}`)
                        socket.emit("nominateChancellor", $(event.target).text());
                    }
                    break;
                default:
            }
        }

        const voteYes = $('<button>').text('ja!').prop('disabled', true).attr("class", "vote");
        const voteNo = $('<button>').text('nein').prop('disabled', true).attr("class", "vote");

        const clickVoteButton = (event) => {
            const vote = $(event.target).text();
            console.log(`I voted ${vote}`);
            socket.emit("voteChancellor", vote == "ja!");
        }

        const updatePolicyCount = () => {
            const passedLiberalPolicies = this.gameState.board.numLiberalPolicies;
            const liberalPoliciesToWin = this.gameState.board.LIBERAL_POLICIES_TO_WIN;
            liberalPolicies.text(`Passed ${passedLiberalPolicies} liberal policies | (Liberals need ${liberalPoliciesToWin} to win)`);
            
            const passedFascistPolicies = this.gameState.board.numFascistPolicies;
            const fascistPoliciesToWin = this.gameState.board.FASCIST_POLICIES_TO_WIN;
            fascistPolicies.text(`Passed ${passedFascistPolicies} fascist policies | (Fascists need ${fascistPoliciesToWin} to win)`);
            
            console.log("Updating Policy Count");
            return "silly";
        }

        const updateRound = () => {
            round.text(`Round: ${this.gameState.round}`);
        }

        const updateDeck = () => {
            const drawLength = this.gameState.draw.deck.length;
            const discardLength = this.gameState.discard.deck.length;
            drawSize.text(`Draw Size: ${drawLength}`);
            discardSize.text(`Discard Size: ${discardLength}`);

            console.log("Updating Deck Count");
            return "kabob";
        }

        const showPlayerIdentity = () => {
            console.log("Showing own identity");
            for (const player of this.gameState.players) {
                console.log(player);
                console.log(player.identity);
                console.log(player.username);
                console.log(player.username == this.state.userName);
                if (player.username == this.state.userName) {
                    playerIdentity.text(`You are ${player.identity}`)
                }
            }
        }

        const showOtherFascists = () => {
            // console.log("Show other Fascists")
            for (const player of this.gameState.players) {
                // console.log(player);
                // console.log(player.identity);
                // console.log(player.username);
                // console.log(player.username == this.state.userName);
                if (player.username == this.state.userName) {
                    if (player.identity == "LIBERAL") {
                        return;
                    }
                }
            }

            // console.log("I am Fascist so let's see the others")
            for (const player of this.gameState.players) {
                // console.log(player);
                // console.log(player.identity);
                // console.log(player.username);
                // console.log(player.username == this.state.userName);
                if (player.identity != "LIBERAL" && player.username != this.state.userName) {
                    const idLine = $('<p>').text(`${player.username} is ${player.identity}`);
                    otherFascists.append(idLine);
                }
            }
        }

        const updatePlayerList = () => {
            for (const player of this.gameState.players) {
                const playerButton = playerList.find(`#${player.username}-${this.gameState.players.indexOf(player)}`)
                console.log(`Looking at ${player.username}`)
                console.log(playerButton)
                if (!player.isAlive || player.username == this.gameState.currPresident || player.username == this.gameState.currChancellor || player.username == this.gameState.lastPresident || player.username == this.gameState.lastChancellor) {
                    playerButton.prop('disabled', true);
                } else {
                    playerButton.prop('disabled', false);
                }
            }
        }

        const udpateVote = () => {
            console.log(this.gameState.voteMap);
            voteYes.prop('disabled', !(this.gameState.state == "CHANCELLOR_VOTING") || this.gameState.voteMap.has(this.state.userName))
            voteNo.prop('disabled', !(this.gameState.state == "CHANCELLOR_VOTING") || this.gameState.voteMap.has(this.state.userName))
        }

        const updateAll = () => {
            console.log(this.gameState);
            updatePolicyCount();
            updateRound();
            updateDeck();
            updatePlayerList();
            udpateVote();
        }

        playerList.find(".playerButton").on("click", clickPlayerButton);
        voteYes.on("click", clickVoteButton);
        voteNo.on("click", clickVoteButton);
        
        $('#root').append(liberalPolicies);
        $('#root').append(fascistPolicies);
        $('#root').append(round);
        $('#root').append(drawSize);
        $('#root').append(discardSize);
        $('#root').append(playerIdentity);
        $('#root').append(otherFascists);
        $('#root').append(action);
        $('#root').append(playerList);
        $('#root').append(voteYes);
        $('#root').append(voteNo);

        showPlayerIdentity();
        showOtherFascists();
        updateAll();

        if (this.state.userName == this.gameState.currPresident) {
            console.log("Starting Game");
            socket.emit("startGame", )
        }

        socket.on('continueGame', (gameData) => {
            this.gameState = gameData;
            this.gameState.voteMap = new Map(JSON.parse(this.gameState.voteMap))
            console.log(this.gameState)
            updateAll();
            switch (this.gameState.state) {
                case "CHANCELLOR_NOMINATION":
                    if (this.state.userName == this.gameState.currPresident) {
                        console.log("I am the president");
                        action.text(`Select your chancellor`);
                    } else {
                        action.text(``);
                    }
                    break;
                case "CHANCELLOR_VOTING":
                    action.text(`Vote on chancellor`);
                    break;
                default:
            }
        })
        // console.log(this.gameState);
        // console.log(this.gameState.players);
        // console.log(this.gameState.board);
        // console.log(this.gameState.draw); 

    }

    render() {
        $('#root').empty()
        switch (this.state.page) {
            case PAGE.LOGIN:
                this.renderLoginPage();
                break;
            case PAGE.LOBBY:
                this.renderLobbyPage();
                break;
            case PAGE.GAME:
                this.renderGamePage();
                break;
            default:
        }
    }
}


const app = new App();

socket.on('connect', () => {
    console.log("Client has been connected");
    app.render();
})

socket.on('joinedGame', (data) => {
    console.log('Joined Game');
    data.page = PAGE.LOBBY;
    
    app.state = Object.assign({}, app.state, data);

    app.render();
})

socket.on('leftGame', (data) => {
    console.log('Left Game');
    data.page = PAGE.LOGIN;

    app.state = data;
    app.render();
})

socket.on('setupGame', (gameData) => {
    console.log('Setting Up Game');
    app.state.page = PAGE.GAME;
    app.gameState = gameData;
    app.gameState.voteMap = new Map();

    app.render();
})
