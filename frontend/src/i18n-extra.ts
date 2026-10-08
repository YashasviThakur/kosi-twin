// Wording for the village card's extra sections: destinations + travel times, SOS, weather, depth
// comparison and voice. Bhojpuri and Maithili need native-speaker review, like the rest.
import type { Lang } from './api'

export type Category = 'hospital' | 'school' | 'high_ground'
export type Mode = 'walk' | 'cycle' | 'motorbike'
export const CATEGORY_ICON: Record<Category, string> = { hospital: '🏥', school: '🏫', high_ground: '🛣️' }
export type DepthObject = 'charpai' | 'goat' | 'motorbike' | 'cow' | 'adult' | 'door' | 'house'

type Strings = {
  destinations: string
  recommended: string
  category: Record<Category, string>
  mode: Record<Mode, string>
  showRoute: string
  modeNote: string
  sos: string
  sosItems: { number: string; label: string }[]
  weather: string
  here: string
  upstream: string
  upstreamNote: string
  rainChance: (p: number) => string
  weatherError: string
  depthCompare: string
  object: Record<DepthObject, string>
  deeperThan: (a: string) => string
  shallowerThan: (b: string) => string
  belowAll: (a: string) => string
  aboveAll: (b: string) => string
  voice: string
  female: string
  male: string
  maleMissing: string
}

export const X: Record<Lang, Strings> = {
  en: {
    destinations: 'Where to go',
    recommended: 'Recommended',
    category: { hospital: 'Nearest dry hospital', school: 'Nearest dry school / college', high_ground: 'Nearest raised dry road' },
    mode: { walk: 'Walk', cycle: 'Cycle', motorbike: 'Motorbike' },
    showRoute: 'Show route',
    modeNote: 'Leave-by times assume walking; roads may be crowded.',
    sos: 'Emergency help',
    sosItems: [
      { number: '112', label: 'All emergencies' }, { number: '108', label: 'Ambulance' },
      { number: '1070', label: 'State disaster control room' }, { number: '1077', label: 'District control room' }],
    weather: 'Rain forecast',
    here: 'Here',
    upstream: 'Upstream (Nepal)',
    upstreamNote: 'Kosi floods are driven mostly by rain upstream in Nepal.',
    rainChance: (p) => `${p}% chance`,
    weatherError: 'Forecast unavailable right now.',
    depthCompare: 'How deep is that?',
    object: { charpai: 'charpai', goat: 'goat', motorbike: 'motorbike', cow: 'cow', adult: 'adult', door: 'door', house: 'one-storey house' },
    deeperThan: (a) => `deeper than a ${a}`,
    shallowerThan: (b) => `below a ${b}'s top`,
    belowAll: (a) => `below a ${a}`,
    aboveAll: (b) => `over a ${b}`,
    voice: 'Voice',
    female: 'Female',
    male: 'Male',
    maleMissing: 'This device has no male Hindi voice. Playing the female voice.',
  },
  hi: {
    destinations: 'कहाँ जाएँ',
    recommended: 'सुझाया गया',
    category: { hospital: 'सबसे पास सूखा अस्पताल', school: 'सबसे पास सूखा स्कूल / कॉलेज', high_ground: 'सबसे पास ऊँची सूखी सड़क' },
    mode: { walk: 'पैदल', cycle: 'साइकिल', motorbike: 'मोटरसाइकिल' },
    showRoute: 'रास्ता दिखाएँ',
    modeNote: 'निकलने का समय पैदल के हिसाब से है; सड़कों पर भीड़ हो सकती है।',
    sos: 'आपातकालीन मदद',
    sosItems: [
      { number: '112', label: 'सभी आपात स्थितियाँ' }, { number: '108', label: 'एम्बुलेंस' },
      { number: '1070', label: 'राज्य आपदा नियंत्रण कक्ष' }, { number: '1077', label: 'ज़िला नियंत्रण कक्ष' }],
    weather: 'बारिश का पूर्वानुमान',
    here: 'यहाँ',
    upstream: 'ऊपर (नेपाल)',
    upstreamNote: 'कोसी की बाढ़ ज़्यादातर नेपाल में ऊपर हुई बारिश से आती है।',
    rainChance: (p) => `${p}% संभावना`,
    weatherError: 'पूर्वानुमान अभी उपलब्ध नहीं है।',
    depthCompare: 'कितना गहरा?',
    object: { charpai: 'चारपाई', goat: 'बकरी', motorbike: 'मोटरसाइकिल', cow: 'गाय', adult: 'बड़ा आदमी', door: 'दरवाज़ा', house: 'एक मंज़िला घर' },
    deeperThan: (a) => `${a} से गहरा`,
    shallowerThan: (b) => `${b} से नीचे`,
    belowAll: (a) => `${a} से नीचे`,
    aboveAll: (b) => `${b} के ऊपर`,
    voice: 'आवाज़',
    female: 'महिला',
    male: 'पुरुष',
    maleMissing: 'इस डिवाइस में हिंदी पुरुष आवाज़ नहीं है। महिला आवाज़ चल रही है।',
  },
  bho: {
    destinations: 'कहाँ जाईं',
    recommended: 'सुझावल',
    category: { hospital: 'सबसे लगे सूखल अस्पताल', school: 'सबसे लगे सूखल स्कूल / कॉलेज', high_ground: 'सबसे लगे ऊँच सूखल सड़क' },
    mode: { walk: 'पैदल', cycle: 'साइकिल', motorbike: 'मोटरसाइकिल' },
    showRoute: 'रास्ता देखाईं',
    modeNote: 'निकले के समय पैदल के हिसाब से बा; सड़क पर भीड़ हो सकेला।',
    sos: 'आपातकालीन मदद',
    sosItems: [
      { number: '112', label: 'सब आपात हालत' }, { number: '108', label: 'एम्बुलेंस' },
      { number: '1070', label: 'राज्य आपदा नियंत्रण कक्ष' }, { number: '1077', label: 'जिला नियंत्रण कक्ष' }],
    weather: 'बरखा के अनुमान',
    here: 'इहाँ',
    upstream: 'ऊपर (नेपाल)',
    upstreamNote: 'कोसी के बाढ़ ज्यादातर नेपाल में ऊपर भइल बरखा से आवेला।',
    rainChance: (p) => `${p}% संभावना`,
    weatherError: 'अनुमान अबहीं ना मिलल।',
    depthCompare: 'केतना गहिर?',
    object: { charpai: 'खटिया', goat: 'बकरी', motorbike: 'मोटरसाइकिल', cow: 'गाय', adult: 'बड़ आदमी', door: 'दरवाजा', house: 'एक तल्ला घर' },
    deeperThan: (a) => `${a} से गहिर`,
    shallowerThan: (b) => `${b} से नीचे`,
    belowAll: (a) => `${a} से नीचे`,
    aboveAll: (b) => `${b} के ऊपर`,
    voice: 'आवाज',
    female: 'मेहरारू',
    male: 'मरद',
    maleMissing: 'एह डिवाइस में हिंदी मरद आवाज नइखे। मेहरारू आवाज चल रहल बा।',
  },
  mai: {
    destinations: 'कतय जाउ',
    recommended: 'सुझाओल',
    category: { hospital: 'सभसँ लगक सुखायल अस्पताल', school: 'सभसँ लगक सुखायल स्कूल / कॉलेज', high_ground: 'सभसँ लगक ऊँच सुखायल सड़क' },
    mode: { walk: 'पैदल', cycle: 'साइकिल', motorbike: 'मोटरसाइकिल' },
    showRoute: 'बाट देखाउ',
    modeNote: 'निकलबाक समय पैदलक हिसाब सँ अछि; सड़क पर भीड़ भ सकैत अछि।',
    sos: 'आपातकालीन मदति',
    sosItems: [
      { number: '112', label: 'सभ आपात स्थिति' }, { number: '108', label: 'एम्बुलेंस' },
      { number: '1070', label: 'राज्य आपदा नियंत्रण कक्ष' }, { number: '1077', label: 'जिला नियंत्रण कक्ष' }],
    weather: 'बरखाक अनुमान',
    here: 'एतय',
    upstream: 'ऊपर (नेपाल)',
    upstreamNote: 'कोसीक बाढ़ि बेसीकाल नेपाल मे ऊपर भेल बरखा सँ अबैत अछि।',
    rainChance: (p) => `${p}% संभावना`,
    weatherError: 'अनुमान एखन उपलब्ध नहि अछि।',
    depthCompare: 'कतेक गहींर?',
    object: { charpai: 'खाट', goat: 'बकरी', motorbike: 'मोटरसाइकिल', cow: 'गाय', adult: 'पैघ लोक', door: 'केबाड़', house: 'एक मंजिला घर' },
    deeperThan: (a) => `${a} सँ गहींर`,
    shallowerThan: (b) => `${b} सँ नीचाँ`,
    belowAll: (a) => `${a} सँ नीचाँ`,
    aboveAll: (b) => `${b} सँ ऊपर`,
    voice: 'आवाज',
    female: 'महिला',
    male: 'पुरुष',
    maleMissing: 'एहि डिवाइस मे हिंदी पुरुष आवाज नहि अछि। महिला आवाज चलि रहल अछि।',
  },
}
