class ThreeChess {
    constructor(containerId, onSquareSelect) {
        this.container = document.getElementById(containerId);
        this.onSquareSelect = onSquareSelect;
        this.piecesGroup = new THREE.Group();
        this.selectedSquare = null;

        this.initThree();
        this.createBoard();
        this.setupLights();
        this.setupInteractions();
        this.animate();
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 8, 9);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Kamera nicht unter den Boden bewegen

        this.scene.add(this.piecesGroup);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    createBoard() {
        const boardGeo = new THREE.BoxGeometry(1, 0.2, 1);
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const isLight = (r + c) % 2 === 0;
                const mat = new THREE.MeshStandardMaterial({
                    color: isLight ? 0xf0d9b5 : 0xb58863,
                    roughness: 0.4
                });
                const tile = new THREE.Mesh(boardGeo, mat);
                // Koordinaten zentrieren (-3.5 bis +3.5)
                tile.position.set(c - 3.5, 0, r - 3.5);
                tile.userData = { square: String.fromCharCode(97 + c) + (8 - r) };
                this.scene.add(tile);
            }
        }
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
    }

    // Erzeugt geometrische Ersatzformen für Figuren ohne externe Assets laden zu müssen
    createPieceMesh(type, color) {
        let geo;
        const mat = new THREE.MeshStandardMaterial({
            color: color === 'w' ? 0xffffff : 0x333333,
            roughness: 0.2,
            metalness: 0.1
        });

        switch(type) {
            case 'p': geo = new THREE.CylinderGeometry(0.15, 0.2, 0.4, 12); break; // Bauer
            case 'r': geo = new THREE.BoxGeometry(0.3, 0.6, 0.3); break; // Turm
            case 'n': geo = new THREE.BoxGeometry(0.25, 0.5, 0.4); break; // Springer
            case 'b': geo = new THREE.ConeGeometry(0.2, 0.7, 12); break; // Läufer
            case 'q': geo = new THREE.CylinderGeometry(0.1, 0.3, 0.8, 16); break; // Königin
            case 'k': geo = new THREE.CylinderGeometry(0.2, 0.3, 0.9, 16); break; // König
        }
        
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.position.y = 0.3; // Auf das Brett stellen
        return mesh;
    }

    updateBoardPieces(boardData) {
        // Alte Figuren löschen
        while(this.piecesGroup.children.length > 0){
            this.piecesGroup.remove(this.piecesGroup.children[0]);
        }

        // Neue Figuren setzen
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = boardData[r][c];
                if (piece) {
                    const mesh = this.createPieceMesh(piece.type, piece.color);
                    mesh.position.set(c - 3.5, 0.2, r - 3.5);
                    this.piecesGroup.add(mesh);
                }
            }
        }
    }

    setupInteractions() {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const handleSelect = (event) => {
            // Erkennt sowohl Touch als auch Maus-Klick-Koordinaten
            const clientX = event.clientX || event.touches[0].clientX;
            const clientY = event.clientY || event.touches[0].clientY;

            mouse.x = (clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, this.camera);
            const intersects = raycaster.intersectObjects(this.scene.children);

            // Finde das angeklickte Feld auf dem Brett
            const clickedTile = intersects.find(i => i.object.userData && i.object.userData.square);
            if (clickedTile) {
                this.onSquareSelect(clickedTile.object.userData.square);
            }
        };

        this.renderer.domElement.addEventListener('pointerdown', handleSelect);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}