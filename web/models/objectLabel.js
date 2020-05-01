import * as THREE from '../three/three';

const visibleHeightOfObject = ( object, camera ) => {
  let object_pos = new THREE.Vector3();
  object_pos.setFromMatrixPosition(object.matrixWorld)
  const depth = camera.position.distanceTo(object_pos);

  const vFOV = camera.fov * Math.PI / 180;
  return 2 * Math.tan( vFOV / 2 ) * Math.abs( depth );
};

export default
class ObjectLabel {
  constructor(object, string) {
    this.object = object;
    let html_label = document.createElement("div");
    html_label.className = "text-label",
    html_label.style.position = 'absolute';
    html_label.style.display = "block";
    html_label.style.width = 1;
    html_label.style.height = 1;
    html_label.style.top = -1000;
    html_label.style.left = -1000;
    html_label.innerHTML = string;

    this.html_label = html_label;

    document.body.appendChild(html_label);
  }

  updatePosition(renderer, camera, showLabel) {
    //get world position of object
    let screen_position = new THREE.Vector3()
    screen_position.setFromMatrixPosition( this.object.matrixWorld );

    //project vector onto camera plane
    window.log = camera
    screen_position.project(camera);

    //get height of object
    //updated below to prevent warning spam in console
    let bounding_box = new THREE.Box3().setFromObject(this.object);
    let obj_width = new THREE.Vector3();
    obj_width = bounding_box.getSize(obj_width).y;
    //get ratio of size of object to size of screen
    let display_ratio = obj_width / visibleHeightOfObject(this.object, camera);
    //get display height of object in pixels
    let display_height = renderer.domElement.height * display_ratio;

    let widthHalf = (renderer.domElement.width/2),
    heightHalf = (renderer.domElement.height/2)

    //convert projection coordinates into screen coordinates
    this.html_label.style.left = ( screen_position.x * widthHalf ) + widthHalf;
    //subtract half of display height to put label over object.
    this.html_label.style.top  = - ( screen_position.y * heightHalf ) + heightHalf - (display_height/1.5);

    //calculate camera frustum
    let frustum = new THREE.Frustum();
    frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));

    //check if the parent object intersects the frustum
    // this allows us to check is in front of, or behind the screen.
    if(frustum.intersectsObject(this.object) && showLabel) {
      //if intresection, show the label
      this.html_label.style.display = "block";
    } else {
      //else hide
      this.html_label.style.display = "none";
    }
  }
}
