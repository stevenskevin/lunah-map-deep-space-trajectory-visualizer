import pathlib

import pytest
import spyce

#
# Constants
#

STATIC_FOLDER = pathlib.Path('static')

# https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/
LEAPSECONDS_KERNEL_FILES = [
    STATIC_FOLDER / 'latest_leapseconds.tls',
]

# https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/
PLANET_EPHEMERIS_BSP_FILE = STATIC_FOLDER / 'de430.bsp'
PLANET_EPHEMERIS_KERNEL_FILES = [
    PLANET_EPHEMERIS_BSP_FILE,
]
EARTH_INT_ID = 399

# https://naif.jpl.nasa.gov/pub/naif/APOLLO/kernels/
APOLLO_BSP_FILE = STATIC_FOLDER / 'apollo15-1.bsp'
APOLLO_KERNEL_FILES = [
    APOLLO_BSP_FILE,
    STATIC_FOLDER / 'apollo_naif_ids.tf',
]
APOLLO15_INT_ID = -915
APOLLO15_STR_ID = 'APOLLO15'
APOLLO15_COVERAGE_WINDOWS = [
    pytest.approx([-897044358.3260887, -896975958.324057]),
    pytest.approx([-896974158.3240035, -896822958.3195117]),
]


#
# Fixtures
#


def kernel_files(filenames):
    """
    Context manager that loads some kernel files (from a provided list
    of filenames (pathlib.Path)), yields the list of filenames (as
    strs), and unloads them when the test is finished.
    """
    for fn in filenames:
        spyce.add_kernel(str(fn))

    yield [str(fn) for fn in filenames]

    for fn in filenames:
        spyce.remove_kernel(str(fn))


@pytest.fixture(scope='session')
def leapseconds_kernel_files():
    """
    Fixture for loading the leapseconds kernel files
    """
    yield from kernel_files(LEAPSECONDS_KERNEL_FILES)


@pytest.fixture(scope='session')
def planet_ephemeris_kernel_files():
    """
    Fixture for loading the planet ephemeris kernel files
    """
    yield from kernel_files(PLANET_EPHEMERIS_KERNEL_FILES)


@pytest.fixture(scope='session')
def apollo_kernel_files():
    """
    Fixture for loading the Apollo kernel files
    """
    yield from kernel_files(APOLLO_KERNEL_FILES)


#
# Spyce function tests
#


def test_add_remove_kernel():
    """
    Test add_kernel() and remove_kernel()
    """
    # Ensure that the kernels aren't loaded
    with pytest.raises(spyce.IDNotFoundError):
        spyce.id_to_str(APOLLO15_INT_ID)

    # Load the kernels with add_kernel
    for kfn in APOLLO_KERNEL_FILES:
        spyce.add_kernel(str(kfn))

    # Ensure that the kernel *is* now loaded
    spyce.id_to_str(APOLLO15_INT_ID)

    # Unload the kernels
    for kfn in APOLLO_KERNEL_FILES:
        spyce.remove_kernel(str(kfn))

    # Ensure that the kernels are no longer loaded
    with pytest.raises(spyce.IDNotFoundError):
        spyce.id_to_str(APOLLO15_INT_ID)


def test_str_id_conversion(apollo_kernel_files):
    """
    Test str_to_id() and id_to_str()
    """
    assert spyce.str_to_id(APOLLO15_STR_ID) == APOLLO15_INT_ID
    assert spyce.id_to_str(APOLLO15_INT_ID) == APOLLO15_STR_ID


def test_utc_et_conversion(leapseconds_kernel_files):
    """
    Test utc_to_et() and et_to_utc()
    """
    assert spyce.utc_to_et('1996-12-18T12:28:28') == pytest.approx(-95815829.81644952)
    assert spyce.utc_to_et('2000-01-01T11:58:56') == pytest.approx(0.18392726328546233)

    assert spyce.et_to_utc(-95815829.81644952, 'C') == '1996 DEC 18 12:28:28'
    assert spyce.et_to_utc(-95815829.81644952, 'ISOC') == '1996-12-18T12:28:28'
    assert spyce.et_to_utc(0.0, 'C') == '2000 JAN 01 11:58:56'
    assert spyce.et_to_utc(0.0, 'ISOC') == '2000-01-01T11:58:56'


def test_get_objects():
    """
    Test get_objects().
    Note that the kernel does not actually have to be loaded for this
    function to work.
    """
    assert spyce.get_objects(str(APOLLO_BSP_FILE)) == [APOLLO15_INT_ID]


def test_get_coverage_windows():
    """
    Test get_coverage_windows().
    Note that the kernel does not actually have to be loaded for this
    function to work.
    """
    assert spyce.get_coverage_windows(str(APOLLO_BSP_FILE), APOLLO15_INT_ID) == APOLLO15_COVERAGE_WINDOWS


def test_get_frame_data(apollo_kernel_files, planet_ephemeris_kernel_files):
    """
    Test get_frame_data().
    """
    JULY_31_1971 = -896957958.816704

    frame = spyce.get_frame_data(APOLLO15_INT_ID, EARTH_INT_ID, JULY_31_1971)
    assert frame.x == pytest.approx(-285887.8720670305)
    assert frame.y == pytest.approx(-240502.97470245895)
    assert frame.z == pytest.approx(-145022.20088735493)
    assert frame.dx == pytest.approx(-0.8664631628329045)
    assert frame.dy == pytest.approx(-0.4454168424206388)
    assert frame.dz == pytest.approx(-0.6584766393115672)


#
# Spyce exception tests
#


def test_FileNotFoundError():
    """
    Test FileNotFoundError.
    """
    with pytest.raises(spyce.FileNotFoundError):
        spyce.add_kernel(str(STATIC_FOLDER / 'nonexistent.bsp'))


# TODO: find a situation that triggers InvalidFileError


def test_InvalidArgumentError():
    """
    Test InvalidArgumentError.
    """
    with pytest.raises(spyce.InvalidArgumentError):
        spyce.add_kernel('')


def test_IDNotFoundError():
    """
    Test IDNotFoundError.
    """
    with pytest.raises(spyce.IDNotFoundError):
        spyce.id_to_str(1234567)


def test_InsufficientDataError():
    """
    Test InsufficientDataError.
    """
    with pytest.raises(spyce.InsufficientDataError):
        spyce.get_frame_data(APOLLO15_INT_ID, EARTH_INT_ID, 0)


def test_InternalError():
    """
    Test InternalError.
    """
    with pytest.raises(spyce.InternalError):
        spyce.get_objects(str(LEAPSECONDS_KERNEL_FILES[0]))
