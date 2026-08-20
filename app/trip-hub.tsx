"use client";

/* eslint-disable @next/next/no-img-element, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import PwaInstall from "./pwa-install";
import { replitContent } from "./replit-content";

type Item = { id: string; text: string; link?: string; linkLabel?: string };
type Group = { id:string; leader:string; photo:string; members:string[] };
type Tip = { id:string; title:string; detail:string; link:string };
type Recommendation = { id:string; category:string; title:string; detail:string; link:string };
type Weather = { temperature:number; feelsLike:number; humidity:number; condition:string; isDay:boolean };
type Memory = { id:string; url:string; caption:string; uploader:string; createdAt:string; likes:number; liked:boolean };

const MAX_PHOTO_BYTES = 20_000_000;
const OPTIMISED_PHOTO_BYTES = 4_000_000;
const MAX_PHOTO_EDGE = 2560;

async function optimisePhoto(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const outputType = file.type === "image/png" && file.size <= OPTIMISED_PHOTO_BYTES ? "image/png" : "image/jpeg";
  let quality = 0.88;
  let blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, outputType, quality));
  while (blob && blob.size > OPTIMISED_PHOTO_BYTES && quality > 0.62) {
    quality -= 0.08;
    blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, outputType, quality));
  }

  if (!blob || blob.size >= file.size) return file;
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const extension = outputType === "image/png" ? "png" : "jpg";
  return new File([blob], `${baseName}-optimised.${extension}`, { type: outputType, lastModified: file.lastModified });
}
type TeamMessage = { id:string; author_name:string; body:string; created_at:string; canDelete:boolean };
type TripTool = "updates" | "group-chat" | "team-chats" | "memories";
type ActivityItem = {
  id:string;
  kind:"update"|"group-message"|"team-message"|"photo";
  groupId?:string;
  author:string;
  text:string;
  createdAt:string;
};
type Content = {
  title: string; kicker: string; subtitle: string; dates: string; heroImage: string; logoImage: string;
  visaUrl: string; arrivalUrl: string; insuranceUrl: string;
  accommodation: string; accommodationNote: string; flightNote: string;
  itinerary: { day: string; title: string; detail: string }[];
  checklist: Item[];
  groups: Group[];
  preparationTips: Tip[];
  recommendations: Recommendation[];
};

const tripChatNames = [
  "Carl", "Chris", "Pierre", "Gary", "Thomas", "Mia", "Danica", "Alain", "Sherra",
  "Kasilyn", "Maiah", "Rach", "Sam", "Lei", "Fred", "Licel", "Ria", "Nat", "Nicole",
  "Florence", "Arjay", "Alyza", "Mira", "Bren", "Crizelle", "Christine", "Therese",
  "Cath", "Jess", "Archie", "Yehn", "Vic", "Amy", "Ian",
];

const philippinesChecklist: Item[] = [
  { id:"ph-employment", text:"Certificate of Employment" },
  { id:"ph-invitation", text:"Conference Invitation Letter with sponsorship or funding coverage stated" },
  { id:"ph-hotel", text:"Hotel Booking Confirmation" },
  { id:"ph-flight", text:"Roundtrip Flight Itinerary" },
  { id:"ph-passport", text:"Valid Passport with at least 6 months’ validity from 15 September 2026" },
  { id:"ph-insurance", text:"Travel Insurance" },
  { id:"ph-company-id", text:"Company ID" },
  { id:"ph-all-indonesia", text:"Complete the All Indonesia arrival card", link:"https://allindonesia.imigrasi.go.id/", linkLabel:"Open official form" },
  { id:"ph-etravel", text:"Complete Philippine eTravel within 72 hours before departure", link:"https://etravel.gov.ph/", linkLabel:"Open official eTravel" },
];

const seminyakRecommendations: Recommendation[] = [
  { id:"explore-seminyak-beach", category:"Explore", title:"Seminyak Beach", detail:"The local favourite for a sunset walk, surf lesson or relaxed afternoon on the sand.", link:"https://www.google.com/maps/search/?api=1&query=Seminyak+Beach+Bali" },
  { id:"explore-petitenget", category:"Explore", title:"Petitenget Beach & Temple", detail:"Pair a quieter stretch of beach with one of Seminyak’s most significant Balinese sea temples.", link:"https://www.google.com/maps/search/?api=1&query=Petitenget+Temple+Bali" },
  { id:"explore-double-six", category:"Explore", title:"Double Six Beach", detail:"A lively sunset spot lined with colourful beanbags, casual beach bars and live music.", link:"https://www.google.com/maps/search/?api=1&query=Double+Six+Beach+Bali" },
  { id:"explore-nyaman", category:"Explore", title:"Nyaman Gallery", detail:"A contemporary gallery showcasing Balinese, Indonesian and international artists in central Seminyak.", link:"https://www.google.com/maps/search/?api=1&query=Nyaman+Gallery+Seminyak" },
  { id:"explore-potato-head", category:"Explore", title:"Desa Potato Head", detail:"More than a beach club—explore its architecture, art, sustainability projects, shops and cultural program.", link:"https://www.google.com/maps/search/?api=1&query=Desa+Potato+Head+Bali" },
  { id:"explore-canggu", category:"Explore", title:"Batu Bolong & Canggu", detail:"Head north for surf culture, boutiques, cafés and a sunset walk around Batu Bolong Beach.", link:"https://www.google.com/maps/search/?api=1&query=Batu+Bolong+Beach+Canggu" },
  { id:"explore-waterbom", category:"Explore", title:"Waterbom Bali", detail:"A polished water park in nearby Kuta with slides, pools and plenty of space for a fun group day.", link:"https://www.google.com/maps/search/?api=1&query=Waterbom+Bali" },
  { id:"explore-tanah-lot", category:"Explore", title:"Tanah Lot Temple", detail:"A spectacular offshore temple and classic sunset destination—allow extra time for traffic.", link:"https://www.google.com/maps/search/?api=1&query=Tanah+Lot+Temple+Bali" },
  { id:"explore-uluwatu", category:"Explore", title:"Uluwatu Temple & Kecak Dance", detail:"A dramatic clifftop temple with ocean views and a memorable sunset fire-dance performance.", link:"https://www.google.com/maps/search/?api=1&query=Uluwatu+Temple+Bali" },
  { id:"explore-ubud", category:"Explore", title:"Ubud Day Trip", detail:"Combine central Ubud, the Monkey Forest, markets, temples and nearby rice terraces in one full-day outing.", link:"https://www.google.com/maps/search/?api=1&query=Ubud+Bali" },
  { id:"eat-sisterfields", category:"Eat", title:"Sisterfields", detail:"Breakfast or lunch: a popular Australian-style café for excellent coffee, brunch plates and fresh bowls.", link:"https://www.google.com/maps/search/?api=1&query=Sisterfields+Seminyak" },
  { id:"eat-revolver", category:"Eat", title:"Revolver Espresso", detail:"Breakfast or lunch: a tucked-away Seminyak institution known for specialty coffee and creative café food.", link:"https://www.google.com/maps/search/?api=1&query=Revolver+Espresso+Seminyak" },
  { id:"eat-coffee-cartel", category:"Eat", title:"Coffee Cartel", detail:"Breakfast or lunch: colourful interiors, strong coffee and an easy menu of brunch favourites.", link:"https://www.google.com/maps/search/?api=1&query=Coffee+Cartel+Seminyak" },
  { id:"eat-sea-circus", category:"Eat", title:"Sea Circus", detail:"Breakfast or lunch: bright, casual and reliable for tacos, smoothie bowls, coffee and relaxed group meals.", link:"https://www.google.com/maps/search/?api=1&query=Sea+Circus+Seminyak" },
  { id:"eat-nook", category:"Eat", title:"Nook", detail:"Breakfast or lunch: an open-air café surrounded by rice fields, with Indonesian and Western options.", link:"https://www.google.com/maps/search/?api=1&query=Nook+Bali+Seminyak" },
  { id:"eat-la-lucciola", category:"Eat", title:"La Lucciola", detail:"Breakfast, lunch or dinner: long-running beachfront dining with beautiful views and polished Mediterranean food.", link:"https://www.google.com/maps/search/?api=1&query=La+Lucciola+Bali" },
  { id:"eat-mamasan", category:"Eat", title:"Mama San", detail:"Lunch or dinner: stylish Southeast Asian dining and cocktails—ideal for a smarter group meal.", link:"https://www.google.com/maps/search/?api=1&query=Mama+San+Bali" },
  { id:"eat-merah-putih", category:"Eat", title:"Merah Putih", detail:"Lunch or dinner: refined regional Indonesian dishes served in one of Seminyak’s most striking dining rooms.", link:"https://www.google.com/maps/search/?api=1&query=Merah+Putih+Restaurant+Bali" },
  { id:"eat-bambu", category:"Eat", title:"Bambu", detail:"Dinner: elegant Indonesian cuisine in a tranquil pavilion setting surrounded by water.", link:"https://www.google.com/maps/search/?api=1&query=Bambu+Restaurant+Seminyak" },
  { id:"eat-barbacoa", category:"Eat", title:"Barbacoa", detail:"Lunch or dinner: Latin American wood-fired food, generous sharing plates and a lively warehouse-style setting.", link:"https://www.google.com/maps/search/?api=1&query=Barbacoa+Bali" },
  { id:"fun-potato-head", category:"Drinks & Fun", title:"Potato Head Beach Club", detail:"Sunset drinks, DJs, poolside lounging and a strong food program in an iconic beachfront setting.", link:"https://www.google.com/maps/search/?api=1&query=Potato+Head+Beach+Club+Bali" },
  { id:"fun-ku-de-ta", category:"Drinks & Fun", title:"KU DE TA", detail:"A Seminyak classic for sunset cocktails, beachfront dining and a polished evening atmosphere.", link:"https://www.google.com/maps/search/?api=1&query=KU+DE+TA+Bali" },
  { id:"fun-mexicola", category:"Drinks & Fun", title:"Motel Mexicola", detail:"Colourful, energetic and built for groups—Mexican food, cocktails, music and dancing after dinner.", link:"https://www.google.com/maps/search/?api=1&query=Motel+Mexicola+Seminyak" },
  { id:"fun-mrs-sippy", category:"Drinks & Fun", title:"Mrs Sippy", detail:"A lively open-air pool club with daybeds, DJs, food and a huge saltwater pool.", link:"https://www.google.com/maps/search/?api=1&query=Mrs+Sippy+Bali" },
  { id:"fun-la-favela", category:"Drinks & Fun", title:"La Favela", detail:"A famously theatrical late-night venue with lush interiors, cocktails and multiple dance areas.", link:"https://www.google.com/maps/search/?api=1&query=La+Favela+Bali" },
  { id:"fun-shishi", category:"Drinks & Fun", title:"ShiShi Bali", detail:"Dining, rooftop drinks and nightclub energy across several levels in Petitenget.", link:"https://www.google.com/maps/search/?api=1&query=ShiShi+Bali" },
  { id:"fun-woobar", category:"Drinks & Fun", title:"WOOBAR Bali", detail:"A stylish beachfront bar at W Bali for sunset cocktails, DJs and a more polished night out.", link:"https://www.google.com/maps/search/?api=1&query=WOOBAR+Bali" },
  { id:"fun-mano", category:"Drinks & Fun", title:"Mano Beach House", detail:"A relaxed Petitenget option for poolside drinks, sunset views and casual beachfront dining.", link:"https://www.google.com/maps/search/?api=1&query=Mano+Beach+House+Bali" },
  { id:"fun-finns", category:"Drinks & Fun", title:"FINNS Beach Club", detail:"A large Canggu beach club with pools, daybeds, live entertainment and a high-energy sunset scene.", link:"https://www.google.com/maps/search/?api=1&query=FINNS+Beach+Club+Bali" },
  { id:"fun-atlas", category:"Drinks & Fun", title:"Atlas Beach Club", detail:"A huge beachfront entertainment complex in Berawa with dining, performances, pools and late-night events.", link:"https://www.google.com/maps/search/?api=1&query=Atlas+Beach+Club+Bali" },
];

const recommendationCategoryDetails: Record<string, { image: string; alt: string; eyebrow: string }> = {
  Explore: {
    image: "/top-pick-explore-temple.png",
    alt: "Balinese temple by the sea",
    eyebrow: "Temples, beaches & culture",
  },
  Eat: {
    image: "/top-pick-eat-brunch.png",
    alt: "A bright Bali brunch with coffee and tropical fruit",
    eyebrow: "Cafés, lunches & dinners",
  },
  "Drinks & Fun": {
    image: "/top-pick-drinks-poolclub.png",
    alt: "A tropical Bali pool club overlooking the ocean",
    eyebrow: "Beach clubs, cocktails & nights out",
  },
};

const defaults: Content = {
  title: replitContent.title,
  kicker: replitContent.kicker,
  subtitle: replitContent.subtitle,
  dates: replitContent.dates,
  heroImage: replitContent.heroImage,
  logoImage: replitContent.logoImage,
  visaUrl: replitContent.visaUrl,
  arrivalUrl: replitContent.arrivalUrl,
  insuranceUrl: replitContent.insuranceUrl,
  accommodation: replitContent.accommodation,
  accommodationNote: replitContent.accommodationNote,
  flightNote: replitContent.flightNote,
  itinerary: replitContent.itinerary.map(item => ({ ...item })),
  checklist: replitContent.checklist.map(item => ({ ...item })),
  groups: replitContent.groups.map(group => ({ ...group, members: [...group.members] })),
  preparationTips: replitContent.preparationTips.map(tip => ({ ...tip })),
  recommendations: seminyakRecommendations,
};

function applyTeamUpdates(groups: Group[]): Group[] {
  const removeFrom = new Map<string, string[]>([
    ["Carl", ["Arjay"]],
    ["Gary", ["Marge", "Bren"]],
    ["Nat", ["Charms"]],
    ["Rach", ["Louie"]],
    ["Jess", ["Annabel"]],
    ["Lei", ["Vic"]],
    ["Cath", ["Mariah", "Pamela", "Arjay"]],
  ]);
  const addTo = new Map<string, string[]>([
    ["Jess", ["Jessa"]],
    ["Cath", ["Bren"]],
  ]);

  return groups.map((group) => {
    const leader = group.leader.trim();
    const removals = removeFrom.get(leader) ?? [];
    const members = group.members.filter((member) => member && !removals.includes(member));
    const additions = addTo.get(leader) ?? [];

    additions.forEach((member) => {
      if (!members.includes(member)) members.push(member);
    });

    return { ...group, members };
  });
}

function applyChecklistUpdates(checklist: Item[]): Item[] {
  return checklist
    .filter((item) => item.id !== "meds" && item.text?.toLowerCase() !== "medication in original packaging")
    .map((item) => item.id === "visa" || /\bvisa\b/i.test(item.text)
      ? { ...item, text:"Australian residents travelling on an Australian passport only: Visa completed" }
      : item);
}

function applyPreparationUpdates(tips: Tip[]): Tip[] {
  return tips.map((tip) => {
    const mentionsVisa = /\bvisa\b/i.test(`${tip.title} ${tip.detail}`);
    const alreadyScoped = /Australian residents travelling on an Australian passport/i.test(tip.detail);
    return mentionsVisa && !alreadyScoped
      ? { ...tip, detail:`${tip.detail} This visa information applies only to Australian residents travelling on an Australian passport.` }
      : tip;
  });
}

function useCountdown() {
  const target = useMemo(() => new Date("2026-09-18T00:00:00+08:00").getTime(), []);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { const tick = () => setNow(Date.now()); const initial = window.setTimeout(tick, 0); const timer = window.setInterval(tick, 1000); return () => { window.clearTimeout(initial); window.clearInterval(timer); }; }, []);
  const left = now === null ? 0 : Math.max(0, target - now); const total = Math.floor(left / 1000);
  return { days: Math.floor(total / 86400), hours: Math.floor(total % 86400 / 3600), mins: Math.floor(total % 3600 / 60), secs: total % 60 };
}

export default function TripHub() {
  const [content, setContent] = useState<Content>(defaults);
  const [menu, setMenu] = useState(false); const [expandedRecommendation,setExpandedRecommendation] = useState<string|null>(null); const [expandedTip,setExpandedTip] = useState<string|null>(null); const [expandedGroup,setExpandedGroup] = useState<string|null>(null);
  const [tripToolsOpen,setTripToolsOpen] = useState(false); const [activeTripTool,setActiveTripTool] = useState<TripTool>("updates");
  const [checked, setChecked] = useState<Record<string, boolean>>({}); const [weather,setWeather] = useState<Weather|null>(null); const countdown = useCountdown();
  useEffect(() => { fetch("/api/content").then(r => r.ok ? r.json() : null).then(v => { if (v?.content) { const savedContent = { ...defaults, ...v.content, logoImage: v.content.logoImage || defaults.logoImage, kicker: brandText(v.content.kicker || defaults.kicker), subtitle: brandText(v.content.subtitle || defaults.subtitle), itinerary: ensureFinalDays(v.content.itinerary), checklist: applyChecklistUpdates(Array.isArray(v.content.checklist) ? v.content.checklist : defaults.checklist), groups: applyTeamUpdates(Array.isArray(v.content.groups) ? v.content.groups : defaults.groups), preparationTips: applyPreparationUpdates(Array.isArray(v.content.preparationTips) ? v.content.preparationTips : defaults.preparationTips), recommendations: Array.isArray(v.content.recommendations) && v.content.recommendations.length >= 30 ? v.content.recommendations : defaults.recommendations, insuranceUrl: !v.content.insuranceUrl || v.content.insuranceUrl === "#essentials" ? defaults.insuranceUrl : v.content.insuranceUrl }; setContent(savedContent); } }).catch(() => {}); const saved = localStorage.getItem("acm-bali-checklist"); if (saved) setChecked(JSON.parse(saved)); }, []);
  useEffect(() => { const endpoint="https://api.open-meteo.com/v1/forecast?latitude=-8.68883&longitude=115.16&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day&timezone=Asia%2FMakassar"; const labels:Record<number,string>={0:"Clear skies",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Foggy",48:"Foggy",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",80:"Rain showers",81:"Rain showers",82:"Heavy showers",95:"Thunderstorms",96:"Thunderstorms",99:"Thunderstorms"}; const load=()=>fetch(endpoint).then(r=>r.ok?r.json():null).then(v=>{const c=v?.current;if(c)setWeather({temperature:Math.round(c.temperature_2m),feelsLike:Math.round(c.apparent_temperature),humidity:Math.round(c.relative_humidity_2m),condition:labels[c.weather_code]||"Current conditions",isDay:Boolean(c.is_day)});}).catch(()=>{});load();const timer=setInterval(load,900000);return()=>clearInterval(timer); },[]);
  useEffect(() => { const saved=localStorage.getItem("acm-bali-trip-tools-open"); if(saved!==null){setTripToolsOpen(saved==="true");return;} const now=new Date(); const start=new Date("2026-09-18T00:00:00+08:00"); const end=new Date("2026-09-24T00:00:00+08:00"); setTripToolsOpen(now>=start&&now<end); },[]);
  const toggle = (id: string) => setChecked(old => { const next = { ...old, [id]: !old[id] }; localStorage.setItem("acm-bali-checklist", JSON.stringify(next)); return next; });
  const openTripTool = (tool:TripTool) => { setTripToolsOpen(true); setActiveTripTool(tool); localStorage.setItem("acm-bali-trip-tools-open","true"); window.setTimeout(()=>document.getElementById("trip-tools")?.scrollIntoView({behavior:"smooth",block:"start"}),0); };
  const toggleTripTools = () => setTripToolsOpen(open => { const next=!open; localStorage.setItem("acm-bali-trip-tools-open",String(next)); return next; });
  const openTeamChat = (groupId:string) => { setExpandedGroup(groupId); window.setTimeout(()=>document.getElementById(`team-${groupId}`)?.scrollIntoView({behavior:"smooth",block:"start"}),0); };
  const completed = content.checklist.filter(i => checked[i.id]).length;
  const philippinesCompleted = philippinesChecklist.filter(i => checked[i.id]).length;
  const nav: { label:string; href:string; tool?:TripTool }[] = [{ label: "Overview", href: "#overview" }, { label:"Trip updates", href:"#trip-tools", tool:"updates" }, { label:"Chat", href:"#trip-tools", tool:"group-chat" }, { label:"Photos", href:"#trip-tools", tool:"memories" }, { label: "Itinerary", href: "#itinerary" }, { label: "Groups", href: "#groups" }, { label: "Prepare", href: "#prepare" }, { label: "Explore", href: "#explore" }];
  return <main>
    <header className="site-header"><a className={`logo-slot ${content.logoImage ? "has-logo" : ""}`} href="#overview">{content.logoImage ? <img src={content.logoImage} alt="Company logo" /> : <><span>ACM Group</span><small>Logo can be added later</small></>}</a><nav id="site-navigation" className={menu ? "open" : ""}>{nav.map(n => <a key={`${n.href}-${n.label}`} href={n.href} onClick={() => { setMenu(false); if(n.tool) openTripTool(n.tool); }}>{n.label}</a>)}</nav><div className="header-actions"><span className="staff-pill">Staff only</span><PwaInstall /><button className="menu-button" onClick={() => setMenu(!menu)} aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu} aria-controls="site-navigation">{menu ? "×" : "☰"}</button></div></header>
    <section id="overview" className="hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(255,249,240,.96) 0%,rgba(255,249,240,.73) 38%,rgba(255,249,240,.05) 70%),url('${content.heroImage}')` }}><div className="hero-copy"><p className="kicker">{content.kicker}</p><h1>{content.title}</h1><p className="subtitle">{content.subtitle}<strong>{content.dates}</strong></p><p className="visa-scope-note"><strong>Australian residents only:</strong> Visa guidance applies only to Australian residents travelling on an Australian passport.</p><div className="hero-ctas"><a className="button primary" href={content.visaUrl} target="_blank" rel="noreferrer">Start visa · Australian residents <span>→</span></a><a className="button secondary" href="#itinerary">Trip itinerary <span>→</span></a></div></div><div className="countdown" aria-live="polite"><div className="countdown-grid">{Object.entries(countdown).map(([label,value]) => <div key={label}><strong>{String(value).padStart(2,"0")}</strong><span>{label}</span></div>)}</div><p>until take-off</p></div></section>
    <section id="essentials" className="quick-grid wrap"><article className="date-card"><span aria-hidden="true">📅</span><div><small>TRIP DATES</small><strong>18–23</strong><p>September 2026</p></div></article><a className="quick-card memory-widget" href="#trip-tools" onClick={()=>openTripTool("memories")}><div className="quick-icon">📷</div><h3>Add a photo</h3><p>Share a favourite Bali moment with the team.</p><span>Open Memories <b>→</b></span></a><article className="weather-card"><span className="weather-sun" aria-hidden="true">☀</span><div><small>SEMINYAK NOW</small>{weather ? <><strong>{weather.temperature}°</strong><p>{weather.condition}</p><em>Feels like {weather.feelsLike}°</em></> : <><strong>--°</strong><p>Loading weather…</p></>}</div></article><Quick tone="visa-widget" icon="◉" title="Visa & entry · Australian residents" text="For Australian residents travelling on an Australian passport only. Check current requirements and apply early." link={content.visaUrl} label="Visa for Australian residents" /><Quick tone="arrival-widget" icon="✓" title="Arrival declaration" text="Complete Indonesia’s official arrival declaration before travelling." link={content.arrivalUrl} label="Open form" /><Quick tone="trip-widget" icon="⌖" title="Trip details" text={content.flightNote} link="#itinerary" label="View itinerary" /></section>
    <CommunicationHub open={tripToolsOpen} active={activeTripTool} groups={content.groups} onToggle={toggleTripTools} onSelect={setActiveTripTool} onOpenTeam={openTeamChat} />
    <section className="section wrap"><div className="section-heading"><p>BEFORE YOU FLY</p><h2>Everything in one sunny spot.</h2><span>No frantic group-chat searching required.</span></div><div className="info-grid"><article className="image-card"><img src="/bali-passport.png" alt="A passport ready for international travel" /><div className="card-body"><div className="round-icon">✈</div><h3>Travel documents</h3><p>Your passport and arrival declarations should be ready before departure. Australian residents travelling on an Australian passport should also complete the visa steps below.</p><div className="travel-audience-note"><strong>Visa guidance: Australian residents only</strong><span>This applies only to Australian residents travelling on an Australian passport. Philippines residents should use the dedicated checklist below.</span></div><div className="travel-deadlines"><div><strong>Visa · Australian residents only</strong><span>Complete by 15 September 2026—at least 3 days before departure.</span><small>Approx. AUD $50</small></div><div><strong>Arrival declaration</strong><span>Complete from 15 September 2026 and before you travel.</span><small>Free</small></div></div><p className="currency-note">For Australian residents travelling on an Australian passport, the visa cost is an estimate and may vary slightly with payment fees.</p><p className="employee-cost-note"><strong>Australian residents travelling on an Australian passport only:</strong> Visa costs are not covered by ACM Group and must be paid by each employee.</p><div className="mini-links"><a href={content.visaUrl} target="_blank" rel="noreferrer">Official Indonesian eVisa site · Australian residents only ↗</a><a href={content.arrivalUrl} target="_blank" rel="noreferrer">Arrival declaration ↗</a></div></div></article><article className="image-card"><img className="hotel-image" src="/ramada-encore-bali-seminyak.jpg" alt="Pool and accommodation at Ramada Encore Bali Seminyak" /><div className="card-body"><div className="round-icon">⌂</div><h3>{content.accommodation}</h3><p>{content.accommodationNote}</p><div className="hotel-note"><span aria-hidden="true">🔑</span><p>Room assignments will be shared during the week before departure, helping everyone check in quickly and easily when we arrive.</p></div><a className="text-link hotel-link" href="https://www.wyndhamhotels.com/hotels/bali-indonesia?brand_id=RA" target="_blank" rel="noreferrer">Visit the hotel website →</a></div></article><article className="image-card"><img src="/bali-plane.png" alt="Passenger aircraft flying above the clouds" /><div className="card-body"><div className="round-icon">♡</div><h3>Travel smart</h3><p>Arrange suitable travel insurance and check any medication requirements before flying.</p><p className="employee-cost-note"><strong>Employee cost:</strong> Travel insurance is not covered by ACM Group and must be paid by each employee.</p><a className="text-link" href={content.insuranceUrl} target="_blank" rel="noreferrer">Insurance details →</a></div></article></div></section>
    <section id="itinerary" className="section itinerary-section"><div className="wrap"><div className="itinerary-intro"><div className="section-heading light"><p>YOUR WEEK AWAY</p><h2>Six days to remember.</h2></div></div><div className="timeline">{content.itinerary.map((item,i) => <article key={i}><DayBadge value={item.day} /><img className="itinerary-image" src={getItineraryImage(item.title,item.day)} alt={`${item.title} destination`} /><div className="itinerary-copy"><span className="activity-label">DAY {String(i + 1).padStart(2,"0")}</span><h3>{item.title}</h3><p>{item.detail}</p></div></article>)}</div></div></section>
    <section id="groups" className="section groups-section"><div className="wrap"><div className="section-heading"><h2>Meet your Bali team leaders!</h2><span>Your team leader will help you get from A to B during group activities throughout our stay in Bali. You’ll be added to a Slack and/or WhatsApp group with your team, where you can coordinate meeting times, ask questions, and share updates.<br/><br/>Please notify your team leader if you plan to make your own way to or from any team event rather than travelling with the group.</span></div><div className="groups-accordion">{content.groups.map((group,i) => { const open=expandedGroup===group.id; const photo=getLeaderPhoto(group.leader,group.photo); return <article id={`team-${group.id}`} className={`group-accordion-card ${open?"open":""}`} key={group.id}><button className="group-toggle" onClick={()=>setExpandedGroup(open?null:group.id)} aria-expanded={open} aria-controls={`group-members-${group.id}`}><span className="group-index">GROUP<br/><strong>{String(i+1).padStart(2,"0")}</strong></span><span className={`accordion-leader-photo ${photo?"has-photo":""}`}>{photo?<img src={photo} alt={group.leader}/>:<span>{initials(group.leader)}</span>}</span><span className="group-leader-meta"><small>TEAM LEADER</small><strong>{group.leader}</strong><em>{group.members.filter(Boolean).length} team members</em></span><span className="group-chevron" aria-hidden="true">{open?"−":"+"}</span></button>{open&&<div className="group-members" id={`group-members-${group.id}`}><p>YOUR GROUP</p><ul>{group.members.filter(Boolean).map((member,j)=><li key={j}><span>{String(j+1).padStart(2,"0")}</span>{member}</li>)}</ul><TeamMessages groupId={group.id} leader={group.leader} members={group.members.filter(Boolean)} /></div>}</article>})}</div></div></section>
    <section id="prepare" className="section prepare-section"><div className="wrap"><div className="section-heading"><p>READY FOR BALI</p><h2>How to prepare.</h2><span>Select a topic to see the practical details.</span></div><div className="tips-grid compact">{content.preparationTips.map((tip,i) => { const open=expandedTip===tip.id; return <article className={`tip-card tip-card-${i%4} ${open?"open":""}`} key={tip.id}><button className="tip-toggle" onClick={()=>setExpandedTip(open?null:tip.id)} aria-expanded={open} aria-controls={`tip-details-${tip.id}`}><span className="tip-icon" aria-hidden="true">{getPreparationIcon(tip.title,i)}</span><h3>{tip.title}</h3><span className="tip-chevron" aria-hidden="true">{open?"−":"+"}</span></button>{open && <div className="tip-details" id={`tip-details-${tip.id}`}><p>{tip.detail}</p>{tip.link && <a href={tip.link} target="_blank" rel="noreferrer">Learn more <span>→</span></a>}</div>}</article>})}</div></div></section>
    <section id="explore" className="section explore-section"><div className="wrap"><div className="section-heading light"><p>SEMINYAK & BEYOND</p><h2>Our Bali top picks.</h2><span>Thirty hand-picked ideas for exploring, eating and making the most of your free time around Seminyak.</span></div><div className="recommendation-accordion">{["Explore","Eat","Drinks & Fun"].map(category => { const items=content.recommendations.filter(item => item.category===category); const open=expandedRecommendation===category; const details=recommendationCategoryDetails[category]; return <article className={open?"open":""} key={category}><button className="recommendation-toggle" onClick={()=>setExpandedRecommendation(open?null:category)} aria-expanded={open} aria-controls={`recommendations-${category.replace(/[^a-z]/gi,"-")}`}><img className="recommendation-feature-image" src={details.image} alt={details.alt} /><span className="recommendation-image-wash" aria-hidden="true"/><span className="recommendation-heading"><small>BALI TOP PICKS</small><strong>{category}</strong><em>{details.eyebrow}</em></span><span className="recommendation-count">{items.length} places</span><span className="recommendation-chevron" aria-hidden="true">{open?"−":"+"}</span></button>{open && <div className="recommendation-list" id={`recommendations-${category.replace(/[^a-z]/gi,"-")}`}>{items.map((item,index) => <article key={item.id}><span className="recommendation-number">{String(index+1).padStart(2,"0")}</span><div><h3>{item.title}</h3><p>{item.detail}</p></div>{item.link && <a href={item.link} target="_blank" rel="noreferrer">Open in Maps <span>→</span></a>}</article>)}</div>}</article>; })}</div></div></section>
    <section id="checklist" className="section wrap checklist-section">
      <div className="checklist-layout">
        <div>
          <div className="section-heading"><p>PACK WITH CONFIDENCE</p><h2>Your Bali checklist.</h2><span>Tick items off as you go—your progress is saved on this device.</span></div>
          <div className="progress"><div><span>{completed} of {content.checklist.length} ready</span><strong>{Math.round(completed/content.checklist.length*100)}%</strong></div><i><b style={{ width: `${completed/content.checklist.length*100}%` }} /></i></div>
        </div>
        <figure className="packing-image"><img src="/bali-packing.png" alt="A suitcase packed with light Bali travel essentials" /><figcaption>Sunshine essentials, sorted.</figcaption></figure>
      </div>
      <div className="checklist-scope-note"><strong>Visa · Australian residents only</strong><span>The visa item below is only for Australian residents travelling on an Australian passport.</span></div>
      <div className="check-grid">{content.checklist.map(item => <label key={item.id} className={checked[item.id] ? "done" : ""}><input type="checkbox" checked={!!checked[item.id]} onChange={() => toggle(item.id)} /><span>{item.text}</span></label>)}</div>

      <article className="philippines-checklist">
        <header className="country-checklist-header">
          <span className="country-flag" aria-hidden="true">🇵🇭</span>
          <div><p>PHILIPPINES RESIDENTS ONLY</p><h3>Philippines Residents Checklist</h3><span>This checklist is for team members travelling from the Philippines. The Australian visa guidance above does not apply to this checklist.</span></div>
        </header>
        <div className="progress country-progress"><div><span>{philippinesCompleted} of {philippinesChecklist.length} ready</span><strong>{Math.round(philippinesCompleted/philippinesChecklist.length*100)}%</strong></div><i><b style={{ width: `${philippinesCompleted/philippinesChecklist.length*100}%` }} /></i></div>
        <div className="philippines-check-grid">{philippinesChecklist.map((item,index) => <div key={item.id} className={`philippines-check-item ${checked[item.id] ? "done" : ""}`}><label><input type="checkbox" checked={!!checked[item.id]} onChange={() => toggle(item.id)} /><span><b>{String(index+1).padStart(2,"0")}</b>{item.text}</span></label>{item.link && <a href={item.link} target="_blank" rel="noreferrer">{item.linkLabel} <span aria-hidden="true">↗</span></a>}</div>)}</div>
        <p className="official-source-note"><strong>Official links only:</strong> Philippine eTravel registration is free. Complete it within 72 hours before departure.</p>
      </article>
    </section>
    <footer><div className="wrap"><strong>ACM Group Bali 2026</strong><span>18–23 September 2026 · Private staff trip hub</span><a href="/signout-with-chatgpt?return_to=/">Sign out</a></div></footer>
  </main>;
}

function CommunicationHub({ open, active, groups, onToggle, onSelect, onOpenTeam }: { open:boolean; active:TripTool; groups:Group[]; onToggle:()=>void; onSelect:(tool:TripTool)=>void; onOpenTeam:(groupId:string)=>void }) {
  const tools: { id:TripTool; icon:string; title:string; text:string }[] = [
    { id:"updates", icon:"📣", title:"Trip Updates", text:"Important announcements and changes from your team leaders." },
    { id:"group-chat", icon:"💬", title:"Whole Group Chat", text:"Chat with everyone, share plans and ask quick questions." },
    { id:"team-chats", icon:"👥", title:"Team Chats", text:"Jump straight into your leader’s private group message board." },
    { id:"memories", icon:"📷", title:"Trip Memories", text:"Upload photos and enjoy the moments everyone has shared." },
  ];
  const openActivity = (item:ActivityItem) => {
    if(item.kind==="update") onSelect("updates");
    else if(item.kind==="group-message") onSelect("group-chat");
    else if(item.kind==="photo") onSelect("memories");
    else if(item.groupId) {
      onSelect("team-chats");
      onOpenTeam(item.groupId);
    }
  };
  return <section id="trip-tools" className={`trip-tools ${open?"open":""}`}>
    <div className="wrap">
      <div className="trip-tools-toggle">
        <button className="trip-tools-main" onClick={onToggle} aria-expanded={open} aria-controls="trip-tools-content">
          <span className="trip-tools-mark" aria-hidden="true">☀</span>
          <span><small>YOUR LIVE TRIP HUB</small><strong>For use during the trip!</strong><em>Chat with the group, follow updates and share your Bali memories.</em></span>
        </button>
        <NotificationBell groups={groups} onOpen={openActivity} />
        <button className="trip-tools-expand" onClick={onToggle} aria-label={open?"Collapse live trip hub":"Expand live trip hub"} aria-expanded={open} aria-controls="trip-tools-content"><span aria-hidden="true">{open?"−":"+"}</span></button>
      </div>
      {open&&<div id="trip-tools-content" className="trip-tools-content">
        <div className="trip-tools-nav" role="tablist" aria-label="Trip communication tools">
          {tools.map(tool=><button key={tool.id} className={active===tool.id?"active":""} onClick={()=>onSelect(tool.id)} role="tab" aria-selected={active===tool.id} aria-controls={`trip-tool-${tool.id}`}><span aria-hidden="true">{tool.icon}</span><strong>{tool.title}</strong><small>{tool.text}</small><b>{active===tool.id?"Open":"View"} →</b></button>)}
        </div>
        <div id={`trip-tool-${active}`} className="trip-tool-panel" role="tabpanel">
          {active==="updates"&&<TripUpdates />}
          {active==="group-chat"&&<GroupChat />}
          {active==="team-chats"&&<TeamChatChooser groups={groups} onOpenTeam={onOpenTeam} />}
          {active==="memories"&&<Memories onOpenChat={()=>onSelect("group-chat")} />}
        </div>
      </div>}
    </div>
  </section>;
}

function NotificationBell({ groups, onOpen }: { groups:Group[]; onOpen:(item:ActivityItem)=>void }) {
  const [items,setItems]=useState<ActivityItem[]>([]);
  const [panelOpen,setPanelOpen]=useState(false);
  const [seenAt,setSeenAt]=useState("");
  const groupNames=useMemo(()=>new Map(groups.map(group=>[group.id,`${group.leader}’s team`])),[groups]);

  useEffect(()=>{
    const stored=localStorage.getItem("acm-bali-notifications-seen-at");
    const initial=stored||new Date().toISOString();
    if(!stored)localStorage.setItem("acm-bali-notifications-seen-at",initial);
    setSeenAt(initial);
    const load=()=>fetch("/api/activity").then(response=>response.ok?response.json():null).then(data=>{
      if(Array.isArray(data?.activity))setItems(data.activity);
    }).catch(()=>{});
    load();
    const timer=window.setInterval(load,10000);
    return()=>window.clearInterval(timer);
  },[]);

  useEffect(()=>{
    if(!panelOpen)return;
    const close=(event:MouseEvent)=>{
      const target=event.target as HTMLElement|null;
      if(target&&!target.closest(".notification-centre"))setPanelOpen(false);
    };
    document.addEventListener("click",close);
    return()=>document.removeEventListener("click",close);
  },[panelOpen]);

  const unread=seenAt?items.filter(item=>item.createdAt>seenAt):[];
  const markRead=()=>{
    const now=new Date().toISOString();
    localStorage.setItem("acm-bali-notifications-seen-at",now);
    setSeenAt(now);
  };
  const openItem=(item:ActivityItem)=>{
    markRead();
    setPanelOpen(false);
    onOpen(item);
  };
  const label=(item:ActivityItem)=>{
    if(item.kind==="update")return"New trip update";
    if(item.kind==="group-message")return"New group message";
    if(item.kind==="photo")return"New trip photo";
    return`New message · ${groupNames.get(item.groupId||"")||"Team chat"}`;
  };
  const icon=(item:ActivityItem)=>item.kind==="update"?"📣":item.kind==="photo"?"📷":item.kind==="team-message"?"👥":"💬";

  return <div className="notification-centre">
    <button className={`notification-bell ${unread.length?"has-unread":""}`} type="button" onClick={event=>{event.stopPropagation();setPanelOpen(value=>!value);}} aria-label={`${unread.length} unread notifications`} aria-expanded={panelOpen} aria-controls="trip-notifications">
      <span aria-hidden="true">🔔</span>
      {unread.length>0&&<b aria-hidden="true">{unread.length>99?"99+":unread.length}</b>}
    </button>
    {panelOpen&&<div id="trip-notifications" className="notification-panel" role="dialog" aria-label="Trip notifications">
      <header><div><small>WHAT’S NEW</small><strong>Notifications</strong></div>{unread.length>0&&<button type="button" onClick={markRead}>Mark all read</button>}</header>
      <div className="notification-list">
        {items.length?items.slice(0,12).map(item=><button type="button" className={item.createdAt>seenAt?"unread":""} key={item.id} onClick={()=>openItem(item)}>
          <span className="notification-icon" aria-hidden="true">{icon(item)}</span>
          <span><strong>{label(item)}</strong><em><b>{item.author}</b> · {item.text}</em><time dateTime={item.createdAt}>{formatActivityTime(item.createdAt)}</time></span>
        </button>):<div className="notification-empty"><span aria-hidden="true">🔔</span><strong>You’re all caught up.</strong><p>New messages, updates and photos will appear here.</p></div>}
      </div>
    </div>}
  </div>;
}

function TeamChatChooser({ groups, onOpenTeam }: { groups:Group[]; onOpenTeam:(groupId:string)=>void }) {
  const [groupId,setGroupId]=useState("");
  return <section className="team-chat-chooser">
    <div><p>YOUR TEAM SPACE</p><h2>Open your team chat.</h2><span>Choose your team leader to jump directly to your group list and message board.</span></div>
    <form onSubmit={event=>{event.preventDefault();if(groupId)onOpenTeam(groupId);}}>
      <label>Team leader<select value={groupId} onChange={event=>setGroupId(event.target.value)} required><option value="">Choose your team</option>{groups.map(group=><option key={group.id} value={group.id}>{group.leader}’s group</option>)}</select></label>
      <button type="submit">Open team chat <span>→</span></button>
    </form>
  </section>;
}

function TripUpdates() {
  const [messages,setMessages]=useState<TeamMessage[]>([]); const [leader,setLeader]=useState(""); const [message,setMessage]=useState(""); const [notice,setNotice]=useState(""); const [deleteToken,setDeleteToken]=useState(""); const [teamLeaderPin,setTeamLeaderPin]=useState(""); const [sending,setSending]=useState(false);
  const leaders=["Carl","Gary","Nat","Lei","Rach","Jess","Cath"];
  const load=async(token=deleteToken,pin=teamLeaderPin)=>{const headers:Record<string,string>={};if(token)headers["x-message-delete-token"]=token;if(pin)headers["x-team-leader-pin"]=pin;const response=await fetch("/api/team-messages?groupId=trip-updates",{headers});if(response.ok){const data=await response.json();if(pin&&!data.teamLeaderMode){sessionStorage.removeItem("acm-bali-team-leader-pin");setTeamLeaderPin("");}setMessages(data.messages||[]);}};
  useEffect(()=>{let token=localStorage.getItem("acm-bali-message-delete-token")||"";if(!token){token=crypto.randomUUID();localStorage.setItem("acm-bali-message-delete-token",token);}setDeleteToken(token);setTeamLeaderPin(sessionStorage.getItem("acm-bali-team-leader-pin")||"");},[]);
  useEffect(()=>{if(!deleteToken)return;load(deleteToken,teamLeaderPin);const timer=window.setInterval(()=>load(deleteToken,teamLeaderPin),5000);return()=>window.clearInterval(timer);},[deleteToken,teamLeaderPin]);
  const unlock=async()=>{const pin=window.prompt("Enter the Team Leader PIN");if(pin===null)return;const response=await fetch("/api/team-messages?groupId=trip-updates",{headers:{"x-message-delete-token":deleteToken,"x-team-leader-pin":pin.trim()}});if(!response.ok){setNotice("Team Leader Mode could not be activated.");return;}const data=await response.json();if(!data.teamLeaderMode){setNotice("Incorrect Team Leader PIN.");return;}sessionStorage.setItem("acm-bali-team-leader-pin",pin.trim());setTeamLeaderPin(pin.trim());setMessages(data.messages||[]);setNotice("Team Leader Mode is active.");};
  const lock=()=>{sessionStorage.removeItem("acm-bali-team-leader-pin");setTeamLeaderPin("");setNotice("Team Leader Mode has been turned off.");};
  const post=async(event:React.FormEvent)=>{event.preventDefault();if(!teamLeaderPin||!leader||!message.trim())return;setSending(true);setNotice("");const response=await fetch("/api/team-messages",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({groupId:"trip-updates",authorName:leader,message:message.trim(),deleteToken,teamLeaderPin})});if(response.ok){setMessage("");await load();}else setNotice("The update could not be posted. Check Team Leader Mode and try again.");setSending(false);};
  const remove=async(id:string)=>{if(!window.confirm("Delete this trip update?"))return;const response=await fetch("/api/team-messages",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({id,deleteToken,teamLeaderPin})});if(response.ok)setMessages(items=>items.filter(item=>item.id!==id));else setNotice("Activate Team Leader Mode to delete this update.");};
  return <section className="trip-updates-panel">
    <div className="trip-updates-head"><div><p>LIVE ANNOUNCEMENTS</p><h2>Trip Updates</h2><span>Check here for meeting times, transport changes and important information from the team leaders.</span></div><button type="button" className={teamLeaderPin?"moderator-active":""} onClick={teamLeaderPin?lock:unlock}>{teamLeaderPin?"✓ Leader mode":"Team leader mode"}</button></div>
    <div className={`trip-updates-feed ${messages.length>5?"scrollable":""}`} aria-live="polite">{messages.length?messages.map((item,index)=><article key={item.id} className={index===messages.length-1?"latest":""}><span aria-hidden="true">📣</span><div><header><strong>{item.author_name}</strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("en-AU",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}</time></header><p>{item.body}</p></div>{item.canDelete&&<button onClick={()=>remove(item.id)}>Delete</button>}</article>):<div className="trip-updates-empty"><span>📍</span><strong>No trip updates yet.</strong><p>Important announcements from your team leaders will appear here.</p></div>}</div>
    {teamLeaderPin?<form className="trip-update-form" onSubmit={post}><label>Posting as<select value={leader} onChange={event=>setLeader(event.target.value)} required><option value="">Choose leader</option>{leaders.map(name=><option key={name} value={name}>{name}</option>)}</select></label><label>Update<textarea value={message} onChange={event=>setMessage(event.target.value)} maxLength={500} placeholder="Share an important trip update…" required /></label>{notice&&<p role="status">{notice}</p>}<button type="submit" disabled={sending}>{sending?"Posting…":"Post update"} <span>→</span></button></form>:<p className="trip-updates-note">Only team leaders can post announcements. Everyone can view them here.</p>}
    {notice&&!teamLeaderPin&&<p className="trip-update-notice" role="status">{notice}</p>}
  </section>;
}

function TeamMessages({ groupId, leader, members }: { groupId: string; leader: string; members: string[] }) {
  const [messages, setMessages] = useState<TeamMessage[]>([]); const [name, setName] = useState(""); const [message, setMessage] = useState(""); const [notice, setNotice] = useState(""); const [sending, setSending] = useState(false); const [deleteToken, setDeleteToken] = useState(""); const [teamLeaderPin, setTeamLeaderPin] = useState("");
  const groupPeople = [leader, ...members].filter((person, index, people) => person && people.indexOf(person) === index);
  useEffect(() => { const savedName = localStorage.getItem("acm-bali-message-name") || ""; let token = localStorage.getItem("acm-bali-message-delete-token") || ""; if (!token) { token = crypto.randomUUID(); localStorage.setItem("acm-bali-message-delete-token", token); } setName(groupPeople.includes(savedName) ? savedName : ""); setDeleteToken(token); setTeamLeaderPin(sessionStorage.getItem("acm-bali-team-leader-pin") || ""); }, [groupId]);
  const load = async (pin = teamLeaderPin) => { const headers: Record<string,string> = {}; if (deleteToken) headers["x-message-delete-token"] = deleteToken; if (pin) headers["x-team-leader-pin"] = pin; const response = await fetch(`/api/team-messages?groupId=${encodeURIComponent(groupId)}`, { headers }); if (response.ok) { const data = await response.json(); if (pin && !data.teamLeaderMode) { sessionStorage.removeItem("acm-bali-team-leader-pin"); setTeamLeaderPin(""); } setMessages(data.messages || []); } };
  useEffect(() => { if (!deleteToken) return; load(); const timer = window.setInterval(() => load(), 8000); return () => window.clearInterval(timer); }, [groupId, deleteToken, teamLeaderPin]);
  const post = async (event: React.FormEvent) => { event.preventDefault(); const authorName = name.trim(); const body = message.trim(); if (!authorName || !body) { setNotice("Please choose your name and enter a message."); return; } setSending(true); setNotice(""); localStorage.setItem("acm-bali-message-name", authorName); try { const response = await fetch("/api/team-messages", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ groupId, authorName, message:body, deleteToken }) }); if (!response.ok) throw new Error(await response.text()); setMessage(""); await load(); } catch { setNotice("Your message could not be posted. Please try again."); } finally { setSending(false); } };
  const unlock = async () => { const pin = window.prompt("Enter the Team Leader PIN"); if (pin === null) return; const response = await fetch(`/api/team-messages?groupId=${encodeURIComponent(groupId)}`, { headers: { "x-message-delete-token": deleteToken, "x-team-leader-pin": pin.trim() } }); if (!response.ok) { setNotice("Team Leader Mode could not be activated."); return; } const data = await response.json(); if (!data.teamLeaderMode) { setNotice("Incorrect Team Leader PIN."); return; } sessionStorage.setItem("acm-bali-team-leader-pin", pin.trim()); setTeamLeaderPin(pin.trim()); setMessages(data.messages || []); setNotice("Team Leader Mode is active. You can now delete any message."); };
  const lock = () => { sessionStorage.removeItem("acm-bali-team-leader-pin"); setTeamLeaderPin(""); setNotice("Team Leader Mode has been turned off."); };
  const remove = async (id: string) => { if (!window.confirm("Delete this message?")) return; const response = await fetch("/api/team-messages", { method:"DELETE", headers:{"content-type":"application/json"}, body:JSON.stringify({ id, deleteToken, teamLeaderPin }) }); if (response.ok) setMessages(items => items.filter(item => item.id !== id)); else setNotice("Enter the Team Leader PIN or use the device that posted this message."); };
  return <section className="team-messages" aria-label={`Messages for ${leader}`}><div className="team-messages-head"><div><small>TEAM MESSAGE BOARD</small><h3>Ask {leader}.</h3><p>Leave a question or update for your team leader and group.</p></div><div className="message-board-tools"><span>{messages.length} {messages.length === 1 ? "message" : "messages"}</span><button type="button" className={teamLeaderPin ? "moderator-active" : ""} onClick={teamLeaderPin ? lock : unlock}>{teamLeaderPin ? "✓ Leader mode" : "Team leader mode"}</button></div></div><div className={`team-message-list ${messages.length > 5 ? "scrollable" : ""}`} aria-live="polite">{messages.length ? messages.map(item => <article key={item.id}><header className="team-message-meta"><strong>{item.author_name}</strong><span><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("en-AU", { day:"numeric", month:"short", hour:"numeric", minute:"2-digit" })}</time>{item.canDelete && <button onClick={() => remove(item.id)}>Delete</button>}</span></header><p>{item.body}</p></article>) : <p className="team-messages-empty">No messages yet. Start the conversation.</p>}</div><form className="team-message-form" onSubmit={post}><label>Who are you?<select value={name} onChange={event => setName(event.target.value)} required><option value="">Choose your name</option><option value={leader}>{leader} — Team Leader</option>{members.filter(member => member !== leader).map(member => <option key={member} value={member}>{member}</option>)}</select></label><label>Your message<textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={500} placeholder={`Ask ${leader} a question or share an update…`} /></label>{notice && <p role="status">{notice}</p>}<button type="submit" disabled={sending}>{sending ? "Posting…" : "Post message"}</button></form></section>;
}

function GroupChat() {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [deleteToken, setDeleteToken] = useState("");
  const [teamLeaderPin, setTeamLeaderPin] = useState("");

  const load = async (token = deleteToken, pin = teamLeaderPin) => {
    const headers: Record<string,string> = {};
    if (token) headers["x-message-delete-token"] = token;
    if (pin) headers["x-team-leader-pin"] = pin;
    const response = await fetch("/api/team-messages?groupId=trip-wall", {
      headers,
    });
    if (response.ok) {
      const data = await response.json();
      if (pin && !data.teamLeaderMode) {
        sessionStorage.removeItem("acm-bali-team-leader-pin");
        setTeamLeaderPin("");
      }
      setMessages(data.messages || []);
    }
  };

  useEffect(() => {
    const savedName = localStorage.getItem("acm-bali-message-name") || "";
    let token = localStorage.getItem("acm-bali-message-delete-token") || "";
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem("acm-bali-message-delete-token", token);
    }
    setName(tripChatNames.includes(savedName) ? savedName : "");
    setDeleteToken(token);
    const pin = sessionStorage.getItem("acm-bali-team-leader-pin") || "";
    setTeamLeaderPin(pin);
  }, []);
  useEffect(() => {
    if (!deleteToken) return;
    load(deleteToken, teamLeaderPin);
    const timer = window.setInterval(() => load(deleteToken, teamLeaderPin), 5000);
    return () => window.clearInterval(timer);
  }, [deleteToken, teamLeaderPin]);

  const post = async (event: React.FormEvent) => {
    event.preventDefault();
    const authorName = name.trim();
    const body = message.trim();
    if (!authorName || !body) {
      setNotice("Please choose your name and enter a message.");
      return;
    }
    setSending(true);
    setNotice("");
    localStorage.setItem("acm-bali-message-name", authorName);
    try {
      const response = await fetch("/api/team-messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId: "trip-wall", authorName, message: body, deleteToken }),
      });
      if (!response.ok) throw new Error(await response.text());
      setMessage("");
      await load();
    } catch {
      setNotice("Your message could not be posted. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this message?")) return;
    const response = await fetch("/api/team-messages", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, deleteToken, teamLeaderPin }),
    });
    if (response.ok) setMessages(items => items.filter(item => item.id !== id));
    else setNotice("Enter the Team Leader PIN or use the device that posted this message.");
  };

  const unlock = async () => {
    const pin = window.prompt("Enter the Team Leader PIN");
    if (pin === null) return;
    const response = await fetch("/api/team-messages?groupId=trip-wall", { headers: { "x-message-delete-token": deleteToken, "x-team-leader-pin": pin.trim() } });
    if (!response.ok) { setNotice("Team Leader Mode could not be activated."); return; }
    const data = await response.json();
    if (!data.teamLeaderMode) { setNotice("Incorrect Team Leader PIN."); return; }
    sessionStorage.setItem("acm-bali-team-leader-pin", pin.trim());
    setTeamLeaderPin(pin.trim());
    setMessages(data.messages || []);
    setNotice("Team Leader Mode is active. You can now delete any message.");
  };

  const lock = () => {
    sessionStorage.removeItem("acm-bali-team-leader-pin");
    setTeamLeaderPin("");
    setNotice("Team Leader Mode has been turned off.");
    load(deleteToken, "");
  };

  return <section id="group-chat" className="section group-chat-section">
    <div className="wrap group-chat-layout">
      <div className="group-chat-intro">
        <p>THE TRIP THREAD</p>
        <h2>Chat with the whole crew.</h2>
        <span>Share plans, ask a quick question or let everyone know where the fun is happening.</span>
        <div className="chat-people-preview" aria-hidden="true">
          {tripChatNames.slice(0, 7).map(person => <i key={person}>{person.slice(0, 1)}</i>)}
          <strong>+{tripChatNames.length - 7}</strong>
        </div>
        <small>All {tripChatNames.length} travellers can join the conversation.</small>
      </div>
      <div className="group-chat-card">
        <div className="group-chat-card-head">
          <div><span className="live-dot" /> Group chat</div>
          <div className="message-board-tools"><small>{messages.length} {messages.length === 1 ? "message" : "messages"}</small><button type="button" className={teamLeaderPin ? "moderator-active" : ""} onClick={teamLeaderPin ? lock : unlock}>{teamLeaderPin ? "✓ Leader mode" : "Team leader mode"}</button></div>
        </div>
        <div className={`group-chat-feed ${messages.length > 5 ? "scrollable" : ""}`} aria-live="polite">
          {messages.length ? messages.map(item => <article key={item.id}>
            <span className="chat-avatar" aria-hidden="true">{item.author_name.slice(0, 1).toUpperCase()}</span>
            <div>
              <header className="chat-message-header">
                <strong>{item.author_name}</strong>
                <span className="chat-message-actions">
                  <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("en-AU", { day:"numeric", month:"short", hour:"numeric", minute:"2-digit" })}</time>
                  {item.canDelete && <button onClick={() => remove(item.id)}>Delete</button>}
                </span>
              </header>
              <p>{item.body}</p>
            </div>
          </article>) : <div className="group-chat-empty"><span>👋</span><strong>Start the trip chat.</strong><p>Be the first to leave a message for the group.</p></div>}
        </div>
        <form className="group-chat-form" onSubmit={post}>
          <label>Who are you?<select value={name} onChange={event => setName(event.target.value)} required><option value="">Choose your name</option>{tripChatNames.map(person => <option key={person} value={person}>{person}</option>)}</select></label>
          <label>Message<textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={500} placeholder="Write a message to the group…" required /></label>
          {notice && <p role="status">{notice}</p>}
          <button type="submit" disabled={sending}>{sending ? "Posting…" : "Send message"} <span aria-hidden="true">→</span></button>
        </form>
      </div>
    </div>
  </section>;
}

function Memories({ onOpenChat }: { onOpenChat?:()=>void }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selected, setSelected] = useState<Memory | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState("");
  useEffect(() => { const load = () => fetch("/api/memories").then(r => r.ok ? r.json() : null).then(data => { if (Array.isArray(data?.memories)) setMemories(data.memories); }).catch(() => {}); load(); const timer = window.setInterval(load, 5000); return () => window.clearInterval(timer); }, []);
  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_PHOTO_BYTES) {
      setMessage("Please choose an image under 20 MB.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setMessage("Preparing your photo…");
    let uploadFile = file;
    try {
      uploadFile = await optimisePhoto(file);
    } catch {
      uploadFile = file;
    }

    setMessage("");
    const data = new FormData();
    data.append("file", uploadFile);
    const result = await new Promise<boolean>(resolve => {
      const request = new XMLHttpRequest();
      request.open("POST", "/api/memories");
      request.upload.onprogress = progress => {
        if (progress.lengthComputable) setUploadProgress(Math.round(progress.loaded / progress.total * 100));
      };
      request.onload = () => resolve(request.status >= 200 && request.status < 300);
      request.onerror = () => resolve(false);
      request.send(data);
    });
    if (result) {
      setUploadProgress(100);
      const refreshed = await fetch("/api/memories").then(r => r.json());
      setMemories(refreshed.memories || []);
      setMessage("Photo optimised and added to the memories wall.");
    } else {
      setMessage("Your photo could not be uploaded. Please try again.");
    }
    event.target.value = "";
    setUploading(false);
    setTimeout(() => setUploadProgress(0), 900);
  };
  const remove = async (memory: Memory) => { try { const response = await fetch(`/api/memories?id=${encodeURIComponent(memory.id)}`, { method:"DELETE" }); if (!response.ok) { setMessage(`Photo could not be removed: ${await response.text() || "please try again."}`); return; } setMemories(items => items.filter(item => item.id !== memory.id)); setSelected(null); setMessage("Photo removed from the memories wall."); } catch { setMessage("Photo could not be removed. Check your connection and try again."); } };
  const toggleLike = async (memory: Memory) => { try { const response = await fetch("/api/memories", { method:"PUT", headers:{"content-type":"application/json"}, body:JSON.stringify({id:memory.id}) }); if (!response.ok) { setMessage(`Like could not be saved: ${await response.text() || "please try again."}`); return; } const update = await response.json(); const change = (item:Memory) => item.id === memory.id ? {...item,likes:update.likes,liked:update.liked} : item; setMemories(items => items.map(change)); setSelected(current => current?.id === memory.id ? change(current) : current); } catch { setMessage("Like could not be saved. Check your connection and try again."); } };
  return <section id="memories" className="section memories-section"><div className="wrap"><div className="memories-head"><div className="section-heading"><p>THE BALI WALL</p><h2>Trip memories.</h2><span>Share the moments worth keeping—new photos appear here for everyone. Photos up to 20 MB are automatically optimised.</span></div><div className="memory-actions"><label className="memory-upload">{uploading ? (uploadProgress ? `Uploading ${uploadProgress}%` : "Preparing photo…") : "＋ Add a photo"}<input type="file" accept="image/*" disabled={uploading} onChange={upload} /></label>{onOpenChat?<button className="memory-chat-link" type="button" onClick={onOpenChat}><span aria-hidden="true">💬</span> Open group chat</button>:<a className="memory-chat-link" href="#group-chat"><span aria-hidden="true">💬</span> Open group chat</a>}</div></div>{uploading && <div className="upload-progress" aria-live="polite"><div><span>{uploadProgress ? "Uploading your photo" : "Optimising your photo"}</span><strong>{uploadProgress ? `${uploadProgress}%` : "Please wait"}</strong></div><i><b style={{width:`${uploadProgress}%`}} /></i></div>}{message && <p className="memory-message">{message}</p>}{memories.length ? <div className="memories-grid">{memories.map(memory => <article key={memory.id} className="memory-card"><button className="memory-tile" onClick={() => setSelected(memory)} aria-label="Open photo"><img src={memory.url} alt={memory.caption || `Photo shared by ${memory.uploader}`} loading="lazy" /><span>{memory.caption || "Bali moment"}</span></button><button className={`memory-heart ${memory.liked ? "liked" : ""}`} onClick={() => toggleLike(memory)} aria-label={memory.liked ? "Remove like" : "Like photo"}>♥ <small>{memory.likes}</small></button><button className="memory-delete" onClick={() => remove(memory)} aria-label="Delete photo">⌫</button></article>)}</div> : <div className="memories-empty"><span>📷</span><h3>Be the first to share a moment.</h3><p>Photos uploaded by the team will appear here automatically.</p></div>}</div>{selected && <div className="memory-modal" role="dialog" aria-modal="true" aria-label="Trip photo" onClick={() => setSelected(null)}><div className="memory-modal-card" onClick={event => event.stopPropagation()}><button onClick={() => setSelected(null)} aria-label="Close photo">×</button><img src={selected.url} alt={selected.caption || `Photo shared by ${selected.uploader}`} /><div><strong>{selected.caption || "Bali moment"}</strong><span>Shared by {selected.uploader}</span><button className={`modal-heart ${selected.liked ? "liked" : ""}`} onClick={() => toggleLike(selected)}>♥ {selected.likes} {selected.liked ? "Liked" : "Like"}</button><button className="memory-delete modal-delete" onClick={() => remove(selected)}>Delete photo</button></div></div></div>}</section>;
}

function Quick({ tone,icon,title,text,link,label }: { tone:string;icon:string;title:string;text:string;link:string;label:string }) { return <article className={`quick-card ${tone}`}><div className="quick-icon">{icon}</div><h3>{title}</h3><p>{text}</p><a href={link} target={link.startsWith("http") ? "_blank" : undefined} rel={link.startsWith("http") ? "noreferrer" : undefined}>{label} <span>→</span></a></article>; }

function DayBadge({ value }: { value:string }) {
  const [date, ...monthParts] = value.trim().split(/\s+/);
  const month = monthParts.join(" ");
  return <div className="day" aria-label={value}><strong>{date}</strong>{month && <span>{month}</span>}</div>;
}

function getItineraryImage(title:string, day:string) {
  const value = title.toLowerCase();
  if (day.trim().startsWith("23") || value.includes("airport") || value.includes("homeward") || value.includes("departure")) return "/itinerary-airport.png";
  if (day.trim().startsWith("22")) return "/itinerary-22-beach.jpg";
  if (value.includes("lagoon")) return "/ramada-encore-bali-seminyak.jpg";
  if (value.includes("mari")) return "/itinerary-mari.png";
  if (value.includes("mama san")) return "/itinerary-mamasan.png";
  if (value.includes("mrs sippy") || value.includes("birthday")) return "/itinerary-mrssippy.png";
  return "/bali-experience.png";
}

function ensureFinalDays(items:Content["itinerary"] | undefined) {
  const itinerary = Array.isArray(items) ? [...items] : [];
  if (!itinerary.some(item => item.day.trim().startsWith("22"))) itinerary.push({ day:"22 SEP", title:"A Day to Explore Bali", detail:"Enjoy a free day to relax, explore or make your own plans with the team." });
  if (!itinerary.some(item => item.day.trim().startsWith("23"))) itinerary.push({ day:"23 SEP", title:"Homeward Bound", detail:"Hotel check-out and transfer to the airport for return flights." });
  return itinerary;
}

function initials(name:string) { return name.split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]).join("").toUpperCase() || "TL"; }
function brandText(value:string) { return value.replace(/\bACM\b(?!\s+Group)/g,"ACM Group"); }
function formatActivityTime(value:string) {
  const date=new Date(value);
  const elapsed=Date.now()-date.getTime();
  if(elapsed<60000)return"Just now";
  if(elapsed<3600000)return`${Math.max(1,Math.floor(elapsed/60000))} min ago`;
  if(elapsed<86400000)return`${Math.floor(elapsed/3600000)} hr ago`;
  return date.toLocaleString("en-AU",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});
}
function getPreparationIcon(title:string,index:number) {
  const value=title.toLowerCase();
  if(value.includes("dress")) return "👗";
  if(value.includes("breakfast")) return "🍳";
  if(value.includes("food")) return "🍴";
  if(value.includes("team event") || value.includes("organised") || value.includes("organized")) return "👥";
  if(value.includes("laptop") || value.includes("computer")) return "💻";
  if(value.includes("free time")) return "🌴";
  if(value.includes("app")) return "📱";
  if(value.includes("money") || value.includes("exchange") || value.includes("currency")) return "💱";
  if(value.includes("med") || value.includes("belly")) return "💊";
  if(value.includes("water")) return "💧";
  return ["☀️","🧳","📍","✈️"][index%4];
}
function getLeaderPhoto(leader:string,photo:string) {
  const builtInPhotos: Record<string,string> = {
    carl: "/team-leader-carl.jpg",
    gary: "/team-leader-gary.png",
    nat: "/team-leader-nat.jpg",
    lei: "/team-leader-lei.jpg",
    rach: "/team-leader-rach.jpg",
    jess: "/team-leader-jess.jpg",
    cath: "/team-leader-cath.jpg",
  };
  return builtInPhotos[leader.trim().toLowerCase()] || (photo||"").replace(/%2F/gi,"/");
}
