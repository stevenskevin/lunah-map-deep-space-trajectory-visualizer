import * as THREE from '../three/three';
import { loadTexture } from '../textures/texture';
import earthTextureImg from '../textures/earthmap1k.jpg';
import earthBumpImg from '../textures/earthbump1k.jpg';
//changed above textures to allow texture loading on lower end systems
export default class Earth {
    constructor(size, earthScale) {
        this.size = size;
        this.earthScale = earthScale;
    }

    async load() {
        const earthTexture = await loadTexture(earthTextureImg, new THREE.TextureLoader());
        let earthGeo = new THREE.SphereGeometry(this.size, 64, 64);
        let earthMaterial = new THREE.MeshPhongMaterial({
            map:    earthTexture,
        });
        const earthBumpMap = await loadTexture(earthBumpImg, new THREE.TextureLoader());
        earthMaterial.bumpMap = earthBumpMap;
        earthMaterial.bumpScale = 0.0001;
        let earthMesh = new THREE.Mesh(earthGeo, earthMaterial);
        earthMesh.scale.set(this.earthScale, this.earthScale, this.earthScale);
        return earthMesh;
    }
}
