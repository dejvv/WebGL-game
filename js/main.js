function start() {
    canvas = document.getElementById("game-surface");
    gl = initGl(canvas);

    // nimam gl, torej nebom nič delal
    if (!gl)
        return;

    console.log("It works! WebGl successfully loaded.");

    // pocisti platno, v clear dodam katere buffere počistim(za barvo in globino)
    gl.clearColor(1.0, 0.89, 0.35, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // vključim globino, vse vrednosti manjše ali enaki se zapišejo v pomnilnik(torej tiste, ki so bližje)
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);


    // Initialize the shaders; this is where all the lighting for the
    // vertices and so forth is established.
    initShaders();

    // Here's where we call the routine that builds all the objects
    // we'll be drawing.
    initTextures();
    loadWorld();

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    requestAnimationFrame(tick);
    // Set up to draw the scene periodically.
    // setInterval(function() {
    //     if (texturesLoaded) { // only draw scene and animate when textures are loaded.
    //         requestAnimationFrame(animate);
    //         handleKeys();
    //         renderGame();
    //     }
    // }, 15);
}

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.projMatrixUniform, false, projMatrix);
    // gl.uniformMatrix4fv(shaderProgram.worldMatrixUniform, false, worldMatrix);
    gl.uniformMatrix4fv(shaderProgram.viewMatrixUniform, false, viewMatrix);

}

function mvPushMatrix() {
    let copy = mat4.create();
    mat4.set(viewMatrix, copy);
    viewMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (viewMatrixStack.length === 0) {
        throw "Invalid popMatrix!";
    }
    viewMatrix = viewMatrixStack.pop();
}

function initTextures() {
    wallTexture = gl.createTexture();
    wallTexture.image = new Image();
    wallTexture.image.onload = function () {
        handleTextureLoaded(wallTexture)
    }
    wallTexture.image.src = "./assets/wall.png";
}

function handleTextureLoaded(texture) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Third texture usus Linear interpolation approximation with nearest Mipmap selection
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindTexture(gl.TEXTURE_2D, null);

    // when texture loading is finished we can draw scene.
    texturesLoaded = true;
}

function handleLoadedWorld(data) {
    var lines = data.split("\n");
    var vertexCount = 0;
    var vertexPositions = [];
    var vertexTextureCoords = [];
    for (var i in lines) {
        var vals = lines[i].replace(/^\s+/, "").split(/\s+/);
        if (vals.length == 5 && vals[0] != "//") {
            // It is a line describing a vertex; get X, Y and Z first
            vertexPositions.push(parseFloat(vals[0]));
            vertexPositions.push(parseFloat(vals[1]));
            vertexPositions.push(parseFloat(vals[2]));

            // And then the texture coords
            vertexTextureCoords.push(parseFloat(vals[3]));
            vertexTextureCoords.push(parseFloat(vals[4]));

            vertexCount += 1;
        }
    }

    worldVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
    worldVertexPositionBuffer.itemSize = 3;
    worldVertexPositionBuffer.numItems = vertexCount;

    worldVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexTextureCoords), gl.STATIC_DRAW);
    worldVertexTextureCoordBuffer.itemSize = 2;
    worldVertexTextureCoordBuffer.numItems = vertexCount;
}

function loadWorld() {
    var request = new XMLHttpRequest();
    request.open("GET", "./assets/world.txt");
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            handleLoadedWorld(request.responseText);
        }
    }
    request.send();
}

function initGl(canvas) {
    let gl = null;
    gl = canvas.getContext("webgl");
    // Explorer, edge, safari
    if (!gl) {
        console.log("WebGl not supported, using experminetal-webgl");
        gl = canvas.getContext("experimental-webgl");
    }
    if (!gl)
        alert("Vaš brskalnik ne podpira webgl");
    else {
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    }
    return gl;
}

// gl - webgl context
// shaderType - kakšen shader funkcija vrne
// shaderText - body shaderja, njegova vsebina
function createShader(shaderType, shaderText) {
    let shader = null;

    // kakšen shader ustvarim in vrnem
    if (shaderType === "vertexShader") shader = gl.createShader(gl.VERTEX_SHADER);
    else if (shaderType === "fragmentShader") shader = gl.createShader(gl.FRAGMENT_SHADER);

    // shaderju dodam njegovo vsebino in ga prevedem
    gl.shaderSource(shader, shaderText);
    gl.compileShader(shader);

    // pogledam za napake
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("ERROR pri prevajanju " + (shaderType === "vertexShader" ? "vertexShader," : "fragmentShader,"), gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function initShaders() {
    fragmentShader = createShader("fragmentShader", fragmentShaderDoom);
    vertexShader = createShader("vertexShader", vertexShaderDoom);

    // naredim program
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // preverim za napake
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Napaka pri prevajanju shader programa");
    }

    // validation
    gl.validateProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.VALIDATE_STATUS)) {
        console.error('ERROR validating program!', gl.getProgramInfoLog(shaderProgram));
    }

    gl.useProgram(shaderProgram);
    // kje se nahaja v shaderju attribut, njegova lokacija

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);


    shaderProgram.projMatrixUniform = gl.getUniformLocation(shaderProgram, "mProj");
    // shaderProgram.worldMatrixUniform = gl.getUniformLocation(shaderProgram, "mWorld");
    shaderProgram.viewMatrixUniform = gl.getUniformLocation(shaderProgram, "mView");
    // store location of uSampler variable defined in shader
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");

}

function initBuffers() {
    // buffers are chunk of memory
    // uporablja vedno zadnji ustvarjeni buffer
    // javascript uporablja 64 bitne float numbers, webgl rabi 32 bitna stevila

    let triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);


    gl.vertexAttribPointer(
        shaderProgram.positionAttribLocation, // lokacija tega atributa
        3, // stevilo elementov na atribut
        gl.FLOAT, // tip podatkov
        gl.FALSE, // ali so podatki normalizirani
        6 * Float32Array.BYTES_PER_ELEMENT,// velikost posamezne tocke
        0 // "offset", torej ali imam še kakšne podatke v tem arrayu, za koliko se naj odmaknem, da najdem prave
    );

    gl.vertexAttribPointer(
        shaderProgram.colorAttribLocation, // lokacija tega atributa
        3, // stevilo elementov na atribut
        gl.FLOAT, // tip podatkov
        gl.FALSE, // ali so podatki normalizirani
        6 * Float32Array.BYTES_PER_ELEMENT,// velikost posamezne tocke
        3 * Float32Array.BYTES_PER_ELEMENT// "offset", torej ali imam še kakšne podatke v tem arrayu, za koliko se naj odmaknem, da najdem prave
    );


}

function renderGame() {
    // set the rendering environment to full canvas size
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (worldVertexTextureCoordBuffer == null || worldVertexPositionBuffer == null) {
        return;
    }
    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    // mvPushMatrix();

    // mat4.lookAt(viewMatrix, [0, 0, -5], [0, 0, 0], [0, 1, 0]);
    // Establish the perspective with which we want to view the
    // scene. Our field of view is 45 degrees, with a width/height
    // ratio and we only want to see objects between 0.1 units
    // and 1000 units away from the camera.
    mat4.perspective(projMatrix, glMatrix.toRadian(45), gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
    mat4.identity(viewMatrix);

    mat4.rotate(viewMatrix, viewMatrix, glMatrix.toRadian(-pitch), [1, 0, 0]);
    mat4.rotate(viewMatrix, viewMatrix, glMatrix.toRadian(-yaw), [0, 1, 0]);
    mat4.translate(viewMatrix, viewMatrix, [-xPosition, -yPosition, -zPosition]);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, wallTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, worldVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, worldVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, worldVertexPositionBuffer.numItems);

    // // updating matrices
    // setMatrixUniforms();
    //
    // // rišem trikotnik, 0 točk prekosčim, 3 točke narišem
    // gl.drawArrays(gl.TRIANGLES, 0, 3);
    // mvPopMatrix();

    i++;
    console.log(i);
}

// function animate() {
//     timeNow = new Date().getTime();
//     if (lastTime !== 0) {
//         angle += (Math.PI * (timeNow - lastTime) * 2) / 1000.0 / 6;
//     }
//     lastTime = timeNow;
// }

// function animate(time) {
//     time /= 1000;
//     if (speed != 0) {
//         xPosition -= Math.sin(glMatrix.toRadian(yaw)) * speed * time;
//         zPosition -= Math.cos(glMatrix.toRadian(yaw)) * speed * time;
//
//         joggingAngle += time * 0.6; // 0.6 "fiddle factor" - makes it feel more realistic :-)
//         yPosition = Math.sin(glMatrix.toRadian(joggingAngle)) / 20 + 0.4
//     }
//     yaw += yawRate * time;
//     pitch += pitchRate * time;
//
// }

function animate() {
    timeNow = new Date().getTime();
    if (lastTime != 0) {
        let elapsed = (timeNow - lastTime);

        if (speed != 0) {
            xPosition -= Math.sin(glMatrix.toRadian(yaw)) * speed * elapsed;
            zPosition -= Math.cos(glMatrix.toRadian(yaw)) * speed * elapsed;

            joggingAngle += elapsed * 0.6; // 0.6 "fiddle factor" - makes it feel more realistic :-)
            yPosition = Math.sin(glMatrix.toRadian(joggingAngle)) / 20 + 0.4
        }

        yaw += yawRate * elapsed;
        pitch += pitchRate * elapsed;

    }
    lastTime = timeNow;
}

// Samo za animacijo
function tick(time) {
    if (texturesLoaded) { // only draw scene and animate when textures are loaded.
        animate(time);
        handleKeys();
        renderGame();
    }
    requestAnimationFrame(tick);

}

let i = 0;
// spremenljivke
let vertexShader; // vertex shader
let fragmentShader; // fragment shader
let shaderProgram; // shader program
let canvas; // canvas
let gl; // webgl content

// Buffers
var worldVertexPositionBuffer = null;
var worldVertexTextureCoordBuffer = null;

// matrike
let worldMatrix = mat4.create(); // matrika sveta
let projMatrix = mat4.create(); // projekcijska matrika
let viewMatrix = mat4.create(); // matrika pogleda
let viewMatrixStack = [];

// kot obračanja, spremenljivke za računanje
let angle = 0;
let lastTime = 0;
let timeNow;

// jogging
let joggingAngle = 0;

// Variables for storing current position and speed
let pitch = 0;
let pitchRate = 0;
let yaw = 0;
let yawRate = 0;
let xPosition = 0;
let yPosition = 0.4;
let zPosition = 0;
let speed = 0;

// Variables for storing textures
let wallTexture;

// Variable that stores  loading state of textures.
let texturesLoaded = false;

// Keyboard handling helper variable for reading the status of keys
let currentlyPressedKeys = {};

const vertexShaderText = [
    'precision mediump float;',
    '',
    'attribute vec3 vertPosition;',
    'attribute vec3 vertColor;',
    'varying vec3 fragColor;',
    'uniform mat4 mWorld;',
    'uniform mat4 mView;',
    'uniform mat4 mProj;',
    '',
    'void main()',
    '{',
    '  fragColor = vertColor;',
    '  gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);',
    '}'
].join('\n');

const fragmentShaderText = [
    'precision mediump float;',
    '',
    'varying vec3 fragColor;',
    'void main()',
    '{',
    '  gl_FragColor = vec4(fragColor, 1.0);',
    '}'
].join('\n');

let triangleVertices = [
    // X,    Y,   Z,     R,   G,   B
    0.0, 0.5, 0.0, 1.0, 0.8, 0.3,
    -0.5, -0.5, 0.0, 0.7, 0.0, 1.0,
    0.5, -0.5, 0.0, 0.8, 1.0, 0.7
];

const vertexShaderDoom = [
    'precision mediump float;',
    '',
    'attribute vec3 aVertexPosition;',
    'attribute vec2 aTextureCoord;',
    '',
    'uniform mat4 mView;',
    'uniform mat4 mProj;',

    // variable for passing texture coordinates
    // from vertex shader to fragment shader
    'varying vec2 vTextureCoord;',

    'void main(void) {',
    'gl_Position = mProj * mView * vec4(aVertexPosition, 1.0);',
    'vTextureCoord = aTextureCoord;',
    '}'
].join('\n');

const fragmentShaderDoom = [
    'precision mediump float;',
    '',
    // uniform attribute for setting texture coordinates
    'varying vec2 vTextureCoord;',
    // uniform attribute for setting 2D sampler
    'uniform sampler2D uSampler;',
    '',
    'void main(void) {',
    // sample the fragment color from texture
    ' gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));',
    '}'
].join('\n');

//
// Keyboard handling helper functions
//
// handleKeyDown    ... called on keyDown event
// handleKeyUp      ... called on keyUp event
//
function handleKeyDown(event) {
    // storing the pressed state for individual key
    currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
    // reseting the pressed state for individual key
    currentlyPressedKeys[event.keyCode] = false;
}

//
// Keyboard handling helper functions
//
// handleKeyDown    ... called on keyDown event
// handleKeyUp      ... called on keyUp event
//
function handleKeyDown(event) {
    // storing the pressed state for individual key
    currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
    // reseting the pressed state for individual key
    currentlyPressedKeys[event.keyCode] = false;
}

//
// handleKeys
//
// Called every time before redeawing the screen for keyboard
// input handling. Function continuisly updates helper variables.
//
function handleKeys() {
    if (currentlyPressedKeys[33]) {
        // Page Up
        pitchRate = 0.1;
    } else if (currentlyPressedKeys[34]) {
        // Page Down
        pitchRate = -0.1;
    } else {
        pitchRate = 0;
    }

    if (currentlyPressedKeys[37] || currentlyPressedKeys[65]) {
        // Left cursor key or A
        yawRate = 0.1;
    } else if (currentlyPressedKeys[39] || currentlyPressedKeys[68]) {
        // Right cursor key or D
        yawRate = -0.1;
    } else {
        yawRate = 0;
    }

    if (currentlyPressedKeys[38] || currentlyPressedKeys[87]) {
        // Up cursor key or W
        speed = 0.003;
    } else if (currentlyPressedKeys[40] || currentlyPressedKeys[83]) {
        // Down cursor key
        speed = -0.003;
    } else {
        speed = 0;
    }
}
