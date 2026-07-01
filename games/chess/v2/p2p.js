class P2PManager {
    constructor(onReady, onConnect, onMoveReceived) {
        this.peer = new Peer(); // Nutzt das kostenlose, öffentliche PeerJS-Cloud-Signaling
        this.conn = null;
        this.onReady = onReady;
        this.onConnect = onConnect;
        this.onMoveReceived = onMoveReceived;

        this.peer.on('open', (id) => this.onReady(id));
        this.peer.on('connection', (connection) => {
            this.conn = connection;
            this.setupConnection();
            this.onConnect(false); // Hoster ist Weiß
        });
    }

    connectToPeer(targetId) {
        this.conn = this.peer.connect(targetId);
        this.setupConnection();
        this.onConnect(true); // Beitretender ist Schwarz
    }

    setupConnection() {
        this.conn.on('data', (data) => {
            if (data.type === 'MOVE') {
                this.onMoveReceived(data.move);
            }
        });
    }

    sendMove(moveData) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'MOVE', move: moveData });
        }
    }
}