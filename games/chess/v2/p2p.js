class P2PManager {
    constructor(onReady, onConnect, onMoveReceived) {
        this.peer = new Peer(); 
        this.conn = null;
        this.onReady = onReady;
        this.onConnect = onConnect;
        this.onMoveReceived = onMoveReceived;

        this.peer.on('open', (id) => this.onReady(id));
        
        // Listener für den Hoster (empfängt eingehenden Anruf vom Gast)
        this.peer.on('connection', (connection) => {
            this.conn = connection;
            this.setupConnection();
            this.onConnect(false); // false = Ich bin Hoster (Weiß)
        });
    }

    // Funktion für den Beitretenden (Gast)
    connectToPeer(targetId) {
        this.conn = this.peer.connect(targetId);
        this.setupConnection();
        
        this.conn.on('open', () => {
            this.onConnect(true); // true = Ich bin der Gast (Schwarz)
        });
    }

    setupConnection() {
        this.conn.on('data', (data) => {
            if (data && data.type === 'MOVE') {
                this.onMoveReceived(data.move);
            }
        });

        this.conn.on('error', (err) => console.error("P2P Verbindungsfehler:", err));
    }

    sendMove(moveData) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'MOVE', move: moveData });
        }
    }
}