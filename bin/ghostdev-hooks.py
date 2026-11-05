"""One-release entry compatibility; canonical logic is in orkest-hooks.py."""
import importlib.util
from pathlib import Path
import sys
sys.dont_write_bytecode = True
_spec = importlib.util.spec_from_file_location('orkest_hooks_compat', Path(__file__).with_name('orkest-hooks.py'))
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
if __name__ == '__main__':
    raise SystemExit(_module.main())
globals().update({key: value for key, value in vars(_module).items() if not key.startswith('__')})
