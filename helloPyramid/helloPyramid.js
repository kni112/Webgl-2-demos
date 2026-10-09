import {WebGLCanvas} from '../base/helpers/WebGLCanvas.js';
import {WebGLShader} from '../base/helpers/WebGLShader.js';
import {Camera} from '../base/helpers/Camera.js';
import {Stack} from '../base/helpers/Stack.js';
import {ImageLoader} from '../base/helpers/ImageLoader.js';

/**
 * Et WebGL-program med to shaderpar som tegner en scene
 * Bruker en egen Camera-klasse som håndterer view, viewmodel og
 * projection-matrisene.
 */
export function main() {
	// Oppretter et webGLCanvas for WebGL-tegning:
	const webGLCanvas = new WebGLCanvas('myCanvas', document.body, 960, 640);

	// Starter med å laste teksturer:
	let imageLoader = new ImageLoader();
	let textureUrls = [
		'../base/textures/pyramidetekstur.png',
		'../base/textures/chess_pattern.png', 
		'../base/textures/chess_pattern_green_background.png' 
		];
	console.log(textureUrls);
	imageLoader.load((textureImages) => {
		const textureImage1 = textureImages[0];
		const textureImage2 = textureImages[1];
		const textureImage3 = textureImages[2];
	

	// Hjelpeobjekt som holder på objekter som trengs for rendring:
	const renderInfo = {
		gl: webGLCanvas.gl,
		baseShader: initBaseShaders(webGLCanvas.gl),
		uniformShader: initUniformShaders(webGLCanvas.gl),
		textureShader: initTextureShaders(webGLCanvas.gl),
		coordBuffers: initCoordBuffers(webGLCanvas.gl),
		gridBuffers: initGridBuffers(webGLCanvas.gl),
		pyramidBuffers: initPyramidBuffers(webGLCanvas.gl, textureImage1),
		torusBuffers: initTorusBuffers(webGLCanvas.gl, textureImage2),
        modelMatrix: new Matrix4(),
        modelviewMatrix: new Matrix4(),
		currentlyPressedKeys: [],
		lastTime: 0,
		fpsInfo: {  // Brukes til å beregne og vise FPS (Frames Per Seconds):
            frameCount: 0,      // Antall frames siden forrige visning.
            elapsedTotal: 0     // Sum forløpt tid (sek.) siden forrige visning.
		},
		stack: new Stack(),
	};

	initKeyPress(renderInfo.currentlyPressedKeys);
	const camera = new Camera(renderInfo.gl, renderInfo.currentlyPressedKeys);
	camera.set();
	
	// Gjenopprett lagret posisjon:
	camera.loadState();

	// Lagre når siden forlates eller lastes på nytt:
	window.addEventListener("pagehide", () => {
		camera.saveState();
	});

	animate(0, renderInfo, camera);
	
}, textureUrls);
}

/**
 * Knytter tastatur-events til eventfunksjoner.
 */
function initKeyPress(currentlyPressedKeys) {
	document.addEventListener('keyup', (event) => {
		currentlyPressedKeys[event.code] = false;
	}, false);
	document.addEventListener('keydown', (event) => {
		currentlyPressedKeys[event.code] = true;
	}, false);
}

// Initialiserer det første shaderparet
function initBaseShaders(gl) {
	// Leser shaderkode fra HTML-fila: Standard/enkel shader (posisjon og farge):
	let vertexShaderSource = document.getElementById('base-vertex-shader').innerHTML;
	let fragmentShaderSource = document.getElementById('base-fragment-shader').innerHTML;

	// Initialiserer  & kompilerer shader-programmene;
	const glslShader = new WebGLShader(gl, vertexShaderSource, fragmentShaderSource);

	// Samler all shader-info i ET JS-objekt, som returneres.
	return  {
		program: glslShader.shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(glslShader.shaderProgram, 'aVertexPosition'),
			vertexColor: gl.getAttribLocation(glslShader.shaderProgram, 'aVertexColor'),
		},
		uniformLocations: {
			projectionMatrix: gl.getUniformLocation(glslShader.shaderProgram, 'uProjectionMatrix'),
			modelViewMatrix: gl.getUniformLocation(glslShader.shaderProgram, 'uModelViewMatrix'),
		},
	};
}
// Initialiserer det andre shaderparet
function initUniformShaders(gl) {
	// Leser shaderkode fra HTML-fila: Standard/enkel shader (posisjon og farge):
	let vertexShaderSource = document.getElementById('uniform-vertex-shader').innerHTML;
	let fragmentShaderSource = document.getElementById('uniform-fragment-shader').innerHTML;

	// Initialiserer  & kompilerer shader-programmene;
	const glslShader = new WebGLShader(gl, vertexShaderSource, fragmentShaderSource);

	// Samler all shader-info i ET JS-objekt, som returneres.
	return  {
		program: glslShader.shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(glslShader.shaderProgram, 'aVertexPosition'),
		},
		uniformLocations: {
			color: gl.getUniformLocation(glslShader.shaderProgram, 'uColor'),
			projectionMatrix: gl.getUniformLocation(glslShader.shaderProgram, 'uProjectionMatrix'),
			modelViewMatrix: gl.getUniformLocation(glslShader.shaderProgram, 'uModelViewMatrix'),
		},
	};
}
// Initialiserer tekstur shaderparet
function initTextureShaders(gl) {
	// Leser shaderkode fra HTML-fila: Standard/enkel shader (posisjon og farge):
	let vertexShaderSource = document.getElementById('texture-vertex-shader').innerHTML;
	let fragmentShaderSource = document.getElementById('texture-fragment-shader').innerHTML;

	// Initialiserer  & kompilerer shader-programmene;
	const glslShader = new WebGLShader(gl, vertexShaderSource, fragmentShaderSource);

	// Samler all shader-info i ET JS-objekt, som returneres.
	return  {
		program: glslShader.shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(glslShader.shaderProgram, 'aVertexPosition'),
			vertexColor: gl.getAttribLocation(glslShader.shaderProgram, 'aVertexColor'),
			vertexTextureCoordinate: gl.getAttribLocation(glslShader.shaderProgram, 'aVertexTextureCoordinate'),
		},
		uniformLocations: {
			color: gl.getUniformLocation(glslShader.shaderProgram, 'uColor'), // Tillegg: Henter også uniform color
			sampler: gl.getUniformLocation(glslShader.shaderProgram, 'uSampler'),
			projectionMatrix: gl.getUniformLocation(glslShader.shaderProgram, 'uProjectionMatrix'),
			modelViewMatrix: gl.getUniformLocation(glslShader.shaderProgram, 'uModelViewMatrix'),
		},
	};
}

/**
 * Aktiverer position-bufferet.
 * Kalles fra draw()
 */
function connectPositionAttribute(gl, baseShader, positionBuffer) {
	const numComponents = 3;
	const type = gl.FLOAT;
	const normalize = false;
	const stride = 0;
	const offset = 0;
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.vertexAttribPointer(
		baseShader.attribLocations.vertexPosition,
		numComponents,
		type,
		normalize,
		stride,
		offset);
	gl.enableVertexAttribArray(baseShader.attribLocations.vertexPosition);
}

/**
 * Kopler til og aktiverer teksturkoordinat-bufferet.
 */
function connectTextureAttribute(gl, textureShader, textureBuffer, textureObject) {
	const numComponents = 2;    //NB!
	const type = gl.FLOAT;
	const normalize = false;
	const stride = 0;
	const offset = 0;
	//Bind til teksturkoordinatparameter i shader:
	gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
	gl.vertexAttribPointer(
		textureShader.attribLocations.vertexTextureCoordinate,
		numComponents,
		type,
		normalize,
		stride,
		offset);
	gl.enableVertexAttribArray(textureShader.attribLocations.vertexTextureCoordinate);

	//Aktiver teksturenhet (0):
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, textureObject);
	//Send inn verdi som indikerer hvilken teksturenhet som skal brukes (her 0):
	gl.uniform1i(textureShader.uniformLocations.sampler, 0);
}

/**
 * Aktiverer color-bufferet.
 * Kalles fra draw()
 */
function connectColorAttribute(gl, baseShader, colorBuffer) {
	const numComponents = 4;
	const type = gl.FLOAT;
	const normalize = false;
	const stride = 0;
	const offset = 0;
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.vertexAttribPointer(
		baseShader.attribLocations.vertexColor,
		numComponents,
		type,
		normalize,
		stride,
		offset);
	gl.enableVertexAttribArray(baseShader.attribLocations.vertexColor);
}

/**
 * Klargjør canvaset.
 * Kalles fra draw()
 */
function clearCanvas(gl) {
	gl.clearColor(0.9, 0.9, 0.9, 1);  // Clear screen farge.
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);           // Enable "depth testing".
	gl.depthFunc(gl.LEQUAL);            // Nære objekter dekker fjerne objekter.
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function handleInput(renderInfo) {

    /* Do something
	if (renderInfo.currentlyPressedKeys['KeyA']) {
        renderInfo.machineHeading += 0.5;
    }
    */

		if (renderInfo.currentlyPressedKeys['KeyA']) {
        renderInfo.machineHeading += 0.5;
    }
}

/**
 * Animasjonsløkke.
 */
function animate(currentTime, renderInfo, camera) {
	window.requestAnimationFrame((currentTime) => {
		animate(currentTime, renderInfo, camera);
	});

    // Finner tid siden siste kall på draw().
    let elapsed = getElapsed(currentTime, renderInfo);
    // Beregner og viser fps:
    calculateFps(elapsed, renderInfo.fpsInfo);

	camera.handleKeys(renderInfo.currentlyPressedKeys);
	handleInput(renderInfo);
	draw(renderInfo, camera);
}

/**
 * Beregner forløpt tid siden siste kall.
 * @param currentTime
 * @param renderInfo
 */
function getElapsed(currentTime, renderInfo) {
	let elapsed = 0.0;
	if (renderInfo.lastTime !== 0.0)	// Først gang er lastTime = 0.0.
		elapsed = (currentTime - renderInfo.lastTime)/1000; // Deler på 1000 for å operere med sekunder.
	renderInfo.lastTime = currentTime;						// Setter lastTime til currentTime.
	return elapsed;
}

/**
 * Beregner og viser FPS.
 * @param elapsed Forløpt tid (i sekunder) siden forrige frame.
 * @param fpsInfo
 */
function calculateFps(elapsed, fpsInfo) {
    fpsInfo.frameCount++;
    fpsInfo.elapsedTotal += elapsed;
    // Viser oppdatert FPS én gang i sekundet:
    if (fpsInfo.elapsedTotal >= 1.0) {
        // Viser FPS i .html ("fps" er definert i .html fila):
        document.getElementById('fps').innerHTML = Math.round(fpsInfo.frameCount / fpsInfo.elapsedTotal);
        // Nullstiller tellere:
        fpsInfo.frameCount = 0;
        fpsInfo.elapsedTotal = 0;
    }
}

// Oppretter verteksbuffer for koordinatsystemet.
function initCoordBuffers(gl) {
	const extent =  100;

	const positions = new Float32Array([
		-extent, 0, 0,
		extent, 0, 0,
		0, -extent, 0,
		0, extent, 0,
		0, 0, -extent,
		0, 0, extent
	]);

	const colors = new Float32Array([
		1, 0, 0, 1,   //R G B A
		1, 0, 0, 1,   //R G B A
		0, 1, 0, 1,   //R G B A
		0, 1, 0, 1,   //R G B A
		0, 0, 1, 1,   //R G B A
		0, 0, 1, 1,   //R G B A
	]);

	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	const colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return  {
		position: positionBuffer,
		color: colorBuffer,
		vertexCount: positions.length/3
	};
}

// Oppretter verteksbuffer for et rutenett.
function initGridBuffers(gl) {
	const extent = 20;
	const positions = []
	for (let i = -extent; i <= extent; i++) {
		// Linje parallelt med Z-aksen:
		positions.push(
			i, 0, -extent,
			i, 0,  extent
		);

		// Linje parallelt med X-aksen:
		positions.push(
			-extent, 0, i,
			 extent, 0, i
		);
	}

	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return  {
		position: positionBuffer,
		vertexCount: positions.length/3
	};
}

//Oppretter verteksbuffer for en kube.
function initCubeBuffers(gl) {
    let positions = new Float32Array([
        //Forsiden (pos):
        -1, 1, 1,
        -1,-1, 1,
        1,-1, 1,

        -1,1,1,
        1, -1, 1,
        1,1,1,

        //Høyre side:
        1,1,1,
        1,-1,1,
        1,-1,-1,

        1,1,1,
        1,-1,-1,
        1,1,-1,

        //Topp:
        -1,1,-1,
        -1,1,1,
        1,1,1,

        -1,1,-1,
        1,1,1,
        1,1,-1,

        //Venstre side:
        -1,1,-1,
        -1,-1,-1,
        -1,-1,1,

        -1,1,-1,
        -1,-1,1,
        -1,1,1,

        //Baksiden (pos):
        1, 1,-1,
        1,-1,-1,
        -1,-1,-1,

        1,1,-1,
        -1,-1,-1,
        -1,1,-1,

        //Bunn:
        -1,-1,1,
        -1,-1,-1,
        1,-1,-1,

        -1,-1,1,
        1,-1,-1,
        1,-1,1
    ]);
    
	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return  {
		position: positionBuffer,
		vertexCount: positions.length/3
	};
}

function initCubeTextureAndBuffers(gl, textureImage) {
	let positions = [
		//Forsiden (pos):
		-1, 1, 1,
		-1,-1, 1,
		1,-1, 1,

		-1,1,1,
		1, -1, 1,
		1,1,1,

		//Høyre side:
		1,1,1,
		1,-1,1,
		1,-1,-1,

		1,1,1,
		1,-1,-1,
		1,1,-1,

        //Topp:
        -1,1,-1,
        -1,1,1,
        1,1,1,

        -1,1,-1,
        1,1,1,
        1,1,-1,

        //Venstre side:
        -1,1,-1,
        -1,-1,-1,
        -1,-1,1,

        -1,1,-1,
        -1,-1,1,
        -1,1,1,

		//Baksiden (pos):
        1, 1,-1, //OK
        1,-1,-1,
        -1,-1,-1,

        1,1,-1,
        -1,-1,-1,
        -1,1,-1,

		//Bunn:
        -1,-1,1,
        -1,-1,-1,
        1,-1,-1,

        -1,-1,1,
        1,-1,-1,
        1,-1,1,
	];

	// Verkeksfarger
	let color = {red: 1, green: 1, blue: 1, alpha: 1.0} // Hvit nøytral
	let colors = [];	
	
	//Samme farge på alle sider:
	for (let i = 0; i < 36; i++) {
		colors.push(color.red, color.green, color.blue, color.alpha);
	}

	
	//Holder etter hvert på alle uv-koordinater for terningen.
	let textureCoordinates = [];
	//Front:
    let bl=[0,0];
    let br=[32,0];
    let tr=[32,1];
    let tl=[0,1];

	textureCoordinates = textureCoordinates.concat(tl, bl, br, tl, br, tr);
    textureCoordinates = textureCoordinates.concat(tl, bl, br, tl, br, tr);
    textureCoordinates = textureCoordinates.concat(tl, bl, br, tl, br, tr);
    textureCoordinates = textureCoordinates.concat(tl, bl, br, tl, br, tr);
    textureCoordinates = textureCoordinates.concat(tl, bl, br, tl, br, tr);
    textureCoordinates = textureCoordinates.concat(tl, bl, br, tl, br, tr);

	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	const colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	//Texture:
	const rectangleTexture = gl.createTexture();
	//Teksturbildet er nå lastet fra server, send til GPU:
	gl.bindTexture(gl.TEXTURE_2D, rectangleTexture);

	//Unngaa at bildet kommer opp-ned:
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    //Merk: Bruker her premultiplied alpha, som gjør at hver texel multipliseres med sin egen alpha-verdi.
    //Betyr: Sett gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); ved tegning av objektet, for å få riktig blending med bakgrunn.
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    //Laster teksturbildet til GPU/shader:
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImage);

    //Teksturparametre:
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

	gl.bindTexture(gl.TEXTURE_2D, null);

	const textureBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

	return  {
		position: positionBuffer,
		color: colorBuffer,
		texture: textureBuffer,
		textureObject: rectangleTexture,
		vertexCount: positions.length/3,
	};
}

//Oppretter verteksbuffer for en prisme.
function initPrismBuffers(gl) {
	const roofAngle = 55;
	const angleRadians = roofAngle * Math.PI / 180;
	const topY = -1 + Math.tan(angleRadians);

	const positions = new Float32Array([
		// Front
		-1, -1, -1,
		1, -1, -1,
		0, topY, -1,

		// Bak
		-1, -1,  1,
		0, topY,  1,
		1, -1,  1,

		// Bunn
		-1, -1, -1,
		-1, -1,  1,
		1, -1, -1,

		1, -1, -1,
		-1, -1,  1,
		1, -1,  1,

		// Venstre skråside
		-1, -1, -1,
		0, topY, -1,
		-1, -1,  1,

		-1, -1,  1,
		0, topY, -1,
		0, topY,  1,

		// Høyre skråside
		1, -1, -1,
		1, -1,  1,
		0, topY, -1,

		0, topY, -1,
		1, -1,  1,
		0, topY,  1
	]);
    
	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return  {
		position: positionBuffer,
		vertexCount: positions.length/3
	};
}

//Oppretter verteksbuffer for en flate.
function initPlaneBuffers(gl) {

    const positions = new Float32Array([
        // Trekant 1
        -0.5, -0.5, 0,
         0.5, -0.5, 0,
         0.5,  0.5, 0,

        // Trekant 2
        -0.5, -0.5, 0,
         0.5,  0.5, 0,
        -0.5,  0.5, 0
    ]);

    const positionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        positions,
        gl.STATIC_DRAW
    );

    return {
        position: positionBuffer,
        vertexCount: 6
    };
}

// Oppretter verteksbuffer for en sylinder.
function initCylinderBuffers(gl) {

    const segments = 32;
    const positions = [];

    const radius = 0.5;
    const topY = 0.5;
    const bottomY = -0.5;

    for (let i = 0; i < segments; i++) {

        const a1 = i * 2 * Math.PI / segments;
        const a2 = (i + 1) * 2 * Math.PI / segments;

        const x1 = radius * Math.cos(a1);
        const z1 = radius * Math.sin(a1);

        const x2 = radius * Math.cos(a2);
        const z2 = radius * Math.sin(a2);

        // Side - trekant 1
        positions.push(
            x1, bottomY, z1,
            x1, topY,    z1,
            x2, topY,    z2
        );

        // Side - trekant 2
        positions.push(
            x1, bottomY, z1,
            x2, topY,    z2,
            x2, bottomY, z2
        );

        // Topplokk
        positions.push(
            0,  topY, 0,
            x1, topY, z1,
            x2, topY, z2
        );

        // Bunnlokk
        positions.push(
            0,  bottomY, 0,
            x2, bottomY, z2,
            x1, bottomY, z1
        );
    }

    const positionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW
    );

    return {
        position: positionBuffer,
        vertexCount: positions.length / 3
    };
}

function initPyramidBuffers(gl, textureImage) {

		// Fire hjørner i bunnflaten 
		const A = [-1, 0, 1];
		const B = [ 1, 0, 1];
		const C = [ 1, 0,  -1];
		const D = [-1, 0,  -1];
		
		// Toppen
		const T = [ 0, 2,  0]; // Toppen
	

	// Vi skal bruke gl.TRIANGLES. 
	// Det betyr at WebGL leser tre og tre verteksoppføringer fra bufferet og tegner én trekant av gangen.

	let positions = new Float32Array([
		// Winding order er CCW
		
		// ... spread operatøren pakker ut verdiene fra arrayene
		
		// Side 1 
		...A, 
		...B, 
		...T,

		// Side 2
		...B,
		...C,
		...T,

		// Side 3,
		...C,
		...D,
		...T,

		// Side 4,
		...D,
		...A,
		...T,

		
		//Når vi ser på grunnflaten ovenfra, skal den egentlig være pyramidens bakside. 
		// Den synlige utsiden av bunnen peker nedover, i negativ Y-retning.
		//Derfor må vi passe på at trekantenes CCW-retning er riktig sett nedenfra.
		
		// Bunn
		...A,
		...D,
		...C,

		...C,
		...B,
		...A,

	]);

	// Verteksfarger
	let color = {red: 1, green: 1, blue: 1, alpha: 1.0} // Hvit nøytral
	let colors = [];	
	
	//Samme farge på alle sider:
	for (let i = 0; i < 18; i++) {
	colors.push(color.red, color.green, color.blue, color.alpha);
	}


	// Tekstur
	let textureCoordinates = new Float32Array([
		// Side 1
		0.0, 0.0,
		0.2, 0.0,
		0.1, 1.0,

		// Side 2
		0.2, 0.0,
		0.4, 0.0,
		0.3, 1.0,

		// Side 3
		0.4, 0.0,
		0.6, 0.0,
		0.5, 1.0,

		// Side 4
		0.6, 0.0,
		0.8, 0.0,
		0.7, 1.0,

		// Bunn A D C
		0.8, 0.0,
		1.0, 0.0,
		0.9, 1.0,

		// Bunn C B A
		0.8, 0.0,
		1.0, 0.0,
		0.9, 1.0,

	]);
	
	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	const colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	//Texture:
	const rectangleTexture = gl.createTexture();
	//Teksturbildet er nå lastet fra server, send til GPU:
	gl.bindTexture(gl.TEXTURE_2D, rectangleTexture);

	//Unngaa at bildet kommer opp-ned:
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    //Merk: Bruker her premultiplied alpha, som gjør at hver texel multipliseres med sin egen alpha-verdi.
    //Betyr: Sett gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); ved tegning av objektet, for å få riktig blending med bakgrunn.
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    //Laster teksturbildet til GPU/shader:
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImage);

    //Teksturparametre:
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

	gl.bindTexture(gl.TEXTURE_2D, null);

	const textureBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, textureCoordinates, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return  {
		position: positionBuffer,
		color: colorBuffer,
		texture: textureBuffer,
		textureObject: rectangleTexture,
		vertexCount: positions.length/3,
	};
}

function initTorusBuffers(gl, textureImage) {
   const color = {red:0.8, green:0.1, blue:0.6, alpha:1};
   const slices = 10;
   const loops = 200;
   const inner_rad = 0.6;
   const outer_rad = 3;

   let positions = [];
   let colors = [];
   let indices = [];
   let textureCoordinates = [];
   let normals = [];

   for (let slice = 0; slice <= slices; ++slice) {
      const v = slice / slices;
      const slice_angle = v * 2 * Math.PI;
      const cos_slices = Math.cos(slice_angle);
      const sin_slices = Math.sin(slice_angle);
      const slice_rad = outer_rad + inner_rad * cos_slices;

      for (let loop = 0; loop <= loops; ++loop) {
         const u = loop / loops;
         const loop_angle = u * 2 * Math.PI;
         const cos_loops = Math.cos(loop_angle);
         const sin_loops = Math.sin(loop_angle);

         const x = slice_rad * cos_loops;
         const y = slice_rad * sin_loops;
         const z = inner_rad * sin_slices;

         //Position:
         positions.push(x, y, z);
         //Color:
         colors.push(color.red, color.green, color.blue, color.alpha);
         //Texture coordinates:
         textureCoordinates.push(u);
         textureCoordinates.push(v);
         //Normals:
         normals.push(
            cos_loops * sin_slices,
            sin_loops * sin_slices,
            cos_slices);
      }
   }

   // 0  1  2  3  4  5
   // 6  7  8  9  10 11
   // 12 13 14 15 16 17
   const vertsPerSlice = loops + 1;

   for (let i = 0; i < slices; ++i) {
      let v1 = i * vertsPerSlice;
      let v2 = v1 + vertsPerSlice;

      for (let j = 0; j < loops; ++j) {

         indices.push(v1);
         indices.push(v1 + 1);
         indices.push(v2);

         indices.push(v2);
         indices.push(v1 + 1);
         indices.push(v2 + 1);

         v1 += 1;
         v2 += 1;
      }
   }

   const positionBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
   gl.bindBuffer(gl.ARRAY_BUFFER, null);

   const colorBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
   gl.bindBuffer(gl.ARRAY_BUFFER, null);

   //Indeksbuffer: oppretter, binder og skriver data til bufret:
   const indexBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	//Texture:
	const rectangleTexture = gl.createTexture();
	//Teksturbildet er nå lastet fra server, send til GPU:
	gl.bindTexture(gl.TEXTURE_2D, rectangleTexture);

	//Unngaa at bildet kommer opp-ned:
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	//Merk: Bruker her premultiplied alpha, som gjør at hver texel multipliseres med sin egen alpha-verdi.
	//Betyr: Sett gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); ved tegning av objektet, for å få riktig blending med bakgrunn.
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

	//Laster teksturbildet til GPU/shader:
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImage);

	//Teksturparametre:
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

	gl.bindTexture(gl.TEXTURE_2D, null);

	const textureBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return {
		position: positionBuffer,
		color: colorBuffer,
		index: indexBuffer,
		texture: textureBuffer,
		textureObject: rectangleTexture,
		vertexCount: positions.length / 3,
		indicesCount: indices.length
	};
}


// Funksjon for å tegne et koordinatsystem
function drawCoord(renderInfo, camera) {
    const gl = renderInfo.gl;
    // Aktiver shader:
    gl.useProgram(renderInfo.baseShader.program);

    // Kople posisjon og farge-attributtene til tilhørende buffer:
    connectPositionAttribute(gl, renderInfo.baseShader, renderInfo.coordBuffers.position);
    connectColorAttribute(gl, renderInfo.baseShader, renderInfo.coordBuffers.color);
    // MODEL:
    renderInfo.modelMatrix.setIdentity();
    // MODELVIEW:
    renderInfo.modelviewMatrix.set(camera.viewMatrix);
    renderInfo.modelviewMatrix.multiply(renderInfo.modelMatrix);

    // Send kameramatrisene til shaderen:
    gl.uniformMatrix4fv(renderInfo.baseShader.uniformLocations.modelViewMatrix, false, renderInfo.modelviewMatrix.elements);
    gl.uniformMatrix4fv(renderInfo.baseShader.uniformLocations.projectionMatrix, false, camera.projectionMatrix.elements);
    // Tegn coord:
    gl.drawArrays(gl.LINES, 0, renderInfo.coordBuffers.vertexCount);
}

// Funksjon for å tegne et rutenett
function drawGridlines(renderInfo, camera) {
    const gl = renderInfo.gl;
    // Aktiver shader:
    gl.useProgram(renderInfo.uniformShader.program);

    // Kople posisjon til tilhørende buffer:
    connectPositionAttribute(gl, renderInfo.uniformShader, renderInfo.gridBuffers.position);
    
	// Uniform farge:
	gl.uniform4f(
    renderInfo.uniformShader.uniformLocations.color,
    0.10, 0.1, 0.45, 1.0
	);

	// MODEL:
    renderInfo.modelMatrix.setIdentity();
    // MODELVIEW:
    renderInfo.modelviewMatrix.set(camera.viewMatrix);
    renderInfo.modelviewMatrix.multiply(renderInfo.modelMatrix);

    // Send kameramatrisene til shaderen:
    gl.uniformMatrix4fv(renderInfo.uniformShader.uniformLocations.modelViewMatrix, false, renderInfo.modelviewMatrix.elements);
    gl.uniformMatrix4fv(renderInfo.uniformShader.uniformLocations.projectionMatrix, false, camera.projectionMatrix.elements);
    // Tegn coord:
    gl.drawArrays(gl.LINES, 0, renderInfo.gridBuffers.vertexCount);
}

// Funksjon for å tegne en kube
function drawCube(renderInfo, camera, color) {
	const gl = renderInfo.gl;
	
	// Aktiver shader:
	gl.useProgram(renderInfo.uniformShader.program);

	// Kople posisjon til tilhørende buffer:
	connectPositionAttribute(gl, renderInfo.uniformShader, renderInfo.cubeBuffers.position);

	// Uniform farge:
	gl.uniform4f(
    renderInfo.uniformShader.uniformLocations.color,
    color.red,
	color.green,
	color.blue,
	color.alpha
	);

	// MODEL:
	const modelMatrix = renderInfo.stack.peekMatrix();

    // MODELVIEW:
    renderInfo.modelviewMatrix.set(camera.viewMatrix);
    renderInfo.modelviewMatrix.multiply(modelMatrix);

	// Send kameramatrisene til shaderen:
    gl.uniformMatrix4fv(renderInfo.uniformShader.uniformLocations.modelViewMatrix, false, renderInfo.modelviewMatrix.elements);
    gl.uniformMatrix4fv(renderInfo.uniformShader.uniformLocations.projectionMatrix, false, camera.projectionMatrix.elements);

	// Tegn!
	gl.drawArrays(gl.TRIANGLES, 0, renderInfo.cubeBuffers.vertexCount);
}

// Funksjon for å tegne en prisme
function drawPrism(renderInfo, camera, color) {
	const gl = renderInfo.gl;
	
	// Aktiver shader:
	gl.useProgram(renderInfo.uniformShader.program);

	// Kople posisjon til tilhørende buffer:
	connectPositionAttribute(gl, renderInfo.uniformShader, renderInfo.prismBuffers.position);

	// Uniform farge:
	gl.uniform4f(
    renderInfo.uniformShader.uniformLocations.color,
    color.red,
	color.green,
	color.blue,
	color.alpha
	);

	// MODEL:
	const modelMatrix = renderInfo.stack.peekMatrix();

    // MODELVIEW:
    renderInfo.modelviewMatrix.set(camera.viewMatrix);
    renderInfo.modelviewMatrix.multiply(modelMatrix);

	// Send kameramatrisene til shaderen:
    gl.uniformMatrix4fv(renderInfo.uniformShader.uniformLocations.modelViewMatrix, false, renderInfo.modelviewMatrix.elements);
    gl.uniformMatrix4fv(renderInfo.uniformShader.uniformLocations.projectionMatrix, false, camera.projectionMatrix.elements);

	// Tegn!
	gl.drawArrays(gl.TRIANGLES, 0, renderInfo.prismBuffers.vertexCount);
}

// Funksjon for å tegne en flate
function drawPlane(renderInfo, camera, color) {
	const gl = renderInfo.gl;
	
	// Aktiver shader:
	gl.useProgram(renderInfo.uniformShader.program);

	// Kople posisjon til tilhørende buffer:
	connectPositionAttribute(gl, renderInfo.uniformShader, renderInfo.planeBuffers.position);

	// Uniform farge:
	gl.uniform4f(
    renderInfo.uniformShader.uniformLocations.color,
    color.red,
	color.green,
	color.blue,
	color.alpha
	);

	// MODEL:
	const modelMatrix = renderInfo.stack.peekMatrix();

    // MODELVIEW:
    renderInfo.modelviewMatrix.set(camera.viewMatrix);
    renderInfo.modelviewMatrix.multiply(modelMatrix);

	// Send kameramatrisene til shaderen:
    gl.uniformMatrix4fv(renderInfo.uniformShader.uniformLocations.modelViewMatrix, false, renderInfo.modelviewMatrix.elements);
    gl.uniformMatrix4fv(renderInfo.uniformShader.uniformLocations.projectionMatrix, false, camera.projectionMatrix.elements);

	// Tegn!
	gl.drawArrays(gl.TRIANGLES, 0, renderInfo.planeBuffers.vertexCount);
}

// Funksjon for å tegne en sylinder
function drawCylinder(renderInfo, camera, color) {
	const gl = renderInfo.gl;
	
	// Aktiver shader:
	gl.useProgram(renderInfo.uniformShader.program);

	// Kople posisjon til tilhørende buffer:
	connectPositionAttribute(gl, renderInfo.uniformShader, renderInfo.cylinderBuffers.position);

	// Uniform farge:
	gl.uniform4f(
    renderInfo.uniformShader.uniformLocations.color,
    color.red,
	color.green,
	color.blue,
	color.alpha
	);

	// MODEL:
	const modelMatrix = renderInfo.stack.peekMatrix();

    // MODELVIEW:
    renderInfo.modelviewMatrix.set(camera.viewMatrix);
    renderInfo.modelviewMatrix.multiply(modelMatrix);

	// Send kameramatrisene til shaderen:
    gl.uniformMatrix4fv(renderInfo.uniformShader.uniformLocations.modelViewMatrix, false, renderInfo.modelviewMatrix.elements);
    gl.uniformMatrix4fv(renderInfo.uniformShader.uniformLocations.projectionMatrix, false, camera.projectionMatrix.elements);

	// Tegn!
	gl.drawArrays(gl.TRIANGLE_FAN, 0, renderInfo.cylinderBuffers.vertexCount);
}

function drawTexturedCube(renderInfo, camera, color) {
    const gl = renderInfo.gl;
	// Aktiver shader:
	gl.useProgram(renderInfo.textureShader.program);

	// Kople posisjon og farge-attributtene til tilhørende buffer:
	connectPositionAttribute(gl, renderInfo.textureShader, renderInfo.texturedCubeBuffers.position);
	connectColorAttribute(gl, renderInfo.textureShader, renderInfo.texturedCubeBuffers.color);
	connectTextureAttribute(gl, renderInfo.textureShader, renderInfo.texturedCubeBuffers.texture, renderInfo.texturedCubeBuffers.textureObject);

    // MODEL:
    const modelMatrix = renderInfo.stack.peekMatrix();

    // MODELVIEW:
    renderInfo.modelviewMatrix.set(camera.viewMatrix);
    renderInfo.modelviewMatrix.multiply(modelMatrix);

	gl.uniformMatrix4fv(renderInfo.textureShader.uniformLocations.modelViewMatrix, false, renderInfo.modelviewMatrix.elements);
	gl.uniformMatrix4fv(renderInfo.textureShader.uniformLocations.projectionMatrix, false, camera.projectionMatrix.elements);

	// Sender uniform farge inn til fragment shader
	gl.uniform4f(
    renderInfo.textureShader.uniformLocations.color,
    color.red,
	color.green,
	color.blue,
	color.alpha
	);

	gl.drawArrays(gl.TRIANGLES, 0, renderInfo.texturedCubeBuffers.vertexCount);
}

// Funksjon for å tegne en pyramide
function drawPyramid(renderInfo, camera, color) {
	const gl = renderInfo.gl;
	
	// Aktiver shader:
	gl.useProgram(renderInfo.textureShader.program);

	// Kople posisjon til tilhørende buffer:
	connectPositionAttribute(gl, renderInfo.textureShader, renderInfo.pyramidBuffers.position);
	connectColorAttribute(gl, renderInfo.textureShader, renderInfo.pyramidBuffers.color);
	connectTextureAttribute(gl, renderInfo.textureShader, renderInfo.pyramidBuffers.texture, renderInfo.pyramidBuffers.textureObject);

	// MODEL:
	const modelMatrix = renderInfo.stack.peekMatrix();

    // MODELVIEW:
    renderInfo.modelviewMatrix.set(camera.viewMatrix);
    renderInfo.modelviewMatrix.multiply(modelMatrix);

	// Sender uniform farge inn til fragment shader
	gl.uniform4f(
    renderInfo.textureShader.uniformLocations.color,
    color.red,
	color.green,
	color.blue,
	color.alpha
	);

	// Send kameramatrisene til shaderen:
    gl.uniformMatrix4fv(renderInfo.textureShader.uniformLocations.modelViewMatrix, false, renderInfo.modelviewMatrix.elements);
    gl.uniformMatrix4fv(renderInfo.textureShader.uniformLocations.projectionMatrix, false, camera.projectionMatrix.elements);

	// Tegn!
	gl.drawArrays(gl.TRIANGLES, 0, renderInfo.pyramidBuffers.vertexCount);
}

function drawTorus(renderInfo, camera, color) {
	const gl = renderInfo.gl;
	
	// Aktiver shader:
	gl.useProgram(renderInfo.textureShader.program);

	// Kople posisjon til tilhørende buffer:
	connectPositionAttribute(gl, renderInfo.textureShader, renderInfo.torusBuffers.position);
	connectColorAttribute(gl, renderInfo.textureShader, renderInfo.torusBuffers.color);
	connectTextureAttribute(gl, renderInfo.textureShader, renderInfo.torusBuffers.texture, renderInfo.torusBuffers.textureObject);

	// MODEL:
	const modelMatrix = renderInfo.stack.peekMatrix();

    // MODELVIEW:
    renderInfo.modelviewMatrix.set(camera.viewMatrix);
    renderInfo.modelviewMatrix.multiply(modelMatrix);

	// Sender uniform farge inn til fragment shader
	gl.uniform4f(
    renderInfo.textureShader.uniformLocations.color,
    color.red,
	color.green,
	color.blue,
	color.alpha
	);

	// Send kameramatrisene til shaderen:
    gl.uniformMatrix4fv(renderInfo.textureShader.uniformLocations.modelViewMatrix, false, renderInfo.modelviewMatrix.elements);
    gl.uniformMatrix4fv(renderInfo.textureShader.uniformLocations.projectionMatrix, false, camera.projectionMatrix.elements);


	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderInfo.torusBuffers.index);

	// Tegn!
	gl.drawElements(gl.TRIANGLES, renderInfo.torusBuffers.indicesCount, gl.UNSIGNED_SHORT, 0);
}

/**
 * Tegner!
 */
function draw(renderInfo, camera) {
	

	// Klargjør canvas
	clearCanvas(renderInfo.gl);


	// Setter verdier for culling:
    renderInfo.gl.frontFace(renderInfo.gl.CCW);	    // Angir vertekser CCW.
    renderInfo.gl.enable(renderInfo.gl.CULL_FACE);	// Aktiverer culling.
    renderInfo.gl.cullFace(renderInfo.gl.BACK);	    // Skjuler baksider.

	// Fargevalg til objekter
	let colorOpaque = {red: 1, green: 1, blue: 1, alpha: 0.6} // Delvis gjennomsiktig
	let colorWhite = {red: 1, green: 1, blue: 1, alpha: 1.0} // Hvit nøytral


	// Tegne hjelpeobjekter
	drawCoord(renderInfo, camera);
	drawGridlines(renderInfo, camera);
		
	renderInfo.gl.enable(renderInfo.gl.BLEND);
	renderInfo.gl.blendFunc(renderInfo.gl.SRC_ALPHA, renderInfo.gl.ONE_MINUS_SRC_ALPHA);
	renderInfo.gl.depthMask(true);
	// Tegne komponenter ved hjelp av stack
	
	// Pyramid 1
	let modelMatrix = new Matrix4();
	modelMatrix.setIdentity();
	modelMatrix.translate(1,0,-6);
	modelMatrix.scale(2,2,2);
	renderInfo.stack.pushMatrix(modelMatrix);
		drawPyramid(renderInfo, camera, colorWhite);
	renderInfo.stack.popMatrix();

		//Pyramid 3
	renderInfo.gl.depthMask(true);
	modelMatrix = new Matrix4();
	modelMatrix.setIdentity();
	modelMatrix.translate(3,0,2);
	modelMatrix.scale(2,2,2);	
	renderInfo.stack.pushMatrix(modelMatrix);
		drawPyramid(renderInfo, camera, colorWhite);
	renderInfo.stack.popMatrix();


	
	//Pyramid 2
	renderInfo.gl.depthMask(false);
	modelMatrix = new Matrix4();
	modelMatrix.setIdentity();
	modelMatrix.translate(2,0,-2);
	modelMatrix.scale(2,2,2);
	renderInfo.stack.pushMatrix(modelMatrix);
		drawPyramid(renderInfo, camera, colorOpaque);
	renderInfo.stack.popMatrix();

	// Pyramid 4
	renderInfo.gl.depthMask(false);
	modelMatrix = new Matrix4();
	modelMatrix.setIdentity();
	modelMatrix.translate(4,0,6);
	modelMatrix.scale(2,2,2);
	renderInfo.stack.pushMatrix(modelMatrix);
		drawPyramid(renderInfo, camera, colorOpaque);
	renderInfo.stack.popMatrix();
	
	// Torus 1
	renderInfo.gl.depthMask(true);
	modelMatrix = new Matrix4();
	modelMatrix.setIdentity();
	modelMatrix.translate(2,3,-6-2);
	modelMatrix.scale(0.5,0.5,0.5);
	renderInfo.stack.pushMatrix(modelMatrix);
		drawTorus(renderInfo, camera, colorWhite);
	renderInfo.stack.popMatrix();

	// Torus 3
	renderInfo.gl.depthMask(true);
	modelMatrix = new Matrix4();
	modelMatrix.setIdentity();
	modelMatrix.translate(4,3,2-2);
	modelMatrix.scale(0.5,0.5,0.5);	
	renderInfo.stack.pushMatrix(modelMatrix);
		drawTorus(renderInfo, camera, colorWhite);
	renderInfo.stack.popMatrix();


	// Torus 2
	renderInfo.gl.depthMask(false);
	modelMatrix = new Matrix4();
	modelMatrix.setIdentity();
	modelMatrix.translate(3,3,-2-2);
	modelMatrix.scale(0.5,0.5,0.5);
	renderInfo.stack.pushMatrix(modelMatrix);
		drawTorus(renderInfo, camera, colorOpaque);
	renderInfo.stack.popMatrix();

	// Torus 4
	renderInfo.gl.depthMask(false);
	modelMatrix = new Matrix4();
	modelMatrix.setIdentity();
	modelMatrix.translate(5,3,6-2);
	modelMatrix.scale(0.5,0.5,0.5);
	renderInfo.stack.pushMatrix(modelMatrix);
		drawTorus(renderInfo, camera, colorOpaque);
	renderInfo.stack.popMatrix();

}
