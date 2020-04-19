from flask import (Flask, request, send_from_directory, redirect, jsonify, abort, json)
import spyce
import os, os.path

EARTH = 399

# This can be overridden by the automatic tests
STATIC_FILES_DIRECTORY = 'dist'

app = Flask(__name__)
kernels = []
main_subject_id = None
main_subject_name = ''


#
# Helper Functions
#

def load_config(conf_data=None):
    """
    Load the information from config/config.json into appropriate
    global variables.
    conf_data overrides the json data (used for automatic testing)
    """
    global main_subject_id
    global main_subject_name

    if conf_data is None:
        with open('config/config.json', 'r', encoding='utf-8') as conf_file:
            conf_data = json.load(conf_file)

    for kern in conf_data['kernels']:
        kernel_filepath = os.path.normpath('config/kernels/' + kern)
        spyce.add_kernel(kernel_filepath)
        kernels.append(kernel_filepath)

    main_subject_id = conf_data['main_subject_id']
    main_subject_name = conf_data['main_subject_name']


def get_object(identifier):
    """
    Look up the object with the given ID (int or str) or name (str), and
    return a dict containing its ID and name, as
    {'id': id, 'name': name}

    Abort with a 404 if no such object can be found.
    """
    obj_name = None
    obj_id = None
    try:
        obj_id = int(identifier)
    except ValueError:
        obj_name = identifier

    if obj_id == main_subject_id or obj_name == main_subject_name or obj_name == 'main':
        return {'id': main_subject_id, 'name': main_subject_name}
    else:
        try:
            if obj_id:
                obj_name = spyce.id_to_str(obj_id)
            else:
                obj_id = spyce.str_to_id(obj_name)
            return {'id': obj_id, 'name': obj_name}
        except spyce.InternalError:
            abort(404, 'SPICE object not found.')
        except spyce.IDNotFoundError:
            abort(404, 'SPICE object not found.')


def frame_to_dict(frame):
    """
    Return a dict containing the frame's x/y/z/dx/dy/dz attributes.
    """
    return {
        'x': frame.x,
        'y': frame.y,
        'z': frame.z,
        'dx': frame.dx,
        'dy': frame.dy,
        'dz': frame.dz
    }


#
# API Endpoints
#

@app.route('/')
def root():
    """
    Redirect to index page
    """
    return redirect('/index.html')


@app.route('/<path:filename>', methods=['GET'])
def get_file(filename):
    """
    Get the requested file path from the dist/ folder
    """
    return send_from_directory(STATIC_FILES_DIRECTORY, filename)


@app.route('/api/objects', methods=['GET'])
def get_all_objects():
    """
    Return an array of all available SPICE objects (as ID/name dicts)
    """
    jsonResponse = []
    for k in kernels:
        try:
            for obj_id in spyce.get_objects(k):
                jsonResponse.append(get_object(obj_id))
        except spyce.InternalError:
            #Happens when trying get_objects on kernels that don't have objects: leapseconds for example
            pass
    return jsonify(jsonResponse)


@app.route('/api/objects/<object_identifier>', methods=['GET'])
def handle_get_object_request(object_identifier):
    """
    Return the ID/name dict for a single specified object
    """
    return jsonify(get_object(object_identifier))


@app.route('/api/objects/<object_identifier>/coverage', methods=['GET'])
def get_coverage_window(object_identifier):
    """
    Return the coverage window for the specified object:
    {
        start: <ISO_8601 string>,
        end: <ISO_8601 string>,
    }
    """

    NAIF_id = get_object(object_identifier)['id']
    windows_piecewise = []
    for k in kernels:
        try:
            windows_piecewise += spyce.get_coverage_windows(k, NAIF_id)
            windows_piecewise.sort(key=lambda x: x[0])
        except spyce.InternalError:
            # Object does not exist in this kernel.
            pass
    if len(windows_piecewise) > 0:
        return jsonify({
            'start': spyce.et_to_utc(windows_piecewise[0][0], 'ISOC'),
            'end': spyce.et_to_utc(windows_piecewise[-1][1], 'ISOC')
        })
    else:
        abort(404, "No Coverage found")


@app.route('/api/objects/<object_identifier>/frames', methods=['POST'])
def get_frame_data(object_identifier):
    """
    Get the frame data for the specified objects at the provided times.

    Request body:
    {
        times: array of <ISO_8601 strings>,
        observer: (int or string: NAIF ID or NAIF name),
    }

    Response: array of frame data objects:
    [
        {
            date: <ISO_8601 string>,
            frame: {
                x: <float>,
                y: <float>,
                z: <float>,
                dx: <float>,
                dy: <float>,
                dz: <float>,
            }
        }
    ]
    """
    obj_id = get_object(object_identifier)['id']
    req_json = request.get_json()
    utc_times = req_json.get('times', None)
    if utc_times == None or not isinstance(utc_times, list):
        abort(400, 'Invalid Argument')

    times_in_J2000 = {}
    for t in utc_times:
        #to handle empty strings
        if not len(t):
            continue

        #utc_to_et requires UTC strings but will not accept them if they
        # are appended with the letter 'Z'(indicating UTC) despite this being part of the ISO 8601 spec
        # we remove the letter if it exists
        t = t[:-1] if t[-1] == 'Z' else t
        try:
            J2000time = spyce.utc_to_et(t)
            times_in_J2000[t] = J2000time
        except spyce.InvalidArgumentError:
            abort(400, 'Invalid time strinet')
        except spyce.InternalError:
            print('[WARN]: unknown error parsing date: ', t)
    observer = get_object(req_json.get('observer', EARTH))['id']
    frames = []

    for utc, J2000 in times_in_J2000.items():
        try:
            frame = frame_to_dict(spyce.get_frame_data(obj_id, observer, J2000))
            frames.append({
                'date': utc,
                'frame': frame
            })
        except (spyce.InternalError, spyce.InsufficientDataError):
            #object not found in this kernel or at this time.
            pass
    return jsonify(frames)


@app.route('/api/convert/et', methods=['POST'])
def toJ2000():
    """
    Convert a time from UTC to ET (J2000).

    Request body:
    {
        utc_time: <ISO_8601 string>,
    }

    Response:
    {
        UTC: <ISO_8601 string>,
        J2000: <float>,
    }
    """
    req_json = request.get_json()
    if req_json == None:
        abort(400, 'Missing json request body')
    time = req_json.get("utc_time", None)
    if time == None:
        abort(400, 'utc_time param missing')

    try:
        return jsonify({
            'UTC': time,
            'J2000': spyce.utc_to_et(str(time))
        })
    except spyce.InvalidArgumentError:
        abort(400, 'Invalid Time String')
    except spyce.InternalError:
        abort(500)


@app.route('/api/convert/utc', methods=['POST'])
def toUTC():
    """
    Convert a time from ET (J2000) to UTC.

    Request body:
    {
        et_time: <float>,
    }

    Response:
    {
        UTC: <ISO_8601 string>,
        J2000: <float>,
    }
    """
    req_json = request.get_json()
    if req_json == None:
        abort(400, 'missing json request body')
    time = req_json.get("et_time", None)
    if time == None:
        abort(400, 'et_time field missing')

    try:
        float(time)
    except ValueError:
        abort(400, 'et_time param malformed')

    try:
        return jsonify({
            'UTC': spyce.et_to_utc(time, 'ISOC'),
            'J2000': float(time)
        })
    except ValueError:
        abort(400, 'Time is not in J2000 format: must be a float')
    except spyce.InvalidArgumentError:
        abort(400, 'J2000 value is inappropriate.')
    except spyce.InternalError:
        abort(500)


if __name__ == '__main__':
    try:
        load_config()
    except Exception as e:
        print ('[ERROR]: Unable to load config')

    port = os.getenv('PORT', 5000)
    host = '0.0.0.0'

    app.run(host=host, port=port)
