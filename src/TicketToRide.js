var camera, scene, renderer;

var keyboard = new THREEx.KeyboardState();
var clock = new THREE.Clock();
var delta;
var car;
var specialBox;
var points = 0;

var CAMERA_VIEW_OUTSIDE = 'car-outside';
var CAMERA_VIEW_INSIDE = 'car-inside';
var cameraView = CAMERA_VIEW_OUTSIDE;

var SERVER_ADDRESS = "http://localhost:8000/";

init();

function init() {

    Physijs.scripts.worker = SERVER_ADDRESS + '/lib/Physijs/physijs_worker.js';
    Physijs.scripts.ammo = SERVER_ADDRESS + '/lib/ammo.js';

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xffffff);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);

    createScene();

    camera = new THREE.TargetCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    scene.add(camera);

    createGround();

    createBuildings(100);
    createSpecialBox();

    var jsonLoader = new THREE.JSONLoader();
    jsonLoader.load(SERVER_ADDRESS + "models/panamera/panamera.js", onCarLoaded);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function createScene() {
    scene = new Physijs.Scene();
    scene.fog = new THREE.Fog(0xffffff, 0, 750);

    var light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(1, 1, 1);
    scene.add(light);

    var light2 = new THREE.DirectionalLight(0xffffff, 0.75);
    light2.position.set(-1, -0.5, -1);
    scene.add(light2);
}

function createGround() {
    var floorMaterial = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({
            map: new THREE.ImageUtils.loadTexture(SERVER_ADDRESS + "images/grasslight-big.png")
        }),
        .8, // high friction
        .4 // low restitution
    );
    floorMaterial.map.wrapS = floorMaterial.map.wrapT = THREE.RepeatWrapping;
    floorMaterial.map.repeat.set(10, 10);

    var floor = new Physijs.BoxMesh(
        new THREE.BoxGeometry(1000, 1000, 10, 10, 10, 1),
        floorMaterial,
        0 // mass
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5;
    floor.receiveShadow = true;
    scene.add(floor);
}

function createBuildings(count) {
    for (var i = 0; i < count; i++) {
        var material = Physijs.createMaterial(
            new THREE.MeshLambertMaterial({
                map: THREE.ImageUtils.loadTexture(SERVER_ADDRESS + "images/brick-wall.jpg")
            }),
            .8, // high friction
            .4 // low restitution
        );
        var boxMesh = new Physijs.BoxMesh(new THREE.BoxGeometry(20, 20, 20), material, 10000);
        boxMesh.position.x = Math.floor(Math.random() * 20 - 10) * 20;
        boxMesh.position.y = 10;
        boxMesh.position.z = Math.floor(Math.random() * 20 - 10) * 20;
        boxMesh.__dirtyPosition = true;

        scene.add(boxMesh);
    }
}

function createSpecialBox() {
    var specialBoxMaterial = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture(SERVER_ADDRESS + "images/checkerboard.png")
        }),
        .6,
        .6
    );
    specialBox = new Physijs.BoxMesh(new THREE.BoxGeometry(10, 10, 10), specialBoxMaterial, 150);

    spawnSpecialBox();
    scene.add(specialBox);
}

function spawnSpecialBox() {
    if (specialBox) {
        specialBox.position.set(Math.floor(Math.random() * 20 - 10) * 20, 30, Math.floor(Math.random() * 20 - 10) * 20);
        specialBox.__dirtyPosition = true;
    }
}

function onCarLoaded(carGeometry, carMaterials) {
    carGeometry.computeTangents();

    car = new Physijs.BoxMesh(
        carGeometry,
        new THREE.MeshFaceMaterial(carMaterials)
    );
    car.position.set(0, 4.5, 250);
    car.rotation.z = Math.PI;
    car.rotation.x = -Math.PI / 2;
    car.__dirtyRotation = true;
    car.__dirtyPosition = true;

    createCameraTargets(car);
    camera.setTarget(cameraView);

    scene.add(car);

    animate();
}

function createCameraTargets(targetObject) {
    camera.addTarget({
        name: CAMERA_VIEW_OUTSIDE,
        targetObject: targetObject,
        cameraPosition: new THREE.Vector3(0, 22, 15),
        fixed: false,
        stiffness: 0.1,
        matchRotation: false
    });
    camera.addTarget({
        name: CAMERA_VIEW_INSIDE,
        targetObject: targetObject,
        cameraPosition: new THREE.Vector3(0, 0.2, 0),
        cameraRotation: new THREE.Euler(-1.4, 0, Math.PI),
        fixed: false,
        stiffness: 1,
        matchRotation: true
    });
}

function animate() {
    requestAnimationFrame(animate);

    delta = clock.getDelta();
    var moveDistance = 40 * delta;

    // move forwards / backwards
    if (keyboard.pressed("down")) {
        car.translateY(moveDistance);
    }
    if (keyboard.pressed("up")) {
        car.translateY(-moveDistance);
    }
    // rotate left/right
    if (keyboard.pressed("up") && keyboard.pressed("left") || (keyboard.pressed("down") && keyboard.pressed("right"))) {
        car.rotation.z += delta;
    }
    if ((keyboard.pressed("down") && keyboard.pressed("left")) || (keyboard.pressed("up") && keyboard.pressed("right"))) {
        car.rotation.z -= delta;
    }

    if (keyboard.pressed("c")) {
        cameraView = cameraView == 'car-inside' ? 'car-outside' : 'car-inside';
        camera.setTarget(cameraView);
    }

    if (specialBox.position.y < -20) {
        points++;
        console.log("Points: " + points);
        spawnSpecialBox();
    }

    car.__dirtyRotation = true;
    car.__dirtyPosition = true;
    camera.update();
    scene.simulate();
    renderer.render(scene, camera);
}
