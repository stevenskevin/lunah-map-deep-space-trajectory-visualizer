import React, { Component } from 'react';
import * as THREE from '../three/three';
import config from '../config/config';
import { 
  addLighting,
  buildScene, 
  addObjects,
  addAxisHelper
} from './sceneHelper';

const earthScale = 0.0085;
const moonScale = 0.00232;

// Moon Orbit Radius to be calculated in real-time using spyce data
// const moonOrbitRadius = 2.38;

// Earth Orbit Radius to be calculated in real-time using spyce data
// const earthOrbitRadius = 930;
const axis = new THREE.Vector3(0, 0.4101524, 0).normalize();

class SpaceScene extends Component {

  constructor(props) {
    super(props);
    this.state = {
      earth: {},
      moon: {},
      pointLight: {}
    };

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
      let sun_pos = pos_store.get_object_position("sun");
      this.state.pointLight.position.x = sun_pos.x;
      this.state.pointLight.position.y = sun_pos.y;
      this.state.pointLight.position.z = sun_pos.z;

      let moon_pos = pos_store.get_object_position("moon");
      this.state.moon.position.x = moon_pos.x;
      this.state.moon.position.y = moon_pos.y;
      this.state.moon.position.z = moon_pos.z;

      let sat_pos = pos_store.get_object_position(config.mainSpacecraftName);
      this.state.satellite.position.x = sat_pos.x;
      this.state.satellite.position.y = sat_pos.y;
      this.state.satellite.position.z = sat_pos.z;

      this.state.earth.rotateOnAxis(axis, 0.0009);
      this.state.moon.rotateOnAxis(axis, 0.001);
    };

    /**
     * Render function
     * sends scene and camera props to renderer
     */
    const render = () => {
      renderer.render(scene, camera);
    };

    /**
     * Animate function
     * gets new frame, updates, and renders scene
     */
    const animate = () => {
      requestAnimationFrame(animate);
      update();
      render();
    };
    
    // Build base scene objects
    let { scene, camera, controls, renderer } = buildScene();

    // Add lighting (sun flare)
    let lighting = await addLighting(scene);
    this.setState({ pointLight: lighting });

    // Load mesh objects for earth and moon
    let { earthObj, moonObj } = await addObjects(scene, earthScale, moonScale);
    this.setState({ earth: earthObj });
    this.setState({ moon: moonObj });

    addAxisHelper(scene);

    animate();
  }

  updatePositions() {
    const bodiesToUpdate = ['moon', 'LMAP', 'sun'];
    const observer = 'earth';
    const currentDate = new Date();
    this.props.updateObjectPositions(bodiesToUpdate, observer, currentDate);
  }

  render() {
    return(
      <div className="space-scene"
        ref={(mount) => { this.mount = mount }}
      />
    )
  }
}


const mapStateToProps = state => ({
  mainObject: selectMainObject(state),
  objectList: selectAllObjects(state),
  moonPosition: selectMoonPosition(state),
  lmapPosition: selectLMAPPosition(state),
  sunPosition: selectSunPosition(state)
});

export default connect(mapStateToProps, {
  getObjectList,
  getMainObject,
  getObjectFrame,
  getObject,
  getObjectFrames,
  getObjectCoverage,
  updateObjectPositions
})}(SpaceScene)
