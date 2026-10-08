"""All user-facing advisory wording, in English, Hindi, Bhojpuri and Maithili.

Bhojpuri and Maithili have no machine translation or voice on AWS, so they are fixed templates
(predictable wording, no AI). NEEDS REVIEW by native speakers before real use — kept in one file
so a reviewer can check every phrase in one place.
"""
from datetime import datetime

LANGS = {"en": "English", "hi": "हिन्दी", "bho": "भोजपुरी", "mai": "मैथिली"}

# Depth bands: (max depth m, key, words per language)
DEPTH_BANDS = [
    (0.3, "ankle", {"en": "ankle-deep", "hi": "टखने तक", "bho": "एड़ी ले", "mai": "एड़ी धरि"}),
    (0.7, "knee", {"en": "knee-deep", "hi": "घुटने तक", "bho": "ठेहुना ले", "mai": "ठेहुन धरि"}),
    (1.1, "waist", {"en": "waist-deep", "hi": "कमर तक", "bho": "कमर ले", "mai": "डाँड़ धरि"}),
    (1.5, "chest", {"en": "chest-deep", "hi": "छाती तक", "bho": "छाती ले", "mai": "छाती धरि"}),
    (float("inf"), "over_head", {"en": "over head height", "hi": "सिर से ऊपर", "bho": "मूड़ी से ऊपर", "mai": "माथ सँ ऊपर"}),
]

# Parts of the day: morning (4-11), afternoon (12-15), evening (16-18), night (19-3)
DAY_PARTS = {
    "hi": ("सुबह", "दोपहर", "शाम", "रात"),
    "bho": ("बिहाने", "दुपहरिया", "साँझ", "रात"),
    "mai": ("भोर", "दुपहर", "साँझ", "राति"),
}

T = {
    "safe": {
        "en": "{name} is not expected to flood in this scenario. Keep listening for updates.",
        "hi": "इस स्थिति में {name} में बाढ़ की आशंका नहीं है। सूचना सुनते रहें।",
        "bho": "एह हालत में {name} में बाढ़ के अंदेसा नइखे। खबर सुनत रहीं।",
        "mai": "एहि स्थिति मे {name} मे बाढ़िक आशंका नहि अछि। सूचना सुनैत रहू।",
    },
    "outskirts": {
        "en": "Flood water may reach the outskirts of {name} by {eta}.",
        "hi": "{eta} तक {name} के बाहरी हिस्से में पानी पहुँच सकता है।",
        "bho": "{eta} ले {name} के बाहरी इलाका में पानी पहुँच सकेला।",
        "mai": "{eta} धरि {name} क बाहरी भाग मे पानि पहुँचि सकैत अछि।",
    },
    "arrives": {
        "en": "Flood water may reach {name} by {eta}, about {depth}.",
        "hi": "{name} में {eta} तक पानी पहुँच सकता है, लगभग {depth}।",
        "bho": "{name} में {eta} ले पानी पहुँच सकेला, मोटा-मोटी {depth}।",
        "mai": "{name} मे {eta} धरि पानि पहुँचि सकैत अछि, करीब {depth}।",
    },
    "boat": {
        "en": "No dry road to a shelter was found. Move to the highest roof or embankment nearby and wait for a boat.",
        "hi": "सुरक्षित जगह तक सूखा रास्ता नहीं मिला। सबसे ऊँची छत या बाँध पर जाएँ और नाव का इंतज़ार करें।",
        "bho": "सुरक्षित जगह ले सूखल रास्ता ना मिलल। लगे के सबसे ऊँच छत भा बान्ह पर चल जाईं आ नाव के इंतजार करीं।",
        "mai": "सुरक्षित स्थान धरि सुखायल बाट नहि भेटल। लगक सभसँ ऊँच छत वा बान्ह पर चलि जाउ आ नाहक प्रतीक्षा करू।",
    },
    "leave": {
        "en": "Leave {when} for {shelter}, {km} km away (about {minutes} minutes on foot).",
        "hi": "{when} {shelter} ({km} किमी, लगभग {minutes} मिनट पैदल) के लिए निकल जाएँ।",
        "bho": "{when} {shelter} ({km} किमी, मोटा-मोटी {minutes} मिनट पैदल) खातिर निकल जाईं।",
        "mai": "{when} {shelter} ({km} किमी, करीब {minutes} मिनट पैदल) दिस निकलि जाउ।",
    },
    "now": {"en": "now", "hi": "अभी", "bho": "अबहिंए", "mai": "एखनहि"},
    "before": {"en": "before {clock}", "hi": "{clock} से पहले", "bho": "{clock} से पहिले", "mai": "{clock} सँ पहिने"},
    "elderly": {
        "en": "Take the elderly and children first.",
        "hi": "बुज़ुर्गों और बच्चों को पहले ले जाएँ।",
        "bho": "बूढ़-पुरनिया आ लइकन के पहिले ले जाईं।",
        "mai": "बूढ़-पुरान आ धिया-पुताकेँ पहिने लऽ जाउ।",
    },
}


def clock(iso, lang):
    h = datetime.fromisoformat(iso).hour
    h12 = h % 12 or 12
    if lang == "en":
        return f"{h12} {'AM' if h < 12 else 'PM'}"
    morning, afternoon, evening, night = DAY_PARTS[lang]
    part = morning if 4 <= h < 12 else afternoon if 12 <= h < 16 else evening if 16 <= h < 19 else night
    return f"{part} {h12} बजे"


def depth_band(depth):
    """{key, en, hi, bho, mai} for a water depth in metres; None when dry."""
    if depth <= 0:
        return None
    for limit, key, words in DEPTH_BANDS:
        if depth <= limit:
            return {"key": key, **words}
