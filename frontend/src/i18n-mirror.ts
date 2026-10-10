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
  shareExample: (depth: string) => string
  depthPick: string
  forecastTime: string
  peak: string
  dry: string
  whatIf: string
  useForecast: string
  oneTap: string
  sampleReady: string
  sampleNote: string
  oneTapHint: string
  oneTapLow: string
  oneTapNote: string
  backToRef: string
}

export const M: Record<Lang, Strings> = {
  en: {
    open: 'See it on your street',
    title: 'Flood Mirror',
    intro: 'See what the forecast flood could look like on your own street.',
    choose: 'Take or choose a photo',
    samples: 'Or start with an example',
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
    presets: { knee: 'Knee', waist: 'Waist', chest: 'Chest', head: 'Over head' },
    show: 'Show the flood',
    working: 'Water is rising…',
    before: 'Today',
    after: 'Forecast',
    compare: 'Drag to compare',
    simulation: 'AI simulation of the forecast, not a real photo.',
    basic: 'Water drawn by the app, not AI-painted.',
    share: 'Share',
    save: 'Save image',
    another: 'Try another photo',
    close: 'Close',
    error: 'Couldn’t make the image. Try another photo, or mark the door again.',
    shareText: (v, d, w) => `Flood forecast for ${v}: about ${d} m of water, expected ${w}. Made with Kosi Twin (AI simulation).`,
    shareExample: (d) => `What a ${d} m flood could look like. Made with Kosi Twin (AI simulation).`,
    depthPick: 'Pick a depth to try.',
    forecastTime: 'Forecast time',
    peak: 'Peak',
    dry: 'No water reaches the streets of this village at this time, so there is nothing to show.',
    whatIf: 'Try a what-if depth instead',
    useForecast: 'Use the forecast for this village',
    oneTap: 'No door or person? Tap just the ground instead',
    sampleReady: 'Scale marked',
    sampleNote: 'Illustrated scenes, ready to try. Your own photo works the same way.',
    oneTapHint: 'Tap where a wall or wheel meets the ground. Hold the phone level, at about chest height.',
    oneTapLow: 'Tap lower, on the ground below the dashed line.',
    oneTapNote: 'Approximate: assumes the phone was held level at about 1.5 m.',
    backToRef: 'Mark a door or person instead',
  },
  hi: {
    open: 'अपनी गली में देखें',
    title: 'बाढ़ दर्पण',
    intro: 'देखें कि अनुमानित बाढ़ आपकी अपनी गली में कैसी दिख सकती है।',
    choose: 'फ़ोटो लें या चुनें',
    samples: 'या कोई उदाहरण चुनें',
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
    presets: { knee: 'घुटना', waist: 'कमर', chest: 'छाती', head: 'सिर से ऊपर' },
    show: 'बाढ़ दिखाएँ',
    working: 'पानी भर रहा है…',
    before: 'आज',
    after: 'अनुमान',
    compare: 'तुलना के लिए खींचें',
    simulation: 'अनुमान का AI चित्रण है, असली फ़ोटो नहीं।',
    basic: 'पानी ऐप ने बनाया है, AI से नहीं।',
    share: 'साझा करें',
    save: 'तस्वीर सहेजें',
    another: 'दूसरी फ़ोटो आज़माएँ',
    close: 'बंद करें',
    error: 'तस्वीर नहीं बन सकी। दूसरी फ़ोटो आज़माएँ, या दरवाज़ा फिर से चिह्नित करें।',
    shareText: (v, d, w) => `${v} के लिए बाढ़ का अनुमान: लगभग ${d} मी पानी, ${w} तक। कोसी ट्विन से बनाया (AI चित्रण)।`,
    shareExample: (d) => `${d} मी की बाढ़ ऐसी दिख सकती है। कोसी ट्विन से बनाया (AI चित्रण)।`,
    depthPick: 'आज़माने के लिए गहराई चुनें।',
    forecastTime: 'अनुमान का समय',
    peak: 'चरम',
    dry: 'इस समय इस गाँव की गलियों में पानी नहीं पहुँचता, इसलिए दिखाने को कुछ नहीं है।',
    whatIf: 'कोई और गहराई आज़माएँ',
    useForecast: 'इस गाँव का अनुमान इस्तेमाल करें',
    oneTap: 'दरवाज़ा या इंसान नहीं है? बस ज़मीन छुएँ',
    sampleReady: 'पैमाना तय',
    sampleNote: 'चित्र-दृश्य, तुरंत आज़माने के लिए। आपकी अपनी फ़ोटो भी ऐसे ही चलेगी।',
    oneTapHint: 'जहाँ दीवार या पहिया ज़मीन से मिलता है वहाँ छुएँ। फ़ोन सीधा, लगभग छाती की ऊँचाई पर रखें।',
    oneTapLow: 'और नीचे, बिंदीदार रेखा के नीचे की ज़मीन पर छुएँ।',
    oneTapNote: 'अनुमानित: मानकर चला गया है कि फ़ोन सीधा, लगभग 1.5 मी की ऊँचाई पर था।',
    backToRef: 'दरवाज़ा या इंसान चिह्नित करें',
  },
  bho: {
    open: 'आपन गली में देखीं',
    title: 'बाढ़ दर्पण',
    intro: 'देखीं कि अंदाजा वाला बाढ़ रउआ आपन गली में कइसन लउक सकेला।',
    choose: 'फोटो लीं भा चुनीं',
    samples: 'भा कवनो उदाहरन चुनीं',
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
    presets: { knee: 'ठेहुना', waist: 'कमर', chest: 'छाती', head: 'मूड़ी से ऊपर' },
    show: 'बाढ़ देखाईं',
    working: 'पानी भर रहल बा…',
    before: 'आज',
    after: 'अंदाजा',
    compare: 'तुलना खातिर खींचीं',
    simulation: 'अंदाजा के AI चित्र बा, असली फोटो ना।',
    basic: 'पानी ऐप बनवले बा, AI से ना।',
    share: 'साझा करीं',
    save: 'तस्वीर सहेजीं',
    another: 'दोसर फोटो आजमाईं',
    close: 'बंद करीं',
    error: 'तस्वीर ना बन सकल। दोसर फोटो आजमाईं, भा दरवाजा फेर से चिन्हित करीं।',
    shareText: (v, d, w) => `${v} खातिर बाढ़ के अंदाजा: लगभग ${d} मी पानी, ${w} ले। कोसी ट्विन से बनल (AI चित्र)।`,
    shareExample: (d) => `${d} मी के बाढ़ अइसन लउक सकेला। कोसी ट्विन से बनल (AI चित्र)।`,
    depthPick: 'आजमावे खातिर गहराई चुनीं।',
    forecastTime: 'अंदाजा के समय',
    peak: 'चरम',
    dry: 'एह समय एह गाँव के गली में पानी ना पहुँचेला, एहसे देखावे के कुछ नइखे।',
    whatIf: 'कवनो दोसर गहराई आजमाईं',
    useForecast: 'एह गाँव के अंदाजा इस्तेमाल करीं',
    oneTap: 'दरवाजा भा आदमी नइखे? खाली जमीन छूईं',
    sampleReady: 'पैमाना तय',
    sampleNote: 'चित्र-दृश्य, तुरंते आजमावे खातिर। रउआ आपन फोटो भी अइसहीं चली।',
    oneTapHint: 'जहाँ देवाल भा पहिया जमीन से मिलेला उहाँ छूईं। फोन सीधा, लगभग छाती के ऊँचाई पर राखीं।',
    oneTapLow: 'आउर नीचे, बिंदी वाला रेखा के नीचे जमीन पर छूईं।',
    oneTapNote: 'अंदाजा: मानल गइल बा कि फोन सीधा, लगभग 1.5 मी के ऊँचाई पर रहे।',
    backToRef: 'दरवाजा भा आदमी चिन्हित करीं',
  },
  mai: {
    open: 'अपन गली मे देखू',
    title: 'बाढ़ि दर्पण',
    intro: 'देखू जे अनुमानित बाढ़ि अहाँक अपन गली मे कोना देखा सकैत अछि।',
    choose: 'फोटो लिअ वा चुनू',
    samples: 'वा कोनो उदाहरण चुनू',
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
    presets: { knee: 'ठेहुन', waist: 'डाँड़', chest: 'छाती', head: 'माथ सँ ऊपर' },
    show: 'बाढ़ि देखाउ',
    working: 'पानि भरि रहल अछि…',
    before: 'आइ',
    after: 'अनुमान',
    compare: 'तुलनाक लेल घिसियाउ',
    simulation: 'अनुमानक AI चित्र अछि, असली फोटो नहि।',
    basic: 'पानि ऐप बनौने अछि, AI सँ नहि।',
    share: 'साझा करू',
    save: 'तस्वीर सहेजू',
    another: 'दोसर फोटो आजमाउ',
    close: 'बंद करू',
    error: 'तस्वीर नहि बनि सकल। दोसर फोटो आजमाउ, वा केबाड़ फेर चिह्नित करू।',
    shareText: (v, d, w) => `${v} लेल बाढ़िक अनुमान: लगभग ${d} मी पानि, ${w} धरि। कोसी ट्विन सँ बनल (AI चित्र)।`,
    shareExample: (d) => `${d} मीक बाढ़ि एहन देखा सकैत अछि। कोसी ट्विन सँ बनल (AI चित्र)।`,
    depthPick: 'आजमाबक लेल गहराइ चुनू।',
    forecastTime: 'अनुमानक समय',
    peak: 'चरम',
    dry: 'एहि समय एहि गामक गली मे पानि नहि पहुँचैत अछि, तेँ देखाबक लेल किछु नहि अछि।',
    whatIf: 'कोनो आन गहराइ आजमाउ',
    useForecast: 'एहि गामक अनुमान उपयोग करू',
    oneTap: 'केबाड़ वा लोक नहि अछि? मात्र जमीन छुबू',
    sampleReady: 'पैमाना तय',
    sampleNote: 'चित्र-दृश्य, तुरंत आजमाबक लेल। अहाँक अपन फोटो सेहो एहिना चलत।',
    oneTapHint: 'जतय देबाल वा पहिया जमीन सँ मिलैत अछि ततय छुबू। फोन सीधा, लगभग छातीक ऊँचाई पर राखू।',
    oneTapLow: 'आओर नीचाँ, बिन्दीदार रेखाक नीचाँक जमीन पर छुबू।',
    oneTapNote: 'अनुमानित: मानल गेल अछि जे फोन सीधा, लगभग 1.5 मीक ऊँचाई पर छल।',
    backToRef: 'केबाड़ वा लोक चिह्नित करू',
  },
}
