#!/bin/bash
cd src
python -m SimpleHTTPServer &
xdg-open http://localhost:8000/