// Village card wording (Screen 2). Bhojpuri and Maithili need native-speaker review, like the rest.
import type { Lang, Risk } from './api'

type CardStrings = {
  close: string
  people: (n: string) => string
  elderly: (n: string) => string
  children: (n: string) => string
  leaveBy: string
  leaveNow: string
  leaveIn: (h: string) => string
  boat: string
  boatHelp: string
  arrives: string
  arrivesIn: (h: string) => string
  depth: string
  outskirts: string
  advisory: string
  play: string
  stop: string
  audioError: string
  chart: string
  now: string
  facilities: (n: number) => string
  safeTitle: string
  safeOutside: string
  safeAbove: string
  loading: string
  error: string
  headline: Record<Risk, string>
}

export const C: Record<Lang, CardStrings> = {
  en: {
    close: 'Close village card',
    people: (n) => `${n} people`,
    elderly: (n) => `${n} aged 60+`,
    children: (n) => `${n} under 5`,
    leaveBy: 'Leave by',
    leaveNow: 'Leave now',
    leaveIn: (h) => `in ${h}`,
    boat: 'Boat rescue needed',
    boatHelp: 'No road stays dry long enough to walk to a shelter. Send boats; people should move to the highest roof or embankment.',
    arrives: 'Water arrives',
    arrivesIn: (h) => `in ${h}`,
    depth: 'Expected depth',
    outskirts: 'Village edge only',
    advisory: 'Advisory',
    play: 'Play',
    stop: 'Stop',
    audioError: 'Voice is unavailable right now. Read the advisory aloud instead.',
    chart: 'Water depth, next 72 hours',
    now: 'now',
    facilities: (n) => `${n} schools and hospitals nearby will flood`,
    safeTitle: 'Not in the water’s path',
    safeOutside: 'This village drains to another river, outside the Kosi floodplain this model covers.',
    safeAbove: 'At this discharge, water stays below this village.',
    loading: 'Working out the flood for this village…',
    error: 'Couldn’t load this village. Select it again to retry.',
    headline: { EVACUATE: 'Evacuate', WATCH: 'Watch', SAFE: 'Safe' },
  },
  hi: {
    close: 'गाँव का कार्ड बंद करें',
    people: (n) => `${n} लोग`,
    elderly: (n) => `${n} 60+ उम्र के`,
    children: (n) => `${n} 5 साल से कम`,
    leaveBy: 'कब तक निकलें',
    leaveNow: 'अभी निकलें',
    leaveIn: (h) => `${h} में`,
    boat: 'नाव से बचाव ज़रूरी',
    boatHelp: 'आश्रय तक पैदल जाने के लिए कोई सड़क सूखी नहीं रहती। नाव भेजें; लोग सबसे ऊँची छत या बाँध पर जाएँ।',
    arrives: 'पानी पहुँचेगा',
    arrivesIn: (h) => `${h} में`,
    depth: 'अनुमानित गहराई',
    outskirts: 'सिर्फ़ गाँव के किनारे तक',
    advisory: 'सूचना',
    play: 'सुनें',
    stop: 'रोकें',
    audioError: 'आवाज़ अभी उपलब्ध नहीं है। सूचना पढ़कर सुनाएँ।',
    chart: 'पानी की गहराई, अगले 72 घंटे',
    now: 'अभी',
    facilities: (n) => `पास के ${n} स्कूल और अस्पताल डूबेंगे`,
    safeTitle: 'पानी की राह में नहीं',
    safeOutside: 'यह गाँव दूसरी नदी की ओर ढलान पर है, इस मॉडल के कोसी बाढ़ क्षेत्र से बाहर।',
    safeAbove: 'इस बहाव पर पानी इस गाँव से नीचे रहता है।',
    loading: 'इस गाँव के लिए बाढ़ का हिसाब हो रहा है…',
    error: 'यह गाँव लोड नहीं हुआ। दोबारा चुनें।',
    headline: { EVACUATE: 'खाली करें', WATCH: 'सतर्क रहें', SAFE: 'सुरक्षित' },
  },
  bho: {
    close: 'गाँव के कार्ड बंद करीं',
    people: (n) => `${n} लोग`,
    elderly: (n) => `${n} 60+ उमिर के`,
    children: (n) => `${n} 5 साल से छोट`,
    leaveBy: 'कब ले निकलीं',
    leaveNow: 'अबहिंए निकलीं',
    leaveIn: (h) => `${h} में`,
    boat: 'नाव से बचाव जरूरी',
    boatHelp: 'आश्रय ले पैदल जाए खातिर कवनो सड़क सूखल ना रहेला। नाव भेजीं; लोग सबसे ऊँच छत भा बान्ह पर जास।',
    arrives: 'पानी पहुँची',
    arrivesIn: (h) => `${h} में`,
    depth: 'अंदाजा गहराई',
    outskirts: 'खाली गाँव के किनारा ले',
    advisory: 'सूचना',
    play: 'सुनीं',
    stop: 'रोकीं',
    audioError: 'आवाज अबहीं ना मिलल। सूचना पढ़ के सुनाईं।',
    chart: 'पानी के गहराई, अगिला 72 घंटा',
    now: 'अबहीं',
    facilities: (n) => `लगे के ${n} स्कूल आ अस्पताल डूबी`,
    safeTitle: 'पानी के राह में नइखे',
    safeOutside: 'ई गाँव दोसर नदी ओर ढलान पर बा, एह मॉडल के कोसी बाढ़ इलाका से बाहर।',
    safeAbove: 'एह बहाव पर पानी एह गाँव से नीचे रहेला।',
    loading: 'एह गाँव खातिर बाढ़ के हिसाब हो रहल बा…',
    error: 'ई गाँव लोड ना भइल। फेर से चुनीं।',
    headline: { EVACUATE: 'खाली करीं', WATCH: 'सचेत रहीं', SAFE: 'सुरक्षित' },
  },
  mai: {
    close: 'गामक कार्ड बंद करू',
    people: (n) => `${n} लोक`,
    elderly: (n) => `${n} 60+ उमेरक`,
    children: (n) => `${n} 5 बरख सँ छोट`,
    leaveBy: 'कखन धरि निकलू',
    leaveNow: 'एखनहि निकलू',
    leaveIn: (h) => `${h} मे`,
    boat: 'नाह सँ बचाव जरूरी',
    boatHelp: 'आश्रय धरि पैदल जेबाक लेल कोनो सड़क सुखायल नहि रहैत अछि। नाह पठाउ; लोक सभसँ ऊँच छत वा बान्ह पर जाथि।',
    arrives: 'पानि पहुँचत',
    arrivesIn: (h) => `${h} मे`,
    depth: 'अनुमानित गहराइ',
    outskirts: 'मात्र गामक किनार धरि',
    advisory: 'सूचना',
    play: 'सुनू',
    stop: 'रोकू',
    audioError: 'आवाज एखन उपलब्ध नहि अछि। सूचना पढ़ि क सुनाउ।',
    chart: 'पानिक गहराइ, अगिला 72 घंटा',
    now: 'एखन',
    facilities: (n) => `लगक ${n} स्कूल आ अस्पताल डूबत`,
    safeTitle: 'पानिक बाट मे नहि',
    safeOutside: 'ई गाम दोसर नदी दिस ढलान पर अछि, एहि मॉडलक कोसी बाढ़ि क्षेत्र सँ बाहर।',
    safeAbove: 'एहि बहाव पर पानि एहि गाम सँ नीचाँ रहैत अछि।',
    loading: 'एहि गामक लेल बाढ़िक हिसाब भ रहल अछि…',
    error: 'ई गाम लोड नहि भेल। फेर चुनू।',
    headline: { EVACUATE: 'खाली करू', WATCH: 'सतर्क रहू', SAFE: 'सुरक्षित' },
  },
}
