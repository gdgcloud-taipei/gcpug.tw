# Copy this file into secrets.py and set keys, secrets and scopes.

# This is a session secret key used by webapp2 framework.
# Get 'a random and long string' from here:
# http://clsc.net/tools/random-string-generator.php
# or execute this from a python shell: import os; os.urandom(64)
# python -c "import os; print os.urandom(64)" > session-secret

import os

def SibPath(name):
  """Generate a path that is a sibling of this file.

  Args:
    name: Name of sibling file.
  Returns:
    Path to sibling file.
  """
  return os.path.join(os.path.dirname(__file__), name)

SESSION_KEY = open(SibPath('session-secret')).read()