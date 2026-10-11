// Wording for the evacuation card (share / print) and the first-visit tour. Bhojpuri and Maithili need
// native-speaker review, like the rest.
import type { Lang } from './api'

interface More {
  share: string
  print: string
  sheetTitle: string
  sheetNote: string
  generated: string
  takeTitle: string
  takeItems: string[]
  tour: { next: string; back: string; done: string; skip: string; steps: { title: string; text: string }[] }
  info: string
  retry: string
  live: {
    title: string; live: string; last: string; cusecs: string; lakh: (n: string) => string; updated: (when: string, ago: string) => string
    minAgo: (m: number) => string; hrAgo: (h: number) => string
    rising: (p: number) => string; falling: (p: number) => string; steady: (p: number) => string
    levels: (up: string, down: string) => string; history: string; outlook: string; apply: string; applied: string
    note: string; report: string; unavailable: string; whatIf: string; backToLive: string; whatIfNote: (live: string) => string
  }
  floods: {
    title: string; official: string; intro: (n: number, thr: number) => string; days: (d: number) => string; lakhCusecs: string
    peakOn: (d: string) => string; show: string; shown: string; replay: string; note: string; unavailable: string
    replayTitle: (d: string) => string; replayNote: string
    all: string; major: string
  }
}

export const N: Record<Lang, More> = {
  en: {
    share: 'Share', print: 'Print', sheetTitle: 'Evacuation card',
    sheetNote: 'A planning estimate from a flood model, not an official warning. Follow the district administration’s instructions.',
    generated: 'Made on',
    takeTitle: 'Take with you',
    takeItems: ['Ration card, Aadhaar and papers in a plastic bag', 'Medicines and a first-aid kit', 'Drinking water and dry food for 3 days',
      'Torch and a charged phone with a power bank', 'Warm and dry clothes, blanket', 'Cash, and a list of phone numbers'],
    tour: {
      next: 'Next', back: 'Back', done: 'Start exploring', skip: 'Skip',
      steps: [
        { title: 'Set the river level', text: 'Drag the water up or down. This is the flow released at the Birpur barrage, in lakh cusecs.' },
        { title: 'The live Kosi', text: 'The newest official reading at the Birpur barrage, from the Bihar Water Resources Department, with how old it is and whether the river is rising or falling.' },
        { title: 'Every flood since 2018', text: 'Each time the barrage released 2 lakh cusecs or more. Show a flood’s peak on the map, or replay it village by village.' },
        { title: 'Who the water reaches', text: 'Villages in the water’s path, soonest first. The number is the hours until the water arrives.' },
        { title: 'When to leave', text: 'Pick a village to see when to leave, when the water arrives, how deep it gets, and where to go.' },
        { title: 'See it on your street', text: 'Add a photo of a street and see the forecast flood on it, at the depth forecast for that village.' },
      ],
    },
    info: 'How this works',
    retry: 'Try again',
    live: {
      title: 'Kosi at Birpur barrage', live: 'Live', last: 'Last reading', cusecs: 'cusecs', lakh: (n) => `${n} lakh cusecs`,
      updated: (w, a) => `official reading, ${w} (${a})`, minAgo: (m) => `${m} min ago`, hrAgo: (h) => `${h} h ago`,
      rising: (p) => `Rising, up ${p}% on yesterday`, falling: (p) => `Falling, down ${p}% on yesterday`, steady: () => 'Steady since yesterday',
      levels: (u, d) => `Upstream ${u} ft · Downstream ${d} ft`, history: 'Last 60 days', outlook: '14-day trend (modelled)',
      apply: 'Show this level on the map', applied: 'Showing this level on the map',
      note: 'Official Bihar WRD readings, taken at 10 AM and 3 PM. The dashed trend ahead is modelled (GloFAS), not a forecast in cusecs.',
      report: 'See the report', unavailable: 'The live barrage reading is unavailable right now.', whatIf: 'What if', backToLive: 'Back to the live reading', whatIfNote: (l) => `A what-if level you set. The live reading is ${l} cusecs.`,
    },
    floods: {
      title: 'Floods since {year}', official: 'Official', intro: (n, t) => `${n} floods when the barrage released ${t} lakh cusecs or more`,
      days: (d) => (d === 1 ? '1 day' : `${d} days`), lakhCusecs: 'lakh cusecs', peakOn: (d) => `peak on ${d}`,
      show: 'Show the peak on the map', shown: 'Showing the peak on the map', replay: 'Replay',
      note: 'Official Bihar WRD barrage readings (10 AM and 3 PM). The department’s reports before 2018 show gate positions but no discharge, so the record starts in 2018.',
      unavailable: 'The flood record is unavailable right now.', replayTitle: (d) => `Recorded flood · ${d}`,
      replayNote: 'RECORDED: Bihar WRD barrage readings (10 AM and 3 PM) at Birpur.',
      all: 'All', major: 'Major (3 lakh+)',
    },
  },
  hi: {
    share: 'साझा करें', print: 'छापें', sheetTitle: 'निकासी कार्ड',
    sheetNote: 'यह बाढ़ मॉडल का योजना हेतु अनुमान है, आधिकारिक चेतावनी नहीं। ज़िला प्रशासन के निर्देश मानें।',
    generated: 'बनाया गया',
    takeTitle: 'साथ ले जाएँ',
    takeItems: ['राशन कार्ड, आधार और काग़ज़ात प्लास्टिक की थैली में', 'दवाइयाँ और प्राथमिक उपचार का सामान', '3 दिन का पीने का पानी और सूखा खाना',
      'टॉर्च, चार्ज किया फ़ोन और पावर बैंक', 'गर्म व सूखे कपड़े, कंबल', 'नकद पैसे और फ़ोन नंबरों की सूची'],
    tour: {
      next: 'आगे', back: 'पीछे', done: 'शुरू करें', skip: 'छोड़ें',
      steps: [
        { title: 'नदी का स्तर तय करें', text: 'पानी को ऊपर-नीचे खींचें। यह बीरपुर बराज से छोड़ा गया बहाव है, लाख क्यूसेक में।' },
        { title: 'अभी की कोसी', text: 'बीरपुर बराज पर बिहार जल संसाधन विभाग की ताज़ा सरकारी रीडिंग, कितनी पुरानी है और नदी बढ़ रही है या घट रही है।' },
        { title: '2018 से अब तक की हर बाढ़', text: 'जब-जब बराज से 2 लाख क्यूसेक या ज़्यादा छोड़ा गया। किसी बाढ़ का चरम स्तर नक्शे पर देखें, या उसे गाँव-गाँव दोबारा चलाएँ।' },
        { title: 'पानी किन तक पहुँचता है', text: 'पानी की राह में आने वाले गाँव, जिन तक पहले पहुँचेगा वे ऊपर। संख्या बताती है कितने घंटे में पानी पहुँचेगा।' },
        { title: 'कब निकलना है', text: 'गाँव चुनें और देखें कब निकलना है, पानी कब पहुँचेगा, कितना गहरा होगा और कहाँ जाना है।' },
        { title: 'अपनी गली में देखें', text: 'गली की फ़ोटो जोड़ें और उस गाँव के अनुमानित पानी की गहराई के साथ बाढ़ देखें।' },
      ],
    },
    info: 'यह कैसे काम करता है',
    retry: 'फिर कोशिश करें',
    live: {
      title: 'बीरपुर बराज पर कोसी', live: 'लाइव', last: 'आख़िरी रीडिंग', cusecs: 'क्यूसेक', lakh: (n) => `${n} लाख क्यूसेक`,
      updated: (w, a) => `सरकारी रीडिंग, ${w} (${a})`, minAgo: (m) => `${m} मिनट पहले`, hrAgo: (h) => `${h} घंटे पहले`,
      rising: (p) => `बढ़ रहा है, कल से ${p}% ऊपर`, falling: (p) => `घट रहा है, कल से ${p}% नीचे`, steady: () => 'कल से लगभग स्थिर',
      levels: (u, d) => `ऊपरी स्तर ${u} फ़ीट · निचला स्तर ${d} फ़ीट`, history: 'पिछले 60 दिन', outlook: '14 दिन का रुझान (मॉडल से)',
      apply: 'यह स्तर नक्शे पर दिखाएँ', applied: 'नक्शे पर यही स्तर दिख रहा है',
      note: 'बिहार जल संसाधन विभाग की सरकारी रीडिंग, सुबह 10 और दोपहर 3 बजे की। आगे का बिंदीदार रुझान मॉडल (GloFAS) से है, क्यूसेक का पूर्वानुमान नहीं।',
      report: 'रिपोर्ट देखें', unavailable: 'बराज की लाइव रीडिंग अभी उपलब्ध नहीं है।', whatIf: 'अगर ऐसा हो', backToLive: 'लाइव रीडिंग पर लौटें', whatIfNote: (l) => `यह आपका चुना हुआ अनुमानित स्तर है। लाइव रीडिंग ${l} क्यूसेक है।`,
    },
    floods: {
      title: '{year} से अब तक की बाढ़ें', official: 'सरकारी', intro: (n, t) => `${n} बाढ़ें, जब बराज से ${t} लाख क्यूसेक या ज़्यादा छोड़ा गया`,
      days: (d) => `${d} दिन`, lakhCusecs: 'लाख क्यूसेक', peakOn: (d) => `${d} को चरम`,
      show: 'चरम स्तर नक्शे पर दिखाएँ', shown: 'नक्शे पर चरम स्तर दिख रहा है', replay: 'दोबारा चलाएँ',
      note: 'बिहार जल संसाधन विभाग की सरकारी बराज रीडिंग (सुबह 10 और दोपहर 3 बजे)। 2018 से पहले की रिपोर्टों में फाटकों की स्थिति है पर बहाव नहीं, इसलिए रिकॉर्ड 2018 से शुरू होता है।',
      unavailable: 'बाढ़ का रिकॉर्ड अभी उपलब्ध नहीं है।', replayTitle: (d) => `दर्ज बाढ़ · ${d}`,
      replayNote: 'दर्ज: बीरपुर पर बिहार जल संसाधन विभाग की बराज रीडिंग (सुबह 10 और दोपहर 3 बजे)।',
      all: 'सभी', major: 'बड़ी (3 लाख+)',
    },
  },
  bho: {
    share: 'साझा करीं', print: 'छापीं', sheetTitle: 'निकासी कार्ड',
    sheetNote: 'ई बाढ़ मॉडल के योजना खातिर अंदाजा बा, सरकारी चेतावनी ना। जिला प्रशासन के निर्देश मानीं।',
    generated: 'बनल',
    takeTitle: 'साथे ले जाईं',
    takeItems: ['राशन कार्ड, आधार आ कागज प्लास्टिक के थैली में', 'दवाई आ प्राथमिक उपचार के सामान', '3 दिन के पिए के पानी आ सूखा खाना',
      'टॉर्च, चार्ज कइल फोन आ पावर बैंक', 'गरम आ सूखा कपड़ा, कंबल', 'नगद पइसा आ फोन नंबर के सूची'],
    tour: {
      next: 'आगे', back: 'पीछे', done: 'शुरू करीं', skip: 'छोड़ीं',
      steps: [
        { title: 'नदी के स्तर तय करीं', text: 'पानी के ऊपर-नीचे खींचीं। ई बीरपुर बराज से छोड़ल बहाव बा, लाख क्यूसेक में।' },
        { title: 'अब के कोसी', text: 'बीरपुर बराज पर बिहार जल संसाधन विभाग के ताजा सरकारी रीडिंग, केतना पुरान बा आ नदी बढ़त बा कि घटत बा।' },
        { title: '2018 से अब ले के हर बाढ़', text: 'जब-जब बराज से 2 लाख क्यूसेक भा बेसी छोड़ल गइल। कवनो बाढ़ के चरम स्तर नक्सा पर देखीं, भा ओकरा के गाँव-गाँव फेर चलाईं।' },
        { title: 'पानी केकरा तक पहुँचेला', text: 'पानी के राह में पड़े वाला गाँव, जहाँ पहिले पहुँची उ ऊपर। संख्या बतावेला कतना घंटा में पानी पहुँची।' },
        { title: 'कब निकले के बा', text: 'गाँव चुनीं आ देखीं कब निकले के बा, पानी कब पहुँची, केतना गहिर होई आ कहाँ जाए के बा।' },
        { title: 'आपन गली में देखीं', text: 'गली के फोटो जोड़ीं आ ओह गाँव के अंदाजा वाला पानी के गहिराई संगे बाढ़ देखीं।' },
      ],
    },
    info: 'ई कइसे काम करेला',
    retry: 'फेर कोशिश करीं',
    live: {
      title: 'बीरपुर बराज पर कोसी', live: 'लाइव', last: 'आखिरी रीडिंग', cusecs: 'क्यूसेक', lakh: (n) => `${n} लाख क्यूसेक`,
      updated: (w, a) => `सरकारी रीडिंग, ${w} (${a})`, minAgo: (m) => `${m} मिनट पहिले`, hrAgo: (h) => `${h} घंटा पहिले`,
      rising: (p) => `बढ़त बा, काल्ह से ${p}% ऊपर`, falling: (p) => `घटत बा, काल्ह से ${p}% नीचे`, steady: () => 'काल्ह से लगभग स्थिर',
      levels: (u, d) => `ऊपरी स्तर ${u} फीट · निचला स्तर ${d} फीट`, history: 'पिछला 60 दिन', outlook: '14 दिन के रुझान (मॉडल से)',
      apply: 'ई स्तर नक्सा पर देखाईं', applied: 'नक्सा पर इहे स्तर देखात बा',
      note: 'बिहार जल संसाधन विभाग के सरकारी रीडिंग, सबेरे 10 आ दुपहर 3 बजे के। आगे के बिंदी वाला रुझान मॉडल (GloFAS) से बा, क्यूसेक के पूर्वानुमान ना।',
      report: 'रिपोर्ट देखीं', unavailable: 'बराज के लाइव रीडिंग अबहीं ना मिलल।', whatIf: 'अगर अइसन होखे', backToLive: 'लाइव रीडिंग पर लौटीं', whatIfNote: (l) => `ई रउरा चुनल अंदाज़ा के स्तर बा। लाइव रीडिंग ${l} क्यूसेक बा।`,
    },
    floods: {
      title: '{year} से अब ले के बाढ़', official: 'सरकारी', intro: (n, t) => `${n} बाढ़, जब बराज से ${t} लाख क्यूसेक भा बेसी छोड़ल गइल`,
      days: (d) => `${d} दिन`, lakhCusecs: 'लाख क्यूसेक', peakOn: (d) => `${d} के चरम`,
      show: 'चरम स्तर नक्सा पर देखाईं', shown: 'नक्सा पर चरम स्तर देखात बा', replay: 'फेर चलाईं',
      note: 'बिहार जल संसाधन विभाग के सरकारी बराज रीडिंग (सबेरे 10 आ दुपहर 3 बजे)। 2018 से पहिले के रिपोर्ट में फाटक के स्थिति बा बाकिर बहाव ना, एहसे रिकॉर्ड 2018 से शुरू होला।',
      unavailable: 'बाढ़ के रिकॉर्ड अबहीं ना मिलल।', replayTitle: (d) => `दर्ज बाढ़ · ${d}`,
      replayNote: 'दर्ज: बीरपुर पर बिहार जल संसाधन विभाग के बराज रीडिंग (सबेरे 10 आ दुपहर 3 बजे)।',
      all: 'सब', major: 'बड़ (3 लाख+)',
    },
  },
  mai: {
    share: 'साझा करू', print: 'छापू', sheetTitle: 'निकासी कार्ड',
    sheetNote: 'ई बाढ़ि मॉडलक योजनाक लेल अनुमान अछि, सरकारी चेतावनी नहि। जिला प्रशासनक निर्देश मानू।',
    generated: 'बनाओल गेल',
    takeTitle: 'संगे लऽ जाउ',
    takeItems: ['राशन कार्ड, आधार आ कागज प्लास्टिकक झोरा मे', 'दवाइ आ प्राथमिक उपचारक सामान', '3 दिनक पिबाक पानि आ सुक्खल खाना',
      'टॉर्च, चार्ज कएल फोन आ पावर बैंक', 'गरम आ सुक्खल कपड़ा, कम्बल', 'नगद पाइ आ फोन नंबरक सूची'],
    tour: {
      next: 'आगू', back: 'पाछू', done: 'शुरू करू', skip: 'छोड़ू',
      steps: [
        { title: 'नदीक स्तर तय करू', text: 'पानिकेँ ऊपर-नीचाँ घिसियाउ। ई बीरपुर बराजसँ छोड़ल बहाव अछि, लाख क्यूसेक मे।' },
        { title: 'एखनुक कोसी', text: 'बीरपुर बराज पर बिहार जल संसाधन विभागक ताजा सरकारी रीडिंग, कतेक पुरान अछि आ नदी बढ़ि रहल अछि कि घटि रहल।' },
        { title: '2018 सँ आब धरिक हर बाढ़ि', text: 'जखन-जखन बराज सँ 2 लाख क्यूसेक वा बेसी छोड़ल गेल। कोनो बाढ़िक चरम स्तर नक्शा पर देखू, वा ओकरा गाम-गाम फेर चलाउ।' },
        { title: 'पानि ककरा धरि पहुँचैत अछि', text: 'पानिक बाटक गाम, जत्त पहिने पहुँचत से ऊपर। संख्या बतबैत अछि कतेक घंटा मे पानि पहुँचत।' },
        { title: 'कखन निकलबाक अछि', text: 'गाम चुनू आ देखू कखन निकलबाक अछि, पानि कखन पहुँचत, कतेक गहींर होयत आ कतय जयबाक अछि।' },
        { title: 'अपन गली मे देखू', text: 'गलीक फोटो जोड़ू आ ओहि गामक अनुमानित पानिक गहराइक संग बाढ़ि देखू।' },
      ],
    },
    info: 'ई कोना काज करैत अछि',
    retry: 'फेर प्रयास करू',
    live: {
      title: 'बीरपुर बराज पर कोसी', live: 'लाइव', last: 'अंतिम रीडिंग', cusecs: 'क्यूसेक', lakh: (n) => `${n} लाख क्यूसेक`,
      updated: (w, a) => `सरकारी रीडिंग, ${w} (${a})`, minAgo: (m) => `${m} मिनट पहिने`, hrAgo: (h) => `${h} घंटा पहिने`,
      rising: (p) => `बढ़ि रहल अछि, काल्हिसँ ${p}% ऊपर`, falling: (p) => `घटि रहल अछि, काल्हिसँ ${p}% नीचाँ`, steady: () => 'काल्हिसँ लगभग स्थिर',
      levels: (u, d) => `ऊपरी स्तर ${u} फीट · निचला स्तर ${d} फीट`, history: 'पछिला 60 दिन', outlook: '14 दिनक रुझान (मॉडल सँ)',
      apply: 'ई स्तर नक्शा पर देखाउ', applied: 'नक्शा पर यैह स्तर देखा रहल अछि',
      note: 'बिहार जल संसाधन विभागक सरकारी रीडिंग, भोर 10 आ दुपहर 3 बजेक। आगुक बिन्दीदार रुझान मॉडल (GloFAS) सँ अछि, क्यूसेकक पूर्वानुमान नहि।',
      report: 'रिपोर्ट देखू', unavailable: 'बराजक लाइव रीडिंग एखन उपलब्ध नहि अछि।', whatIf: 'जँ एहन भेल', backToLive: 'लाइव रीडिंग पर घुरू', whatIfNote: (l) => `ई अहाँक चुनल अनुमानित स्तर अछि। लाइव रीडिंग ${l} क्यूसेक अछि।`,
    },
    floods: {
      title: '{year} सँ आब धरिक बाढ़ि', official: 'सरकारी', intro: (n, t) => `${n} बाढ़ि, जखन बराज सँ ${t} लाख क्यूसेक वा बेसी छोड़ल गेल`,
      days: (d) => `${d} दिन`, lakhCusecs: 'लाख क्यूसेक', peakOn: (d) => `${d} केँ चरम`,
      show: 'चरम स्तर नक्शा पर देखाउ', shown: 'नक्शा पर चरम स्तर देखा रहल अछि', replay: 'फेर चलाउ',
      note: 'बिहार जल संसाधन विभागक सरकारी बराज रीडिंग (भोर 10 आ दुपहर 3 बजे)। 2018 सँ पहिनुक रिपोर्ट मे फाटकक स्थिति अछि मुदा बहाव नहि, तेँ रिकॉर्ड 2018 सँ शुरू होइत अछि।',
      unavailable: 'बाढ़िक रिकॉर्ड एखन उपलब्ध नहि अछि।', replayTitle: (d) => `दर्ज बाढ़ि · ${d}`,
      replayNote: 'दर्ज: बीरपुर पर बिहार जल संसाधन विभागक बराज रीडिंग (भोर 10 आ दुपहर 3 बजे)।',
      all: 'सभ', major: 'पैघ (3 लाख+)',
    },
  },
}
