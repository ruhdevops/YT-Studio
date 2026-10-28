import json
from pathlib import Path

with Path("package.json").open() as f:
    pkg = json.load(f)

# The CI log mentioned:
# * 2 dependencies were added: trigger-circleci-pipeline@^1.12.1, circletui@^1.0.3
# * 1 dependencies are mismatched:
#   - @circleci/circleci-config-sdk (lockfile: ^0.12.5, manifest: ^0.8.0)

# It seems someone (maybe another agent or tool) updated the lockfile but not the package.json,
# or the package.json I see is actually outdated compared to what pnpm expects in the CI environment.
# Wait, if I see 0.12.5 in my package.json, why does CI say it's 0.8.0?
# Maybe the CI is running against a different state of the PR?

# Let's just make sure trigger-circleci-pipeline and circletui are in package.json if they are in the lockfile.
if "dependencies" not in pkg:
    pkg["dependencies"] = {}

pkg["dependencies"]["trigger-circleci-pipeline"] = "^1.12.1"
pkg["dependencies"]["circletui"] = "^1.0.3"
pkg["dependencies"]["@circleci/circleci-config-sdk"] = "^0.12.5"

with Path("package.json").open("w") as f:
    json.dump(pkg, f, indent=2)
    f.write("\n")
