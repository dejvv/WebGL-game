// Gradnja modela
class Model {
    constructor(gl, vertices, normals, indices, texture){
        this.vertices = vertices; // točke
        this.normals = normals; // normale
        this.indices = indices; // povezave med točkami -> tvorijo trikotnik
        this.texture = texture; // za texture

        this.vbo = gl.createBuffer(); // vertex buffer
        this.ibo = gl.createBuffer(); // indices buffer
        this.nbo = gl.createBuffer(); // normals buffer
        this.tbo = gl.createBuffer(); // texture buffer

        this.nPoints = indices.length; // stevilo tock
        this.world = mat4.create();

        this.hehe();
    }
    hehe() {
        // vertex
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

        // normal
        gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);

        // index
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

        // texture
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.texture), gl.STATIC_DRAW);

        // prazno, da za naslednjega ni noben bindan
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    vertexBuffer() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, gl.FALSE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
        // gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.tbo);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, 2, gl.FLOAT, gl.FALSE, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
        // gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo);
        gl.vertexAttribPointer(shaderProgram.normalAttribute, 3, gl.FLOAT, gl.TRUE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
    }

    draw(){
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vbo);
        gl.drawElements(gl.TRIANGLES, this.nPoints, gl.UNSIGNED_SHORT, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
}


// Struktura za hitrost
class Direction{
    constructor(positionx, positionz, speedx = 0.05, speedz = 0.05){
        this.positionx = positionx;
        this.positionz = positionz;
        this.speedx = speedx;
        this.speedz = speedz;

        this.radius = 1; // gledam na vse objekte kot da so krog
    }

    // metoda pogleda, ali se točka(x,z) dotika objekta
    hitted(x, z) {
        const razdalja = (x - this.positionx) * (x - this.positionx) + (z - this.positionz) * (z - this.positionz);
        if(razdalja <= this.radius * this.radius)
            return {
                x: this.x,
                z: this.z
            };
        return false;
    }
}
