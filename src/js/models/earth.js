import * as THREE from '../three';
import earthTextureImg from '../../1_earth_8k.jpg';
import earthBumpImg from '../../nasa_bump_map.png';

// Function-like promise loader
const loadTexture = (path, loader, onProgress) => { 
    return new Promise((resolve, reject) => {
        loader.load(path, resolve, onProgress, reject);
    });
}

export default class Earth {
    constructor(size, earthScale) {
        this.size = size;
        this.earthScale = earthScale;
    }

    load() {
        return loadTexture(earthTextureImg, new THREE.TextureLoader()).then((earthTexture) => {
            let earthGeo = new THREE.SphereGeometry(this.size, 32, 32);
            let earthMaterial = new THREE.MeshPhongMaterial({
                map:    earthTexture,
            });
            earthMaterial.bumpMap = new THREE.TextureLoader().load(earthBumpImg);
            earthMaterial.bumpScale = 0.05;
            let earthMesh = new THREE.Mesh(earthGeo, earthMaterial);
            earthMesh.scale.set(this.earthScale, this.earthScale, this.earthScale);
            return earthMesh;
        }).catch((err) => {
            console.log(err);
        });
    }

}