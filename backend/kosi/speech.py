"""Advisory audio via Amazon Polly (Kajal, neural — speaks Hindi and Indian English).
Polly has no Bhojpuri or Maithili voice; the Hindi voice reads their Devanagari text (Hindi accent).
Synthesised once per distinct text and cached in S3 when a bucket is configured."""
import hashlib

from . import cloud

LANGS = {"en": "en-IN", "hi": "hi-IN", "bho": "hi-IN", "mai": "hi-IN"}


def synthesize(text, lang):
    """MP3 bytes for `text`, or None when Polly is unavailable."""
    if not cloud.ENABLED or lang not in LANGS:
        return None
    key = f"audio/{lang}/{hashlib.sha1(text.encode()).hexdigest()}.mp3"
    s3 = cloud.client("s3") if cloud.BUCKET else None
    if s3:
        try:
            return s3.get_object(Bucket=cloud.BUCKET, Key=key)["Body"].read()
        except Exception:
            pass
    try:
        audio = cloud.client("polly").synthesize_speech(
            Text=text, VoiceId="Kajal", Engine="neural", LanguageCode=LANGS[lang], OutputFormat="mp3"
        )["AudioStream"].read()
    except Exception:
        return None
    if s3:
        try:
            s3.put_object(Bucket=cloud.BUCKET, Key=key, Body=audio, ContentType="audio/mpeg")
        except Exception:
            pass
    return audio
