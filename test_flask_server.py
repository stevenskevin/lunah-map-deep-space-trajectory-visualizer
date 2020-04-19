import contextlib
import os, os.path
import pathlib
import sys

import flask
import pytest

import FlaskServer
import spyce


#
# Constants
#

# The following 3 IDs shouldn't match anything, including each other
MAIN_SUBJECT_ID = -10000
MAIN_SUBJECT_NAME = '-10001'
INVALID_ID = -10002

APOLLO15_INT_ID = -915
APOLLO15_STR_ID = 'APOLLO15'
APOLLO15_SERVER_RESPONSE = {'id': APOLLO15_INT_ID, 'name': APOLLO15_STR_ID}

MOON_STR_ID = 'MOON'

CONFIG_KERNELS = pathlib.Path('config/kernels').resolve()
STATIC_FOLDER = pathlib.Path('tests_static').resolve()

TESTING_CONFIG = {
    'kernels': [
        # Paths in this dictionary are relative to the "config/kernels"
        # directory, so we need to start with a couple "../"'s to get to
        # the actual directory where these are stored
        os.path.relpath(STATIC_FOLDER / 'latest_leapseconds.tls', CONFIG_KERNELS),
        os.path.relpath(STATIC_FOLDER / 'de430.bsp', CONFIG_KERNELS),
        os.path.relpath(STATIC_FOLDER / 'apollo15-1.bsp', CONFIG_KERNELS),
        os.path.relpath(STATIC_FOLDER / 'apollo_naif_ids.tf', CONFIG_KERNELS),
    ],
    'main_subject_id': MAIN_SUBJECT_ID,
    'main_subject_name': MAIN_SUBJECT_NAME,
}


#
# Fixtures
#


@pytest.fixture
def client():
    """
    A fixture providing a Flask client object for accessing the server.
    """
    with FlaskServer.app.test_client() as client:
        yield client


@pytest.fixture(scope='module')
def testing_config():
    """
    A fixture that loads the testing config into the server.
    """
    FlaskServer.load_config(TESTING_CONFIG)

    yield

    for k in FlaskServer.kernels:
        spyce.remove_kernel(k)
    FlaskServer.kernels.clear()


#
# Flask server tests
#


def test_root(client):
    """
    Test the / endpoint
    """
    resp = client.get('/')
    assert resp.status_code == 302  # "302 Found" (aka redirect)
    assert resp.headers['Location'].endswith('/index.html')


def test_static_files(client):
    """
    Test serving of static files
    """
    # Force the server to obtain its static files from the testing
    # static folder
    old_dir = FlaskServer.STATIC_FILES_DIRECTORY
    FlaskServer.STATIC_FILES_DIRECTORY = str(STATIC_FOLDER)

    # Request the latest_leapseconds.tls file
    resp = client.get('/latest_leapseconds.tls')
    assert resp.data.startswith(b'KPL/LSK\n')

    # Clean up by resetting the static files directory
    FlaskServer.STATIC_FILES_DIRECTORY = old_dir


def test_get_all_objects(client, testing_config):
    """
    Test the /api/objects endpoint
    """
    resp = client.get('/api/objects')
    j = resp.get_json()

    # Just check that more than one thing is in there,
    # and that one of them is Apollo 15
    assert len(j) > 1
    for entry in j:
        if entry == APOLLO15_SERVER_RESPONSE:
            break
    else:
        raise ValueError('Could not find Apollo 15 in the objects list')


def test_get_one_object(client, testing_config):
    """
    Test the /api/objects/<id> endpoint
    """
    # Test both by ID and by name
    for id in [str(APOLLO15_INT_ID), APOLLO15_STR_ID]:
        resp = client.get('/api/objects/' + id)
        assert resp.get_json() == APOLLO15_SERVER_RESPONSE

    # Response for nonexistent object
    resp = client.get('/api/objects/' + str(INVALID_ID))
    assert resp.status_code == 404


def test_get_object_coverage(client, testing_config):
    """
    Test the /api/objects/<id>/coverage endpoint
    """
    APOLLO15_COVERAGE_WINDOWS_SERVER_RESPONSE = {'start': '1971-07-30T01:00:00', 'end': '1971-08-01T14:30:00'}

    # Test both by ID and by name
    for id in [str(APOLLO15_INT_ID), APOLLO15_STR_ID]:
        resp = client.get('/api/objects/' + id + '/coverage')
        assert resp.get_json() == APOLLO15_COVERAGE_WINDOWS_SERVER_RESPONSE

    # Response for nonexistent object
    resp = client.get('/api/objects/' + str(INVALID_ID) + '/coverage')
    assert resp.status_code == 404


def test_post_object_frames(client, testing_config):
    """
    Test the /api/objects/<id>/frames (POST) endpoint
    """
    APOLLO15_FRAME_TIMES = ['1971 JUL 31 01:00:00', '1971 JUL 31 02:00:00']
    APOLLO15_INVALID_FRAME_TIME = '1965 JAN 11 01:00:00'
    APOLLO15_FRAMES_RELATIVE_TO_EARTH = [
        {
            'date': '1971 JUL 31 01:00:00',
            'frame': {
                'x': -285887.8720670305,
                'y': -240502.97470245895,
                'z': -145022.20088735493,
                'dx': -0.8664631628329045,
                'dy': -0.4454168424206388,
                'dz': -0.6584766393115672,
            },
        },
        {
            'date': '1971 JUL 31 02:00:00',
            'frame': {
                'x': -283588.1667145274,
                'y': -240001.24138706079,
                'z': -143498.7948626823,
                'dx': 2.2895190147299713,
                'dy': -0.8191792950887163,
                'dz': 0.09869213762837856,
            },
        },
    ]
    APOLLO15_FRAMES_RELATIVE_TO_MOON = [
        {
            'date': '1971 JUL 31 01:00:00',
            'frame': {
                'x': 144.16362137133322,
                'y': -1361.0783702131753,
                'z': -1232.7953580538697,
                'dx': -1.5755903953868629,
                'dy': 0.1743172159753839,
                'dz': -0.39225548079169986,
            },
        },
        {
            'date': '1971 JUL 31 02:00:00',
            'frame': {
                'x': -120.77021521829812,
                'y': 1361.8298148445106,
                'z': 1243.074751606993,
                'dx': 1.5738551539002716,
                'dy': -0.2049366550053968,
                'dz': 0.36161351430094785,
            },
        },
    ]
    assert APOLLO15_FRAMES_RELATIVE_TO_EARTH != APOLLO15_FRAMES_RELATIVE_TO_MOON

    # Test both by ID and by name
    for id in [str(APOLLO15_INT_ID), APOLLO15_STR_ID]:
        # Relative to Earth (default)
        resp = client.post('/api/objects/' + id + '/frames', json={'times': APOLLO15_FRAME_TIMES})
        assert resp.get_json() == APOLLO15_FRAMES_RELATIVE_TO_EARTH

        # Relative to Moon
        resp = client.post('/api/objects/' + id + '/frames', json={'observer': 'MOON', 'times': APOLLO15_FRAME_TIMES})
        assert resp.get_json() == APOLLO15_FRAMES_RELATIVE_TO_MOON

        # Response for a time the server has no data for
        resp = client.post('/api/objects/' + id + '/frames', json={'times': [APOLLO15_INVALID_FRAME_TIME]})
        assert resp.get_json() == []

    # Response for nonexistent object
    resp = client.post('/api/objects/' + str(INVALID_ID) + '/frames', json={'times': APOLLO15_FRAME_TIMES})
    assert resp.status_code == 404


CONVERSION_TEST_TIME = {'UTC': '1996-12-18T12:28:28', 'J2000': -95815829.81644952}


def test_convert_et(client, testing_config):
    """
    Test the /api/convert/et (POST) endpoint
    """
    # Basic request
    resp = client.post('/api/convert/et', json={'utc_time': CONVERSION_TEST_TIME['UTC']})
    assert resp.get_json() == CONVERSION_TEST_TIME

    # Empty request
    resp = client.post('/api/convert/et')
    assert resp.status_code == 400  # 400 "Bad Request"


def test_convert_utc(client, testing_config):
    """
    Test the /api/convert/utc (POST) endpoint
    """
    # Basic request
    resp = client.post('/api/convert/utc', json={'et_time': CONVERSION_TEST_TIME['J2000']})
    assert resp.get_json() == CONVERSION_TEST_TIME

    # Empty request
    resp = client.post('/api/convert/utc')
    assert resp.status_code == 400  # 400 "Bad Request"
