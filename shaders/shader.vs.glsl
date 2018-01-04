precision mediump float;

attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;
varying vec2 vTextureCoord;
uniform mat4 mView;
uniform mat4 mProj;

void main()
{
vTextureCoord = aTextureCoord;
gl_Position = mProj * mView * vec4(vertPosition, 1.0);
}
