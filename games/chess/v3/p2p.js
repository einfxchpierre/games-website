class P2PManager {
    // Erwartet jetzt zusätzlich ein "isHost" (true/false) zur sauberen ID-Trennung
    constructor(customId, isHost, onReady, onConnect, onMoveReceived) {
        const APP_PREFIX = "phoenixschach-"; // Schützt kurze Codes vor globalen Kollisionen
        this.conn = null;
        this.onReady = onReady;
        this.onConnect = onConnect;
        this.onMoveReceived = onMoveReceived;

        if (isHost) {
            // Hoster: Nutzen den Wunsch-Code oder eine kurze 4-stellige Zufallszahl
            let shortId = customId ? customId.trim() : Math.floor(1000 + Math.random() * 9000).toString();
            
            // Registriere die ID im Hintergrund mit Prefix
            this.peer = new Peer(APP_PREFIX + shortId);
            
            // Gib dem Spiel aber nur die kurze ID (z.B. "123") für den Bildschirm zurück
            this.peer.on('open', () => this.onReady(shortId));
        } else {
            // Gast: Braucht keinen festen Namen, bekommt eine freie Standard-ID von PeerJS
            this.peer = new Peer();
            this.peer.on('open', () => this.onReady());
        }
        
        // Verbindungsempfang für den Hoster
        this.peer.on('connection', (connection) => {
            this.conn = connection;
            this.setupConnection();
            this.onConnect(false); // false = Hoster-Rolle
        });

        this.peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                alert("Dieser Kurz-Code ist im Moment leider schon vergeben. Bitte nimm einen anderen (z.B. 1234)!");
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
    }

    sendMove(moveData) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'MOVE', move: moveData });
        }
    }
}