var camera, scene, renderer;
var geometry, material, mesh;
var time = Date.now();

var objects = [];

var ray;
var blocker = document.getElementById('blocker');
var instructions = document.getElementById('instructions');

// http://www.html5rocks.com/en/tutorials/pointerlock/intro/

var keyboard = new THREEx.KeyboardState();
var clock = new THREE.Clock();
var delta;
var car;
var CAMERA_VIEW_OUTSIDE = 'car-outside';
var CAMERA_VIEW_INSIDE = 'car-inside';
var cameraView = CAMERA_VIEW_OUTSIDE;
var SERVER_ADDRESS = "http://localhost:8000/";

var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

if (havePointerLock) {
    var element = document.body;

    var pointerlockchange = function (event) {
        if (document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element) {
            blocker.style.display = 'none';
        } else {
            blocker.style.display = '-webkit-box';
            blocker.style.display = '-moz-box';
            blocker.style.display = 'box';
            instructions.style.display = '';
        }
    };

    var pointerlockerror = function (event) {
        instructions.style.display = '';
    };

    // Hook pointer lock state change events
    document.addEventListener('pointerlockchange', pointerlockchange, false);
    document.addEventListener('mozpointerlockchange', pointerlockchange, false);
    document.addEventListener('webkitpointerlockchange', pointerlockchange, false);

    document.addEventListener('pointerlockerror', pointerlockerror, false);
    document.addEventListener('mozpointerlockerror', pointerlockerror, false);
    document.addEventListener('webkitpointerlockerror', pointerlockerror, false);

    instructions.addEventListener('click', function (event) {
        instructions.style.display = 'none';

        // Ask the browser to lock the pointer
        element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;

        if (/Firefox/i.test(navigator.userAgent)) {

            var fullscreenchange = function (event) {

                if (document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element) {
                    document.removeEventListener('fullscreenchange', fullscreenchange);
                    document.removeEventListener('mozfullscreenchange', fullscreenchange);
                    element.requestPointerLock();
                }
            };
            document.addEventListener('fullscreenchange', fullscreenchange, false);
            document.addEventListener('mozfullscreenchange', fullscreenchange, false);

            element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;
            element.requestFullscreen();
        } else {
            element.requestPointerLock();
        }
    }, false);
} else {
    instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
}

init(animate);

function init(callback) {

    camera = new THREE.TargetCamera(75, window.innerWidth / window.innerHeight, 1, 1000);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xffffff, 0, 750);

    var light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(1, 1, 1);
    scene.add(light);

    var light = new THREE.DirectionalLight(0xffffff, 0.75);
    light.position.set(-1, -0.5, -1);
    scene.add(light);

    ray = new THREE.Raycaster();
    ray.ray.direction.set(0, -1, 0);

    // floor

    geometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
    geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

    for (var i = 0, l = geometry.vertices.length; i < l; i++) {

        var vertex = geometry.vertices[i];
        vertex.x += Math.random() * 20 - 10;
        vertex.y += Math.random() * 2;
        vertex.z += Math.random() * 20 - 10;

    }

    var floorTexture = new THREE.ImageUtils.loadTexture(SERVER_ADDRESS + "images/grasslight-big.png");
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(10, 10);
    var floorMaterial = new THREE.MeshBasicMaterial({map: floorTexture, side: THREE.DoubleSide});
    var floorGeometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
    var floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -0.5;
    floor.rotation.x = Math.PI / 2;
    scene.add(floor);

    // objects

    geometry = new THREE.BoxGeometry(20, 20, 20);

    for (var i = 0, l = geometry.faces.length; i < l; i++) {

        var face = geometry.faces[i];
        face.vertexColors[0] = new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
        face.vertexColors[1] = new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
        face.vertexColors[2] = new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75);

    }

    for (var i = 0; i < 100; i++) {
        material = new THREE.MeshPhongMaterial({
            specular: 0xffffff,
            shading: THREE.FlatShading,
            vertexColors: THREE.VertexColors
        });

        var mesh = createMesh(geometry, "brick-wall.jpg");
        mesh.position.x = Math.floor(Math.random() * 20 - 10) * 20;
        mesh.position.y = 5;
        mesh.position.z = Math.floor(Math.random() * 20 - 10) * 20;
        scene.add(mesh);

        material.color.setHSL(Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
        objects.push(mesh);
    }
    //

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xffffff);
    renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(renderer.domElement);

    //

    window.addEventListener('resize', onWindowResize, false);


    var carModelUrl = SERVER_ADDRESS + "models/panamera/panamera.js";

    // load ascii model
    var jsonLoader = new THREE.JSONLoader();
    jsonLoader.load(carModelUrl, function (geometry, materials) {

        geometry.computeTangents();
        car = THREE.SceneUtils.createMultiMaterialObject(geometry, materials);
        car.position.set(0, 4.5, -30);
        car.rotation.z = Math.PI;
        car.rotation.x = -Math.PI / 2;

        camera.addTarget({
            name: CAMERA_VIEW_OUTSIDE,
            targetObject: car,
            cameraPosition: new THREE.Vector3(0, 22, 15),
            fixed: false,
            stiffness: 0.1,
            matchRotation: false
        });
        camera.addTarget({
            name: CAMERA_VIEW_INSIDE,
            targetObject: car,
            cameraPosition: new THREE.Vector3(0, 0.2, 0),
            cameraRotation: new THREE.Euler(-1.4, 0, Math.PI),
            fixed: false,
            stiffness: 1,
            matchRotation: true
        });

        camera.setTarget(cameraView);

        scene.add(car);
        scene.add(camera);

        callback();
    });

}

function createMesh(geom, imageFile) {
    var texture = THREE.ImageUtils.loadTexture(SERVER_ADDRESS + "images/" + imageFile);
    var mat = new THREE.MeshPhongMaterial();
    mat.map = texture;
    var mesh = new THREE.Mesh(geom, mat);
    return mesh;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
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
    if (keyboard.pressed("up") && keyboard.pressed("left")) {
        car.rotation.z += delta;
    }
    if (keyboard.pressed("down") && keyboard.pressed("left")) {
        car.rotation.z -= delta;
    }
    if (keyboard.pressed("up") && keyboard.pressed("right")) {
        car.rotation.z -= delta;
    }
    if (keyboard.pressed("down") && keyboard.pressed("right")) {
        car.rotation.z += delta;
    }

    if (keyboard.pressed("c")) {
        cameraView = cameraView == 'car-inside' ? 'car-outside' : 'car-inside';
        camera.setTarget(cameraView);
    }

    camera.update();
    renderer.render(scene, camera);
    time = Date.now();
}
