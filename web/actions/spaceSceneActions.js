
/** Actions types */
export const UPDATE_SIMULATION_TIME = 'UPDATE_SIMULATION_TIME';
export const UPDATE_ANIMATION_SPEED = 'UPDATE_ANIMATION_SPEED';
export const UPDATE_TRAIL_TYPE = 'UPDATE_TRAIL_TYPE';
export const UPDATE_CAMERA = 'UPDATE_CAMERA';
export const TOGGLE_LABELS = 'TOGGLE_LABELS';

/**
 * Action dispatchers (Redux)
 * Essentially these are called when the user performs an action that requires an update to our scene (aka. clicks on a button)
 */
export const updateSimulationTime = (newTime) => dispatch => {
  dispatch({type: UPDATE_SIMULATION_TIME, payload: newTime});
}

export const updateAnimationSpeed = (newSpeed) => dispatch => {
  dispatch({type: UPDATE_ANIMATION_SPEED, payload: newSpeed});
}

export const updateCamera = (newCamera) => dispatch => {
  dispatch({type: UPDATE_CAMERA, payload: newCamera})
}

export const updateTrailType = (newTrailType) => dispatch => {
  dispatch({type: UPDATE_TRAIL_TYPE, payload: newTrailType})
}

export const toggleLabels = (showLabels) => dispatch => {
  dispatch({type: TOGGLE_LABELS, payload: showLabels});
}
