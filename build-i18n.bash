#!/bin/bash

set -exuo pipefail

FILE_PATTERN="src/**/*.{js,jsx,ts,tsx,json}"

i18next "${FILE_PATTERN}" [-oc] -c "./i18next-parser.config.js" -o "locales/\$LOCALE/\$NAMESPACE.json"
