class P2PManager {
    constructor(customId, isHost, onReady, onConnect, onMoveReceived) {
        const APP_PREFIX = "phoenixschach-"; 
        this.conn = null;
        this.onReady = onReady;
        this.onConnect = onConnect;
        this.onMoveReceived = onMoveReceived;

        if (isHost) {
            // Hoster: Wunsch-Code oder eine kurze 4-stellige Zufallszahl
            let shortId = customId ? customId.trim() : Math.floor(1000 + Math.random() * 9000).toString();
            this.peer = new Peer(APP_PREFIX + shortId);
            this.peer.on('open', () => this.onReady(shortId));
        } else {
            // Gast: Braucht keinen festen Namen
            this.peer = new Peer();
            this.peer.on('open', () => this.onReady());
        }
        
        // Verbindungsempfang für den Hoster
        this.peer.on('connection', (connection) => {
            this.conn = connection;
            this.setupConnection();
            
            // FEHLERBEHEBUNG: Erst wenn der Datenkanal wirklich BEREIT und OFFEN ist,
            // wird das Spiel gestartet!
            this.conn.on('open', () => {
                this.onConnect(false); // false = Hoster-Rolle
            });
        });

        this.peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                alert("Dieser Kurz-Code ist im Moment leider schon vergeben. Bitte nimm einen anderen!");
            } else {
                console.error("PeerJS Verbindungsfehler:", err);
            }
        });
    }

    // Verbindungsfunktion für den Gast
    connectToPeer(targetShortId) {
        const APP_PREFIX = "phoenixschach-";
        const fullTargetId = APP_PREFIX + targetShortId.trim();
        
        this.conn = this.peer.connect(fullTargetId);
        this.setupConnection();
        
        this.conn.on('open', () => {
            this.onConnect(true); // true = Gast-Rolle
        });
    }

    setupConnection() {
        this.conn.on('data', (data) => {
            if (data && data.type === 'MOVE') {
                this.onMoveReceived(data.move);
            }
        });

        // Automatisch neu laden, wenn einer die Verbindung abbricht
        this.conn.on('close', () => {
            alert("Verbindung zum Mitspieler verloren!");
            location.reload();
        });
    }

    sendMove(moveData) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'MOVE', move: moveData });
        }
    }
}