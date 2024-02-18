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
        const teamWin = $('<p>');

        const liberalPolicies = $('<p>');
        const fascistPolicies = $('<p>');
        const round = $('<p>');
        const electionTracker = $('<p>');
        
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

        const choosePolicies = $('<div>');

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

        const updateElectionTracker = () => {
            electionTracker.text(`Election Tracker: ${this.gameState.electionTracker} | 3 consecutive failed chancellor votes automatically enacts a policy`);
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
            for (const player of this.gameState.players) {
                if (player.username == this.state.userName) {
                    if (player.identity == "LIBERAL") {
                        return;
                    }
                }
            }

            for (const player of this.gameState.players) {
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
        
        const updateChoosePolicies = () => {
            choosePolicies.empty();
            if (this.gameState.state == "LEGISLATIVE_PRESIDENT" && this.state.userName == this.gameState.currPresident) {
                const policyOne = $('<button>').text(this.gameState.legislativePolicies[0]);
                const policyTwo = $('<button>').text(this.gameState.legislativePolicies[1]);
                const policyThree = $('<button>').text(this.gameState.legislativePolicies[2]);

                choosePolicies.append(policyOne);
                choosePolicies.append(policyTwo);
                choosePolicies.append(policyThree);

                const discardPolicy = (event) => {
                    const index = this.gameState.legislativePolicies.indexOf($(event.target).text());
                    console.log(`Discarded ${index}`);
                    socket.emit('presidentDiscard', index);
                }

                policyOne.on('click', discardPolicy);
                policyTwo.on('click', discardPolicy);
                policyThree.on('click', discardPolicy);
            } else if (this.gameState.state == "LEGISLATIVE_CHANCELLOR" && this.state.userName == this.gameState.currChancellor) {
                const policyOne = $('<button>').text(this.gameState.legislativePolicies[0]);
                const policyTwo = $('<button>').text(this.gameState.legislativePolicies[1]);

                choosePolicies.append(policyOne);
                choosePolicies.append(policyTwo);

                const enactPolicy = (event) => {
                    const index = this.gameState.legislativePolicies.indexOf($(event.target).text());
                    console.log(`Enacted ${index}`);
                    socket.emit('chancellorEnact', index);
                }
                
                policyOne.on('click', enactPolicy);
                policyTwo.on('click', enactPolicy);
            } else if (this.gameState.state == "POST_LEGISLATIVE" && this.state.userName == this.gameState.currPresident) {
                const endTurn = $('<button>').text(`End Term`);

                choosePolicies.append(endTurn);

                const endTurnButton = () => {
                    console.log("Ending Presidential Term");
                    socket.emit('endPresidentialTerm', )
                }

                endTurn.on('click', endTurnButton);
            }
        }

        const updateAll = () => {
            updatePolicyCount();
            updateRound();
            updateElectionTracker();
            updateDeck();
            updatePlayerList();
            udpateVote();
            updateChoosePolicies();
        }

        playerList.find(".playerButton").on("click", clickPlayerButton);
        voteYes.on("click", clickVoteButton);
        voteNo.on("click", clickVoteButton);
        
        $('#root').append(teamWin);
        $('#root').append(liberalPolicies);
        $('#root').append(fascistPolicies);
        $('#root').append(round);
        $('#root').append(electionTracker);
        $('#root').append(drawSize);
        $('#root').append(discardSize);
        $('#root').append(playerIdentity);
        $('#root').append(otherFascists);
        $('#root').append(action);
        $('#root').append(playerList);
        $('#root').append(voteYes);
        $('#root').append(voteNo);
        $('#root').append(choosePolicies);

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
                case "LEGISLATIVE_PRESIDENT":
                    if (this.state.userName == this.gameState.currPresident) {
                        action.text(`Discard one policy. Your chancellor will decide between the other two.`);
                    } else {
                        action.text(``)
                    }
                    break;
                case "LEGISLATIVE_CHANCELLOR":
                    if (this.state.userName == this.gameState.currChancellor) {
                        action.text(`Enact one policy. The other policy will be discarded.`);
                    } else {
                        action.text(``);
                    }
                    break;
                case "POST_LEGISLATIVE":
                    if (this.state.userName == this.gameState.currPresident) {
                        action.text(`Waiting for you to end your presidential term...`);
                    } else {
                        action.text(``);
                    }
                    break;
                default:
            }
        })

        socket.on('gameOver', (gameData) => {
            this.gameState = gameData;
            this.gameState.voteMap = new Map(JSON.parse(this.gameState.voteMap))
            console.log(this.gameState)
            updateAll();
            switch (this.gameState.state) {
                case "LIBERAL_VICTORY_POLICY":
                case "LIBERAL_VICTORY_EXECUTION":
                    teamWin.text("Liberals have won");
                    break;
                case "FASCIST_VICTORY_POLICY":
                case "FASCIST_VICTORY_ELECTION":
                    teamWin.text("Fascists have won");
                    break;
                default:
            }
            const returnToLogin = $('<button>').text("To Login");
            const returnToLobby = $('<button>').text("To Lobby");

            $('#root').append(returnToLogin)
            $('#root').append(returnToLobby)

            returnToLogin.on('click', () => {
                this.gameState = {};
                socket.emit('returnToLogin', )
            })

            returnToLobby.on('click', () => {
                this.gameState = {};
                socket.emit('returnToLobby', )
            })


        })
    }

    render() {
        $('#root').empty();
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
