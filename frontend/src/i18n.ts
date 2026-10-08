// All interface wording. Bhojpuri and Maithili need native-speaker review (same as backend/kosi/lang.py).
import type { Lang, Risk } from './api'

type Strings = {
  title: string
  estimate: string
  gaugeTitle: string
  unit: string
  rise: (m: string) => string
  normal: string
  peak2024: string
  summary: (q: string, villages: string, people: string) => string
  summaryDry: (q: string) => string
  elderly: string
  children: string
  roads: string
  shelters: string
  area: string
  pathTitle: string
  pathEmpty: string
  risk: Record<Risk, string>
  waterIn: (h: string) => string
  replay: string
  pause: string
  resume: string
  exitReplay: string
  replayNote: string
  legend: string
  collapse: string
  expand: string
  textSize: string
  mapStyle: string
  satellite: string
  plainMap: string
  clickHint: string
  loading: string
  error: string
}

export const T: Record<Lang, Strings> = {
  en: {
    title: 'Kosi Twin',
    estimate: 'Planning estimate',
    gaugeTitle: 'Water released at Birpur barrage',
    unit: 'lakh cusecs',
    rise: (m) => `+${m} m above normal`,
    normal: 'Normal monsoon',
    peak2024: '2024 peak',
    summary: (q, v, p) => `At ${q} lakh cusecs, water reaches ${v} villages and ${p} people.`,
    summaryDry: (q) => `At ${q} lakh cusecs, the Kosi stays in its channel.`,
    elderly: 'aged 60+',
    children: 'children under 5',
    roads: 'km of road under water',
    shelters: 'schools and hospitals flooded',
    area: 'km² under water',
    pathTitle: "Villages in the water's path",
    pathEmpty: 'No village is in the water’s path at this level.',
    risk: { EVACUATE: 'Evacuate', WATCH: 'Watch', SAFE: 'Safe' },
    waterIn: (h) => `water in ${h}`,
    replay: 'Replay Sept 2024',
    pause: 'Pause',
    resume: 'Play',
    exitReplay: 'Back to the gauge',
    replayNote: 'Approximate curve — only the peak is from reports.',
    legend: 'Column height = people · colour = risk',
    collapse: 'Hide panel',
    expand: 'Show panel',
    textSize: 'Text size',
    mapStyle: 'Map style',
    satellite: 'Satellite',
    plainMap: 'Map',
    clickHint: 'Select a village to see when to leave',
    loading: 'Loading the Kosi…',
    error: 'Couldn’t reach the flood model. Check that the API is running, then reload.',
  },
  hi: {
    title: 'कोसी ट्विन',
    estimate: 'योजना हेतु अनुमान',
    gaugeTitle: 'बीरपुर बराज से छोड़ा गया पानी',
    unit: 'लाख क्यूसेक',
    rise: (m) => `सामान्य से ${m} मी ऊपर`,
    normal: 'सामान्य मानसून',
    peak2024: '2024 का उच्चतम',
    summary: (q, v, p) => `${q} लाख क्यूसेक पर पानी ${v} गाँवों और ${p} लोगों तक पहुँचता है।`,
    summaryDry: (q) => `${q} लाख क्यूसेक पर कोसी अपनी धारा में रहती है।`,
    elderly: '60+ उम्र के',
    children: '5 साल से कम बच्चे',
    roads: 'किमी सड़क पानी में',
    shelters: 'स्कूल व अस्पताल डूबे',
    area: 'वर्ग किमी पानी में',
    pathTitle: 'पानी की राह में गाँव',
    pathEmpty: 'इस स्तर पर कोई गाँव पानी की राह में नहीं है।',
    risk: { EVACUATE: 'खाली करें', WATCH: 'सतर्क रहें', SAFE: 'सुरक्षित' },
    waterIn: (h) => `${h} में पानी`,
    replay: 'सितंबर 2024 दोबारा देखें',
    pause: 'रोकें',
    resume: 'चलाएँ',
    exitReplay: 'गेज पर लौटें',
    replayNote: 'अनुमानित वक्र — केवल उच्चतम स्तर रिपोर्ट से है।',
    legend: 'स्तंभ की ऊँचाई = आबादी · रंग = ख़तरा',
    collapse: 'पैनल छिपाएँ',
    expand: 'पैनल दिखाएँ',
    textSize: 'अक्षर का आकार',
    mapStyle: 'नक्शे का प्रकार',
    satellite: 'सैटेलाइट',
    plainMap: 'नक्शा',
    clickHint: 'कब निकलना है, जानने के लिए गाँव चुनें',
    loading: 'कोसी लोड हो रही है…',
    error: 'बाढ़ मॉडल से संपर्क नहीं हुआ। API चालू है या नहीं देखें, फिर रीलोड करें।',
  },
  bho: {
    title: 'कोसी ट्विन',
    estimate: 'योजना खातिर अंदाजा',
    gaugeTitle: 'बीरपुर बराज से छोड़ल पानी',
    unit: 'लाख क्यूसेक',
    rise: (m) => `सामान्य से ${m} मी ऊपर`,
    normal: 'सामान्य बरसात',
    peak2024: '2024 के सबसे ऊँच',
    summary: (q, v, p) => `${q} लाख क्यूसेक पर पानी ${v} गाँव आ ${p} लोग ले पहुँचेला।`,
    summaryDry: (q) => `${q} लाख क्यूसेक पर कोसी अपना धार में रहेले।`,
    elderly: '60+ उमिर के',
    children: '5 साल से छोट लइका',
    roads: 'किमी सड़क पानी में',
    shelters: 'स्कूल आ अस्पताल डूबल',
    area: 'वर्ग किमी पानी में',
    pathTitle: 'पानी के राह में गाँव',
    pathEmpty: 'एह स्तर पर कवनो गाँव पानी के राह में नइखे।',
    risk: { EVACUATE: 'खाली करीं', WATCH: 'सचेत रहीं', SAFE: 'सुरक्षित' },
    waterIn: (h) => `${h} में पानी`,
    replay: 'सितंबर 2024 फेर से देखीं',
    pause: 'रोकीं',
    resume: 'चलाईं',
    exitReplay: 'गेज पर लवटीं',
    replayNote: 'अंदाजा वाला वक्र — खाली सबसे ऊँच स्तर रिपोर्ट से बा।',
    legend: 'खंभा के ऊँचाई = आबादी · रंग = खतरा',
    collapse: 'पैनल छिपाईं',
    expand: 'पैनल देखाईं',
    textSize: 'अक्षर के आकार',
    mapStyle: 'नक्सा के किसिम',
    satellite: 'सैटेलाइट',
    plainMap: 'नक्सा',
    clickHint: 'कब निकले के बा, जाने खातिर गाँव चुनीं',
    loading: 'कोसी लोड हो रहल बा…',
    error: 'बाढ़ मॉडल से संपर्क ना भइल। API चालू बा कि ना देखीं, फेर रीलोड करीं।',
  },
  mai: {
    title: 'कोसी ट्विन',
    estimate: 'योजना लेल अनुमान',
    gaugeTitle: 'बीरपुर बराज सँ छोड़ल पानि',
    unit: 'लाख क्यूसेक',
    rise: (m) => `सामान्य सँ ${m} मी ऊपर`,
    normal: 'सामान्य बरखा',
    peak2024: '2024 क सभसँ ऊँच',
    summary: (q, v, p) => `${q} लाख क्यूसेक पर पानि ${v} गाम आ ${p} लोक धरि पहुँचैत अछि।`,
    summaryDry: (q) => `${q} लाख क्यूसेक पर कोसी अपन धार मे रहैत अछि।`,
    elderly: '60+ उमेरक',
    children: '5 बरख सँ छोट धिया-पुता',
    roads: 'किमी सड़क पानि मे',
    shelters: 'स्कूल आ अस्पताल डूबल',
    area: 'वर्ग किमी पानि मे',
    pathTitle: 'पानिक बाट मे गाम',
    pathEmpty: 'एहि स्तर पर कोनो गाम पानिक बाट मे नहि अछि।',
    risk: { EVACUATE: 'खाली करू', WATCH: 'सतर्क रहू', SAFE: 'सुरक्षित' },
    waterIn: (h) => `${h} मे पानि`,
    replay: 'सितम्बर 2024 फेर देखू',
    pause: 'रोकू',
    resume: 'चलाउ',
    exitReplay: 'गेज पर घुरू',
    replayNote: 'अनुमानित वक्र — मात्र सभसँ ऊँच स्तर रिपोर्ट सँ अछि।',
    legend: 'खाम्हक ऊँचाई = आबादी · रंग = खतरा',
    collapse: 'पैनल नुकाउ',
    expand: 'पैनल देखाउ',
    textSize: 'अक्षरक आकार',
    mapStyle: 'नक्शाक प्रकार',
    satellite: 'सैटेलाइट',
    plainMap: 'नक्शा',
    clickHint: 'कखन निकलबाक अछि, जानबाक लेल गाम चुनू',
    loading: 'कोसी लोड भ रहल अछि…',
    error: 'बाढ़ि मॉडल सँ संपर्क नहि भेल। API चालू अछि कि नहि देखू, फेर रीलोड करू।',
  },
}
