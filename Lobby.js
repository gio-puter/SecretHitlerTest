import { Socket } from "socket.io";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'node:fs';
import { Game } from "./Game.js";

export class LobbyManager {
    lobbies = new Map();

    constructor(server) {
        this.server = server
    }
    
    createLobby() {
        let uniqueId = Math.random().toString(36).slice(2).substring(0, 4);
        while (this.lobbies.get(uniqueId)) {
            uniqueId = Math.random().toString(36).slice(2).substring(0, 4);
        }

        const lobby = new Lobby(this.server, uniqueId.toUpperCase());
        this.lobbies.set(lobby.id, lobby);

        return lobby;
    }

    joinLobby(client, lobbyId) {
        const lobby = this.lobbies.get(lobbyId);
        if (lobby == null || lobby.clients.size == lobby.maxClients) {
            return null;
        }
        lobby.addClient(client);
        return lobby;
    }

    async leaveLobby(client, lobbyId) {
        const lobby = this.lobbies.get(lobbyId);
        lobby.removeClient(client);

        if (lobby.clients.size == 0) {
            await lobby.close();
            this.lobbies.delete(lobby.id);
        }

        return lobby;
    }

    getLobby(lobbyId) {
        return this.lobbies.get(lobbyId);
    }
}

export class Lobby {
    createdAt = new Date();
    clients = new Map();
    lobbySize = 0;
    minClients = 5;
    maxCleints = 10;
    password = Math.random().toString(36).slice(2).substring(0, 6);
    game;

    constructor(server, id) {
        this.server = server;
        this.id = id;
        this.db = null;
        // this.initializeDatabase();
    }

    async initializeDatabase() {
        try {
            // open the database file
            this.db = await open({
                filename: `${this.id}.db`, 
                // filename: 'chat.db',
                driver: sqlite3.Database
            });

            await this.db.exec(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sender TEXT,
                    message TEXT
                );
            `);
        } catch (e) {
            console.error("database not created", e);
        }
    }

    addClient(client) {
        this.lobbySize += 1
        this.clients.set(client.id, client);
        client.join(this.id);
        client.data.lobby = this;

        // console.log(this.clients)
    }

    removeClient(client) {
        // console.log(client)
        this.lobbySize -= 1;
        this.clients.delete(client.id)
        client.leave(this.id)
        
        delete client.data.lobby;
        delete client.data.lobbyName;
    }

    async updateDatabase(client, msg) {
        try {
            await this.db.run('INSERT INTO messages (sender, message) VALUES (?, ?)', client.data.userName, msg);
        } catch (e) {
            console.log(e);
            if (e.errno === 19 /* SQLITE_CONSTRAINT */ ) {
                // the message was already inserted, so we notify the client
                callback();
            } else {
                // nothing to do, just let the client retry
            }
            return;
        }
    }

    async sendDatabase(client) {
        try {
            await this.db.each('SELECT id, sender, message FROM messages',
                (_err, row) => {
                    // console.log('message: ' + row.message + '   ||   id : ' + row.id )
                    client.emit('chat-message', `${row.sender}: ${row.message}`);
            })
        } catch (e) {
        // something went wrong
        }
    }

    async close() {
        await this.db.close();
        await fs.promises.unlink(`${this.id}.db`);
        // await fs.promises.unlink('chat.db');
    }

    setupGame() {
        console.log("Setting up game");
        // console.log(clients.keys())
        this.game = new Game(this.clients);
    }

}