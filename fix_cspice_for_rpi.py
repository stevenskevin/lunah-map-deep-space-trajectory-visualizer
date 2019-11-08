import pathlib

for f in pathlib.Path('.').glob('**/*.csh'):
    contents = f.read_text()
    if '-m64' in contents:
        f.write_text(contents.replace('-m64', ''))
