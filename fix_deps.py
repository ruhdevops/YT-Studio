import json
from pathlib import Path

with Path("package.json").open() as f:
    pkg = json.load(f)

# Ensure required dependencies are present
if "dependencies" not in pkg:
    pkg["dependencies"] = {}

pkg["dependencies"]["trigger-circleci-pipeline"] = "^1.12.1"
pkg["dependencies"]["circletui"] = "^1.0.3"
pkg["dependencies"]["@circleci/circleci-config-sdk"] = "^0.12.5"

with Path("package.json").open("w") as f:
    json.dump(pkg, f, indent=2)
    f.write("\n")
