function start(){
    canvas = document.getElementById("game-surface");
    gl = initGl(canvas);

    // nimam gl, torej nebom nič delal
    if(!gl)
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
    initBuffers();

    // Set up to draw the scene periodically every 15ms.
    // Set up to draw the scene periodically.
    // setInterval(function() {
    //     // requestAnimationFrame(animate);
    //     renderGame();
    // }, 15);

    // requestAnimationFrame(renderGame);
    // renderGame();
    tick();
}

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.projMatrixUniform, false, projMatrix);
    gl.uniformMatrix4fv(shaderProgram.worldMatrixUniform, false, worldMatrix);
    gl.uniformMatrix4fv(shaderProgram.viewMatrixUniform, false, viewMatrix);

}

function initGl(canvas){
    let gl = null;
    gl = canvas.getContext("webgl");
    // Explorer, edge, safari
    if (!gl) {
        console.log("WebGl not supported, using experminetal-webgl");
        gl = canvas.getContext("experimental-webgl");
    }
    if(!gl)
        alert("Vaš brskalnik ne podpira webgl");
    else{
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    }
    return gl;
}

// gl - webgl context
// shaderType - kakšen shader funkcija vrne
// shaderText - body shaderja, njegova vsebina
function createShader(shaderType, shaderText){
    let shader = null;

    // kakšen shader ustvarim in vrnem
    if(shaderType === "vertexShader") shader = gl.createShader(gl.VERTEX_SHADER);
    else if(shaderType === "fragmentShader") shader = gl.createShader(gl.FRAGMENT_SHADER);

    // shaderju dodam njegovo vsebino in ga prevedem
    gl.shaderSource(shader, shaderText);
    gl.compileShader(shader);

    // pogledam za napake
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("ERROR pri prevajanju " + (shaderType === "vertexShader" ? "vertexShader," : "fragmentShader,"), gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function initShaders() {
    fragmentShader = createShader("fragmentShader", fragmentShaderText);
    vertexShader = createShader("vertexShader", vertexShaderText);

    // naredim program
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // preverim za napake
    if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)){
        alert("Napaka pri prevajanju shader programa");
    }

    // validation
    gl.validateProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.VALIDATE_STATUS)) {
        console.error('ERROR validating program!', gl.getProgramInfoLog(shaderProgram));
    }

    gl.useProgram(shaderProgram);

    shaderProgram.projMatrixUniform = gl.getUniformLocation(shaderProgram, "mProj");
    shaderProgram.worldMatrixUniform = gl.getUniformLocation(shaderProgram, "mWorld");
    shaderProgram.viewMatrixUniform = gl.getUniformLocation(shaderProgram, "mView");

}

function initBuffers() {
    // buffers are chunk of memory
    // uporablja vedno zadnji ustvarjeni buffer
    // javascript uporablja 64 bitne float numbers, webgl rabi 32 bitna stevila

    let triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);

    // kje se nahaja v shaderju attribut, njegova lokacija
    let positionAttribLocation = gl.getAttribLocation(shaderProgram, "vertPosition");
    let colorAttribLocation = gl.getAttribLocation(shaderProgram, "vertColor");

    gl.vertexAttribPointer(
        positionAttribLocation, // lokacija tega atributa
        3, // stevilo elementov na atribut
        gl.FLOAT, // tip podatkov
        gl.FALSE, // ali so podatki normalizirani
        6 * Float32Array.BYTES_PER_ELEMENT,// velikost posamezne tocke
        0 // "offset", torej ali imam še kakšne podatke v tem arrayu, za koliko se naj odmaknem, da najdem prave
    );

    gl.vertexAttribPointer(
        colorAttribLocation, // lokacija tega atributa
        3, // stevilo elementov na atribut
        gl.FLOAT, // tip podatkov
        gl.FALSE, // ali so podatki normalizirani
        6 * Float32Array.BYTES_PER_ELEMENT,// velikost posamezne tocke
        3 * Float32Array.BYTES_PER_ELEMENT// "offset", torej ali imam še kakšne podatke v tem arrayu, za koliko se naj odmaknem, da najdem prave
    );

    gl.enableVertexAttribArray(positionAttribLocation);
    gl.enableVertexAttribArray(colorAttribLocation);
}

function renderGame() {
    // set the rendering environment to full canvas size
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    mat4.identity(worldMatrix);
    mat4.lookAt(viewMatrix, [0, 0, -2], [0, 0, 0], [0, 1, 0]);
    // Establish the perspective with which we want to view the
    // scene. Our field of view is 45 degrees, with a width/height
    // ratio and we only want to see objects between 0.1 units
    // and 1000 units away from the camera.
    mat4.perspective(projMatrix, glMatrix.toRadian(45), gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0);

    setMatrixUniforms();
    // rišem trikotnik, 0 točk prekosčim, 3 točke narišem
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    i++;
    console.log(i);
}

function animate() {
    timeNow = new Date().getTime();
    if (lastTime !== 0) {
        angle += (90 * timeNow - lastTime) / 1000.0;
    }
    lastTime = timeNow;
}

// Samo za animacijo
function tick(){
    requestAnimationFrame(tick);
    renderGame();
    animate();
}

let i = 0;
// spremenljivke
let vertexShader; // vertex shader
let fragmentShader; // fragment shader
let shaderProgram; // shader program
let canvas; // canvas
let gl; // webgl content

// matrike
let worldMatrix = mat4.create(); // matrika sveta
let projMatrix = mat4.create(); // projekcijska matrika
let viewMatrix = mat4.create(); // matrika pogleda

// kot obračanja, spremenljivke za računanje
let angle = 0;
let lastTime = 0;
let timeNow;

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
      0.0,  0.5, 0.0,   1.0, 0.8, 0.3,
     -0.5, -0.5, 0.0,   0.7, 0.0, 1.0,
      0.5, -0.5, 0.0,   0.8, 1.0, 0.7
];
