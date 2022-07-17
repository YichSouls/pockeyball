import * as THREE from "three";
import { gsap } from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import Objects from "game/objects";
import Player from "game/player";
import Ui from "game/ui";
import Tools from "game/tools";

const skyFloorTexture = process.env.PUBLIC_URL + "/img/sky.jpg";

export const sceneConfiguration = {
    FPS: 60,

    debug: false,

    // Stage of the game
    stageGame: {
        readyStage: 0,
        playingStage: 1,
        finishStage: 2,
    },

    // Whether the scene is ready
    sceneReady: false,

    // Whether the game is on pause
    isPause: false,

    // The height of the cloud
    cloudHeight: 100,

    // The range of cloud
    cloudRange: 300,

    // The total number of cloud
    cloudNumber: 50,

    // The range of trees
    treeRange: 100,

    // The total number of trees
    treeNumber: 500,

    // The number of branche on the path, pay attention to the pathHeight
    brancheNumber: 40,

    // The number of obstacles on the path, pay attention to the pathHeight
    obstacleNumber: 50,

    // Whether the game is started
    gameStarted: false,

    // How many score points
    playerScore: 0,

    // The gravity acceleration of the game
    gravityAcceleration: -9.8,

    // How much is the max speed up
    ballMaxInitialSpeed: 15,

    // How much is the max speed when touch the target
    ballMaxBonusInitialSpeed: 25,

    // The initial height of the ball attached to the path
    ballInitialHeight: 3,

    // The height of the current level, increases as levels go up
    pathHeight: 200,

    // How far the player is through the current level, initialises to zero.
    pathProgress: 0,

    // Whether the level has finished
    levelOver: false,

    // Gives the completion amount of the course thus far, from 0.0 to 1.0.
    coursePercentComplete: () => sceneConfiguration.courseProgress / sceneConfiguration.courseLength,

    // Whether the start animation is playing (the circular camera movement while looking at the ship)
    cameraStartAnimationPlaying: false,
};

class Game extends THREE.EventDispatcher {
    constructor() {
        super();

        this.totalNumberOfObjects = 4;

        this.init = this.init.bind(this);
        this.keypress = this.keypress.bind(this);
        this.update = this.update.bind(this);
        this.playableResize = this.playableResize.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerCancel = this.onPointerCancel.bind(this);
        this.reset = this.reset.bind(this);
        this.pause = this.pause.bind(this);

        this.objects = null;
        this.player = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.cameraControls = null;
        this.stats = null;
        this.positionRatioStart = null;
    }

    init() {
        console.log("init");

        // Document configuration
        document.backgroundColor = "#FFFFFF";
        document.body.style.margin = 0;
        document.body.style.display = "block";
        document.body.style["background-color"] = "#FFFFFF";
        document.body.style.color = "#fff";
        document.body.style.overflow = "hidden";

        this.initEngine();
        this.initGame();
        this.initEvents();
        this.debug();

        //START ENGINE
        gsap.ticker.fps(sceneConfiguration.FPS);
        gsap.ticker.add(this.update);
        //this.update();
    }

    initEngine() {
        // Scene configuration
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x008011);
        this.scene.fog = new THREE.Fog(0x008011, 1, 500);

        // Light configuration
        const hemiLight = new THREE.HemisphereLight(0xa1a1a1, 0xa1a1a1, 0.4);
        hemiLight.color.setHSL(0.6, 1, 0.6);
        hemiLight.groundColor.setHSL(0.095, 1, 0.75);
        hemiLight.position.set(10, 50, 10);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.color.setHSL(0.1, 1, 0.95);
        dirLight.position.set(1.7, 1.75, 2);
        dirLight.position.multiplyScalar(30);
        this.scene.add(dirLight);

        dirLight.castShadow = true;

        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;

        const d = 20;

        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;

        dirLight.shadow.camera.far = 2500;
        dirLight.shadow.bias = -0.00005;

        // Renderer configuration
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.LinearToneMapping;
        document.body.appendChild(this.renderer.domElement);

        // Camera
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(4, 3, 9);
        this.camera.lookAt(0, 2, 0);

        const axesHelper = new THREE.AxesHelper(3);
        this.scene.add(axesHelper);

        if (sceneConfiguration.debug) {
            this.cameraControls = new OrbitControls(this.camera, this.renderer.domElement);
            this.cameraControls.enablePan = false;
            this.cameraControls.enableZoom = true;
            //this.cameraControls.maxPolarAngle = Math.PI / 2;
            this.cameraControls.target.set(0, 2, 0);
            this.cameraControls.update();
        }
    }

    initGame() {
        // Init the UI
        Ui.init();

        // Add the surrounding objects
        this.objects = new Objects();
        this.objects.init();

        this.scene.add(this.objects);

        // Add the player
        this.player = new Player();
        this.player.init();

        this.scene.add(this.player);
    }

    initEvents() {
        // Add event handlers for the resize of window
        window.addEventListener("resize", this.playableResize, false);

        this.renderer.domElement.style.touchAction = "none"; // disable touch scroll

        // Add event handlers for clicking
        document.addEventListener("keypress", this.keypress, false);

        if (!sceneConfiguration.debug) {
            // Add event handlers for pointerdown
            document.addEventListener("pointerdown", this.onPointerDown);

            // Add event handlers for pointermove
            document.addEventListener("pointermove", this.onPointerMove);

            // Add event handlers for pointerup
            document.addEventListener("pointerup", this.onPointerCancel);

            // Add event handlers for pointer leave the screen
            document.addEventListener("pointerleave", this.onPointerCancel);
        }

        //document.style.touchAction = 'none';
    }

    debug() {
        // Add the stats ui
        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);
    }

    keypress(e) {
        if (e.key == "1") {
            this.start();
        }

        if (e.key == "2") {
            this.reset();
        }

        // if (e.key == "a") {
        //     this.moveLeft();
        // }

        // if (e.key == "d") {
        //     this.moveRight();
        // }
    }

    onPointerDown(e) {
        //console.log("onPointerDown", e);
        this.positionRatioStart = e.clientY / window.innerHeight;
        this.player.onPointerDown();
    }

    onPointerMove(e) {
        //console.log("onPointerMove", e);
        let actualPositionRatio = e.clientY / window.innerHeight;
        let positionRatioDelta = actualPositionRatio - this.positionRatioStart;
        let forceFactor = Tools.remapValue(0, 0.3, positionRatioDelta, 0, 1);

        this.player.onPointerMove(forceFactor);
    }

    onPointerCancel(e) {
        //console.log("onPointerCancel", e);
        this.player.onPointerCancel();
    }

    update() {
        if (!sceneConfiguration.isPause) {
            // Update the stats ui in the scene
            this.stats.update();

            // Update the objects in the scene
            this.objects.update();

            // Update the player in the scene
            this.player.update();

            // Render the scene
            this.renderer.render(this.scene, this.camera);

            // console.log(this.renderer.info.render.triangles + " tri");
            // console.log(this.renderer.info.render.calls+ " call");

            if (sceneConfiguration.gameStarted) {
            }
        }
    }

    playableResize() {
        console.log("playableResize");

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        //Force iOS view resize
        setTimeout(() => {
            window.scrollTo(0, 1);
        }, 500);
    }

    start() {
        console.log("start");
    }

    reset() {
        console.log("reset");

        // Reset the player
        this.player.reset();

        // Reset all the objects
        this.objects.reset();

        // Reset the UI
    }

    pause() {
        console.log("pause");

        sceneConfiguration.isPause = true;
    }

    // When the height of the ball is below 2, drop the ball and game over
    dropBallOnGround() {
        console.log("dropBallOnGround");

        this.objects.position.set(0, -2, 0);

        Ui.toggleResetButton(true);
    }

    touchRedBlock() {
        console.log("touchRedBlock");

        Ui.toggleResetButton(true);
    }
}

export default new Game();
