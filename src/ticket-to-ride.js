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
var vehicle;
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

    Physijs.scripts.worker = SERVER_ADDRESS + '/lib/Physijs/physijs_worker.js';
    Physijs.scripts.ammo = SERVER_ADDRESS + '/lib/ammo.js';

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xffffff);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize, false);

    // camera and scene

    camera = new THREE.TargetCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    scene = new Physijs.Scene();

    scene.setGravity(new THREE.Vector3( 0, -50, 0 ));

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

    var floorTexture = new THREE.ImageUtils.loadTexture(SERVER_ADDRESS + "images/grasslight-big.png");
    var floorMaterial = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({
            map: floorTexture,
            side: THREE.DoubleSide
        }),
        .8, // high friction
        .4 // low restitution
    );
    floorMaterial.map.wrapS = floorMaterial.map.wrapT = THREE.RepeatWrapping;
    floorMaterial.map.repeat.set(10, 10);

    var floorGeometry = new THREE.BoxGeometry(1000, 1000, 10, 10, 10, 1);
    // var floorGeometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);

    // floorGeometry.computeFaceNormals();
    // floorGeometry.computeVertexNormals();

    var floor = new Physijs.BoxMesh(
        floorGeometry,
        floorMaterial,
        0 // mass
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5;
    floor.receiveShadow = true;
    scene.add(floor);


    // objects

    geometry = new THREE.BoxGeometry(20, 20, 20);

    for (var i = 0; i < 100; i++) {
        var mat = Physijs.createMaterial(
            new THREE.MeshLambertMaterial({
                map: THREE.ImageUtils.loadTexture(SERVER_ADDRESS + "images/brick-wall.jpg")
            }),
            .1, // high friction
            .4 // low restitution
        );
        var mesh = new Physijs.BoxMesh(geometry, mat, 100000);

        mesh.position.x = Math.floor(Math.random() * 20 - 10) * 20;
        mesh.position.y = 10;
        mesh.position.z = Math.floor(Math.random() * 20 - 10) * 20;
        mesh.__dirtyRotation = true;
        scene.add(mesh);

        objects.push(mesh);
    }

    var carModelUrl = SERVER_ADDRESS + "models/panamera/panamera.js";

    var onRenderFcts= [];
    var sunAngle = -1/6*Math.PI*2;
    var sunAngle = -3/6*Math.PI*2;
    onRenderFcts.push(function(delta, now){
        var dayDuration	= 10	// nb seconds for a full day cycle
        sunAngle	+= delta/dayDuration * Math.PI*2
    })

    var starField	= new THREEx.DayNight.StarField()
    scene.add(starField.object3d)
    onRenderFcts.push(function(delta, now){
        starField.update(sunAngle)
    })

    var sunSphere	= new THREEx.DayNight.SunSphere()
    scene.add( sunSphere.object3d )
    onRenderFcts.push(function(delta, now){
        sunSphere.update(sunAngle)
    })

    var sunLight	= new THREEx.DayNight.SunLight()
    scene.add( sunLight.object3d )
    onRenderFcts.push(function(delta, now){
        sunLight.update(sunAngle)
    })

    var skydom	= new THREEx.DayNight.Skydom()
    scene.add( skydom.object3d )
    onRenderFcts.push(function(delta, now){
        skydom.update(sunAngle)
    })

    var geometry	= new THREE.TorusKnotGeometry(0.5-0.15, 0.15)
    var material	= new THREE.MeshPhongMaterial({
        shading	: THREE.SmoothShading,
    });
    var mesh	= new THREE.Mesh( geometry, material )
    scene.add( mesh )
    onRenderFcts.push(function(delta){
        mesh.rotateY(delta * Math.PI*2 *0.2)
        mesh.rotateX(delta * Math.PI*2 *0.1)
    })

    onRenderFcts.push(function(){
        renderer.render( scene, camera );
    })

    var lastTimeMsec= null
    requestAnimationFrame(function animate(nowMsec){
        // keep looping
        requestAnimationFrame( animate );
        // measure time
        lastTimeMsec	= lastTimeMsec || nowMsec-1000/60
        var deltaMsec	= Math.min(200, nowMsec - lastTimeMsec)
        lastTimeMsec	= nowMsec
        // call each update function
        onRenderFcts.forEach(function(onRenderFct){
            onRenderFct(deltaMsec/1000, nowMsec/1000)
        })
    })


    // load ascii model
    var jsonLoader = new THREE.JSONLoader();
    jsonLoader.load(carModelUrl, function (car_geometry, car_materials) {

        car_geometry.computeTangents();

        car = new Physijs.BoxMesh(
            car_geometry,
            new THREE.MeshFaceMaterial( car_materials )
        );
        car.position.set(0, 4.5, 250);
        car.rotation.z = Math.PI;
        car.rotation.x = -Math.PI / 2;
        car.__dirtyRotation = true;

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

    car.__dirtyRotation = true;
    car.__dirtyPosition = true;
    camera.update();
    scene.simulate();
    renderer.render(scene, camera);
    time = Date.now();
}
