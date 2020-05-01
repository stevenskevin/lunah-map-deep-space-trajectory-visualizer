import React from "react";
import { render } from "react-dom";
import SpaceScene from './components/SpaceScene';
import './styles/styles.scss';
import SimulationControls from "./components/SimulationControls";
import { Provider } from 'react-redux';
import store from './store';

//Utilize Redux to define our app, it has two sections, SpaceScene and SimulationControls, which are imported above.
const App = () =>{
  return (
    <div>
      <Provider store={store}>
        <SpaceScene/>
        <SimulationControls/>
      </Provider>
    </div>
  )
};
//Render above application to the div we defined in our index.html file named "app"
render(<App />, document.getElementById("app"));
