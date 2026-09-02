"use client";
// ResQX multilingual support — English / हिंदी / मराठी
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "hi" | "mr";

export const LANGS: { code: Lang; label: string; native: string; voiceCode: string }[] = [
  { code: "en", label: "English", native: "English", voiceCode: "en-IN" },
  { code: "hi", label: "Hindi", native: "हिंदी", voiceCode: "hi-IN" },
  { code: "mr", label: "Marathi", native: "मराठी", voiceCode: "mr-IN" },
];

type Dict = Record<string, string>;

const en: Dict = {
  "brand.tagline": "Identify Risks. Assess Capacity. Prioritize Relocation. Save Lives.",
  "brand.sub": "Intelligent Hazard Assessment & Relocation Platform — Maharashtra",
  "nav.home": "Home",
  "nav.dashboard": "Dashboard",
  "nav.map": "Risk Map",
  "nav.analytics": "Analytics",
  "nav.vulnerability": "Vulnerability",
  "nav.capacity": "Capacity",
  "nav.relocation": "Relocation",
  "nav.alerts": "Alerts",
  "nav.infrastructure": "Infrastructure",
  "nav.schemes": "Schemes",
  "nav.protection": "Protection",
  "nav.satellite": "Satellite",
  "nav.simulation": "Simulation",
  "nav.reports": "Field Reports",
  "nav.govreports": "Reports",
  "nav.admin": "Admin",
  "nav.group.overview": "Overview",
  "nav.group.risk": "Risk & Planning",
  "nav.group.operations": "Operations",
  "nav.group.programs": "Programs & Governance",
  "common.exploreMap": "Explore Risk Map",
  "common.viewDashboard": "View Dashboard",
  "common.learnMore": "Learn More",
  "common.search": "Search habitations, districts…",
  "common.language": "Language",
  "common.online": "Online",
  "common.offline": "Offline Mode",
  "common.viewAll": "View All",
  "common.generate": "Generate",
  "common.generatePdf": "Generate PDF",
  "common.high": "High",
  "common.medium": "Medium",
  "common.low": "Low",
  "common.safe": "Safe",
  "common.population": "Population",
  "common.district": "District",
  "common.taluka": "Taluka",
  "common.hazardScore": "AI Hazard Score",
  "common.vulnerability": "Vulnerability Index",
  "common.urgency": "Urgency",
  "common.riskLevel": "Risk Level",
  "common.capacity": "Capacity",
  "common.match": "Match",
  "common.distance": "Distance",
  "common.status": "Status",
  "home.stats.analyzed": "Habitations Analyzed",
  "home.stats.districts": "Districts Covered",
  "home.stats.impact": "People in Survey Area",
  "home.stats.accuracy": "Data Accuracy",
  "home.hero.title1": "Intelligent. Data-Driven.",
  "home.hero.title2": "Disaster-Resilient Maharashtra.",
  "home.hero.desc":
    "ResQX identifies hazard-based red zones across Maharashtra, assesses carrying capacity of safe land, and prioritizes relocation of vulnerable habitations — from Mumbai flood wards to drought-hit Marathwada.",
  "ai.title": "ResQ AI Assistant",
  "ai.placeholder": "Ask about risks, schemes, alerts…",
  "ai.listen": "Voice input",
  "ai.speak": "Read answer aloud",
  "offline.banner": "You are offline — Field Mode active. Reports will sync automatically.",
  "footer.text": "Empowering government officials with data-driven insights for disaster risk reduction and sustainable relocation planning.",
  "footer.motto": "ResQX — Because Every Life Matters",
};

const hi: Dict = {
  "brand.tagline": "जोखिम पहचानें। क्षमता आंकें। पुनर्वास प्राथमिकता दें। जीवन बचाएं।",
  "brand.sub": "बुद्धिमान खतरा आकलन एवं पुनर्वास मंच — महाराष्ट्र",
  "nav.home": "होम",
  "nav.dashboard": "डैशबोर्ड",
  "nav.map": "जोखिम नक्शा",
  "nav.analytics": "विश्लेषण",
  "nav.vulnerability": "भेद्यता",
  "nav.capacity": "वहन क्षमता",
  "nav.relocation": "पुनर्वास",
  "nav.alerts": "चेतावनी",
  "nav.infrastructure": "अवसंरचना",
  "nav.schemes": "योजनाएं",
  "nav.protection": "सुरक्षा",
  "nav.satellite": "उपग्रह",
  "nav.simulation": "सिमुलेशन",
  "nav.reports": "फील्ड रिपोर्ट",
  "nav.govreports": "रिपोर्ट",
  "nav.admin": "एडमिन",
  "nav.group.overview": "अवलोकन",
  "nav.group.risk": "जोखिम एवं नियोजन",
  "nav.group.operations": "संचालन",
  "nav.group.programs": "कार्यक्रम एवं शासन",
  "common.exploreMap": "जोखिम नक्शा देखें",
  "common.viewDashboard": "डैशबोर्ड देखें",
  "common.learnMore": "और जानें",
  "common.search": "बस्तियाँ, ज़िले खोजें…",
  "common.language": "भाषा",
  "common.online": "ऑनलाइन",
  "common.offline": "ऑफलाइन मोड",
  "common.viewAll": "सभी देखें",
  "common.generate": "जनरेट करें",
  "common.generatePdf": "PDF बनाएं",
  "common.high": "उच्च",
  "common.medium": "मध्यम",
  "common.low": "निम्न",
  "common.safe": "सुरक्षित",
  "common.population": "जनसंख्या",
  "common.district": "ज़िला",
  "common.taluka": "तहसील",
  "common.hazardScore": "एआई खतरा स्कोर",
  "common.vulnerability": "भेद्यता सूचकांक",
  "common.urgency": "तात्कालिकता",
  "common.riskLevel": "जोखिम स्तर",
  "common.capacity": "क्षमता",
  "common.match": "मैच",
  "common.distance": "दूरी",
  "common.status": "स्थिति",
  "home.stats.analyzed": "विश्लेषित बस्तियाँ",
  "home.stats.districts": "शामिल ज़िले",
  "home.stats.impact": "सर्वेक्षण क्षेत्र की जनसंख्या",
  "home.stats.accuracy": "डेटा सटीकता",
  "home.hero.title1": "बुद्धिमान। डेटा-आधारित।",
  "home.hero.title2": "आपदा-प्रतिरोधी महाराष्ट्र।",
  "home.hero.desc":
    "ResQX महाराष्ट्र में खतरे आधारित लाल क्षेत्रों की पहचान करता है, सुरक्षित भूमि की वहन क्षमता आंकता है, और भेद्य बस्तियों के पुनर्वास को प्राथमिकता देता है — मुंबई के बाढ़ वार्डों से लेकर मराठवाड़ा के सूखाग्रस्त क्षेत्रों तक।",
  "ai.title": "ResQ एआई सहायक",
  "ai.placeholder": "जोखिम, योजनाओं, चेतावनियों के बारे में पूछें…",
  "ai.listen": "आवाज़ इनपुट",
  "ai.speak": "उत्तर सुनें",
  "offline.banner": "आप ऑफलाइन हैं — फील्ड मोड सक्रिय। रिपोर्ट स्वतः सिंक होंगी।",
  "footer.text": "आपदा जोखिम न्यूनीकरण और सतत पुनर्वास नियोजन हेतु सरकारी अधिकारियों को डेटा-आधारित अंतर्दृष्टि प्रदान करना।",
  "footer.motto": "ResQX — क्योंकि हर जीवन मायने रखता है",
};

const mr: Dict = {
  "brand.tagline": "धोके ओळखा. क्षमता मोजा. पुनर्वसनाला प्राधान्य द्या. प्राण वाचवा.",
  "brand.sub": "बुद्धिमान धोका मूल्यांकन आणि पुनर्वसन व्यासपीठ — महाराष्ट्र",
  "nav.home": "मुख्यपृष्ठ",
  "nav.dashboard": "डॅशबोर्ड",
  "nav.map": "धोका नकाशा",
  "nav.analytics": "विश्लेषण",
  "nav.vulnerability": "असुरक्षितता",
  "nav.capacity": "वहनक्षमता",
  "nav.relocation": "पुनर्वसन",
  "nav.alerts": "इशारे",
  "nav.infrastructure": "मूलभूत सुविधा",
  "nav.schemes": "योजना",
  "nav.protection": "संरक्षण",
  "nav.satellite": "उपग्रह",
  "nav.simulation": "सिम्युलेशन",
  "nav.reports": "फील्ड अहवाल",
  "nav.govreports": "अहवाल",
  "nav.admin": "प्रशासन",
  "nav.group.overview": "आढावा",
  "nav.group.risk": "धोका व नियोजन",
  "nav.group.operations": "कार्यवाही",
  "nav.group.programs": "कार्यक्रम व प्रशासन",
  "common.exploreMap": "धोका नकाशा पहा",
  "common.viewDashboard": "डॅशबोर्ड पहा",
  "common.learnMore": "अधिक जाणून घ्या",
  "common.search": "वस्त्या, जिल्हे शोधा…",
  "common.language": "भाषा",
  "common.online": "ऑनलाइन",
  "common.offline": "ऑफलाइन मोड",
  "common.viewAll": "सर्व पहा",
  "common.generate": "तयार करा",
  "common.generatePdf": "PDF तयार करा",
  "common.high": "उच्च",
  "common.medium": "मध्यम",
  "common.low": "कमी",
  "common.safe": "सुरक्षित",
  "common.population": "लोकसंख्या",
  "common.district": "जिल्हा",
  "common.taluka": "तालुका",
  "common.hazardScore": "एआय धोका गुण",
  "common.vulnerability": "असुरक्षितता निर्देशांक",
  "common.urgency": "तातडी",
  "common.riskLevel": "धोका पातळी",
  "common.capacity": "क्षमता",
  "common.match": "जोडणी",
  "common.distance": "अंतर",
  "common.status": "स्थिती",
  "home.stats.analyzed": "विश्लेषित वस्त्या",
  "home.stats.districts": "झालेले जिल्हे",
  "home.stats.impact": "सर्वेक्षण क्षेत्रातील लोकसंख्या",
  "home.stats.accuracy": "डेटा अचूकता",
  "home.hero.title1": "बुद्धिमान. डेटा-आधारित.",
  "home.hero.title2": "आपत्ती-प्रतिरोधक महाराष्ट्र.",
  "home.hero.desc":
    "ResQX महाराष्ट्रातील धोका-आधारित लाल क्षेत्रे ओळखतो, सुरक्षित जमिनीची वहनक्षमता मोजतो आणि असुरक्षित वस्त्यांच्या पुनर्वसनाला प्राधान्य देतो — मुंबईच्या पूरग्रस्त वॉर्डपासून मराठवाड्याच्या दुष्काळग्रस्त भागांपर्यंत.",
  "ai.title": "ResQ एआय सहाय्यक",
  "ai.placeholder": "धोके, योजना, इशारे विचारा…",
  "ai.listen": "आवाज इनपुट",
  "ai.speak": "उत्तर ऐका",
  "offline.banner": "तुम्ही ऑफलाइन आहात — फील्ड मोड सुरू. अहवाल आपोआप सिंक होतील.",
  "footer.text": "आपत्ती जोखीम कमी करण्यासाठी आणि शाश्वत पुनर्वसन नियोजनासाठी शासकीय अधिकाऱ्यांना डेटा-आधारित अंतर्दृष्टी देणे.",
  "footer.motto": "ResQX — कारण प्रत्येक जीवन महत्त्वाचे आहे",
};

const DICTS: Record<Lang, Dict> = { en, hi, mr };

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  voiceCode: string;
}

const Ctx = createContext<I18nCtx>({ lang: "en", setLang: () => {}, t: (k) => k, voiceCode: "en-IN" });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("resqx-lang") as Lang | null) : null;
    if (saved && DICTS[saved]) {
      const raf = requestAnimationFrame(() => setLangState(saved));
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("resqx-lang", l);
    } catch {}
  }, []);

  const t = useCallback((key: string) => DICTS[lang][key] ?? DICTS.en[key] ?? key, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, t, voiceCode: LANGS.find((l) => l.code === lang)?.voiceCode ?? "en-IN" }),
    [lang, setLang, t]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
