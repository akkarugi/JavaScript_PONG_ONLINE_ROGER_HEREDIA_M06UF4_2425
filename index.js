const PORT = 7777;
const http = require('http');
const static = require('node-static');
const ws = require('ws');

const file = new static.Server('./public');
const http_server = http.createServer((request, response) => {
    request.addListener('end', () => file.serve(request, response)).resume();
}).listen(PORT);

const ws_server = new ws.Server({ server: http_server });
let player1 = null;
let player2 = null;
let spectators = [];
let game_over = false;

ws_server.on('connection', (conn) => {
    console.log("Usuario conectado");

    notifyAllPlayers({ message: "Un jugador se ha conectado" });

    if (player1 === null) {
        player1 = conn;
        conn.send(JSON.stringify({ player_num: 1 }));

        conn.on('close', () => {
            console.log("Player 1 disconnected");
            player1 = null;
            notifyAllPlayers({ message: "Player 1 disconnected", game_over: true });
            resetGame();
        });

        conn.on('message', (msg) => handleMessage(msg, player2, conn, 1));
    } else if (player2 === null) {
        player2 = conn;
        conn.send(JSON.stringify({ player_num: 2 }));

        conn.on('close', () => {
            console.log("Player 2 disconnected");
            player2 = null;
            notifyAllPlayers({ message: "Player 2 disconnected", game_over: true });
            resetGame();
        });

        startCountdown();

        conn.on('message', (msg) => handleMessage(msg, player1, conn, 2));
    } else {
        spectators.push(conn);
        conn.send(JSON.stringify({ message: "You are a spectator" }));

        conn.on('close', () => {
            console.log("Spectator disconnected");
            spectators = spectators.filter(s => s !== conn);
        });
    }
});

function startCountdown() {
    let countdown = 3;
    const countdownInterval = setInterval(() => {
        if (countdown > 0) {
            const info = { countdown: countdown };
            notifyAllPlayers(info);
            countdown--;
        } else {
            clearInterval(countdownInterval);
            const info = { game_start: true };
            notifyAllPlayers(info);
            notifyAllPlayers({ message: "start_music" });
            game_over = false;
        }
    }, 1000);
}

function handleMessage(msg, otherPlayer, conn, playerNum) {
    if (otherPlayer === null) return;

    const data = JSON.parse(msg);
    if (data.y !== undefined || data.bx !== undefined || data.by !== undefined || data.score1 !== undefined) {
        otherPlayer.send(JSON.stringify(data));
        notifySpectators(data);
    }

    if (data.y !== undefined) {
        notifySpectators({ y: data.y, player: playerNum });
    }

    if (data.game_over !== undefined) {
        game_over = true;
        notifyAllPlayers(data);
        setTimeout(() => {
            resetGame();
            startCountdown();
        }, 5000);
    }
}

function resetGame() {
    game_over = false;
    notifyAllPlayers({ reset: true });
}

function notifySpectators(info) {
    spectators.forEach(s => s.send(JSON.stringify(info)));
}

function notifyAllPlayers(info) {
    if (player1 !== null) player1.send(JSON.stringify(info));
    if (player2 !== null) player2.send(JSON.stringify(info));
    notifySpectators(info);
}