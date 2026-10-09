'use strict';
/*
    Tegner koordinatsystemet.
*/

import {rotateVector} from "../lib/utility-functions.js";

export class Camera {

    constructor(
        gl,
        currentlyPressedKeys = [],
        camPosX=-15,
        camPosY=10,
        camPosZ=30,
        lookAtX=0,
        lookAtY=0,
        lookAtZ=0,
        upX=0,
        upY=1,
        upZ=0)
    {

        this.gl = gl;
        this.currentlyPressedKeys = currentlyPressedKeys;

        // Kameraposisjon:
        this.camPosX = camPosX;
        this.camPosY = camPosY;
        this.camPosZ = camPosZ;

        // Kamera ser mot ...
        this.lookAtX = lookAtX;
        this.lookAtY = lookAtY;
        this.lookAtZ = lookAtZ;

        // Kameraorientering:
        this.upX = upX;
        this.upY = upY;
        this.upZ = upZ;

        this.near = 1.0;
        this.far = 10000;

        this.viewMatrix = new Matrix4();
        this.projectionMatrix = new Matrix4();

        this.initialPosition = {
            x: camPosX,
            y: camPosY,
            z: camPosZ
        };
    }

    set() {
        // VIEW-matrisa:
        this.viewMatrix.setLookAt(this.camPosX, this.camPosY, this.camPosZ, this.lookAtX, this.lookAtY, this.lookAtZ, this.upX, this.upY, this.upZ);
        // PROJECTION-matrisa (frustum): cuon-utils: Matrix4.prototype.setPerspective = function(fovy, aspect, near, far)
        const fieldOfView = 45; // I grader.
        const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
        // PROJEKSJONS-matrisa; Bruker cuon-utils: Matrix4.prototype.setPerspective = function(fovy, aspect, near, far)
        this.projectionMatrix.setPerspective(fieldOfView, aspect, this.near, this.far);
    }

    getModelViewMatrix(modelMatrix) {
        return new Matrix4(this.viewMatrix.multiply(modelMatrix)); // NB! rekkefølge!
    }

    setPosition(posX, posY, posZ) {
        this.camPosX = posX;
        this.camPosY = posY;
        this.camPosZ = posZ;
    }

    setLookAt(lookX, lookY, lookZ) {
        this.lookAtX = lookX;
        this.lookAtY = lookY;
        this.lookAtZ = lookZ;
    }

    setUp(upX, upY, upZ) {
        this.upX = upX;
        this.upY = upY;
        this.upZ = upZ;
    }

    setNear(near) {
        this.near = near;
    }

    setFar(far) {
        this.far = far;
    }

    handleKeys(elapsed) {   
        
        // Tilbakestill kameraet
        if (this.currentlyPressedKeys['KeyR']) {
            this.resetState();
            return;
        }

        let camPosVec = vec3.fromValues(this.camPosX, this.camPosY, this.camPosZ);
        
        //Enkel rotasjon av kameraposisjonen:
        if (this.currentlyPressedKeys['KeyA']) {    //A
            rotateVector(2, camPosVec, 0, 1, 0);  //Roterer camPosVec 2 grader om y-aksen.
        }
        if (this.currentlyPressedKeys['KeyD']) {	//D
            rotateVector(-2, camPosVec, 0, 1, 0);  //Roterer camPosVec -2 grader om y-aksen.
        }
        if (this.currentlyPressedKeys['KeyW']) {	//W
            rotateVector(2, camPosVec, 1, 0, 0);  //Roterer camPosVec 2 grader om x-aksen.
        }
        if (this.currentlyPressedKeys['KeyS']) {	//S
            rotateVector(-2, camPosVec, 1, 0, 0);  //Roterer camPosVec 2 grader om x-aksen.
        }

        //Zoom inn og ut:
        if (this.currentlyPressedKeys['KeyV']) { //V
            vec3.scale(camPosVec, camPosVec, 1.05);
        }
        if (this.currentlyPressedKeys['KeyB']) {	//B
            vec3.scale(camPosVec, camPosVec, 0.95);
        }
       
        this.camPosX = camPosVec[0];
        this.camPosY = camPosVec[1];
        this.camPosZ = camPosVec[2];
        this.set();
    }

    saveState() {
        const state = {
            x: this.camPosX,
            y: this.camPosY,
            z: this.camPosZ
        };

        localStorage.setItem("cameraState", JSON.stringify(state));
    }

    loadState() {
        const saved = localStorage.getItem("cameraState");

        if (!saved) return;

        try {
            const state = JSON.parse(saved);

            if (![state.x, state.y, state.z].every(Number.isFinite)) {
                return;
            }

            this.setPosition(state.x, state.y, state.z);
            this.set();
        } catch (error) {
            console.warn("Kunne ikke laste kameratilstand:", error);
        }
    }

    resetState() {
        localStorage.removeItem("cameraState");
        this.setPosition(
            this.initialPosition.x,
            this.initialPosition.y,
            this.initialPosition.z
        );
        this.set();
    }

    toString() {
        return 'x:' + String(this.camPosX.toFixed(1)) + ', y' + String(this.camPosY.toFixed(1)) + ', z:' + String(this.camPosZ.toFixed(1))
        //return "Position:" + String(this.camPosX.toFixed(1)) + ', ' + String(this.camPosY.toFixed(1)) + ', ' + String(this.camPosZ.toFixed(1)) +
        //    ", LookAt:" + String(this.lookAtX.toFixed(1)) + ', ' + String(this.lookAtY.toFixed(1)) + ', ' + String(this.lookAtZ.toFixed(1));
    }
}


