class P2PManager {
    constructor(onReady, onConnect, onMoveReceived) {
        this.peer = new Peer(); 
        this.conn = null;
        this.onReady = onReady;
        this.onConnect = onConnect;
        this.onMoveReceived = onMoveReceived;

        this.peer.on('open', (id) => this.onReady(id));
        
        this.peer.on('connection', (connection) => {
            this.conn = connection;
            this.setupConnection();
            this.onConnect(false); // false = Ich bin Hoster
        });
    }

    connectToPeer(targetId) {
        this.conn = this.peer.connect(targetId);
        this.setupConnection();
        
        this.conn.on('open', () => {
            this.onConnect(true); // true = Ich bin Gast
        });
    }

    setupConnection() {
        this.conn.on('data', (data) => {
            if (data && data.type === 'MOVE') {
                this.onMoveReceived(data.move);
            }
        });
        this.conn.on('error', (err) => console.error("Verbindung abgebrochen oder Fehler:", err));
    }

    sendMove(moveData) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'MOVE', move: moveData });
        }
    }
}