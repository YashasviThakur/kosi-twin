// Flood Mirror (Screen 3) wording. Bhojpuri and Maithili need native-speaker review, like the rest.
import type { Lang } from './api'

export type RefKind = 'door' | 'person' | 'motorcycle'

type Strings = {
  open: string
  title: string
  intro: string
  choose: string
  samples: string
  tip: string
  detecting: string
  found: (what: string) => string
  refKinds: Record<RefKind, string>
  none: string
  tapHint: string
  marked: string
  refIs: string
  refDoor: string
  refPerson: string
  depth: string
  depthExample: string
  forecastDepth: (m: string) => string
  presets: { knee: string; waist: string; chest: string; head: string }
  show: string
  working: string
  before: string
  after: string
  compare: string
  simulation: string
  basic: string
  share: string
  save: string
  another: string
  close: string
  error: string
  shareText: (village: string, depth: string, when: string) => string
}

export const M: Record<Lang, Strings> = {
  en: {
    open: 'See it on your street',
    title: 'Flood Mirror',
    intro: 'See what the forecast flood could look like on your own street.',
    choose: 'Take or choose a photo',
    samples: 'Or try a sample',
    tip: 'Best photos show a door or a person standing on the ground, so the water height can be measured.',
    detecting: 'Looking for a door or a person…',
    found: (what) => `Found ${what} to measure the height`,
    refKinds: { door: 'a door', person: 'a person', motorcycle: 'a motorbike' },
    none: 'No door or person found in this photo.',
    tapHint: 'Tap the bottom, then the top, of a door or a person.',
    marked: 'Marked. Tap again to change.',
    refIs: 'The marked object is',
    refDoor: 'a 2.1 m door',
    refPerson: 'a 1.6 m adult',
    depth: 'Flood depth',
    depthExample: 'This village floods only at its edge, so pick an example depth.',
    forecastDepth: (m) => `Forecast for this village: ${m} m`,
    presets: { knee: 'Knee', waist: 'Waist', chest: 'Chest', head: 'Over head' },
    show: 'Show the flood',
    working: 'Water is rising…',
    before: 'Today',
    after: 'Forecast',
    compare: 'Drag to compare',
    simulation: 'AI simulation of the forecast, not a real photo.',
    basic: 'Basic water overlay (AI painting is not enabled).',
    share: 'Share',
    save: 'Save image',
    another: 'Try another photo',
    close: 'Close',
    error: 'Couldn’t make the image. Try another photo, or mark the door again.',
    shareText: (v, d, w) => `Flood forecast for ${v}: about ${d} m of water, expected ${w}. Made with Kosi Twin (AI simulation).`,
  },
  hi: {
    open: 'अपनी गली में देखें',
    title: 'बाढ़ दर्पण',
    intro: 'देखें कि अनुमानित बाढ़ आपकी अपनी गली में कैसी दिख सकती है।',
    choose: 'फ़ोटो लें या चुनें',
    samples: 'या नमूना आज़माएँ',
    tip: 'सबसे अच्छी फ़ोटो में दरवाज़ा या ज़मीन पर खड़ा इंसान दिखे, ताकि पानी की ऊँचाई नापी जा सके।',
    detecting: 'दरवाज़ा या इंसान खोज रहे हैं…',
    found: (what) => `ऊँचाई नापने के लिए ${what} मिला`,
    refKinds: { door: 'दरवाज़ा', person: 'इंसान', motorcycle: 'मोटरसाइकिल' },
    none: 'इस फ़ोटो में दरवाज़ा या इंसान नहीं मिला।',
    tapHint: 'दरवाज़े या इंसान का पहले निचला, फिर ऊपरी सिरा छुएँ।',
    marked: 'निशान लग गया। बदलने के लिए फिर छुएँ।',
    refIs: 'निशान लगी चीज़ है',
    refDoor: '2.1 मी का दरवाज़ा',
    refPerson: '1.6 मी का बड़ा इंसान',
    depth: 'बाढ़ की गहराई',
    depthExample: 'यह गाँव सिर्फ़ किनारे पर डूबता है, इसलिए उदाहरण के लिए गहराई चुनें।',
    forecastDepth: (m) => `इस गाँव का अनुमान: ${m} मी`,
    presets: { knee: 'घुटना', waist: 'कमर', chest: 'छाती', head: 'सिर से ऊपर' },
    show: 'बाढ़ दिखाएँ',
    working: 'पानी भर रहा है…',
    before: 'आज',
    after: 'अनुमान',
    compare: 'तुलना के लिए खींचें',
    simulation: 'अनुमान का AI चित्रण है, असली फ़ोटो नहीं।',
    basic: 'सामान्य पानी की परत (AI चित्रण चालू नहीं है)।',
    share: 'साझा करें',
    save: 'तस्वीर सहेजें',
    another: 'दूसरी फ़ोटो आज़माएँ',
    close: 'बंद करें',
    error: 'तस्वीर नहीं बन सकी। दूसरी फ़ोटो आज़माएँ, या दरवाज़ा फिर से चिह्नित करें।',
    shareText: (v, d, w) => `${v} के लिए बाढ़ का अनुमान: लगभग ${d} मी पानी, ${w} तक। कोसी ट्विन से बनाया (AI चित्रण)।`,
  },
  bho: {
    open: 'आपन गली में देखीं',
    title: 'बाढ़ दर्पण',
    intro: 'देखीं कि अंदाजा वाला बाढ़ रउआ आपन गली में कइसन लउक सकेला।',
    choose: 'फोटो लीं भा चुनीं',
    samples: 'भा नमूना आजमाईं',
    tip: 'सबसे बढ़िया फोटो में दरवाजा भा जमीन पर ठाढ़ आदमी लउके, ताकि पानी के ऊँचाई नापल जा सके।',
    detecting: 'दरवाजा भा आदमी खोजत बानी…',
    found: (what) => `ऊँचाई नापे खातिर ${what} मिलल`,
    refKinds: { door: 'दरवाजा', person: 'आदमी', motorcycle: 'मोटरसाइकिल' },
    none: 'एह फोटो में दरवाजा भा आदमी ना मिलल।',
    tapHint: 'दरवाजा भा आदमी के पहिले निचला, फेर ऊपरी छोर छूईं।',
    marked: 'निशान लाग गइल। बदले खातिर फेर छूईं।',
    refIs: 'निशान लागल चीज बा',
    refDoor: '2.1 मी के दरवाजा',
    refPerson: '1.6 मी के बड़ आदमी',
    depth: 'बाढ़ के गहराई',
    depthExample: 'ई गाँव खाली किनारा पर डूबेला, एहसे उदाहरण खातिर गहराई चुनीं।',
    forecastDepth: (m) => `एह गाँव के अंदाजा: ${m} मी`,
    presets: { knee: 'ठेहुना', waist: 'कमर', chest: 'छाती', head: 'मूड़ी से ऊपर' },
    show: 'बाढ़ देखाईं',
    working: 'पानी भर रहल बा…',
    before: 'आज',
    after: 'अंदाजा',
    compare: 'तुलना खातिर खींचीं',
    simulation: 'अंदाजा के AI चित्र बा, असली फोटो ना।',
    basic: 'सादा पानी के परत (AI चित्र चालू नइखे)।',
    share: 'साझा करीं',
    save: 'तस्वीर सहेजीं',
    another: 'दोसर फोटो आजमाईं',
    close: 'बंद करीं',
    error: 'तस्वीर ना बन सकल। दोसर फोटो आजमाईं, भा दरवाजा फेर से चिन्हित करीं।',
    shareText: (v, d, w) => `${v} खातिर बाढ़ के अंदाजा: लगभग ${d} मी पानी, ${w} ले। कोसी ट्विन से बनल (AI चित्र)।`,
  },
  mai: {
    open: 'अपन गली मे देखू',
    title: 'बाढ़ि दर्पण',
    intro: 'देखू जे अनुमानित बाढ़ि अहाँक अपन गली मे कोना देखा सकैत अछि।',
    choose: 'फोटो लिअ वा चुनू',
    samples: 'वा नमूना आजमाउ',
    tip: 'सभसँ नीक फोटो मे केबाड़ वा जमीन पर ठाढ़ लोक देखाए, जाहि सँ पानिक ऊँचाई नापल जा सकय।',
    detecting: 'केबाड़ वा लोक ताकि रहल छी…',
    found: (what) => `ऊँचाई नापबाक लेल ${what} भेटल`,
    refKinds: { door: 'केबाड़', person: 'लोक', motorcycle: 'मोटरसाइकिल' },
    none: 'एहि फोटो मे केबाड़ वा लोक नहि भेटल।',
    tapHint: 'केबाड़ वा लोकक पहिने निचला, फेर ऊपरी छोर छुबू।',
    marked: 'निशान लागि गेल। बदलबाक लेल फेर छुबू।',
    refIs: 'निशान लागल वस्तु अछि',
    refDoor: '2.1 मीक केबाड़',
    refPerson: '1.6 मीक पैघ लोक',
    depth: 'बाढ़िक गहराइ',
    depthExample: 'ई गाम मात्र किनार पर डूबैत अछि, तेँ उदाहरणक लेल गहराइ चुनू।',
    forecastDepth: (m) => `एहि गामक अनुमान: ${m} मी`,
    presets: { knee: 'ठेहुन', waist: 'डाँड़', chest: 'छाती', head: 'माथ सँ ऊपर' },
    show: 'बाढ़ि देखाउ',
    working: 'पानि भरि रहल अछि…',
    before: 'आइ',
    after: 'अनुमान',
    compare: 'तुलनाक लेल घिसियाउ',
    simulation: 'अनुमानक AI चित्र अछि, असली फोटो नहि।',
    basic: 'सादा पानिक परत (AI चित्र चालू नहि अछि)।',
    share: 'साझा करू',
    save: 'तस्वीर सहेजू',
    another: 'दोसर फोटो आजमाउ',
    close: 'बंद करू',
    error: 'तस्वीर नहि बनि सकल। दोसर फोटो आजमाउ, वा केबाड़ फेर चिह्नित करू।',
    shareText: (v, d, w) => `${v} लेल बाढ़िक अनुमान: लगभग ${d} मी पानि, ${w} धरि। कोसी ट्विन सँ बनल (AI चित्र)।`,
  },
}
