import * as THREE from '../three/three';
import { loadTexture } from '../textures/texture';
import OrbitControls from '../three/OrbitControls';
import LensFlare from '../three/LensFlare'; //used by addLighting
import solarFlare from '../textures/lensflare0.png';
import sat_model from '../models/model.obj';
import starmap from '../textures/stars.png';

import Earth from '../models/earth'
import Moon from '../models/moon'
import SatelliteTrail from '../models/satelliteTrail'
import ObjectLabel from '../models/objectLabel';

import {OBJLoader2} from '../three/OBJLoader2';

import config from '../config/config'

/**
 * Scene Helper
 * Holds all helper functions used by SpaceScene
 * to help build the scene (lights, camera, models, etc)
 */

/**
 * buildScene
 * Creates the scene, camera, and controls
 */
export function buildScene() {
  let scene = new THREE.Scene();

  // Create renderer
  let renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Create solar camera
  let solarCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.0001, 10000);
  solarCamera.position.set(0.05, 0.05, 0);
  solarCamera.updateWorldMatrix();
  solarCamera.updateProjectionMatrix();
  // Add solar camera mouse controls
  const solarControls = new OrbitControls(solarCamera, renderer.domElement);

  // Create moon view camera
  let moonCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.0001, 10000);
  moonCamera.position.z = 0;
  moonCamera.position.x = 0;
  moonCamera.position.y = 0;
  moonCamera.zoom = 25;
  moonCamera.updateProjectionMatrix();


  // Create spacecraft view camera
  let spacecraftCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.0001, 10000);

  // Create tempe camera with higher FOV
  let tempeCamera = new THREE.PerspectiveCamera(110, window.innerWidth / window.innerHeight, 0.0001, 10000);

  // Make scene responsive
  window.addEventListener('resize', function() {
    let widthWindow = window.innerWidth;
    let heightWindow = window.innerHeight;
    renderer.setSize(widthWindow, heightWindow);
    solarCamera.aspect = widthWindow / heightWindow;
    solarCamera.updateProjectionMatrix();
    solarCamera.updateWorldMatrix()
    moonCamera.aspect = solarCamera.aspect;
    moonCamera.updateProjectionMatrix();
    moonCamera.updateWorldMatrix()
    spacecraftCamera.aspect = solarCamera.aspect;
    spacecraftCamera.updateProjectionMatrix();
    spacecraftCamera.updateWorldMatrix();
    tempeCamera.aspect = solarCamera.aspect;
    tempeCamera.updateProjectionMatrix();
    tempeCamera.updateWorldMatrix();
  });

  // Return created objects to the scene
  return {
    scene,
    solarCamera,
    moonCamera,
    spacecraftCamera,
    tempeCamera,
    solarControls,
    renderer
  }
}

/**
 * addObjects
 * Adds earth, moon, satellite, satellite trail,
 * and object labels to the scene
 */
export async function addObjects(scene, earthScale, moonScale) {

    // Create base objects
    let earth = new Earth(1, earthScale);
    let moon = new Moon(1, moonScale);
    let satellite = null;
    //This is where we define the logic to keep track of where tempe is
    let tempePoint = new THREE.Mesh(new THREE.SphereGeometry(earthScale/64, 32, 32), new THREE.MeshBasicMaterial({
      color: "red"
    }));
    let tempeCoords = new THREE.Vector3(0,0,0);
    //coordinates of tempe
    tempeCoords.setFromSphericalCoords(0.0085273, 0.98739632679, -0.3826843824);
    tempePoint.position.set(tempeCoords.x, tempeCoords.y, tempeCoords.z)
    //we then add that to a pivot object to rotate it around the origin so it stays on the earth
    let pivot = new THREE.Group();
    pivot.position.set( 0.0, 0.0, 0 );
    pivot.add(tempePoint);
    scene.add(pivot);
    //console.log(tempeCoords)
    //console.log(tempePoint.getWorldPosition())

    // Load earth texture, and add to the scene
    const earthMesh = await earth.load();
    earth = earthMesh;
    scene.add(earth);

    // Load moon texture, and add to scene
    const moonMesh = await moon.load();
    moon = moonMesh;
    scene.add(moon);

    // Load Satellite, and add to scene
    const objLoader = new OBJLoader2();
    let satobj;
    //first we begin loading the satellite model into satobj
    //this runs concurrently with the rest of the program
    objLoader.load(sat_model, (root) => {
      console.log("satobj loaded");
      satobj = root;
    });
    //create logic to wait 2 seconds for model to load, if model hasn't loaded in that time
    //then instead just create a dot object to represent it.
    var flag = false;
    let i = 0;
    while(typeof satobj == 'undefined') {
      await new Promise(done => setTimeout(done, 250));
      i++;
      console.log(i);
      if(i >= 8) {
        //our model has failed to load
        flag = true;
        break;
      }
    }
    if(flag) {
      console.log("Failed to load model");
      var dotGeometry = new THREE.Geometry();
      dotGeometry.vertices.push(new THREE.Vector3());
      var dotMaterial = new THREE.PointsMaterial({
          size: this.size,
          sizeAttenuation: false,
          alphaTest: 0.5,
          transparent: true});
      satellite = new THREE.Points(dotGeometry);
      scene.add(satellite);
    }
    else {
      if(satobj.children.length != 1) {
        console.log("Failed to load model");
        var dotGeometry = new THREE.Geometry();
        dotGeometry.vertices.push(new THREE.Vector3());
        var dotMaterial = new THREE.PointsMaterial({
            size: this.size,
            sizeAttenuation: false,
            alphaTest: 0.5,
            transparent: true});
        satellite = new THREE.Points(dotGeometry);
        scene.add(satellite);
      }
      else {
        satellite = satobj.children[0];
        satellite.scale.set(0.001,0.001,0.001); //THIS IS MODEL SPECIFIC, NEEDS TO BE TOYED WITH A LOT.
        satellite.geometry.center();
        scene.add(satellite);
      }
    }
    // Create trail object, based on satellite
    let trailObj = new SatelliteTrail(satellite);
    trailObj.preload();


    // Return loaded objects
    return {
        earthObj: earth,
        moonObj: moon,
        satelliteObj: satellite,
        tempeObj: pivot,
        trueTempeObj: tempePoint,
        trailObj: trailObj,
        labelList: [
          new ObjectLabel(earth, "Earth"),
          new ObjectLabel(moon, "Moon"),
          new ObjectLabel(satellite, config.mainSpacecraftName)
        ]
    };
}

/**
 * addLighting
 * Returns a promise that loads sun lighting / textures
 */
export async function addLighting(scene) {
  const textureFlare = await makeTextureFlare();
  let pointLight = makePointLight(0.995, 0.5, 0.9, 0, 0, 0);
  let lensFlare = makeLensflare(textureFlare, pointLight);
  scene.add(pointLight);
  pointLight.add(lensFlare);
  return pointLight;
}

/**
 * addAmbientLighting
 * Returns a promise that loads basic ambient lighting
 */
export async function addAmbientLighting(scene) {
  let light = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(light);
  return light;
}

/**
 * makeTextureFlare
 * loads the solarFlare texture
 */
export function makeTextureFlare() {
  return loadTexture(solarFlare, new THREE.TextureLoader())
}

/**
 * makePointLight
 * Creates point light and sets color of light
 */
export function makePointLight(h, s, l, x, y, z) {
  let light = new THREE.PointLight(0xffffff, 1.5, 2000);
  light.color.setHSL(h, s, l);
  light.position.set(x, y, z);

  return light;
}

/**
 * makeLensflare
 * Creates lensflare effect
 */
export function makeLensflare(textureFlare, light) {
  let lensflare = new THREE.Lensflare();
  lensflare.addElement(new THREE.LensflareElement(textureFlare, 100, 0, light.color));
  return lensflare;
}

/**
 * addAxisHelper
 * Adds axis at origin to orient
 */
export function addAxisHelper(scene) {
  let axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);
}
