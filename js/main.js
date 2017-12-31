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
    //setInterval(renderGame, 15);
    renderGame();
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
    gl.vertexAttribPointer(
        positionAttribLocation, // lokacija tega atributa
        2, // stevilo elementov na atribut
        gl.FLOAT, // tip podatkov
        gl.FALSE, // ali so podatki normalizirani
        2 * Float32Array.BYTES_PER_ELEMENT,// velikost posamezne tocke
        0 // "offset", torej ali imam še kakšne podatke v tem arrayu, za koliko se naj odmaknem, da najdem prave
    );

    gl.enableVertexAttribArray(positionAttribLocation);
}

function renderGame() {
    // rišem trikotnik, 0 točk prekosčim, 3 točke narišem
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// spremenljivke
let vertexShader; // vertex shader
let fragmentShader; // fragment shader
let shaderProgram; // shader program
let canvas; // canvas
let gl; // webgl conten

const vertexShaderText = [
    'precision mediump float;',
    '',
    'attribute vec2 vertPosition;',
    '',
    'void main()',
    '{',
    '  gl_Position = vec4(vertPosition, 0.0, 1.0);',
    '}'
].join('\n');

const fragmentShaderText = [
    'precision mediump float;',
    '',
    'void main()',
    '{',
    '  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);',
    '}'
].join('\n');
//    '  gl_FragColor = vec4(fragColor, 1.0);',


let triangleVertices = [
      // X,    Y,      R,   G,   B
        0.0,  0.5,
       -0.5, -0.5,
        0.5, -0.5,
];
