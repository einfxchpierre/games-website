class ThreeChess {
    constructor(containerId, onSquareSelect) {
        this.container = document.getElementById(containerId);
        this.onSquareSelect = onSquareSelect;
        this.piecesGroup = new THREE.Group();
        this.boardTiles = []; 
        this.lastHighlightedTile = null;

        // Animations-Tracking
        this.animatedPieces = []; // List of pieces currently moving
        this.ANIMATION_DURATION = 200; // in Millisekunden

        this.initThree();
        this.createBoard();
        this.setupLights();
        this.setupInteractions();
        this.animate();
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x141414);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 7, 8);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05;

        this.scene.add(this.piecesGroup);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    createBoard() {
        const boardGeo = new THREE.BoxGeometry(1, 0.15, 1);
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const isLight = (r + c) % 2 === 0;
                const tileColor = isLight ? 0xeadeca : 0x705335; // Hochwertigere Holz-Optik
                const mat = new THREE.MeshStandardMaterial({
                    color: tileColor,
                    roughness: 0.5,
                    metalness: 0.1
                });
                const tile = new THREE.Mesh(boardGeo, mat);
                tile.position.set(c - 3.5, 0, r - 3.5);
                tile.receiveShadow = true;
                
                const squareName = String.fromCharCode(97 + c) + (8 - r);
                tile.userData = { square: squareName, originalColor: tileColor };
                
                this.boardTiles.push(tile);
                this.scene.add(tile);
            }
        }
    }

    highlightSquare(squareName) {
        this.clearHighlight();
        const tile = this.boardTiles.find(t => t.userData.square === squareName);
        if (tile) {
            this.lastHighlightedTile = tile;
            tile.material.color.setHex(0x2980b9); 
        }
    }

    clearHighlight() {
        if (this.lastHighlightedTile) {
            this.lastHighlightedTile.material.color.setHex(this.lastHighlightedTile.userData.originalColor);
            this.lastHighlightedTile = null;
        }
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(4, 12, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);
    }

    // Verbesserte Designer-Figuren
    createPieceMesh(type, color) {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({
            color: color === 'w' ? 0xf5f5f5 : 0x2c2c2c,
            roughness: 0.15,
            metalness: 0.2
        });

        // Gemeinsame Basis für alle Figuren
        const baseGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.08, 16);
        const base = new THREE.Mesh(baseGeo, mat);
        base.castShadow = true;
        group.add(base);

        switch(type) {
            case 'p': { // Bauer
                const body = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 16), mat);
                body.position.y = 0.2;
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), mat);
                head.position.y = 0.4;
                group.add(body, head);
                break;
            }
            case 'r': { // Turm (mit Zinnen)
                const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.45, 16), mat);
                body.position.y = 0.25;
                const top = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.20, 0.1, 12), mat);
                top.position.y = 0.5;
                group.add(body, top);
                break;
            }
            case 'n': { // Springer (Pferd-Silhouette)
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.28), mat);
                body.position.set(0, 0.25, 0.04);
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.3), mat);
                head.position.set(0, 0.45, -0.05);
                group.add(body, head);
                break;
            }
            case 'b': { // Läufer (Geschwungen mit Spitze)
                const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 0.45, 16), mat);
                body.position.y = 0.25;
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), mat);
                head.scale.set(1, 1.4, 1);
                head.position.y = 0.52;
                const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), mat);
                tip.position.y = 0.75;
                group.add(body, head, tip);
                break;
            }
            case 'q': { // Dame (Krone)
                const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.6, 16), mat);
                body.position.y = 0.3;
                const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.14, 0.2, 16), mat);
                crown.position.y = 0.65;
                group.add(body, crown);
                break;
            }
            case 'k': { // König (Kreuz/Krone-Hybrid)
                const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 0.65, 16), mat);
                body.position.y = 0.32;
                const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.2, 16), mat);
                crown.position.y = 0.7;
                const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05), mat);
                const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.05), mat);
                crossH.position.y = 0.86;
                crossV.position.y = 0.86;
                group.add(body, crown, crossH, crossV);
                break;
            }
        }
        return group;
    }

    // Erkennt, welche Figuren sich bewegt haben, und startet für sie eine Animation
    updateBoardPieces(boardData, lastMove = null) {
        const currentGroupChildren = [...this.piecesGroup.children];
        this.piecesGroup.clear();

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = boardData[r][c];
                if (piece) {
                    const targetX = c - 3.5;
                    const targetZ = r - 3.5;
                    const squareName = String.fromCharCode(97 + c) + (8 - r);

                    const mesh = this.createPieceMesh(piece.type, piece.color);
                    mesh.userData = { square: squareName };

                    // Wenn dieser Square das Ziel des letzten Zugs war, animieren wir ihn von seiner Startposition
                    if (lastMove && squareName === lastMove.to) {
                        const fromC = lastMove.from.charCodeAt(0) - 97;
                        const fromR = 8 - parseInt(lastMove.from[1]);
                        
                        mesh.position.set(fromC - 3.5, 0.04, fromR - 3.5);
                        this.animatedPieces.push({
                            mesh: mesh,
                            startX: fromC - 3.5,
                            startZ: fromR - 3.5,
                            endX: targetX,
                            endZ: targetZ,
                            startTime: performance.now()
                        });
                    } else {
                        // Statische Platzierung
                        mesh.position.set(targetX, 0.04, targetZ);
                    }
                    this.piecesGroup.add(mesh);
                }
            }
        }
    }

    setupInteractions() {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const handleSelect = (event) => {
            if (event.target.closest('#elo-display') || event.target.closest('#menu') || event.target.closest('#status-turn')) {
                return;
            }

            let clientX = event.clientX || (event.touches && event.touches[0].clientX);
            let clientY = event.clientY || (event.touches && event.touches[0].clientY);

            if (clientX === undefined || clientY === undefined) return;

            mouse.x = (clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, this.camera);
            const intersects = raycaster.intersectObjects(this.scene.children);

            const clickedTile = intersects.find(i => i.object.userData && i.object.userData.square);
            if (clickedTile) {
                this.onSquareSelect(clickedTile.object.userData.square);
            }
        };

        window.addEventListener('pointerdown', handleSelect, { passive: true });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();

        // Lineare Interpolation (Lerp) für gleitende Züge
        const now = performance.now();
        for (let i = this.animatedPieces.length - 1; i >= 0; i--) {
            const anim = this.animatedPieces[i];
            const elapsed = now - anim.startTime;
            const progress = Math.min(elapsed / this.ANIMATION_DURATION, 1);

            // Sanfte mathematische Sinus-Kurve für die Bewegung (Easing)
            const easeProgress = Math.sin(progress * Math.PI / 2);

            anim.mesh.position.x = anim.startX + (anim.endX - anim.startX) * easeProgress;
            anim.mesh.position.z = anim.startZ + (anim.endZ - anim.startZ) * easeProgress;
            
            // Kleine Parabel für leichtes Anheben beim Ziehen
            anim.mesh.position.y = 0.04 + Math.sin(progress * Math.PI) * 0.25;

            if (progress >= 1) {
                anim.mesh.position.set(anim.endX, 0.04, anim.endZ);
                this.animatedPieces.splice(i, 1);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}