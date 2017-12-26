function start(){
    console.log("It works!");

    let canvas = document.getElementById("game-surface");
    let gl = initGl(canvas);

    // nimam gl, torej nebom nič delal
    if(!gl)
        return;

    // pocisti platno, v clear dodam katere buffere počistim(za barvo in globino)
    gl.clearColor(1.0, 0.89, 0.35, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // vključim globino, vse vrednosti manjše ali enaki se zapišejo v pomnilnik(torej tiste, ki so bližje)
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    createShader(gl, "vertexShader", vertexShaderText);
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

function createShader(gl, shaderType, shaderText){
    let shader = null;

    if(shaderType = "vertexShader") shader = gl.createShader(gl.VERTEX_SHADER);
    else if(shaderType = "fragmentShader") shader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(shader, shaderText); // shaderju dodam njegovo vsebino
    gl.compileShader(shader);

    // pogledam za napake
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("ERROR pri prevajanju shaderja,", gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

let vertexShaderText = [
    'precision mediump float;',
    '',
    'attribute vec2 vertPosition;',
    '',
    'void(main)',
    '{',
    ' gl_Position = vec4(vertPosition, 0.0, 1.0);',
    '}'
].join('\n');

let vertexShaderText =
    [
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
