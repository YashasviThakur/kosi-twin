import os

os.environ["KOSI_AWS"] = "0"   # unit tests never call AWS; see tests/live_aws_check.py for the real services
