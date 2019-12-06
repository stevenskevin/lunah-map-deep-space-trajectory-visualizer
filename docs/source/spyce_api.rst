Spyce API
=========

.. py:module:: spyce


This page describes the Spyce library's Python API.

.. contents:: Contents
    :local:


Classes
-------

.. py:class:: Frame

    This immutable class is used to convey the position and velocity of an
    object with respect to some other object.

    :py:class:`Frame` objects are created directly from the output of the
    CSpice `spkez_c() function
    <https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/spkez_c.html>`_;
    check that documentation for more detailed information.

    .. py:attribute:: x
    .. py:attribute:: y
    .. py:attribute:: z

        Components of the object's position, with respect to some observer.

        :type: :py:class:`double`

    .. py:attribute:: dx
    .. py:attribute:: dy
    .. py:attribute:: dz

        Components of the object's velocity, with respect to some observer.

        :type: :py:class:`double`


Functions
---------

Loading/unloading kernel files
++++++++++++++++++++++++++++++

.. py:function:: add_kernel(filename: str) -> None

    Load the kernel file with the provided filename. You can unload it later
    with :py:func:`remove_kernel`.

    Implementation note: this uses CSpice's `furnsh_c()
    <https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/furnsh_c.html>`_.

.. py:function:: remove_kernel(filename: str) -> None

    Unload the kernel file with the provided filename, which must have been
    previously loaded with :py:func:`add_kernel`.

    Implementation note: this uses CSpice's `unload_c()
    <https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/unload_c.html>`_.


Object name/ID conversion
+++++++++++++++++++++++++

.. py:function:: str_to_id(naif_id: str) -> int

    Convert a given kernel object name to its corresponding integer ID. If the
    name is not found, raises :py:exc:`IDNotFoundError`.

    Implementation note: this uses CSpice's `bodn2c_c()
    <https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/bodn2c_c.html>`_.

.. py:function:: str_to_id(naif_id: int) -> str

    Convert a given kernel object ID to its corresponding string name. If the
    ID is not found, raises :py:exc:`IDNotFoundError`.

    Implementation note: this uses CSpice's `bodc2n_c()
    <https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/bodc2n_c.html>`_.


Time conversion
+++++++++++++++

.. py:function:: utc_to_et(date: str) -> float

    Convert a time in UTC format (ISO 8601 string) to ET (J2000). Examples of
    valid input strings can be found `on NAIF's website
    <https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/utc2et_c.html#Examples>`__.

    Implementation note: this uses CSpice's `utc2et_c()
    <https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/utc2et_c.html>`_.

.. py:function:: et_to_utc(date: float, format: string) -> string

    Convert a time in ET format (J2000) to UTC (ISO 8601 string). A detailed
    explanation of the "format" parameter can be found `on NAIF's website
    <https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/et2utc_c.html#Detailed_Input>`__.

    Implementation note: this uses CSpice's `et2utc_c()
    <https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/et2utc_c.html>`_.


Data access
+++++++++++

.. py:function:: get_objects(filename: str) -> List[int]

    Return a list of all object IDs in the kernel with the specified filename.

    Implementation note: this uses CSpice's `spkobj_c()
    <https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/spkobj_c.html>`_.

.. py:function:: get_coverage_windows(filename: str, object_id: int) -> List[Tuple[float, float]]

    Return a list containing all time intervals for which the specified kernel
    file has data regarding the specified object. Each time interval is given
    as a tuple ``(beginning, end)``, where both elements are floats.

    Implementation note: this uses CSpice's `spkcov_c()
    <https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/spkcov_c.html>`_.

.. py:function:: get_frame_data(target_id: int, observer_id: int, e_time: float) -> Frame

    Return a :py:class:`Frame` object containing the position and velocity of
    a specified kernel object, relative to a specified observer object, at a
    specified time.

    Implementation note: this uses CSpice's `spkez_c()
    <https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/spkez_c.html>`_.

    :param int target_id: the ID of the object to get data for
    :param int observer_id: the position/velocity data will be relative to this
        object
    :param float e_time: the time to get position/velocity data for, specified
        in ET format (J2000).
    :rtype: Frame


Exceptions
----------

Whenever one of these exceptions can be raised by more than one CSpice error,
the exception message indicates which one it was. (The message will not be
exactly the same as the CSpice error name, though.)

.. py:exception:: FileNotFoundError

    A kernel file was not found.

    Corresponds to CSpice ``SPICE(NOSUCHFILE)`` errors.

.. py:exception:: InvalidFileError

    A kernel file had an invalid format.

    Corresponds to the following CSpice errors:

    *   ``SPICE(BADFILETYPE)``
    *   ``SPICE(BADARCHTYPE)``
    *   ``SPICE(INVALIDFORMAT)``

.. py:exception:: InvalidArgumentError

    A function argument was invalid.

    Corresponds to the following CSpice errors:

    *   ``SPICE(EMPTYSTRING)``
    *   ``SPICE(INVALIDTIMESTRING)``
    *   ``SPICE(INVALIDTIMEFORMAT)``

.. py:exception:: IDNotFoundError

    The requested object ID couldn't be found.

    Corresponds to CSpice ``SPICE(IDCODENOTFOUND)`` errors, as well as other
    situations in which an ID is not found.

.. py:exception:: InsufficientDataError

    There isn't enough data available to perform the requested action. `Usually
    this means you need to load more kernel files.
    <https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/req/problems.html#Problem:%20SPICE(SPKINSUFFDATA)%20error%20is%20signaled>`_

    Corresponds to CSpice ``SPICE(SPKINSUFFDATA)`` errors.

.. py:exception:: InternalError

    An unspecified internal error occurred.

    Corresponds to every CSpice error Spyce doesn't recognize.
