REST API
========

This page describes the complete REST API exposed by the Flask server.

.. contents:: Contents
    :local:


Kernel object access (``/api/objects``)
---------------------------------------

Please note:

*   "Object names" and "object IDs" refer to NAIF names and IDs.
*   The server uses all kernel files available to it when looking up objects.
*   Object names can be used wherever object IDs are expected, though this is
    discouraged.


``/api/objects`` (GET)
++++++++++++++++++++++

Provides a list of all available objects (from all kernel files) as an array of
JSON objects with ``"id"`` and ``"name"`` members:

.. code-block:: text

    [
        {
            "id": (integer),
            "name": (string)
        },
        ...
    ]

Example
'''''''

.. code-block:: text

    GET /api/objects

.. code-block:: json

    [
        {"id": 1, "name": "MERCURY BARYCENTER"},
        {"id": 2, "name": "VENUS BARYCENTER"},
        {"id": 3, "name": "EARTH BARYCENTER"}
    ]


``/api/objects/<id>`` (GET)
+++++++++++++++++++++++++++

Provides the ID and name of the object with the specified ID or name, as a JSON
object:

.. code-block:: text

    {
        "id": (integer),
        "name": (string)
    }

The response is an HTTP 404 if the object ID/name is not found.

Example 1
'''''''''

.. code-block:: text

    GET /api/objects/3

.. code-block:: json

    {"id": 3, "name": "EARTH BARYCENTER"}

Example 2
'''''''''

.. code-block:: text

    GET /api/objects/EARTH%20BARYCENTER

.. code-block:: json

    {"id": 3, "name": "EARTH BARYCENTER"}


``/api/objects/<id>/coverage`` (GET)
++++++++++++++++++++++++++++++++++++

Provides the timestamps of the earliest and latest available data for the
object with the specified ID or name. Note that data may not necessarily be
available for *all* times in this interval.

The response is a JSON object with ``"start"`` and ``"end"`` members, using
timestamps which are ISO 8601 strings in the UTC timezone:

.. code-block:: text

    {
        "start": (timestamp),
        "end": (timestamp)
    }

The response is an HTTP 404 if the object ID/name is not found.

Example
'''''''

.. code-block:: text

    GET /api/objects/3/coverage

.. code-block:: json

    {
        "start": "1549-12-30T23:59:19",
        "end": "2650-01-24T23:58:51"
    }


``/api/objects/<id>/frames`` (POST)
+++++++++++++++++++++++++++++++++++

Provides frame data for the object with the specified ID or name, at all of the
specified times.

The request body should be a JSON object with the following structure, where
timestamps are ISO 8601 strings in the UTC timezone:

.. code-block:: text

    {
        // "observer" is optional; the default observer is planet Earth
        "observer": (integer ID or string name),
        "times": [(array of timestamps)]
    }

Timestamps may be empty strings, in which case they are ignored.

The response is a JSON array containing one frame data entry for each timestamp
specified in the request (excluding empty-string timestamps):

.. code-block:: text

    [
        {
            "date": (timestamp),
            "frame": {
                "x": (float),
                "y": (float),
                "z": (float),
                "dx": (float),
                "dy": (float),
                "dz": (float)
            }
        },
        ...
    ]

This array may be sorted in the same order as the ``times`` array in the
request, but this is not guaranteed. (It depends on the version of Python the
server is running on.)

The response is an HTTP 400 if the ``times`` array is malformed, or an HTTP 404
if the object ID/name is not found.

Example
'''''''

.. code-block:: text

    POST /api/objects/3/frames

    {
        "observer": "earth",
        "times": [
            "2018-10-10T02:30:16.000Z",
            "2018-10-10T14:30:16.000Z",
            ""
        ]
    }

.. code-block:: json

    [
        {
            "date": "2018-10-10T02:30:16.000",
            "frame": {
                "dx": 0.1399554660011002,
                "dy": -1.9468433905848126,
                "dz": -0.6396063248633757,
                "x": -23729.848285589702,
                "y": -125715.4282678978,
                "z": -25873.95288366341
            }
        },
        {
            "date": "2018-10-10T14:30:16.000",
            "frame": {
                "dx": 0.22112686055709038,
                "dy": -1.329894842740333,
                "dz": -0.49671513697331404,
                "x": -15434.152435466227,
                "y": -194588.79173208485,
                "z": -50090.365676144786
            }
        }
    ]


Time conversion (``/api/convert``)
----------------------------------

Documentation on the ET time format is available `on NAIF\'s website <https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/Tutorials/pdf/individual_docs/15_time.pdf>`_.

``/api/convert/et`` (POST)
++++++++++++++++++++++++++

Converts a time in UTC format (ISO 8601 string) to ET (J2000).

The request body should be a JSON object with a single ``"utc_time"`` member
(an ISO 8601 string):

.. code-block:: text

    {
        "utc_time": (timestamp)
    }

The response is a JSON object containing the specified time in both UTC (ISO
8601 string) and ET (J2000) formats:

.. code-block:: text

    {
        "UTC": (timestamp),
        "J2000": (float)
    }

The response is an HTTP 400 if the request is malformed.

Example
'''''''

.. code-block:: text

    POST /api/convert/et

    {
        "utc_time": "2018-10-10T02:30:16"
    }

.. code-block:: json

    {"UTC": "2018-10-10T02:30:16", "J2000": 592410685.182348}


``/api/convert/utc`` (POST)
+++++++++++++++++++++++++++

Converts a time in ET format (J2000) to UTC (ISO 8601 string).

The request body should be a JSON object with a single ``"et_time"`` member:

.. code-block:: text

    {
        "et_time": (float)
    }

The response is a JSON object containing the specified time in both UTC (ISO
8601 string) and ET (J2000) formats:

.. code-block:: text

    {
        "UTC": (timestamp),
        "J2000": (float)
    }

The response is an HTTP 400 if the request is malformed.

Example
'''''''

.. code-block:: text

    POST /api/convert/utc

    {
        "et_time": 592410685.182348
    }

.. code-block:: json

    {"UTC": "2018-10-10T02:30:16", "J2000": 592410685.182348}


Other
-----

``/``
+++++

Redirects to `/index.html`.


``/<file_path>`` (GET)
++++++++++++++++++++++

This is used as a fallback if none of the more specific URL patterns match.

Retrieves the file with the specified path and filename, relative to the
``dist/`` folder. (This is implemented in a secure way that prevents directory
traversal exploits.)
