import React, { Component } from 'react';
import { connect } from 'react-redux';
import * as THREE from '../three/three';

import * as pos_store from '../libraries/position_store'
import {
  addLighting,
  addAmbientLighting,
  buildScene,
  addObjects
} from './sceneHelper';
import config from '../config/config';
import {
  selectCurrentTrailType,
  selectCurrentCamera,
  selectShowLabels
} from '../reducers';
//these are scaled to THREEJS' coordinate system
const earthScale = 0.0085270424;
const moonScale = 0.0023228;
const axis = new THREE.Vector3(0, 0.4101524, 0).normalize();

let tempeDirection = new THREE.Vector3();
let tempeCoordinates = new THREE.Vector3();

/**
 * SpaceScene
 * Main scene component
 * Holds the ThreeJS scene and the rendering logic
 */

class SpaceScene extends Component {

  constructor(props) {
    super(props);
    this.state = {};
    console.log(props);
    // starts the update loop
    pos_store.init_store();
  }
  /**
   * componentDidMount
   * Lifecycle method in React
   * Gets called everytime the component (page) loads
   */
  async componentDidMount() {

    /**
     * Update function
     * Runs every frame to animate the scene
     */

    const update = () => {

      // Update positions of sun, moon, and spacecraft

      let sun_pos = pos_store.get_object_position("sun");
      pointLight.position.x = sun_pos.x;
      pointLight.position.y = sun_pos.y;
      pointLight.position.z = sun_pos.z;

      let moon_pos = pos_store.get_object_position("moon");
      moonObj.position.x = moon_pos.x;
      moonObj.position.y = moon_pos.y;
      moonObj.position.z = moon_pos.z;

      let sat_pos = pos_store.get_object_position(config.mainSpacecraftName);
      satelliteObj.position.x = sat_pos.x;
      satelliteObj.position.y = sat_pos.y;
      satelliteObj.position.z = sat_pos.z;

      // Have moon look at the earth, and the moon camera look at the moon
      moonObj.lookAt(0,0,0);
      moonCamera.lookAt(moonObj.position);



      // Calculate where to position the spacecraft camera based on its velocity vector
      let satVelocityMagnitude = Math.sqrt(
        Math.pow(sat_pos.dx, 2) + Math.pow(sat_pos.dy, 2) + Math.pow(sat_pos.dz, 2)
      );
      let normalizedSatelliteVelocityVector = {
        x: sat_pos.dx/satVelocityMagnitude,
        y: sat_pos.dy/satVelocityMagnitude,
        z: sat_pos.dz/satVelocityMagnitude
      }
      spacecraftCamera.position.x = sat_pos.x - normalizedSatelliteVelocityVector.x*.1; //ORIGINALLY 0.001
      spacecraftCamera.position.y = sat_pos.y - normalizedSatelliteVelocityVector.y*.1;
      spacecraftCamera.position.z = sat_pos.z - normalizedSatelliteVelocityVector.z*.1;
      spacecraftCamera.lookAt(satelliteObj.position);

      // Determine whether to display full, partial, or no spacecraft trail
      scene.remove(currentTrailObj);
      if(this.props.currentTrailType == "full") {
        currentTrailObj = trailObj.getFullPath();
      } else if(this.props.currentTrailType == "partial") {
        currentTrailObj = trailObj.getPartialPath(pos_store.get_working_date());
      } else {
        currentTrailObj = null;
      }
      if(currentTrailObj) {
        scene.add(currentTrailObj);
      }

      //very bad approximation of earth's rotation
      //note that tempeObj's rotation MUST match the Earth's rotation
      earthObj.rotateOnAxis(axis, 0.00013927576*(1+(pos_store.get_update_frequency()-1)/40)); //originally 0.009
      tempeObj.rotateOnAxis(axis, 0.00013927576*(1+(pos_store.get_update_frequency()-1)/40));
      moonObj.rotateOnAxis(axis, 0.001);

      //get world position of the dot representing tempe
      trueTempeObj.getWorldPosition(tempeCoordinates)
      //take the inverse of the vector from tempe to center of sphere
      tempeDirection.subVectors(new THREE.Vector3(tempeCoordinates.x, tempeCoordinates.y, tempeCoordinates.z), new THREE.Vector3(0,0.005,0) ).normalize();
      //point camera in that direction
      tempeCamera.lookAt(tempeDirection);
      //update camera's position
      tempeCamera.position.x = tempeCoordinates.x;
      tempeCamera.position.y = tempeCoordinates.y;
      tempeCamera.position.z = tempeCoordinates.z;

      // Update position of labels based on current camera and label controls state
      labelList.forEach(label => {
        label.updatePosition(renderer, selectedCameraObj, this.props.showLabels);
      });
    };

    /**
     * Render function
     * sends scene and camera props to renderer
     */
    const render = () => {
      renderer.render(scene, selectedCameraObj);
    };

    /**
     * Animate function
     * gets new frame, updates, and renders scene
     */
    const animate = () => {
      //set a timeout to limit our applications framerate, this only calls the function every 33.3ms
      setTimeout( function() {

       requestAnimationFrame( animate );

      }, 1000 / 30 );
      // Choose which camera to render the scene with
      switch(this.props.selectedCamera) {
      //here we also set the scale of the satelliteObj
      //it might be worth it to move this to a standalone method and only call it when the camera changes, but fine for now.
      case 'solar':
        selectedCameraObj = solarCamera;
        satelliteObj.scale.set(0.001,0.001,0.001);
        break;
      case 'moon':
        selectedCameraObj = moonCamera;
        satelliteObj.scale.set(0.0001,0.0001,0.0001);
        break;
      case 'spacecraft':
        selectedCameraObj = spacecraftCamera;
        satelliteObj.scale.set(0.0001,0.0001,0.0001);
        break;
      case 'tempe':
        selectedCameraObj = tempeCamera;
        satelliteObj.scale.set(0.001,0.001,0.001);
        break;
      default:
        selectedCameraObj = solarCamera;
      }

      update();
      render();
    };

    // Build base scene objects
    let { scene, solarCamera, moonCamera, spacecraftCamera, tempeCamera, solarControls, renderer } = buildScene();

    // Add lighting (sun flare)
    let pointLight = await addLighting(scene);
    let ambientLight = await addAmbientLighting(scene);
    // Load mesh objects
    let {
      earthObj,
      moonObj,
      satelliteObj,
      trailObj,
      tempeObj,
      trueTempeObj,
      labelList
    } = await addObjects(scene, earthScale, moonScale);
    let currentTrailObj;
    let selectedCameraObj = solarCamera;

    animate();
  }

  render() {
    return(
      <div className="space-scene"
        ref={(mount) => { this.mount = mount }}
      />
    )
  }
}

/**
 * mapStateToProps
 * maps state in redux store (right)
 * to component props property (left)
 */
const mapStateToProps = state => ({
  currentTrailType: selectCurrentTrailType(state),
  selectedCamera: selectCurrentCamera(state),
  showLabels: selectShowLabels(state)
});

export default connect(mapStateToProps, {})(SpaceScene)
