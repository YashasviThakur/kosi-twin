"""AWS clients and settings. Every AWS feature degrades to a local fallback when unavailable,
so the app keeps working without credentials, without Bedrock quota, or offline (tests set KOSI_AWS=0)."""
import os
import time
from functools import lru_cache

import boto3
from botocore.config import Config

ENABLED = os.environ.get("KOSI_AWS", "1") == "1"
REGION = os.environ.get("KOSI_REGION", "us-east-1")
BUCKET = os.environ.get("KOSI_BUCKET")                       # media bucket: audio cache, mirror photos
MEDIA_BASE_URL = os.environ.get("KOSI_MEDIA_BASE_URL")       # CloudFront URL in front of the bucket

# Tried in order; the first one that answers wins. Claude writes better Hindi; Nova needs no Marketplace subscription.
TEXT_MODELS = os.environ.get("KOSI_TEXT_MODELS",
                             "us.anthropic.claude-haiku-4-5-20251001-v1:0,us.amazon.nova-lite-v1:0").split(",")
IMAGE_MODEL = os.environ.get("KOSI_IMAGE_MODEL", "amazon.nova-canvas-v1:0")

# Fail fast: a throttled Bedrock call must not stall the page — the fallback is good enough.
# API Gateway cuts a request off at 29 s, so an AWS call gets 20 s at most (KOSI_READ_TIMEOUT), leaving time to fall back.
_FAST = Config(retries={"max_attempts": 1, "mode": "standard"}, connect_timeout=3,
               read_timeout=int(os.environ.get("KOSI_READ_TIMEOUT", "20")))


@lru_cache
def client(service):
    return boto3.client(service, region_name=REGION, config=_FAST)


# Circuit breaker: after a Bedrock failure (no quota, throttled, no access) skip it for a while
# instead of making every request wait on a call that will fail; retry automatically afterwards.
_down_until = {}
COOLDOWN_S = 300


def available(feature):
    return ENABLED and time.monotonic() >= _down_until.get(feature, 0)


def failed(feature):
    _down_until[feature] = time.monotonic() + COOLDOWN_S
