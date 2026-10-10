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
  },
}
