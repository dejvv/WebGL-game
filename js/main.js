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


    Promise.all([
        loadExternalModel('./assets/Susan.json'),
        loadExternalModel('./assets/horse.json')
    ]).then((models) => {
        setModelsAttributes(models);
        initShaders();
        initBuffers();
        initTextures();
        loadWorld();

        document.onkeydown = handleKeyDown;
        document.onkeyup = handleKeyUp;

        requestAnimationFrame(tick);
    });

    // loadExternalModel()
    //     .then(() => {
    //         initShaders();
    //         initBuffers();
    //         initTextures();
    //         loadWorld();
    //
    //         document.onkeydown = handleKeyDown;
    //         document.onkeyup = handleKeyUp;
    //
    //         requestAnimationFrame(tick);
    //     });

}
// naloži model iz določene poti in vrne Objekt
function loadExternalModel(pot) {
    return new Promise((resolve, reject) => {
        loadJSONResource(pot, function (modelErr, modelObj) {
            if (modelErr) {
                alert('Fatal error getting Susan model (see console)');
                console.error("[JSON model] ", fsErr);
                reject(fsErr);
            } else {
                console.log("[JSON model] successfuly loaded:", modelObj);
                resolve(modelObj);
            }
        });
    })

}

// normalizira tabelo števil na range med maxNew in minNew
function normalizeArray(array, maxNew = 1, minNew = 0){
    let normalized = [];
    let max = Math.max(...array);
    let min = Math.min(...array);
    let c = (maxNew - minNew)/(max - min);

    for(let i = 0; i < array.length; i++){
        normalized.push(c * ((array[i]-max)+max));
    }
    return normalized;
}

function setModelsAttributes(models){
    susanObject = models[0];
    susanVertices = normalizeArray(susanObject.meshes[0].vertices, 1, -1);
    susanIndices = [].concat.apply([], susanObject.meshes[0].faces);
    susanTexCoords = susanObject.meshes[0].texturecoords[0];
    susanNormals = susanObject.meshes[0].normals;

    horseObject = models[1];
    horseVertices = normalizeArray(horseObject.meshes[0].vertices, 1, -1);
    horseIndices = [].concat.apply([], horseObject.meshes[0].faces);
    horseTexCoords = horseObject.meshes[0].texturecoords[0];
    horseNormals = horseObject.meshes[0].normals;

    susanObject = new Model(
        gl,  // gl
        models[0].meshes[0].vertices, // točke
        models[0].meshes[0].normals, // normale
        [].concat.apply([], models[0].meshes[0].faces), // indices
        models[0].meshes[0].texturecoords[0] // textureCoords
    );
}

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.projMatrixUniform, false, projMatrix);
    gl.uniformMatrix4fv(shaderProgram.worldMatrixUniform, false, worldMatrix);
    gl.uniformMatrix4fv(shaderProgram.viewMatrixUniform, false, viewMatrix);
}

function mvPushMatrix() {
    worldMatrixStack.push(mat4.copy(mat4.create(), worldMatrix));
}

function mvPopMatrix() {
    if (worldMatrixStack.length === 0) {
        throw "Invalid popMatrix!";
    }
    worldMatrix = worldMatrixStack.pop();
}

function initTextures() {
    boxTexture = gl.createTexture();
    boxTexture.image = new Image();
    boxTexture.image.onload = function () {
        handleTextureLoaded(boxTexture);
    };
    boxTexture.image.src = "./assets/wall.png";

    groundTexture = gl.createTexture();
    groundTexture.image = new Image();
    groundTexture.image.onload = function () {
        handleTextureLoaded(groundTexture);
    };
    groundTexture.image.src = "./assets/grass.png";

    heheTexture = gl.createTexture();
    heheTexture.image = new Image();
    heheTexture.image.onload = function () {
        handleTextureLoaded(heheTexture);
    };
    heheTexture.image.src = "./assets/test.png";

    susanTexture = gl.createTexture();
    susanTexture.image = new Image();
    susanTexture.image.onload = function () {
        handleTextureLoaded(susanTexture);
    };
    susanTexture.image.src = "./assets/SusanTexture.png";

    horseTexture = gl.createTexture();
    horseTexture.image = new Image();
    horseTexture.image.onload = function () {
        handleTextureLoaded(horseTexture);
    };
    horseTexture.image.src = "./assets/Horse.png";

}

function handleTextureLoaded(texture) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
        gl.UNSIGNED_BYTE,
        texture.image
    );
    gl.bindTexture(gl.TEXTURE_2D, null);
    // when texture loading is finished we can draw scene.
    texturesLoaded++;
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
    };
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
    fragmentShader = createShader("fragmentShader", fragmentShaderText);
    vertexShader = createShader("vertexShader", vertexShaderText);

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

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "vertPosition");
    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "vertTexCoord");
    shaderProgram.normalAttribute = gl.getAttribLocation(shaderProgram, "vertNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
    gl.enableVertexAttribArray(shaderProgram.normalAttribute);


    shaderProgram.projMatrixUniform = gl.getUniformLocation(shaderProgram, "mProj");
    shaderProgram.worldMatrixUniform = gl.getUniformLocation(shaderProgram, "mWorld");
    shaderProgram.viewMatrixUniform = gl.getUniformLocation(shaderProgram, "mView");
    // store location of uSampler variable defined in shader
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "sampler");


    ambientUniformLocation = gl.getUniformLocation(shaderProgram, 'ambientLightIntensity');
    sunlightDirUniformLocation = gl.getUniformLocation(shaderProgram, 'sun.direction');
    sunlightIntUniformLocation = gl.getUniformLocation(shaderProgram, 'sun.color');

    gl.uniform3f(ambientUniformLocation, 0.8, 0.8, 0.8);
    gl.uniform3f(sunlightDirUniformLocation, 3.0, 4.0, -2.0);
    gl.uniform3f(sunlightIntUniformLocation, 0.9, 0.9, 0.9);

}

function initBuffers() {
    // enka
    box1VertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, box1VertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(box1Vertices), gl.STATIC_DRAW);

    box1IndexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, box1IndexBufferObject);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(box1Indices), gl.STATIC_DRAW);

    // dvojka
    box2VertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, box2VertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(box2Vertices), gl.STATIC_DRAW);

    box2IndexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, box2IndexBufferObject);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(box2Indices), gl.STATIC_DRAW);

    // susan
    susanVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, susanVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(susanVertices), gl.STATIC_DRAW);

    susanVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, susanVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(susanTexCoords), gl.STATIC_DRAW);

    susanVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, susanVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(susanIndices), gl.STATIC_DRAW);

    susanVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, susanVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(susanNormals), gl.STATIC_DRAW);

    // horse
    horseVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, horseVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(horseVertices), gl.STATIC_DRAW);

    horseVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, horseVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(horseTexCoords), gl.STATIC_DRAW);

    horseVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, horseVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(horseIndices), gl.STATIC_DRAW);

    horseVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, horseVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(horseNormals), gl.STATIC_DRAW);
}

/**
 * pred vsakim risanje potrebno shraniti view matriko z mvPushMatrix() in jo potem restorati z mvPopMatrix
 */
let angle = 0;
function renderGame(now) {
    // set the rendering environment to full canvas size
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // update fps
    fpsCounter(now);
    // obračanje
    angle = now / 1000 / 6 * 2 * Math.PI;

    mat4.perspective(projMatrix, glMatrix.toRadian(45), gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
    mat4.identity(viewMatrix);
    mat4.identity(worldMatrix);

    // premikanje
    mat4.rotate(viewMatrix, viewMatrix, glMatrix.toRadian(-pitch), [1, 0, 0]);
    mat4.rotate(viewMatrix, viewMatrix, glMatrix.toRadian(-yaw), [0, 1, 0]);
    mat4.translate(viewMatrix, viewMatrix, [-xPosition, -yPosition, -zPosition]);


    // // rišem world
    mvPushMatrix();
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, worldVertexTextureCoordBuffer.itemSize, gl.FLOAT, gl.FALSE, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, worldVertexPositionBuffer.itemSize, gl.FLOAT, gl.FALSE, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, groundTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, worldVertexPositionBuffer.numItems);
    mvPopMatrix();

    // rišem susan
    mvPushMatrix();
    //mat4.translate(world matrika, object.world, pomik);
    mat4.translate(worldMatrix, worldMatrix, [-5, 1, -7.0]);
    mat4.rotateX(worldMatrix, worldMatrix, angle);
    gl.bindBuffer(gl.ARRAY_BUFFER, susanVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, gl.FALSE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
    // gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    gl.bindBuffer(gl.ARRAY_BUFFER, susanVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, 2, gl.FLOAT, gl.FALSE, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    // gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    gl.bindBuffer(gl.ARRAY_BUFFER, susanVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.normalAttribute, 3, gl.FLOAT, gl.TRUE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, susanTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, susanVertexIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, susanIndices.length, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix();

    // Objekten način - dela
    // mvPushMatrix();
    // mat4.translate(worldMatrix, worldMatrix, [-5, 1, -2.0]);
    // susanObject.vertexBuffer();
    // gl.activeTexture(gl.TEXTURE0);
    // gl.bindTexture(gl.TEXTURE_2D, susanTexture);
    // gl.uniform1i(shaderProgram.samplerUniform, 0);
    // setMatrixUniforms();
    // susanObject.draw();
    // mvPopMatrix();

    // // rišem horse
    mvPushMatrix();

    premakniObjekt(horse); // izračun premika
    spremeniSmer(horse); // sprememba smeri
    mat4.translate(worldMatrix, worldMatrix, [horse.positionx, 0.0, horse.positionz]);
    // mat4.rotateY(worldMatrix, worldMatrix, angle);
    gl.bindBuffer(gl.ARRAY_BUFFER, horseVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, gl.FALSE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
    // gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    gl.bindBuffer(gl.ARRAY_BUFFER, horseVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, 2, gl.FLOAT, gl.FALSE, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    // gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    gl.bindBuffer(gl.ARRAY_BUFFER, horseVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.normalAttribute, 3, gl.FLOAT, gl.TRUE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, horseTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, horseVertexIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, horseIndices.length, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix();

    // // rišem 1. kvadrat
    // narišem ga malo levo od mene, gledam v [0,0,0] torej čisto v center
    mvPushMatrix();
    mat4.translate(worldMatrix, worldMatrix, [-1.5, 1.0, -7.0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, box1VertexBufferObject);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, gl.FALSE, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, 2, gl.FLOAT, gl.FALSE, 5 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, boxTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, box1IndexBufferObject);
    setMatrixUniforms(); // čistka matrike
    gl.drawElements(gl.TRIANGLES, box1Indices.length, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix();

    // // rišem 2. kvadrat
    // narišem ga malo desno od mene, gledam v [0,0,0] torej čisto v center
    mvPushMatrix();
    mat4.translate(worldMatrix, worldMatrix, [1.5, 1.0, -7.0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, box2VertexBufferObject);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, gl.FALSE, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, 2, gl.FLOAT, gl.FALSE, 5 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, heheTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, box2IndexBufferObject);
    setMatrixUniforms(); // čistka matrike
    gl.drawElements(gl.TRIANGLES, box2Indices.length, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix();

    steviloIteracij++;
    // // updating matrices
    // setMatrixUniforms();
    //
    // // rišem trikotnik, 0 točk prekosčim, 3 točke narišem
    // gl.drawArrays(gl.TRIANGLES, 0, 3);
    //mvPopMatrix();
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let steviloIteracij = 0;

let hx = randomIntFromInterval(-15, 15);
let hz = randomIntFromInterval(-15, 15);

let horse = new Direction(hx, hz, 0, 0);
// objekto spremeni smer
function spremeniSmer(object){
    if(steviloIteracij % 120 === 0){
        object.speedx = randomIntFromInterval(-5, 5) / 100;
        object.speedz = randomIntFromInterval(-5, 5) / 100;
    }
}
// premakni objekt
function premakniObjekt(object){
    if (object.positionx > 17 ||  object.positionx < -17){
        object.speedx *= -1;
    }
    if (object.positionz > 17 ||  object.positionz < -17){
        object.speedz *= -1;
    }
    object.positionx += object.speedx;
    object.positionz += object.speedz;
}

function randomIntFromInterval(min,max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 *Funkcija glede na čas izračuna premikanje
 */
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
    if (texturesLoaded === 5) { // only draw scene and animate when textures are loaded.
        animate();
        handleKeys();
        renderGame(time);
    }
    else {
        console.log("Textures loading, loaded:", texturesLoaded);
    }
    requestAnimationFrame(tick);

}

function fpsCounter(now) {
    now *= 0.001;                          // convert to seconds
    const deltaTime = now - then;          // compute time since last frame
    then = now;                            // remember time for next frame
    const fps = 1 / deltaTime;             // compute frames per second
    fpsElem.textContent = fps.toFixed(1);  // update fps display
    // add the current fps and remove the oldest fps
    totalFPS += fps - (frameTimes[frameCursor] || 0);
    // record the newest fps
    frameTimes[frameCursor++] = fps;
    // needed so the first N frames, before we have maxFrames, is correct.
    numFrames = Math.max(numFrames, frameCursor);
    // wrap the cursor
    frameCursor %= maxFrames;
    const averageFPS = totalFPS / numFrames;
    avgElem.textContent = averageFPS.toFixed(1);  // update avg display
}

let i = 0;
// spremenljivke
let vertexShader; // vertex shader
let fragmentShader; // fragment shader
let shaderProgram; // shader program
let canvas; // canvas
let gl; // webgl content

// Buffers
let worldVertexPositionBuffer = null;
let worldVertexTextureCoordBuffer = null;
let box1VertexBufferObject;
let box1IndexBufferObject;
let box2VertexBufferObject;
let box2IndexBufferObject;

let susanVertexPositionBuffer;
let susanVertexTextureCoordBuffer;
let susanVertexIndexBuffer;
let susanVertexNormalBuffer;
let susanObject;
let susanVertices;
let susanIndices;
let susanTexCoords;
let susanNormals;

let horseVertexPositionBuffer;
let horseVertexTextureCoordBuffer;
let horseVertexIndexBuffer;
let horseVertexNormalBuffer;
let horseObject;
let horseVertices;
let horseIndices;
let horseTexCoords;
let horseNormals;

// matrike
let worldMatrix = mat4.create(); // matrika sveta
let projMatrix = mat4.create(); // projekcijska matrika
let viewMatrix = mat4.create(); // matrika pogleda
let worldMatrixStack = [];

// kot obračanja, spremenljivke za računanje
let lastTime = 0;
let timeNow;

// lightning
let ambientUniformLocation;
let sunlightDirUniformLocation;
let sunlightIntUniformLocation;

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
let boxTexture;
let groundTexture;
let heheTexture;
let susanTexture;
let horseTexture;

// Variable that stores  loading state of textures.
let texturesLoaded = 0;

// Keyboard handling helper variable for reading the status of keys
let currentlyPressedKeys = {};

// fps counter
const fpsElem = document.querySelector("#fps");
const avgElem = document.querySelector("#avg");

const frameTimes = [];
let   frameCursor = 0;
let   numFrames = 0;
const maxFrames = 20;
let   totalFPS = 0;

let then = 0;

const vertexShaderText = [
    'precision mediump float;',
    '',
    'attribute vec3 vertPosition;',
    'attribute vec2 vertTexCoord;',
    'attribute vec3 vertNormal;',
    'varying vec2 fragTexCoord;',
    'varying vec3 fragNormal;',
    'uniform mat4 mWorld;',
    'uniform mat4 mView;',
    'uniform mat4 mProj;',
    '',
    'void main()',
    '{',
    '  fragTexCoord = vertTexCoord;',
    '  fragNormal = (mWorld * vec4(vertNormal, 0.0)).xyz;',
    '  gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);',
    '}'
].join('\n');

const fragmentShaderText = [
    'precision mediump float;',
    '',
    'struct DirectionalLight',
    '{',
    ' vec3 direction;',
    ' vec3 color;',
    '};',
    '',
    'varying vec2 fragTexCoord;',
    'varying vec3 fragNormal;',
    '',
    'uniform vec3 ambientLightIntensity;',
    'uniform DirectionalLight sun;',
    'uniform sampler2D sampler;',
    '',
    'void main()',
    '{',
    'vec3 surfaceNormal = normalize(fragNormal);',
    'vec3 normSunDir = normalize(sun.direction);',
    'vec4 texel = texture2D(sampler, fragTexCoord);',
    '',
    'vec3 lightIntensity = ambientLightIntensity +',
    'sun.color * max(dot(fragNormal, normSunDir), 0.0);',
    '',
    'gl_FragColor = vec4(texel.rgb * lightIntensity, texel.a);',
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
// handleKeys
//
// Called every time before redeawing the screen for keyboard
// input handling. Function continuisly updates helper variables.
//
function handleKeys() {
    if (currentlyPressedKeys[78]) {
        // M
        pitchRate = 0.08;
    } else if (currentlyPressedKeys[77]) {
        // N
        pitchRate = -0.08;
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
        if (checkPos()) {
            speed = 0.003;
        }
    } else if (currentlyPressedKeys[40] || currentlyPressedKeys[83]) {
        // Down cursor key
        if (checkPos()) {
            speed = -0.003;
        }
    } else {
        speed = 0;
    }

    if (currentlyPressedKeys[70]){
        /*

        TU BO ZA SPAWN IN PREMIK BURGERJA
         */
    }
}

function checkPos() {
    if (xPosition > 17){
        xPosition = xPosition-0.25;
        return false;
    }
    else if(xPosition < -17){
        xPosition = xPosition+0.25;
        return false;
    }
    else if (zPosition > 17){
        zPosition = zPosition-0.25;
        return false;
    }
    else if (zPosition < -17){
        zPosition = zPosition+0.25;
        return false;
    }else{
        return true;
    }
}

//
// Create buffer
//
var box1Vertices =
    [ // X, Y, Z           U, V
        // Top
        -1.0, 1.0, -1.0, 0, 0,
        -1.0, 1.0, 1.0, 0, 1,
        1.0, 1.0, 1.0, 1, 1,
        1.0, 1.0, -1.0, 1, 0,

        // Left
        -1.0, 1.0, 1.0, 0, 0,
        -1.0, -1.0, 1.0, 1, 0,
        -1.0, -1.0, -1.0, 1, 1,
        -1.0, 1.0, -1.0, 0, 1,

        // Right
        1.0, 1.0, 1.0, 1, 1,
        1.0, -1.0, 1.0, 0, 1,
        1.0, -1.0, -1.0, 0, 0,
        1.0, 1.0, -1.0, 1, 0,

        // Front
        1.0, 1.0, 1.0, 1, 1,
        1.0, -1.0, 1.0, 1, 0,
        -1.0, -1.0, 1.0, 0, 0,
        -1.0, 1.0, 1.0, 0, 1,

        // Back
        1.0, 1.0, -1.0, 0, 0,
        1.0, -1.0, -1.0, 0, 1,
        -1.0, -1.0, -1.0, 1, 1,
        -1.0, 1.0, -1.0, 1, 0,

        // Bottom
        -1.0, -1.0, -1.0, 1, 1,
        -1.0, -1.0, 1.0, 1, 0,
        1.0, -1.0, 1.0, 0, 0,
        1.0, -1.0, -1.0, 0, 1,
    ];

var box1Indices =
    [
        // Top
        0, 1, 2,
        0, 2, 3,

        // Left
        5, 4, 6,
        6, 4, 7,

        // Right
        8, 9, 10,
        8, 10, 11,

        // Front
        13, 12, 14,
        15, 14, 12,

        // Back
        16, 17, 18,
        16, 18, 19,

        // Bottom
        21, 20, 22,
        22, 20, 23
    ];

var box2Vertices =
    [ // X, Y, Z           U, V
        // Top
        -1.0, 1.0, -1.0, 0, 0,
        -1.0, 1.0, 1.0, 0, 1,
        1.0, 1.0, 1.0, 1, 1,
        1.0, 1.0, -1.0, 1, 0,

        // Left
        -1.0, 1.0, 1.0, 0, 0,
        -1.0, -1.0, 1.0, 1, 0,
        -1.0, -1.0, -1.0, 1, 1,
        -1.0, 1.0, -1.0, 0, 1,

        // Right
        1.0, 1.0, 1.0, 1, 1,
        1.0, -1.0, 1.0, 0, 1,
        1.0, -1.0, -1.0, 0, 0,
        1.0, 1.0, -1.0, 1, 0,

        // Front
        1.0, 1.0, 1.0, 1, 1,
        1.0, -1.0, 1.0, 1, 0,
        -1.0, -1.0, 1.0, 0, 0,
        -1.0, 1.0, 1.0, 0, 1,

        // Back
        1.0, 1.0, -1.0, 0, 0,
        1.0, -1.0, -1.0, 0, 1,
        -1.0, -1.0, -1.0, 1, 1,
        -1.0, 1.0, -1.0, 1, 0,

        // Bottom
        -1.0, -1.0, -1.0, 1, 1,
        -1.0, -1.0, 1.0, 1, 0,
        1.0, -1.0, 1.0, 0, 0,
        1.0, -1.0, -1.0, 0, 1,
    ];

var box2Indices =
    [
        // Top
        0, 1, 2,
        0, 2, 3,

        // Left
        5, 4, 6,
        6, 4, 7,

        // Right
        8, 9, 10,
        8, 10, 11,

        // Front
        13, 12, 14,
        15, 14, 12,

        // Back
        16, 17, 18,
        16, 18, 19,

        // Bottom
        21, 20, 22,
        22, 20, 23
    ];

/*
TODO:
-da se krava premika sama,
-da ji lahko vržeš hrano, ki jo pobere
-ostalo je bonus
 * glej render za vse objekte, shawmaping od 492. vrstice naprej
 * glej Models objekt, ki bo definicija za vse model(300. vrstica)
 */
