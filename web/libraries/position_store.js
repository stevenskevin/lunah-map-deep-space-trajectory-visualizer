import config from '../config/config'
import net from './network_layer';
import reduxStore from '../store';
import { UPDATE_SIMULATION_TIME } from '../actions/spaceSceneActions';

const base_objects = [
  "sun",
  "moon",
  config.mainSpacecraftName
]

let app_store = {}
let timeout_ref = undefined;
let will_refresh_loop = false;
let offset_time = new Date();

/**
 * @name init_object(obj)
 * @description initialize each existing object in the app_store dictionary to store ALL of the important data
 * @param object: obj
 */
async function init_object(obj) {
  //get the data and coverage for the object
  //Note coverage is the time window where positioning data exists
  let obj_data = await net.get_object(obj);
  let obj_cov = await net.get_coverage(obj);

  //Then we add a new entry for that object with 4 keys/values:
  app_store.objects[obj] = {
    name: obj_data.name,
    id: obj_data.id,
    position: {},
    coverage: obj_cov
  }
}

/**
 * @name update_objects()
 * @description update each object in the app_store dictionary
 */
async function update_objects() {
  for(let key of Object.keys(app_store.objects)) {
    let spice_pos = await net.get_frame(key, "earth", app_store.working_date);

    /*
      * Coordinate frames:
      *
      *    ThreeJS           SPICE
      *      |Y                |Z
      *      |                 |
      *      |                 |
      *      |________         |________
      *     /        X        /        Y
      *    /                 /
      *   /Z                /X
      */
    app_store.objects[key].position = {
      x: spice_pos.frame.y,
      y: spice_pos.frame.z,
      z: spice_pos.frame.x,
      dx: spice_pos.frame.dy,
      dy: spice_pos.frame.dz,
      dz: spice_pos.frame.dx
    }
  }
}

/**
 * @name init_store()
 * @description initialize the app_store dict and begin our update loop
 */
export
async function init_store() {
  //get the coverage of the main object, and store it
  app_store.coverage = await net.get_coverage("main");
  if(new Date() > app_store.coverage.start && new Date() < app_store.coverage.end) {
    app_store.working_date = new Date();
  } else {
    app_store.working_date = new Date(app_store.coverage.start);
  }
  //dispatch to the application that we are updating the simulation time to the start of the coverage window
  reduxStore.dispatch({type: UPDATE_SIMULATION_TIME, payload: app_store.working_date.getTime() })
  app_store.update_frequency = 1;

  //define each object in the app store to be empty
  app_store.objects = {};
  //then for each object, intialize it and then wait for each object to be initially updated before continuing
  for(let obj of base_objects) {
    await init_object(obj);
  }
  await update_objects();

  //here we start our update loop using some javascript hacks
  will_refresh_loop = true;
  start_loop();
}

export
/**
 * @name start_loop() 
 * @description repeatedly calls request_loop() and then times out the request if it exceeds the updatePeriod
 */
 //NOTE: this is what allows the application to recover from short disconnections
function start_loop() {
  timeout_ref = setTimeout(request_loop, config.updatePeriod);
}

//occastionally needed in some weird edge cases
export
function restart_loop() {
  stop_loop();
  start_loop();
}

export
function stop_loop() {
  clearTimeout(timeout_ref);
}

/**
 * @name request_loop()
 * @description request the position of all of the objects in the simulation and update them
 */
async function request_loop() {
  //first we update our time based on our time period, then dispatch that we are updating the time to that time.
  app_store.working_date.setTime(app_store.working_date.getTime() + (config.updatePeriod * app_store.update_frequency));
  reduxStore.dispatch({type: UPDATE_SIMULATION_TIME, payload: app_store.working_date.getTime()});
  //if we are inside the coverage window still, update our objects and restart this loop
  if(app_store.working_date < app_store.coverage.end && app_store.working_date > app_store.coverage.start) {
    update_objects();

    //reissue timeout;
    if(will_refresh_loop){
      restart_loop();
      return;
    }
  }
  //If we are outside the coverage window, stop the update loop.
  stop_loop();
}

//these are all just short helper functions
export
function get_working_date() {
  return app_store.working_date;
}

export
function set_working_date(date) {
    app_store.working_date = date;
    update_objects();
    restart_loop();
}

export
function get_update_frequency() {
  return app_store.update_frequency;
}

export
function set_update_frequency(freq) {
    app_store.update_frequency = freq;
}

export
function get_object_name(object) {
  return app_store.objects[object].name;
}

export
function get_object_id(object) {
  return app_store.objects[object].id;
}

export
function get_object_position(object) {
  return app_store.objects[object].position;
}

export
function get_object_coverage(object) {
  return app_store.objects[object].coverage;
}

export
function get_coverage() {
  return app_store.coverage;
}
