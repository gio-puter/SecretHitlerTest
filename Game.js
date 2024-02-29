export class Game {
    NUM_FASCIST_POLICIES = 11;
    NUM_LIBERAL_POLICIES = 6;

    MAX_FAILED_ELECTIONS = 3;
    MIN_DRAW_DECK_SIZE = 3;

    PRESIDENT_DRAW_SIZE = 3;
    CHANCELLOR_DRAW_SIZE = 2;

    NUM_FASCIST_FOR_PLAYERS = [-1, -1, -1, -1, -1, 1, 1, 2, 2, 3, 3 ]

    clients;
    players;
    board = new Board();
    discard;
    draw;
    electionTracker = 0;
    state;
    lastState = GameState.SETUP;
    round;
    lastPresident = null;
    lastChancellor = null;
    lastPolicy = Policy.FASCIST;
    currPresident;
    currChancellor = null;
    nextPresident;
    electedPresident;
    target;
    legislativePolicies;
    didElectionTrackerAdvance = false;
    didVetoOccurThisTurn = false;

    voteMap = new Map();

    constructor(clients) {
        console.log('asldkfj');
        this.clients = clients;

        this.players = [...this.clients.values()].map((x) => new Player(x.data.userName))
        this.players.sort(() => Math.random() - 0.5);

        this.resetDeck();
        this.assignRoles();

        this.currPresident = this.players[0].username;

        this.state = GameState.CHANCELLOR_NOMINATION;
        this.round = 1;
    }

    getGameData() {
        const gameData = {
            state : this.state,
            lastState : this.lastState,
            board : this.board,
            players : this.players,
            draw : this.draw,
            discard : this.discard,
            lastPresident : this.lastPresident,
            lastChancellor : this.lastChancellor,
            currPresident : this.currPresident,
            currChancellor : this.currChancellor,
            nextPresident : this.nextPresident,
            electedPresident : this.electedPresident,
            lastPolicy : this.lastPolicy,
            legislativePolicies : this.legislativePolicies,
            target : this.target,
            round : this.round,
            electionTracker : this.electionTracker,
            didElectionTrackerAdvance : this.didElectionTrackerAdvance,
            didVetoOccurThisTurn : this.didVetoOccurThisTurn,
            voteMap : this.voteMap,
        };

        if (gameData.state == GameState.PRESIDENTIAL_POWER_PEEK) {
            gameData.policies = this.getPeek();
        }

        return gameData;
    }

    getState() {
        if (this.board != null) {
            this.checkIfGameOver();
        }
        return this.state;
    }

    indexOfPlayer(username) {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].username == username) {
                return i;
            }
        }
    }

    getPlayer(username) {
        return this.players[this.indexOfPlayer(username)]
    }

    resetDeck() {
        this.draw = new Deck();
        this.discard = new Deck();

        for(let i = 0; i < this.NUM_LIBERAL_POLICIES; i++) {
            this.draw.add(Policy.LIBERAL)
        }
        for(let i = 0; i < this.NUM_FASCIST_POLICIES; i++) {
            this.draw.add(Policy.FASCIST)
        }

        this.draw.shuffle();
    }

    assignRoles() {
        let numFascistsToSet = this.NUM_FASCIST_FOR_PLAYERS[this.players.length];

        for (const player of this.players) {
            player.setIdentity(Identity.LIBERAL);
        }

        const indexOfHitler = Math.floor(Math.random() * this.players.length);

        this.players[indexOfHitler].setIdentity(Identity.HITLER);

        while (numFascistsToSet > 0) {
            const randomIndex = Math.floor(Math.random() * this.players.length);
            if (this.players[randomIndex].isFascist()) { continue; }

            this.players[randomIndex].setIdentity(Identity.FASCIST);
            numFascistsToSet -= 1;
        }

    }

    checkIfGameOver() {
        if (this.board.isFascistVictory()) {
            this.lastState = this.state;
            this.state = GameState.FASCIST_VICTORY_POLICY;
        } else if (this.board.isLiberalVictory()) {
            this.lastState = this.state;
            this.state = GameState.LIBERAL_VICTORY_POLICY;
        }
    }

    hasGameFinished() {
        return this.state == GameState.FASCIST_VICTORY_ELECTION || this.state == GameState.FASCIST_VICTORY_POLICY 
                || this.state == GameState.LIBERAL_VICTORY_EXECUTION || this.state == GameState.LIBERAL_VICTORY_POLICY;
    }

    shuffleDiscardIntoDraw() {
        console.log(!this.discard.isEmpty())
        while (!this.discard.isEmpty()) {
            this.draw.add(this.discard.remove())
        }
        console.log(this.discard);
        console.log(this.draw);
        this.draw.shuffle();
    }

    getLivingPlayerCount() {
        let numLivingPlayers = 0;
        for (const player of this.players) {
            if (player.isAlive) { numLivingPlayers += 1; }
        }
        return numLivingPlayers;
    }

    nominateChancellor(username) {
        const numLivingPlayers = this.getLivingPlayerCount();

        if (this.getState() != GameState.CHANCELLOR_NOMINATION) {
            console.log("cannot elect chancellor now (invalid state)");
        } else if (username == this.lastChancellor || (username == this.lastPresident && numLivingPlayers > 5)) {
            console.log("cannot elect chancellor that was prev in office");
        } else if (!this.getPlayer(username).isAlive) {
            console.log("cannot elect dead player");
        } else if (username == this.currPresident) {
            console.log("cannot elect president as chancellor")
        }

        this.didElectionTrackerAdvance = false;
        this.currChancellor = username;
        this.lastState = this.state;
        this.state = GameState.CHANCELLOR_VOTING;
        this.voteMap = new Map();
    }

    hasPlayerVoted(username) {
        return this.voteMap.has(username);
    }

    registerVote(username, vote) {
        if (this.voteMap.has(username)) {
            console.log("cannot vote twice");
        } else if (this.state != GameState.CHANCELLOR_VOTING) {
            console.log("cannot vote when vote is not tkaing place");
        }

        this.voteMap.set(username, vote);

        let allPlayersHaveVoted = true;
        let totalVotes = 0;
        let totalYesVotes = 0;

        for (const player of this.players) {
            if (!player.isAlive) {continue;}

            if (this.voteMap.has(player.username)) {
                totalVotes += 1;
                if (this.voteMap.get(player.username)) {
                    totalYesVotes += 1;
                }
            } else {
                allPlayersHaveVoted = false;
            }
        }

        if (!allPlayersHaveVoted) { return; }

        if (totalYesVotes/totalVotes > 0.5) {
            this.lastChancellor = this.currChancellor;
            this.lastPresident = this.currPresident;
            if (this.getPlayer(this.currChancellor).isHitler() && this.board.fascistsCanWinByElection()) {
                this.lastState = this.state;
                this.state = GameState.FASCIST_VICTORY_ELECTION;
            } else {
                this.startLegislativeSession();
            }
        } else {
            this.advanceElectionTracker();
        }
    }

    advanceElectionTracker() {
        this.didElectionTrackerAdvance = true;
        this.electionTracker += 1;
        if (this.electionTracker == this.MAX_FAILED_ELECTIONS) {
            if (this.draw.getSize() < this.MIN_DRAW_DECK_SIZE) {
                this.shuffleDiscardIntoDraw();
            }
            const newPolicy = this.draw.remove();
            this.board.enactPolicy(newPolicy);
            this.electionTracker = 0;

            this.onEnactPolicy(newPolicy);
        } else {
            this.concludePresidentialActions();
        }
    }

    concludePresidentialActions() {
        this.lastState = this.state;
        this.state = GameState.POST_LEGISLATIVE;
    }

    endPresidentialTerm() {
        if (this.state != GameState.POST_LEGISLATIVE) {
            console.log("cannot do since wrong state");
        }

        if (this.electedPresident != null) {
            this.currPresident = this.electedPresident;
            this.electedPresident = null;
        } else if (this.nextPresident != null) {
            this.currPresident = this.nextPresident;
            while (!this.getPlayer(this.currPresident).isAlive) {
                const presIndex = this.indexOfPlayer(this.currPresident);
                const nextPresIndex = (presIndex + 1) % this.players.length;
                this.currPresident = this.players[nextPresIndex].username;
            }
            this.nextPresident = null;
        } else {
            this.currPresident = this.getNextActivePlayer(this.currPresident);
        }

        this.currChancellor = null;
        this.lastState = this.state;
        this.state = GameState.CHANCELLOR_NOMINATION;
        this.round += 1;
    }

    getNextActivePlayer(username) {
        for (let i = 1; i < this.players.length; i++) {
            const index = (i + this.indexOfPlayer(username)) % this.players.length;
            if (this.players[index].isAlive) {
                return this.players[index].username;
            }
        }
        return null;
    }

    startLegislativeSession() {
        if (this.state != this.lastState && this.state != GameState.LEGISLATIVE_PRESIDENT) {
            this.lastState = this.state;
            this.state = GameState.LEGISLATIVE_PRESIDENT;
        }

        if (this.draw.getSize() < this.MIN_DRAW_DECK_SIZE) {
            this.shuffleDiscardIntoDraw();
        }

        this.legislativePolicies = []
        for (let i = 0; i < this.PRESIDENT_DRAW_SIZE; i++) {
            this.legislativePolicies.unshift(this.draw.remove());
        }
    }

    getPresidentLegislativeChoices() {
        if (this.state != GameState.LEGISLATIVE_PRESIDENT) {
            console.log("cannot get President legislatives choices when not in session");
        }
        return this.legislativePolicies.slice();
    }

    presidentDiscardPolicy(index) {
        if (this.state != GameState.LEGISLATIVE_PRESIDENT) {
            console.log("cannot discard policy from pres hand in curr state");
        } else if (index < 0 || index >= this.PRESIDENT_DRAW_SIZE) {
            console.log("cannot discard policy at out of bounds index");
        } 

        this.discard.add(this.legislativePolicies.splice(index, 1)[0]);
        this.lastState = this.state;
        this.state = GameState.LEGISLATIVE_CHANCELLOR;
    }

    getChancellorLegislativeChoice() {
        if (this.getState() != GameState.LEGISLATIVE_CHANCELLOR && this.getState() != GameState.LEGISLATIVE_PRESIDENT_VETO) {
            console.log("cannot get chancellor choies when not in session");
        }
        if (this.legislativePolicies.length != this.CHANCELLOR_DRAW_SIZE) {
            console.log("incorrect # of policies for chancellor");
        }

        return this.legislativePolicies.slice();
    }

    chancellorEnactPolicy(index) {
        if (this.getState() != GameState.LEGISLATIVE_CHANCELLOR) {
            console.log("cannot discard policy from chancellor hand in curr state");
        } else if (index < 0 || index >= this.CHANCELLOR_DRAW_SIZE) {
            console.log("cannot discard policy at out of bounds index");
        }

        const newPolicy = this.legislativePolicies.splice(index, 1)[0];
        this.board.enactPolicy(newPolicy);
        this.discard.add(this.legislativePolicies.splice(0, 1)[0]);
        this.didVetoOccurThisTurn = false;
        this.onEnactPolicy(newPolicy);
    }

    chancellorVeto() {
        if (this.getState() != GameState.LEGISLATIVE_CHANCELLOR) {
            console.log("cannot veto in this state");
        } else if (this.board.getNumFascistPolicies() != 5) {
            console.log("cannot veto when there are less than 5 fascist policies enacted")
        } else if (this.didVetoOccurThisTurn) {
            console.log("cannot veto again once veto is denied")
        }

        this.didVetoOccurThisTurn = true;
        this.state = GameState.LEGISLATIVE_PRESIDENT_VETO;
    }

    presidentialVeto(response) {
        if (this.state != GameState.LEGISLATIVE_PRESIDENT_VETO) {
            console.log("cannot get president veto input during this state");
        }
        if (response) {
            while (this.legislativePolicies.length > 0) {
                this.discard.add(this.legislativePolicies.shift(0));
            }
            this.advanceElectionTracker();
            this.didVetoOccurThisTurn = false;
        } else {
            this.lastState = this.state;
            this.state = GameState.LEGISLATIVE_CHANCELLOR;
        }
    }

    onEnactPolicy(policy) {
        this.electionTracker = 0;
        this.lastPolicy = policy;

        if (this.draw.getSize() < this.MIN_DRAW_DECK_SIZE) {
            console.log(`${this.draw.getSize()} < ${this.MIN_DRAW_DECK_SIZE}`);
            this.shuffleDiscardIntoDraw();
        }

        if (this.didElectionTrackerAdvance) {
            this.state = GameState.POST_LEGISLATIVE;
            this.lastChancellor = null;
            this.lastPresident = null;
            return;
        }

        this.lastState = this.state;
        switch (this.board.getActivatedPower()) {
            case PresidentialPower.PEEK:
                this.state = GameState.PRESIDENTIAL_POWER_PEEK;
                break;
            case PresidentialPower.EXECUTION:
                this.state = GameState.PRESIDENTIAL_POWER_EXECUTION;
                break;
            case PresidentialPower.ELECTION:
                this.state = GameState.PRESIDENTIAL_POWER_ELECTION;
                break;
            case PresidentialPower.INVESTIGATE:
                this.state = GameState.PRESIDENTIAL_POWER_INVESTIGATE;
                break;
            case PresidentialPower.NONE:
                this.state = GameState.POST_LEGISLATIVE;
                break;
        }
    }

    getPeek() {
        if (this.state != GameState.PRESIDENTIAL_POWER_PEEK) {
            console.log("cannot peek when power not active");
            return [];
        } else if (this.draw.deck.length < 3) {
            console.log("insufficient cards in draw deck");
            return [];
        }

        const policies = [];
        policies.push(this.draw.peek(0));
        policies.push(this.draw.peek(1));
        policies.push(this.draw.peek(2));
        return policies;
    }

    endPeek() {
        this.concludePresidentialActions();
    }

    investigatePlayer(username) {
        if (this.state != GameState.PRESIDENTIAL_POWER_INVESTIGATE) {
            console.log('cannot investigate a player when power not active')
        } else if (!this.getPlayer(username).isAlive) {
            console.log("cannot investigate dead player");
        } else if (this.getPlayer(username).hasBeenInvestigated()) {
            console.log("cannot investigate player twice");
        }

        this.target = username;
        this.getPlayer(username).investigate()
        this.concludePresidentialActions();

        if (this.getPlayer(username).isFascist()) {
            return Identity.FASCIST;
        } else {
            return Identity.LIBERAL;
        }
    }

    executePlayer(username) {
        if (this.state != GameState.PRESIDENTIAL_POWER_EXECUTION) {
            console.log("Cannot execute a player when the power is not active.");
        }

        const playerToKill = this.getPlayer(username);
        this.target = username;
        if (!playerToKill.isAlive) {
            console.log("cannot execute the dead");
        }

        playerToKill.kill();
        if (playerToKill.isHitler()) {
            this.lastState = this.state;
            this.state = GameState.LIBERAL_VICTORY_EXECUTION;
        } else {
            this.concludePresidentialActions();
        }
    }

    electNextPresident(username) {
        if (this.state != GameState.PRESIDENTIAL_POWER_ELECTION) {
            console.log("Cannot elect a player president when the power is not active.");
        } else if (!this.getPlayer(username).isAlive) {
            console.log("Cannot elect the dead.");
        }

        this.target = username;
        this.nextPresident = this.getNextActivePlayer(this.currPresident);

        if (this.currPresident == target) {
            console.log("cannot elect self during special election")
        }

        this.electedPresident = username;
        this.concludePresidentialActions(); 
    }
}

const Policy = {
    FASCIST: "FASCIST",
    LIBERAL: "LIBERAL",
}

const Identity = {
    UNASSIGNED: "UNASSIGNED",
    HITLER: "HITLER",
    FASCIST: "FASCIST",
    LIBERAL: "LIBERAL",
}

class Player {
    username;
    identity = Identity.UNASSIGNED;
    isAlive = true;
    investigated = false;

    constructor(username) {
        this.username = username;
    }

    setIdentity(identity) {
        this.identity = identity;
    }

    getIdentity() {
        return this.identity
    }

    isHitler() {
        return this.identity == Identity.HITLER;
    }

    kill() {
        this.isAlive = false;
    }

    // isAlive() {
    //     return this.isAlive;
    // }

    investigate() {
        this.investigated = true;
    }

    hasBeenInvestigated() {
        return this.invesitgated;
    }

    isFascist() {
        return this.isHitler() || this.identity == Identity.FASCIST;
    }
}

class Deck {
    deck;

    constructor() {
        this.deck = [];
    }

    remove() {
        if (this.isEmpty()) {
            console.log("no can do");
            return;
        }
        return this.deck.shift();
    }

    add(policy) {
        this.deck.unshift(policy);
    }

    peek(index) {
        return this.deck[index];
    }

    isEmpty() {
        return this.getSize() == 0;
    }

    getSize() {
        return this.deck.length;
    }

    shuffle() {
        this.deck.sort(() => Math.random() - 0.5);
    }
}

class Board {
    FASCIST_POLICIES_TO_WIN = 6;
    LIBERAL_POLICIES_TO_WIN = 5;

    MIN_POLICIES_FOR_CHANCELLOR_VICTORY = 3;

    numFascistPolicies = 0;
    numLiberalPolicies = 0;

    lastEnacted = null;

    enactPolicy(policy) {
        if (this.isLiberalVictory() || this.isFascistVictory()) {
            console.log("no can do bucko");
            return;
        }
        if (policy == Policy.FASCIST) {
            this.numFascistPolicies += 1;
        } else {
            this.numLiberalPolicies += 1;
        }
        this.lastEnacted = policy;
    }

    getLastEnacted() {
        return this.lastEnacted;
    }

    getNumFascistPolicies() {
        return this.numFascistPolicies;
    }

    getNumLiberalPolicies() {
        return this.numLiberalPolicies;
    }

    isFascistVictory() {
        return this.getNumFascistPolicies() >= this.FASCIST_POLICIES_TO_WIN;
    }

    isLiberalVictory() {
        return this.getNumLiberalPolicies() >= this.LIBERAL_POLICIES_TO_WIN;
    }

    hasActivatedPower() {
        return this.getActivatedPower() != PresidentialPower.NONE;
    }

    getActivatedPower() {
        if (this.getLastEnacted() == Policy.FASCIST) {
            switch (this.getNumFascistPolicies()) {
                case 3:
                    return PresidentialPower.PEEK;
                case 5:
                    return PresidentialPower.EXECUTION;
                default:
            }
        }
        return PresidentialPower.NONE;
    }

    fascistsCanWinByElection() {
        return this.getNumFascistPolicies() >= this.MIN_POLICIES_FOR_CHANCELLOR_VICTORY;
    }

}

const PresidentialPower = {
    NONE: "NONE",
    PEEK: "PEEK",
    INVESTIGATE: "INVESTIGATE",
    EXECUTION: "EXECUTION",
    ELECTION: "ELECTION",
}

const GameState = {
    SETUP: "SETUP",                          // Game is being set up.
    CHANCELLOR_NOMINATION : "CHANCELLOR_NOMINATION",          // President is nominating a chancellor.
    CHANCELLOR_VOTING : "CHANCELLOR_VOTING",              // Voting on the chancellor is taking place.
    LEGISLATIVE_PRESIDENT : "LEGISLATIVE_PRESIDENT",          // In the legislative phase. The president is selecting a card to discard.
    LEGISLATIVE_CHANCELLOR : "LEGISLATIVE_CHANCELLOR",         // In the legislative phase. The chancellor is selecting a card to enact.
    LEGISLATIVE_PRESIDENT_VETO : "LEGISLATIVE_PRESIDENT_VETO",     // Chancellor decided to initiate veto, President chooses whether to allow.
    PRESIDENTIAL_POWER_PEEK : "PRESIDENTIAL_POWER_PEEK",        // President may peek at the next three cards in the deck
    PRESIDENTIAL_POWER_INVESTIGATE : "PRESIDENTIAL_POWER_INVESTIGATE", // President can investigate a party membership
    PRESIDENTIAL_POWER_EXECUTION : "PRESIDENTIAL_POWER_EXECUTION",   // President may choose a player to execute
    PRESIDENTIAL_POWER_ELECTION : "PRESIDENTIAL_POWER_ELECTION",    // President chooses the next president, seat continues as normal after.
    POST_LEGISLATIVE : "POST_LEGISLATIVE",               // Waiting for the President to end their turn.
    LIBERAL_VICTORY_POLICY : "LIBERAL_VICTORY_POLICY",         // Liberal Party won through enacting Liberal policies.
    LIBERAL_VICTORY_EXECUTION : "LIBERAL_VICTORY_EXECUTION",      // Liberal Party won through executing Hitler.
    FASCIST_VICTORY_POLICY : "FASCIST_VICTORY_POLICY",         // Fascist Party won through enacting Fascist policies.
    FASCIST_VICTORY_ELECTION : "FASCIST_VICTORY_ELECTION",       // Fascist Party won by successfully electing Hitler chancellor.
}