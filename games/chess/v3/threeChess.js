class ThreeChess {
    constructor(containerId, onSquareSelect) {
        this.container = document.getElementById(containerId);
        this.onSquareSelect = onSquareSelect;
        
        this.piecesGroup = new THREE.Group();
        this.graveyardGroup = new THREE.Group(); // Neu: Gruppe für geschlagene Figuren
        this.boardTiles = []; 
        this.lastHighlightedTile = null;
        this.currentGreenTiles = [];

        this.animatedPieces = []; 
        this.ANIMATION_DURATION = 220; 

        this.initThree();
        this.createBoard();
        this.setupLights();
        this.setupInteractions();
        this.animate();
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);

        // Kamera leicht nach hinten gezogen, damit Rand-Figuren (Friedhof) Platz haben
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 9, 10);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05;

        this.scene.add(this.piecesGroup);
        this.scene.add(this.graveyardGroup);

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
                const tileColor = isLight ? 0xcca67d : 0x8b5a2b; 
                const mat = new THREE.MeshStandardMaterial({ color: tileColor, roughness: 0.8 });
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

    highlightPossibleMoves(movesArray) {
        this.clearGreenHighlights();
        movesArray.forEach(moveStr => {
            const targetSquare = moveStr.replace(/[+#x=QRNBK]/g, '').slice(-2);
            const tile = this.boardTiles.find(t => t.userData.square === targetSquare);
            if (tile) {
                tile.material.color.setHex(0x2ecc71); 
                this.currentGreenTiles.push(tile);
            }
        });
    }

    clearGreenHighlights() {
        this.currentGreenTiles.forEach(tile => tile.material.color.setHex(tile.userData.originalColor));
        this.currentGreenTiles = [];
    }

    clearHighlight() {
        if (this.lastHighlightedTile) {
            this.lastHighlightedTile.material.color.setHex(this.lastHighlightedTile.userData.originalColor);
            this.lastHighlightedTile = null;
        }
        this.clearGreenHighlights();
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
        dirLight.position.set(2, 12, 6);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
    }

    // --- NEUES GEOMETRISCHES DESIGN ---
    createPieceMesh(type, color) {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({
            color: color === 'w' ? 0xdddddd : 0x222222, // Matte, schlichte Farben
            roughness: 0.9,
            metalness: 0.0
        });

        // Gemeinsamer Sockel (flacher Zylinder)
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 32), mat);
        base.position.y = 0.075;
        base.castShadow = true;
        group.add(base);

        // Aufsätze basierend auf dem Bild
        switch(type) {
            case 'p': { // Bauer: Kugel
                const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 32), mat);
                sphere.position.y = 0.35;
                sphere.castShadow = true;
                group.add(sphere); 
                break;
            }
            case 'r': { // Turm: Würfel
                const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat);
                box.position.y = 0.4;
                box.castShadow = true;
                group.add(box); 
                break;
            }
            case 'n': { // Springer: Kegel
                const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 32), mat);
                cone.position.y = 0.5;
                cone.castShadow = true;
                group.add(cone); 
                break;
            }
            case 'b': { // Läufer: Zylinder mit Kugel
                const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.5, 32), mat);
                cyl.position.y = 0.4;
                const topSphere = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), mat);
                topSphere.position.y = 0.7;
                cyl.castShadow = true; topSphere.castShadow = true;
                group.add(cyl, topSphere); 
                break;
            }
            case 'q': { // Dame: Schwebender Ring
                const body = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 32), mat);
                body.position.y = 0.5;
                const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 16, 32), mat);
                ring.rotation.x = Math.PI / 2; // Ring flach hinlegen
                ring.position.y = 0.95;
                body.castShadow = true; ring.castShadow = true;
                group.add(body, ring); 
                break;
            }
            case 'k': { // König: 3D Kreuz
                const bodyK = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 32), mat);
                bodyK.position.y = 0.5;
                const vBox = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat);
                vBox.position.y = 1.05;
                const hBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), mat);
                hBox.position.y = 1.05;
                bodyK.castShadow = true; vBox.castShadow = true; hBox.castShadow = true;
                group.add(bodyK, vBox, hBox); 
                break;
            }
        }
        return group;
    }

    // --- NEU: 3D FRIEDHOF FÜR GESCHLAGENE FIGUREN ---
    updateGraveyard(boardData) {
        this.graveyardGroup.clear();

        const startCounts = { p: 8, r: 2, n: 2, b: 2, q: 1 }; // König ignorieren
        const currentW = { p: 0, r: 0, n: 0, b: 0, q: 0 };
        const currentB = { p: 0, r: 0, n: 0, b: 0, q: 0 };

        boardData.forEach(row => {
            row.forEach(piece => {
                if (piece) {
                    if (piece.color === 'w' && currentW[piece.type] !== undefined) currentW[piece.type]++;
                    if (piece.color === 'b' && currentB[piece.type] !== undefined) currentB[piece.type]++;
                }
            });
        });

        // Funktion zum Positionieren der toten Figuren in 2er-Reihen
        const placeDeadPieces = (color, currentCounts, startX, directionX) => {
            let deadPieces = [];
            for (let type in startCounts) {
                let diff = startCounts[type] - currentCounts[type];
                for (let i = 0; i < diff; i++) deadPieces.push(type);
            }

            deadPieces.forEach((type, index) => {
                const mesh = this.createPieceMesh(type, color);
                const col = Math.floor(index / 8); // 2 Reihen
                const row = index % 8;             // 8 Spalten
                // Platzierung außerhalb des Brettes
                mesh.position.set(startX + (col * directionX), 0, row - 3.5);
                this.graveyardGroup.add(mesh);
            });
        };

        // Weiße tote Figuren links (x = -5), Schwarze tote Figuren rechts (x = 5)
        placeDeadPieces('w', currentW, -5.0, -1);
        placeDeadPieces('b', currentB, 5.0, 1);
    }

    updateBoardPieces(boardData, lastMove = null) {
        this.piecesGroup.clear();
        this.updateGraveyard(boardData); // Friedhof bei jedem Zug prüfen

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = boardData[r][c];
                if (piece) {
                    const targetX = c - 3.5;
                    const targetZ = r - 3.5;
                    const squareName = String.fromCharCode(97 + c) + (8 - r);

                    const mesh = this.createPieceMesh(piece.type, piece.color);
                    mesh.userData = { square: squareName };

                    if (lastMove && squareName === lastMove.to) {
                        const fromC = lastMove.from.charCodeAt(0) - 97;
                        const fromR = 8 - parseInt(lastMove.from[1]);
                        
                        mesh.position.set(fromC - 3.5, 0, fromR - 3.5);
                        this.animatedPieces.push({
                            mesh: mesh, startX: fromC - 3.5, startZ: fromR - 3.5, endX: targetX, endZ: targetZ, startTime: performance.now()
                        });
                    } else {
                        mesh.position.set(targetX, 0, targetZ);
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
            if (event.target.closest('#ui-container') && event.target.tagName !== 'CANVAS') return;

            let clientX = event.clientX || (event.touches && event.touches[0].clientX);
            let clientY = event.clientY || (event.touches && event.touches[0].clientY);
            if (clientX === undefined || clientY === undefined) return;

            mouse.x = (clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, this.camera);
            const intersects = raycaster.intersectObjects(this.scene.children, true);

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

        const now = performance.now();
        for (let i = this.animatedPieces.length - 1; i >= 0; i--) {
            const anim = this.animatedPieces[i];
            const elapsed = now - anim.startTime;
            const progress = Math.min(elapsed / this.ANIMATION_DURATION, 1);
            const easeProgress = Math.sin(progress * Math.PI / 2); 

            anim.mesh.position.x = anim.startX + (anim.endX - anim.startX) * easeProgress;
            anim.mesh.position.z = anim.startZ + (anim.endZ - anim.startZ) * easeProgress;
            anim.mesh.position.y = Math.sin(progress * Math.PI) * 0.4; // Höherer "Sprung"

            if (progress >= 1) {
                anim.mesh.position.set(anim.endX, 0, anim.endZ);
                this.animatedPieces.splice(i, 1);
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
}