/**
 * Lager et <div> element som inneholder et <canvas> element.
 * <canvas> elementet gis en id.
 */
export class WebGLCanvas {
	constructor(id, parent, width, height) {
        
		let divWrapper = document.createElement('div');
		this.canvasElement = document.createElement('canvas');
		parent.appendChild(divWrapper);
		divWrapper.appendChild(this.canvasElement);
        this.canvasElement.id = id;
		this.canvasElement.width = width;
		this.canvasElement.height = height;
		this.gl = this.canvasElement.getContext('webgl2', {stencil: true} );
		if (!this.gl)
			alert('En feil oppsto ved lesing av WebGL-konteksten.');
	}
}
