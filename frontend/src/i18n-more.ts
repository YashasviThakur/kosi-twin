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
  hist: {
    title: string; modelled: string; pick: (from: string) => string; of2024: string; forecast: string; jump: string
    show: string; shown: string; replay: string; note: string; unavailable: string; replayTitle: (d: string) => string; replayNote: string; overstated: string
  }
  live: {
    title: string; live: string; of2024: string; rising: string; falling: string; steady: string
    peak: (pct: number, day: string) => string; history: string; outlook: string; apply: string; applied: string
    note: string; unavailable: string
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
        { title: 'Replay September 2024', text: 'Watch the 2024 flood unfold: the water, the villages it reached, and when.' },
        { title: 'Who the water reaches', text: 'Villages in the water’s path, soonest first. The number is the hours until the water arrives.' },
        { title: 'When to leave', text: 'Pick a village to see when to leave, when the water arrives, how deep it gets, and where to go.' },
        { title: 'See it on your street', text: 'Add a photo of a street and see the forecast flood on it, at the depth forecast for that village.' },
      ],
    },
    info: 'How this works',
    retry: 'Try again',
    hist: {
      title: 'Look back', modelled: 'Modelled', pick: (f) => `Any day from ${f} to now`, of2024: 'of the 2024 flood flow', forecast: 'forecast',
      jump: 'Jump to a year’s biggest flow', show: 'Show this day on the map', shown: 'Showing this day on the map', replay: 'Replay this flood',
      note: 'Modelled river flow (GloFAS). It can read big Kosi floods low and rank years differently from official records. Only the September 2024 flood has a reported figure.',
      unavailable: 'Past river data is unavailable right now.', replayTitle: (d) => `Modelled flow · ${d}`,
      replayNote: 'MODELLED (GloFAS), not a barrage record. It can read big Kosi floods low and rank years differently from official records.',
      overstated: 'The model shows this day bigger than the 2024 flood, but news reports called 2024 the biggest Kosi flow in over 50 years. Treat the size of this day as unreliable.',
    },
    live: {
      title: 'River now (modelled)', live: 'Live', of2024: 'of the 2024 flood flow', rising: 'Rising over the next 3 days', falling: 'Falling over the next 3 days',
      steady: 'Steady over the next 3 days', peak: (p, d) => `up to ${p}% by ${d}`, history: 'Last 4 months', outlook: '14-day outlook',
      apply: 'Show this level on the map', applied: 'Showing this level on the map',
      note: 'Modelled river flow (GloFAS), compared with the same model’s reading for the 2024 flood. Not a gauge reading, and the model reads big Kosi floods low.',
      unavailable: 'Live river data is unavailable right now.',
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
        { title: 'सितंबर 2024 दोबारा देखें', text: '2024 की बाढ़ को चलते देखें: पानी, कौन-से गाँव डूबे और कब।' },
        { title: 'पानी किन तक पहुँचता है', text: 'पानी की राह में आने वाले गाँव, जिन तक पहले पहुँचेगा वे ऊपर। संख्या बताती है कितने घंटे में पानी पहुँचेगा।' },
        { title: 'कब निकलना है', text: 'गाँव चुनें और देखें कब निकलना है, पानी कब पहुँचेगा, कितना गहरा होगा और कहाँ जाना है।' },
        { title: 'अपनी गली में देखें', text: 'गली की फ़ोटो जोड़ें और उस गाँव के अनुमानित पानी की गहराई के साथ बाढ़ देखें।' },
      ],
    },
    info: 'यह कैसे काम करता है',
    retry: 'फिर कोशिश करें',
    hist: {
      title: 'पीछे देखें', modelled: 'मॉडल से', pick: (f) => `${f} से अब तक कोई भी दिन`, of2024: '2024 की बाढ़ के बहाव का', forecast: 'अनुमान',
      jump: 'किसी साल का सबसे बड़ा बहाव चुनें', show: 'यह दिन नक्शे पर दिखाएँ', shown: 'नक्शे पर यही दिन दिख रहा है', replay: 'यह बाढ़ दोबारा चलाएँ',
      note: 'मॉडल से निकाला नदी का बहाव (GloFAS)। यह कोसी की बड़ी बाढ़ को कम आँक सकता है और सालों का क्रम सरकारी रिकॉर्ड से अलग दिखा सकता है। केवल सितंबर 2024 की बाढ़ का रिपोर्ट किया आँकड़ा है।',
      unavailable: 'पिछला नदी डेटा अभी उपलब्ध नहीं है।', replayTitle: (d) => `मॉडल से बहाव · ${d}`,
      replayNote: 'मॉडल से (GloFAS), बराज का रिकॉर्ड नहीं। यह कोसी की बड़ी बाढ़ को कम आँक सकता है और सालों का क्रम सरकारी रिकॉर्ड से अलग दिखा सकता है।',
      overstated: 'मॉडल इस दिन को 2024 की बाढ़ से बड़ा दिखा रहा है, पर समाचारों में 2024 को 50 साल से ज़्यादा में कोसी का सबसे बड़ा बहाव बताया गया था। इस दिन के आकार को भरोसेमंद न मानें।',
    },
    live: {
      title: 'नदी अभी (मॉडल से)', live: 'लाइव', of2024: '2024 की बाढ़ के बहाव का', rising: 'अगले 3 दिन बढ़ेगा', falling: 'अगले 3 दिन घटेगा',
      steady: 'अगले 3 दिन लगभग स्थिर', peak: (p, d) => `${d} तक ${p}% तक`, history: 'पिछले 4 महीने', outlook: '14 दिन का अनुमान',
      apply: 'यह स्तर नक्शे पर दिखाएँ', applied: 'नक्शे पर यही स्तर दिख रहा है',
      note: 'मॉडल से निकाला नदी का बहाव (GloFAS), उसी मॉडल की 2024 की बाढ़ के आँकड़े से तुलना में। यह गेज की रीडिंग नहीं है, और मॉडल कोसी की बड़ी बाढ़ को कम आँकता है।',
      unavailable: 'नदी का लाइव डेटा अभी उपलब्ध नहीं है।',
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
        { title: 'सितंबर 2024 फेर देखीं', text: '2024 के बाढ़ के चलत देखीं: पानी, कवन गाँव डूबल आ कब।' },
        { title: 'पानी केकरा तक पहुँचेला', text: 'पानी के राह में पड़े वाला गाँव, जहाँ पहिले पहुँची उ ऊपर। संख्या बतावेला कतना घंटा में पानी पहुँची।' },
        { title: 'कब निकले के बा', text: 'गाँव चुनीं आ देखीं कब निकले के बा, पानी कब पहुँची, केतना गहिर होई आ कहाँ जाए के बा।' },
        { title: 'आपन गली में देखीं', text: 'गली के फोटो जोड़ीं आ ओह गाँव के अंदाजा वाला पानी के गहिराई संगे बाढ़ देखीं।' },
      ],
    },
    info: 'ई कइसे काम करेला',
    retry: 'फेर कोशिश करीं',
    hist: {
      title: 'पीछे देखीं', modelled: 'मॉडल से', pick: (f) => `${f} से अब ले कवनो दिन`, of2024: '2024 के बाढ़ के बहाव के', forecast: 'अंदाजा',
      jump: 'कवनो साल के सबसे बड़ बहाव चुनीं', show: 'ई दिन नक्सा पर देखाईं', shown: 'नक्सा पर इहे दिन देखात बा', replay: 'ई बाढ़ फेर चलाईं',
      note: 'मॉडल से निकारल नदी के बहाव (GloFAS)। ई कोसी के बड़ बाढ़ के कम आँक सकेला आ सालन के क्रम सरकारी रिकॉर्ड से अलग देखा सकेला। खाली सितंबर 2024 के बाढ़ के रिपोर्ट कइल आँकड़ा बा।',
      unavailable: 'पिछला नदी डेटा अबहीं ना मिलल।', replayTitle: (d) => `मॉडल से बहाव · ${d}`,
      replayNote: 'मॉडल से (GloFAS), बराज के रिकॉर्ड ना। ई कोसी के बड़ बाढ़ के कम आँक सकेला आ सालन के क्रम सरकारी रिकॉर्ड से अलग देखा सकेला।',
      overstated: 'मॉडल ई दिन के 2024 के बाढ़ से बड़ देखावत बा, बाकिर समाचार में 2024 के 50 साल से बेसी में कोसी के सबसे बड़ बहाव बतावल गइल रहे। ई दिन के आकार पर भरोसा मत करीं।',
    },
    live: {
      title: 'नदी अब (मॉडल से)', live: 'लाइव', of2024: '2024 के बाढ़ के बहाव के', rising: 'अगिला 3 दिन बढ़ी', falling: 'अगिला 3 दिन घटी',
      steady: 'अगिला 3 दिन लगभग स्थिर', peak: (p, d) => `${d} ले ${p}% तक`, history: 'पिछला 4 महीना', outlook: '14 दिन के अंदाजा',
      apply: 'ई स्तर नक्सा पर देखाईं', applied: 'नक्सा पर इहे स्तर देखात बा',
      note: 'मॉडल से निकारल नदी के बहाव (GloFAS), ओही मॉडल के 2024 के बाढ़ के आँकड़ा से तुलना में। ई गेज के रीडिंग ना ह, आ मॉडल कोसी के बड़ बाढ़ के कम आँकेला।',
      unavailable: 'नदी के लाइव डेटा अबहीं ना मिलल।',
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
        { title: 'सितम्बर 2024 फेर देखू', text: '2024 क बाढ़िकेँ चलैत देखू: पानि, कोन गाम डूबल आ कखन।' },
        { title: 'पानि ककरा धरि पहुँचैत अछि', text: 'पानिक बाटक गाम, जत्त पहिने पहुँचत से ऊपर। संख्या बतबैत अछि कतेक घंटा मे पानि पहुँचत।' },
        { title: 'कखन निकलबाक अछि', text: 'गाम चुनू आ देखू कखन निकलबाक अछि, पानि कखन पहुँचत, कतेक गहींर होयत आ कतय जयबाक अछि।' },
        { title: 'अपन गली मे देखू', text: 'गलीक फोटो जोड़ू आ ओहि गामक अनुमानित पानिक गहराइक संग बाढ़ि देखू।' },
      ],
    },
    info: 'ई कोना काज करैत अछि',
    retry: 'फेर प्रयास करू',
    hist: {
      title: 'पाछू देखू', modelled: 'मॉडल सँ', pick: (f) => `${f} सँ आब धरि कोनो दिन`, of2024: '2024 क बाढ़िक बहावक', forecast: 'अनुमान',
      jump: 'कोनो सालक सभसँ पैघ बहाव चुनू', show: 'ई दिन नक्शा पर देखाउ', shown: 'नक्शा पर यैह दिन देखा रहल अछि', replay: 'ई बाढ़ि फेर चलाउ',
      note: 'मॉडल सँ निकालल नदीक बहाव (GloFAS)। ई कोसीक पैघ बाढ़िकेँ कम आँकि सकैत अछि आ सभक क्रम सरकारी रिकॉर्ड सँ अलग देखा सकैत अछि। मात्र सितम्बर 2024 क बाढ़िक रिपोर्ट कएल आँकड़ा अछि।',
      unavailable: 'पछिला नदी डेटा एखन उपलब्ध नहि अछि।', replayTitle: (d) => `मॉडल सँ बहाव · ${d}`,
      replayNote: 'मॉडल सँ (GloFAS), बराजक रिकॉर्ड नहि। ई कोसीक पैघ बाढ़िकेँ कम आँकि सकैत अछि आ सभक क्रम सरकारी रिकॉर्ड सँ अलग देखा सकैत अछि।',
      overstated: 'मॉडल ई दिनकेँ 2024 क बाढ़ि सँ पैघ देखा रहल अछि, मुदा समाचार मे 2024 केँ 50 सालसँ बेसी मे कोसीक सभसँ पैघ बहाव कहल गेल छल। ई दिनक आकार पर भरोसा नहि करू।',
    },
    live: {
      title: 'नदी एखन (मॉडल सँ)', live: 'लाइव', of2024: '2024 क बाढ़िक बहावक', rising: 'अगिला 3 दिन बढ़त', falling: 'अगिला 3 दिन घटत',
      steady: 'अगिला 3 दिन लगभग स्थिर', peak: (p, d) => `${d} धरि ${p}% धरि`, history: 'पछिला 4 मास', outlook: '14 दिनक अनुमान',
      apply: 'ई स्तर नक्शा पर देखाउ', applied: 'नक्शा पर यैह स्तर देखा रहल अछि',
      note: 'मॉडल सँ निकालल नदीक बहाव (GloFAS), ओही मॉडलक 2024 क बाढ़िक आँकड़ा सँ तुलना मे। ई गेजक रीडिंग नहि अछि, आ मॉडल कोसीक पैघ बाढ़िकेँ कम आँकैत अछि।',
      unavailable: 'नदीक लाइव डेटा एखन उपलब्ध नहि अछि।',
    },
  },
}
