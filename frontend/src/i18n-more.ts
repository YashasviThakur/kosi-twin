// Wording for the evacuation card (share / print) and the first-visit tour. Bhojpuri and Maithili need
// native-speaker review, like the rest.
import type { Lang } from './api'

interface More {
  share: string
  copyLink: string
  offline: string
  copied: string
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
  alert: {
    title: string; intro: (name: string) => string; email: string; placeholder: string; button: string; sending: string
    confirm: (email: string) => string; updated: string; dry: string; test: string; testSent: string; testDry: string
    invalid: string; tooMany: string; limit: string; error: string; privacy: string
  }
  load: {
    title: string; intro: (people: string) => string; people: (n: string) => string; from: (names: string) => string
    boat: (people: string, villages: string) => string; note: string; loading: string; empty: string; unavailable: string
    kinds: { hospital: string; school: string; high_ground: string }; more: (n: number) => string
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
    share: 'Share', copyLink: 'Copy link', offline: 'You are offline. Showing what was saved on this phone; the live reading may be old.', copied: 'Link copied', print: 'Print', sheetTitle: 'Evacuation card',
    sheetNote: 'A planning estimate from a flood model, not an official warning. Follow the district administration’s instructions.',
    generated: 'Made on',
    takeTitle: 'Take with you',
    takeItems: ['Ration card, Aadhaar and papers in a plastic bag', 'Medicines and a first-aid kit', 'Drinking water and dry food for 3 days',
      'Torch and a charged phone with a power bank', 'Warm and dry clothes, blanket', 'Cash, and a list of phone numbers'],
    tour: {
      next: 'Next', back: 'Back', done: 'Start exploring', skip: 'Skip',
      steps: [
        { title: 'Set the river level', text: 'The board shows the flow released at the Birpur barrage, in cusecs. Drag the water up or down to ask “what if it rose to…”.' },
        { title: 'The live Kosi', text: 'Below the gauge: the newest official reading from the Bihar Water Resources Department, how old it is, and the last 60 days. Moved the gauge? Tap “Back to the live reading”.' },
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
    alert: {
      title: 'Get email alerts for this village', intro: (n) => `We email you when the river reading climbs to a level that would flood ${n}.`,
      email: 'Your email', placeholder: 'name@example.com', button: 'Alert me', sending: 'Signing you up…',
      confirm: (e) => `Check ${e}: AWS has sent you a confirmation link. Alerts start once you click it.`,
      updated: 'You are following this village. Your address was already confirmed.',
      dry: 'Demo mode: this copy of the app does not send email.', test: 'Send me a test alert',
      testSent: 'Test alert sent. It can take a minute to arrive.', testDry: 'Demo mode: the test alert was written to a file, not emailed.',
      invalid: 'That does not look like an email address.', tooMany: 'Too many sign-ups today. Please try again tomorrow.',
      limit: 'You can follow up to 5 villages with one address.', error: 'Alerts are unavailable right now.',
      privacy: 'We use your address only for alerts about the villages you follow. Every email has an unsubscribe link. An alert is a planning estimate, not an official warning.',
    },
    load: {
      title: 'Where people would go', intro: (p) => `About ${p} people would have to move at this level. This is where the plan sends them.`,
      people: (n) => `${n} people`, from: (names) => `from ${names}`,
      boat: (p, v) => `${p} people in ${v} villages have no dry road out and would need boats.`,
      note: 'Demand only. The capacity of schools, hospitals and roads is not in our data, so this cannot say whether a place has room.',
      loading: 'Working out the routes…', empty: 'No village floods at this level, so nobody has to move.', unavailable: 'This view is unavailable right now.',
      kinds: { hospital: 'Hospital', school: 'School / college', high_ground: 'Raised road' }, more: (n) => `and ${n} more places`,
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
    share: 'साझा करें', copyLink: 'लिंक कॉपी करें', offline: 'आप ऑफ़लाइन हैं। इस फ़ोन में सहेजा हुआ दिख रहा है; लाइव रीडिंग पुरानी हो सकती है।', copied: 'लिंक कॉपी हो गया', print: 'छापें', sheetTitle: 'निकासी कार्ड',
    sheetNote: 'यह बाढ़ मॉडल का योजना हेतु अनुमान है, आधिकारिक चेतावनी नहीं। ज़िला प्रशासन के निर्देश मानें।',
    generated: 'बनाया गया',
    takeTitle: 'साथ ले जाएँ',
    takeItems: ['राशन कार्ड, आधार और काग़ज़ात प्लास्टिक की थैली में', 'दवाइयाँ और प्राथमिक उपचार का सामान', '3 दिन का पीने का पानी और सूखा खाना',
      'टॉर्च, चार्ज किया फ़ोन और पावर बैंक', 'गर्म व सूखे कपड़े, कंबल', 'नकद पैसे और फ़ोन नंबरों की सूची'],
    tour: {
      next: 'आगे', back: 'पीछे', done: 'शुरू करें', skip: 'छोड़ें',
      steps: [
        { title: 'नदी का स्तर तय करें', text: 'बोर्ड बीरपुर बराज से छोड़ा गया बहाव क्यूसेक में दिखाता है। “अगर इतना बढ़ा तो?” देखने के लिए पानी को ऊपर-नीचे खींचें।' },
        { title: 'अभी की कोसी', text: 'गेज के नीचे: बिहार जल संसाधन विभाग की ताज़ा सरकारी रीडिंग, वह कितनी पुरानी है, और पिछले 60 दिन। गेज हिलाया? “लाइव रीडिंग पर लौटें” दबाएँ।' },
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
    alert: {
      title: 'इस गाँव के लिए ईमेल अलर्ट पाएँ', intro: (n) => `जब नदी की रीडिंग इतनी बढ़ेगी कि ${n} में पानी आ सके, हम आपको ईमेल करेंगे।`,
      email: 'आपका ईमेल', placeholder: 'name@example.com', button: 'अलर्ट भेजें', sending: 'साइन-अप हो रहा है…',
      confirm: (e) => `${e} देखें: AWS ने पुष्टि का लिंक भेजा है। लिंक दबाते ही अलर्ट शुरू हो जाएँगे।`,
      updated: 'आप इस गाँव को फ़ॉलो कर रहे हैं। आपका पता पहले से पुष्ट है।',
      dry: 'डेमो मोड: इस प्रति से कोई ईमेल नहीं जाता।', test: 'मुझे टेस्ट अलर्ट भेजें',
      testSent: 'टेस्ट अलर्ट भेज दिया गया। पहुँचने में एक मिनट लग सकता है।', testDry: 'डेमो मोड: टेस्ट अलर्ट ईमेल नहीं हुआ, फ़ाइल में लिखा गया।',
      invalid: 'यह ईमेल पता सही नहीं लगता।', tooMany: 'आज बहुत साइन-अप हो चुके हैं। कल फिर कोशिश करें।',
      limit: 'एक पते से 5 गाँव तक फ़ॉलो कर सकते हैं।', error: 'अलर्ट अभी उपलब्ध नहीं हैं।',
      privacy: 'आपका पता सिर्फ़ चुने हुए गाँवों के अलर्ट के लिए इस्तेमाल होगा। हर ईमेल में सदस्यता छोड़ने का लिंक है। अलर्ट बाढ़ मॉडल का अनुमान है, सरकारी चेतावनी नहीं।',
    },
    load: {
      title: 'लोग कहाँ जाएँगे', intro: (p) => `इस स्तर पर लगभग ${p} लोगों को निकलना होगा। योजना उन्हें यहाँ भेजती है।`,
      people: (n) => `${n} लोग`, from: (names) => `${names} से`,
      boat: (p, v) => `${v} गाँवों के ${p} लोगों के लिए बाहर निकलने की कोई सूखी सड़क नहीं है, उन्हें नाव चाहिए होगी।`,
      note: 'सिर्फ़ ज़रूरत का हिसाब। स्कूलों, अस्पतालों और सड़कों की क्षमता हमारे आँकड़ों में नहीं है, इसलिए यह नहीं कहा जा सकता कि जगह है या नहीं।',
      loading: 'रास्ते निकाले जा रहे हैं…', empty: 'इस स्तर पर कोई गाँव नहीं डूबता, इसलिए किसी को निकलना नहीं है।', unavailable: 'यह जानकारी अभी उपलब्ध नहीं है।',
      kinds: { hospital: 'अस्पताल', school: 'स्कूल / कॉलेज', high_ground: 'ऊँची सड़क' }, more: (n) => `और ${n} जगहें`,
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
    share: 'साझा करीं', copyLink: 'लिंक कॉपी करीं', offline: 'रउआ ऑफ़लाइन बानी। एह फ़ोन में सहेजल देखात बा; लाइव रीडिंग पुरान हो सकेला।', copied: 'लिंक कॉपी हो गइल', print: 'छापीं', sheetTitle: 'निकासी कार्ड',
    sheetNote: 'ई बाढ़ मॉडल के योजना खातिर अंदाजा बा, सरकारी चेतावनी ना। जिला प्रशासन के निर्देश मानीं।',
    generated: 'बनल',
    takeTitle: 'साथे ले जाईं',
    takeItems: ['राशन कार्ड, आधार आ कागज प्लास्टिक के थैली में', 'दवाई आ प्राथमिक उपचार के सामान', '3 दिन के पिए के पानी आ सूखा खाना',
      'टॉर्च, चार्ज कइल फोन आ पावर बैंक', 'गरम आ सूखा कपड़ा, कंबल', 'नगद पइसा आ फोन नंबर के सूची'],
    tour: {
      next: 'आगे', back: 'पीछे', done: 'शुरू करीं', skip: 'छोड़ीं',
      steps: [
        { title: 'नदी के स्तर तय करीं', text: 'बोर्ड बीरपुर बराज से छोड़ल बहाव क्यूसेक में देखावेला। “अगर अतना बढ़ल त?” देखे खातिर पानी के ऊपर-नीचे खींचीं।' },
        { title: 'अब के कोसी', text: 'गेज के नीचे: बिहार जल संसाधन विभाग के ताज़ा सरकारी रीडिंग, ऊ केतना पुरान बा, आ पिछला 60 दिन। गेज हिलावल? “लाइव रीडिंग पर लौटीं” दबाईं।' },
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
    alert: {
      title: 'एह गाँव खातिर ईमेल अलर्ट पाईं', intro: (n) => `जब नदी के रीडिंग अतना बढ़ी कि ${n} में पानी आ सके, हम रउआ के ईमेल करब।`,
      email: 'रउआ के ईमेल', placeholder: 'name@example.com', button: 'अलर्ट भेजीं', sending: 'साइन-अप होखत बा…',
      confirm: (e) => `${e} देखीं: AWS पुष्टि के लिंक भेजले बा। लिंक दबावते अलर्ट शुरू हो जाई।`,
      updated: 'रउआ ई गाँव फ़ॉलो करत बानी। रउआ के पता पहिलहीं पुष्ट बा।',
      dry: 'डेमो मोड: एह प्रति से कवनो ईमेल ना जाला।', test: 'हमके टेस्ट अलर्ट भेजीं',
      testSent: 'टेस्ट अलर्ट भेज दिहल गइल। पहुँचे में एक मिनट लाग सकेला।', testDry: 'डेमो मोड: टेस्ट अलर्ट ईमेल ना भइल, फ़ाइल में लिखल गइल।',
      invalid: 'ई ईमेल पता सही नइखे लागत।', tooMany: 'आज बहुत साइन-अप हो गइल। काल्ह फेर कोशिश करीं।',
      limit: 'एक पता से 5 गाँव ले फ़ॉलो कर सकिले।', error: 'अलर्ट अबहीं ना मिल रहल बा।',
      privacy: 'रउआ के पता खाली चुनल गाँव के अलर्ट खातिर इस्तेमाल होई। हर ईमेल में सदस्यता छोड़े के लिंक बा। अलर्ट बाढ़ मॉडल के अंदाज़ा ह, सरकारी चेतावनी ना।',
    },
    load: {
      title: 'लोग कहाँ जइहें', intro: (p) => `एह स्तर पर करीब ${p} लोग के निकले के पड़ी। योजना उनके एहिजा भेजेला।`,
      people: (n) => `${n} लोग`, from: (names) => `${names} से`,
      boat: (p, v) => `${v} गाँव के ${p} लोग खातिर बाहर निकले के कवनो सूखल सड़क नइखे, उनके नाव चाहीं।`,
      note: 'खाली जरूरत के हिसाब। स्कूल, अस्पताल आ सड़क के क्षमता हमनी के आँकड़ा में नइखे, एहसे ई ना कहल जा सकेला कि जगह बा कि ना।',
      loading: 'रस्ता निकालल जात बा…', empty: 'एह स्तर पर कवनो गाँव ना डूबेला, एहसे केहू के निकले के नइखे।', unavailable: 'ई जानकारी अबहीं ना मिलल।',
      kinds: { hospital: 'अस्पताल', school: 'स्कूल / कॉलेज', high_ground: 'ऊँच सड़क' }, more: (n) => `आ ${n} गो आउर जगह`,
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
    share: 'साझा करू', copyLink: 'लिंक कॉपी करू', offline: 'अहाँ ऑफ़लाइन छी। एहि फ़ोन मे सहेजल देखा रहल अछि; लाइव रीडिंग पुरान भ सकैत अछि।', copied: 'लिंक कॉपी भ गेल', print: 'छापू', sheetTitle: 'निकासी कार्ड',
    sheetNote: 'ई बाढ़ि मॉडलक योजनाक लेल अनुमान अछि, सरकारी चेतावनी नहि। जिला प्रशासनक निर्देश मानू।',
    generated: 'बनाओल गेल',
    takeTitle: 'संगे लऽ जाउ',
    takeItems: ['राशन कार्ड, आधार आ कागज प्लास्टिकक झोरा मे', 'दवाइ आ प्राथमिक उपचारक सामान', '3 दिनक पिबाक पानि आ सुक्खल खाना',
      'टॉर्च, चार्ज कएल फोन आ पावर बैंक', 'गरम आ सुक्खल कपड़ा, कम्बल', 'नगद पाइ आ फोन नंबरक सूची'],
    tour: {
      next: 'आगू', back: 'पाछू', done: 'शुरू करू', skip: 'छोड़ू',
      steps: [
        { title: 'नदीक स्तर तय करू', text: 'बोर्ड बीरपुर बराजसँ छोड़ल बहाव क्यूसेक मे देखबैत अछि। “जँ एतेक बढ़ल तँ?” देखबाक लेल पानिकेँ ऊपर-नीचाँ घिसियाउ।' },
        { title: 'एखनुक कोसी', text: 'गेजक नीचाँ: बिहार जल संसाधन विभागक ताज़ा सरकारी रीडिंग, ओ कतेक पुरान अछि, आ पछिला 60 दिन। गेज हिलेलहुँ? “लाइव रीडिंग पर घुरू” दबाउ।' },
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
    alert: {
      title: 'एहि गामक लेल ईमेल अलर्ट पाउ', intro: (n) => `जखन नदीक रीडिंग एतेक बढ़त जे ${n} मे पानि आबि सकय, हम अहाँकेँ ईमेल करब।`,
      email: 'अहाँक ईमेल', placeholder: 'name@example.com', button: 'अलर्ट पठाउ', sending: 'साइन-अप भ रहल अछि…',
      confirm: (e) => `${e} देखू: AWS पुष्टिक लिंक पठौने अछि। लिंक दबिते अलर्ट शुरू भ जाएत।`,
      updated: 'अहाँ ई गाम फ़ॉलो क रहल छी। अहाँक पता पहिनहि पुष्ट अछि।',
      dry: 'डेमो मोड: एहि प्रति सँ कोनो ईमेल नहि जाइत अछि।', test: 'हमरा टेस्ट अलर्ट पठाउ',
      testSent: 'टेस्ट अलर्ट पठा देल गेल। पहुँचबा मे एक मिनट लागि सकैत अछि।', testDry: 'डेमो मोड: टेस्ट अलर्ट ईमेल नहि भेल, फ़ाइल मे लिखल गेल।',
      invalid: 'ई ईमेल पता सही नहि लगैत अछि।', tooMany: 'आइ बहुत साइन-अप भ गेल। काल्हि फेर प्रयास करू।',
      limit: 'एक पता सँ 5 गाम धरि फ़ॉलो क सकैत छी।', error: 'अलर्ट एखन उपलब्ध नहि अछि।',
      privacy: 'अहाँक पता मात्र चुनल गामक अलर्ट लेल प्रयोग होएत। हर ईमेल मे सदस्यता छोड़बाक लिंक अछि। अलर्ट बाढ़ मॉडलक अनुमान अछि, सरकारी चेतावनी नहि।',
    },
    load: {
      title: 'लोक कतए जाएत', intro: (p) => `एहि स्तर पर लगभग ${p} लोककेँ निकलए पड़त। योजना हुनका सभकेँ एतए पठबैत अछि।`,
      people: (n) => `${n} लोक`, from: (names) => `${names} सँ`,
      boat: (p, v) => `${v} गामक ${p} लोकक लेल बाहर निकलबाक कोनो सुखायल सड़क नहि अछि, हुनका नाव चाही।`,
      note: 'मात्र जरूरतिक हिसाब। स्कूल, अस्पताल आ सड़कक क्षमता हमरा सभक आँकड़ा मे नहि अछि, तेँ ई नहि कहि सकैत छी जे जगह अछि कि नहि।',
      loading: 'रस्ता निकालल जा रहल अछि…', empty: 'एहि स्तर पर कोनो गाम नहि डूबैत अछि, तेँ ककरो निकलबाक नहि अछि।', unavailable: 'ई जानकारी एखन उपलब्ध नहि अछि।',
      kinds: { hospital: 'अस्पताल', school: 'स्कूल / कॉलेज', high_ground: 'ऊँच सड़क' }, more: (n) => `आ ${n} आओर जगह`,
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
