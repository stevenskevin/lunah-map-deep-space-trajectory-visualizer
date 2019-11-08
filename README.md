# LunaH-Map Deep Space Trajectory Visualizer

## Build Instructions

The only officially supported operating systems are Debian-based Linux Distributions. Ubuntu in particular is recommended.

To begin, install the following packages:  
- curl
- libboost-python-dev
- libboost-filesystem-dev
- build-essential
- python3-dev
- nodejs
- npm

**NOTE:** On Ubuntu, you may have to enable the "Universe" PPA to be able to install libboost-python-dev. You can do so by running `add-apt-repository universe` as root.

Cmake is also required, but the necessary version is not available in apt repositories as of the time of this writing.  
Cmake can be downloaded and installed from the following link: https://cmake.org/download/. The latest version should work.

Once dependencies are downloaded, `cd` into the project root.

The first step is to build the Spyce library.  
Run the following commands:  
```bash
cd spyce
cmake .
```
**If on Raspberry Pi:** See the "Special Instructions for Raspberry Pi: Building CSpice" section for additional steps to take at this point. Then continue:
```bash
make
mv spyce.so ../
```
If `make` fails with an error about `pyconfig.h`, do `export CPLUS_INCLUDE_PATH="$CPLUS_INCLUDE_PATH:/usr/include/python3.5/"` (adjusting the Python version number if needed) and try it again.

Afterwards, `cd` back to the project.

This will also move the Spyce library into the project root where the flask server is expecting it.

Before being able to compile the frontend, you must install the dependencies:  
**If on Raspberry Pi:** See the "Special Instructions for Raspberry Pi: Updating Node and npm" section for additional steps to take before running `npm install`.
```bash
npm install
```

The frontend software must now be compiled, which can be done by running the following:

```bash
npm run build
```

This will compile the web files into the `dist/` directory.

The last step is to populate the config directory.

Two required kernel files can be downloaded from NASA:

 - The leapseconds descriptor kernel
   - https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/latest_leapseconds.tls
 - Planetary ephemeris kernel
   - https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de430.bsp

A third kernel is required for the ephemeris data of the satellite, and this must be provided externally.

All kernel files should be placed in the `config/kernels/` directory. 
A JSON config file will also have to be created at `config/config.json`. 
An example is provided below:
```JSON
{
    "main_subject_id": -39,
    "main_subject_name": "LMAP",
    "kernels": [
        "planets.bsp",
        "LMAP_FullTrajectory.bsp",
        "latest_leapseconds.tls"
    ]
}
```

Change the data to match the subject satellite and add the kernels as they are in the kernels folder.

Lastly, the server dependencies must be installed, which can be done with the following commands:
```
sudo apt-get install -y python3-pip
sudo pip3 install flask
```

Once this is finished, the application can be run by executing `python3 FlaskServer.py` from the root directory and visiting http://localhost:5000 in a web browser.


### Special Instructions for Raspberry Pi

Raspberry Pi is not an officially supported platform at this time, but these instructions are provided in the hopes that they may be useful.

#### Building CSpice

NASA only provides x86 and x86_64 builds of CSpice, so for Raspberry Pi, it must be built manually.

First, install build dependencies:
```bash
sudo apt-get install csh
```

Now `cd` to some temporary folder outside of the main project directory.  
Download the latest 64-bit Linux CSpice toolkit release in `tar.Z` format from [NASA JPL NAIF's website](https://naif.jpl.nasa.gov/naif/toolkit_C_PC_Linux_GCC_64bit.html), which contains source code in addition to the (useless, in this case) x86_64 build. Please note that the source code itself varies depending on the build you choose, so it's important to get the code from the Linux 64-bit download.

Extract it and `cd` into it:
```bash
zcat cspice.tar.Z | tar -xvf -
cd cspice
```
Copy `fix_cspice_for_rpi.py` from the root project directory and place it in this `cspice` folder. Then:
```bash
python3 fix_cspice_for_rpi.py
csh makeall.csh
```
Next, copy-paste `cspice.a` from the `lib` folder into `<project_root>/spyce/cspice/lib/`.  
Delete or rename the existing `libcspice_linux_32.a` in that folder, and rename `cspice.a` to that. (Yes, 32. Not 64.)

Finally, `cd` back to the project root and continue the original steps.

#### Updating Node and npm

As of 2019, the versions of Node.js and npm in the Raspberry Pi repositories are too outdated to use for this project. `cd` to the root project directory if you're not already there, and then update Node with:
```bash
npm cache clean -f
sudo npm install -g n
sudo n stable
```
At this point, `node` and `sudo node` refer to the old and new versions of Node, respectively. Sorry.  
Next, update npm:
```bash
sudo npm install -g npm
sudo npm install -g npm
```
[Yes, you need to run it twice.](https://askubuntu.com/a/562432)

Also [update node-gyp](https://github.com/nodejs/node-gyp/wiki/Updating-npm's-bundled-node-gyp), which is needed to compile native npm packages (specifically, the "`deasync`" package):
```bash
sudo npm explore npm -g -- npm install node-gyp@latest
```

From this point on, run all `npm` commands with `sudo`, even those that aren't shown with it in this readme. (TODO: find a better method for updating Node that doesn't cause this problem.)
