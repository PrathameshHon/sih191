// ResQX seed — REAL Maharashtra disaster-geography dataset.
// District hazard baselines calibrated to actual events:
//   26/7/2005 Mumbai deluge (944mm/24h) · Malin landslide 2014 (151 deaths)
//   Taliye landslide 2020 · Cyclone Nisarga 2020 · Krishna-Panchganga floods 2019/21
//   Chiplun flood 2021 · Killari earthquake 1993 · Marathwada chronic drought
import { PrismaClient } from "@prisma/client";
import {
  applyLocalModifiers, compositeScore, zoneFor, vulnerabilityIndex,
  urgencyIndex, populationAtRisk, computeCapacity, runMatching,
} from "../src/lib/engine";
import type { HazardScores } from "../src/lib/types";

const prisma = new PrismaClient();

// District baselines 0..100 per hazard, calibrated to real disaster history
const DISTRICT_BASE: Record<string, HazardScores> = {
  "Mumbai City": { flood: 88, landslide: 25, earthquake: 42, cyclone: 55, drought: 4 },
  "Mumbai Suburban": { flood: 92, landslide: 38, earthquake: 42, cyclone: 55, drought: 4 },
  Thane: { flood: 82, landslide: 52, earthquake: 42, cyclone: 48, drought: 8 },
  Palghar: { flood: 72, landslide: 48, earthquake: 38, cyclone: 58, drought: 18 },
  Raigad: { flood: 74, landslide: 76, earthquake: 40, cyclone: 78, drought: 12 },
  Ratnagiri: { flood: 80, landslide: 62, earthquake: 36, cyclone: 60, drought: 14 },
  Sindhudurg: { flood: 76, landslide: 54, earthquake: 34, cyclone: 72, drought: 16 },
  Pune: { flood: 66, landslide: 72, earthquake: 52, cyclone: 10, drought: 38 },
  Nashik: { flood: 78, landslide: 48, earthquake: 38, cyclone: 6, drought: 40 },
  Ahilyanagar: { flood: 56, landslide: 30, earthquake: 34, cyclone: 4, drought: 82 },
  Satara: { flood: 84, landslide: 62, earthquake: 48, cyclone: 8, drought: 40 },
  Sangli: { flood: 92, landslide: 38, earthquake: 40, cyclone: 6, drought: 44 },
  Kolhapur: { flood: 90, landslide: 58, earthquake: 44, cyclone: 6, drought: 34 },
  Solapur: { flood: 48, landslide: 10, earthquake: 30, cyclone: 4, drought: 86 },
  Latur: { flood: 32, landslide: 8, earthquake: 74, cyclone: 3, drought: 90 },
  Beed: { flood: 42, landslide: 6, earthquake: 36, cyclone: 3, drought: 94 },
  Dharashiv: { flood: 32, landslide: 6, earthquake: 56, cyclone: 3, drought: 92 },
  "Chh. Sambhajinagar": { flood: 44, landslide: 10, earthquake: 44, cyclone: 3, drought: 70 },
  Nanded: { flood: 62, landslide: 8, earthquake: 46, cyclone: 4, drought: 58 },
  Dhule: { flood: 56, landslide: 20, earthquake: 34, cyclone: 3, drought: 54 },
  Nandurbar: { flood: 62, landslide: 28, earthquake: 44, cyclone: 3, drought: 48 },
  Jalgaon: { flood: 58, landslide: 18, earthquake: 36, cyclone: 3, drought: 54 },
  Buldhana: { flood: 46, landslide: 24, earthquake: 40, cyclone: 3, drought: 60 },
  Akola: { flood: 40, landslide: 8, earthquake: 34, cyclone: 2, drought: 64 },
  Washim: { flood: 38, landslide: 8, earthquake: 34, cyclone: 2, drought: 64 },
  Amravati: { flood: 54, landslide: 18, earthquake: 32, cyclone: 2, drought: 54 },
  Yavatmal: { flood: 44, landslide: 16, earthquake: 34, cyclone: 2, drought: 62 },
  Wardha: { flood: 50, landslide: 12, earthquake: 30, cyclone: 2, drought: 54 },
  Nagpur: { flood: 56, landslide: 10, earthquake: 30, cyclone: 2, drought: 38 },
  Bhandara: { flood: 62, landslide: 8, earthquake: 30, cyclone: 2, drought: 34 },
  Gondia: { flood: 60, landslide: 10, earthquake: 32, cyclone: 2, drought: 32 },
  Chandrapur: { flood: 64, landslide: 12, earthquake: 30, cyclone: 2, drought: 34 },
  Gadchiroli: { flood: 68, landslide: 16, earthquake: 32, cyclone: 2, drought: 30 },
};

// [id, name, district, taluka, lat, lng, pop, hh, kutcha%, sc/st%, lit%, elevM, slope°,
//  riverKm, coastKm, faultKm, waterSource, infraAccess, protection%, events[]]
type HRow = [string, string, string, string, number, number, number, number, number, number, number, number, number, number, number, number, string, number, number, string[]];

const HABITATIONS: HRow[] = [
  ["H01", "Kurla West", "Mumbai Suburban", "Mumbai (L Ward)", 19.0726, 72.8856, 210000, 42000, 34, 11, 84, 8, 1.5, 0.8, 8, 480, "Municipal", 0.82, 62, ["26 July 2005 deluge — 944 mm in 24h", "29 Aug 2017 street flooding"]],
  ["H02", "Dharavi", "Mumbai Suburban", "Mumbai (G-North)", 19.0415, 72.8558, 350000, 70000, 62, 14, 74, 7, 1.2, 0.6, 6, 480, "Municipal", 0.62, 41, ["26/7/2005 floods", "Recurring monsoon waterlogging"]],
  ["H03", "Chembur Nala Belt", "Mumbai Suburban", "Mumbai (M-West)", 19.0522, 72.8999, 140000, 28000, 40, 12, 82, 10, 2, 1.2, 7, 470, "Municipal", 0.75, 58, ["2005, 2017, 2021 waterlogging"]],
  ["H04", "Andheri East Subway Belt", "Mumbai Suburban", "Mumbai (P/E)", 19.1136, 72.8697, 180000, 36000, 28, 9, 87, 12, 2, 1.5, 9, 470, "Municipal", 0.85, 66, ["2021 subway inundation", "2005 floods"]],
  ["H05", "Malad East", "Mumbai Suburban", "Mumbai (P-North)", 19.1867, 72.849, 160000, 32000, 38, 11, 82, 9, 3, 0.9, 10, 465, "Municipal", 0.72, 57, ["26/7/2005 floods", "2021 monsoon inundation"]],
  ["H06", "Parel–Elphinstone Belt", "Mumbai City", "Mumbai (E)", 18.996, 72.83, 95000, 19000, 18, 8, 89, 11, 2, 2.5, 2, 480, "Municipal", 0.88, 70, ["26/7/2005 deluge", "2017 monsoon flooding"]],
  ["H07", "Bhiwandi Old City", "Thane", "Bhiwandi", 19.3002, 73.063, 250000, 50000, 48, 10, 78, 13, 2, 1, 18, 430, "Borewell/Mix", 0.66, 48, ["2005 Ulhas flood", "2021 monsoon flooding"]],
  ["H08", "Kalyan East", "Thane", "Kalyan", 19.2403, 73.1305, 200000, 40000, 36, 9, 84, 12, 2.5, 0.9, 20, 425, "Municipal", 0.74, 60, ["Ulhas floods 2005 & 2019"]],
  ["H09", "Ulhasnagar (Waldhuni Bank)", "Thane", "Ulhasnagar", 19.2215, 73.1645, 150000, 30000, 30, 12, 83, 20, 2, 2.2, 25, 420, "Municipal", 0.7, 58, ["Waldhuni floods 2005/2019"]],
  ["H10", "Shahapur", "Thane", "Shahapur", 19.4472, 73.3103, 35000, 7000, 44, 16, 76, 90, 12, 2.5, 40, 400, "Well", 0.5, 44, ["Bhatsai flood 2019"]],
  ["H11", "Vasai–Gokhivare Belt", "Palghar", "Vasai", 19.3919, 72.8397, 220000, 44000, 42, 10, 82, 9, 2, 1.2, 6, 460, "Mix", 0.68, 52, ["Creek floods 2019/2021"]],
  ["H12", "Palghar", "Palghar", "Palghar", 19.6969, 72.7652, 60000, 12000, 40, 18, 78, 25, 4, 2, 10, 440, "Well", 0.6, 47, ["Monsoon flooding 2019"]],
  ["H13", "Dahanu", "Palghar", "Dahanu", 19.9675, 72.7868, 45000, 9000, 46, 26, 71, 15, 5, 1.5, 3, 430, "Well/River", 0.52, 42, ["Cyclone Tauktae impact 2021"]],
  ["H14", "Mahad", "Raigad", "Mahad", 18.0829, 73.4223, 30000, 6000, 38, 14, 82, 20, 9, 0.8, 35, 250, "River", 0.58, 50, ["July 2021 Savitri flood", "2020 Taliye landslide nearby"]],
  ["H15", "Taliye", "Raigad", "Mahad", 18.0766, 73.461, 850, 170, 55, 40, 66, 95, 28, 1.2, 38, 248, "Spring", 0.3, 38, ["23 July 2020 landslide — 42 deaths, village wiped out"]],
  ["H16", "Alibag", "Raigad", "Alibag", 18.6412, 72.8724, 25000, 5000, 28, 10, 86, 8, 2, 3.5, 1, 300, "Mix", 0.72, 60, ["Cyclone Nisarga landfall 3 June 2020"]],
  ["H17", "Pen", "Raigad", "Pen", 18.7375, 73.0948, 20000, 4000, 34, 12, 83, 25, 8, 1.5, 12, 295, "Well", 0.56, 52, ["Nisarga 2020", "Monsoon floods"]],
  ["H18", "Murud", "Raigad", "Murud", 18.3282, 72.9473, 15000, 3000, 36, 14, 78, 6, 5, 2, 0.5, 290, "Well", 0.5, 48, ["Nisarga 2020 coastal damage"]],
  ["H19", "Chiplun", "Ratnagiri", "Chiplun", 17.5333, 73.5167, 60000, 12000, 32, 12, 84, 15, 10, 0.7, 22, 220, "River", 0.66, 54, ["July 2021 Vashishti flood — 600mm/48h record"]],
  ["H20", "Khed", "Ratnagiri", "Khed", 17.7167, 73.3833, 20000, 4000, 38, 16, 80, 30, 12, 1.2, 28, 215, "River", 0.5, 46, ["2021 floods"]],
  ["H21", "Ratnagiri City", "Ratnagiri", "Ratnagiri", 16.9902, 73.312, 75000, 15000, 26, 10, 87, 12, 8, 1.8, 1, 200, "Mix", 0.74, 58, ["Monsoon flooding 2019/2021"]],
  ["H22", "Sangameshwar", "Ratnagiri", "Sangameshwar", 17.1833, 73.5333, 15000, 3000, 40, 14, 79, 40, 14, 1, 30, 205, "River", 0.46, 44, ["Landslides + floods 2021"]],
  ["H23", "Kankavli", "Sindhudurg", "Kankavli", 16.2667, 73.6667, 18000, 3600, 36, 12, 82, 45, 10, 1.5, 15, 190, "River", 0.52, 46, ["2021 floods"]],
  ["H24", "Malvan", "Sindhudurg", "Malvan", 16.0583, 73.4639, 20000, 4000, 32, 10, 83, 8, 4, 2, 0.4, 185, "Mix", 0.56, 50, ["Coastal erosion + cyclone surge"]],
  ["H25", "Sawantwadi", "Sindhudurg", "Sawantwadi", 15.9036, 73.8222, 18000, 3600, 38, 16, 81, 40, 14, 1, 18, 180, "River", 0.5, 45, ["2021 landslides"]],
  ["H26", "Malin", "Pune", "Ambegaon", 19.024, 73.675, 400, 80, 60, 35, 62, 720, 30, 2.5, 90, 130, "Spring", 0.22, 35, ["30 July 2014 landslide — 151 deaths, village buried"]],
  ["H27", "Lavale (Mulshi Ghat)", "Pune", "Mulshi", 18.5305, 73.5625, 8000, 1600, 35, 12, 78, 640, 24, 3, 85, 120, "Borewell", 0.42, 48, ["Monsoon slope failures", "2021 ghat-road landslides"]],
  ["H28", "Wadarwadi (Mula Riverbed)", "Pune", "Pune City", 18.5273, 73.842, 12000, 2400, 68, 18, 70, 555, 2, 0.3, 95, 125, "Municipal", 0.5, 40, ["Mula floods 2019/2021"]],
  ["H29", "Yerawada", "Pune", "Pune City", 18.5515, 73.8828, 90000, 18000, 42, 20, 80, 560, 2, 1, 100, 128, "Municipal", 0.68, 55, ["Mula-Mutha floods 2019", "Urban flooding 2021"]],
  ["H30", "Vitthalwadi", "Pune", "Haveli", 18.4789, 73.8142, 25000, 5000, 45, 16, 76, 540, 4, 0.6, 100, 122, "Municipal", 0.55, 47, ["2021 Panshet release flood", "1961 Panshet disaster heritage"]],
  ["H31", "Junnar", "Pune", "Junnar", 19.2086, 73.8742, 25000, 5000, 40, 14, 80, 640, 16, 1, 95, 150, "River", 0.48, 45, ["Kukadi floods 2021"]],
  ["H32", "Bhor", "Pune", "Bhor", 18.1459, 73.8439, 18000, 3600, 44, 18, 76, 620, 20, 1.2, 105, 135, "River", 0.44, 43, ["Nira floods 2019", "Ghat landslides"]],
  ["H33", "Baramati", "Pune", "Baramati", 18.1514, 74.5771, 55000, 11000, 30, 14, 84, 540, 2, 1.5, 130, 160, "Canal", 0.62, 55, ["Karha floods 2019", "Chronic drought"]],
  ["H34", "Indapur", "Pune", "Indapur", 18.1163, 75.0281, 30000, 6000, 34, 16, 80, 500, 1.5, 2, 150, 175, "Well", 0.5, 48, ["Bhima floods 2019/2021", "Drought 2019"]],
  ["H35", "Panchavati", "Nashik", "Nashik", 20.0113, 73.7929, 95000, 19000, 36, 12, 84, 560, 3, 0.4, 145, 90, "Municipal", 0.68, 56, ["Godavari floods 2019 & 2021"]],
  ["H36", "Trimbakeshwar", "Nashik", "Trimbakeshwar", 19.9374, 73.5328, 12000, 2400, 42, 22, 76, 720, 22, 0.5, 150, 80, "Spring", 0.4, 42, ["2021 flash floods", "Ghat landslides"]],
  ["H37", "Igatpuri", "Nashik", "Igatpuri", 19.695, 73.5619, 30000, 6000, 38, 20, 78, 600, 24, 2, 130, 85, "River", 0.5, 48, ["Landslides on Mumbai-Agra NH every monsoon"]],
  ["H38", "Dindori", "Nashik", "Dindori", 20.21, 73.8333, 20000, 4000, 44, 24, 74, 580, 6, 4, 160, 95, "Well", 0.42, 40, ["Hailstorm + drought 2019"]],
  ["H39", "Sinnar", "Nashik", "Sinnar", 19.35, 74, 35000, 7000, 32, 14, 82, 590, 3, 1.2, 175, 110, "Mix", 0.6, 54, ["Godavari flood 2019"]],
  ["H40", "Malegaon", "Nashik", "Malegaon", 20.5537, 74.5288, 120000, 24000, 46, 10, 74, 440, 2, 0.5, 190, 105, "River", 0.5, 45, ["Aug 2019 Mosam flood — city centres submerged"]],
  ["H41", "Kalwan", "Nashik", "Kalwan", 20.4833, 73.95, 15000, 3000, 48, 34, 72, 620, 14, 2.5, 185, 95, "Well", 0.36, 36, ["Drought + tribal belt deprivation"]],
  ["H42", "Satana (Baglan)", "Nashik", "Baglan", 20.5937, 74.2014, 30000, 6000, 40, 18, 76, 480, 8, 3, 195, 100, "Well", 0.46, 41, ["Drought shadow zone"]],
  ["H43", "Shirdi", "Ahilyanagar", "Rahata", 19.7757, 74.4774, 35000, 7000, 22, 8, 88, 510, 2, 2.2, 210, 100, "Mix", 0.78, 65, ["Sep 2019 Godavari overflow — streets flooded", "Pilgrim-hub exposure"]],
  ["H44", "Kopargaon", "Ahilyanagar", "Kopargaon", 19.8853, 74.4798, 45000, 9000, 32, 12, 84, 500, 1.5, 0.6, 215, 100, "Mix", 0.64, 58, ["Sep 2019 Godavari flood — thousands evacuated", "2021 flood alert"]],
  ["H45", "Rahata", "Ahilyanagar", "Rahata", 19.7167, 74.4833, 25000, 5000, 36, 12, 80, 505, 1.5, 1.2, 215, 102, "Well", 0.52, 48, ["2019 flood", "Drought 2013/2016"]],
  ["H46", "Sangamner", "Ahilyanagar", "Sangamner", 19.5667, 74.2167, 65000, 13000, 34, 14, 82, 540, 5, 0.8, 160, 115, "River", 0.62, 55, ["Pravara floods 2019", "Chronic drought"]],
  ["H47", "Akole", "Ahilyanagar", "Akole", 19.3167, 73.9333, 20000, 4000, 46, 32, 74, 620, 20, 1, 120, 120, "River", 0.38, 38, ["Ghat landslides", "Flood 2021"]],
  ["H48", "Rahuri", "Ahilyanagar", "Rahuri", 19.3833, 74.65, 35000, 7000, 38, 16, 78, 480, 2, 1, 230, 110, "Canal", 0.54, 50, ["Mula canal breach flood 2019", "Drought 2016"]],
  ["H49", "Newasa", "Ahilyanagar", "Newasa", 19.5472, 74.7, 25000, 5000, 40, 16, 76, 490, 1.5, 1.5, 235, 108, "Canal", 0.46, 46, ["Pravara flood Sep 2019", "Drought 2019"]],
  ["H50", "Shrirampur", "Ahilyanagar", "Shrirampur", 19.6167, 74.6667, 45000, 9000, 28, 12, 85, 500, 1.5, 2.5, 230, 106, "Canal", 0.66, 58, ["Drought shadow + 2019 canal flood"]],
  ["H51", "Pathardi", "Ahilyanagar", "Pathardi", 19.1667, 75.1333, 20000, 4000, 48, 22, 72, 520, 3, 5, 270, 125, "Borewell", 0.36, 34, ["Severe drought 2013/2016/2019", "Groundwater critically low"]],
  ["H52", "Jamkhed", "Ahilyanagar", "Jamkhed", 18.7333, 75.3167, 15000, 3000, 50, 26, 70, 560, 5, 6, 295, 135, "Borewell", 0.34, 32, ["Chronic drought belt", "2016 water crisis — tanker dependent"]],
  ["H53", "Karjat", "Ahilyanagar", "Karjat", 18.9167, 74.9, 18000, 3600, 44, 18, 74, 530, 4, 4, 265, 128, "Borewell", 0.4, 37, ["Drought 2019"]],
  ["H54", "Shevgaon", "Ahilyanagar", "Shevgaon", 19.35, 75.2, 15000, 3000, 46, 20, 73, 500, 2, 5, 275, 122, "Borewell", 0.38, 35, ["Drought + hailstorms"]],
  ["H55", "Parner", "Ahilyanagar", "Parner", 18.95, 74.5833, 12000, 2400, 46, 18, 75, 550, 4, 6, 250, 122, "Borewell", 0.36, 34, ["Chronic drought"]],
  ["H56", "Ahmednagar City", "Ahilyanagar", "Nagar", 19.0948, 74.748, 100000, 20000, 30, 14, 85, 550, 2, 1.2, 275, 128, "Mix", 0.7, 60, ["Drought 2016/2019", "Sina floods 2021"]],
  ["H57", "Umbraj (Patan)", "Satara", "Patan", 17.4778, 73.7311, 20000, 4000, 40, 14, 78, 620, 18, 0.6, 60, 45, "River", 0.48, 48, ["July 2021 flood & landslide — 15 deaths", "Koyna backwater floods"]],
  ["H58", "Wai", "Satara", "Wai", 17.9471, 73.8898, 30000, 6000, 32, 10, 84, 680, 8, 0.5, 75, 40, "River", 0.6, 56, ["Krishna floods 2019/2021"]],
  ["H59", "Satara City", "Satara", "Satara", 17.6868, 74.0188, 60000, 12000, 28, 10, 86, 700, 4, 0.8, 70, 42, "Mix", 0.7, 62, ["Krishna floods 2019 & 2021"]],
  ["H60", "Karad", "Satara", "Karad", 17.2833, 74.1833, 60000, 12000, 30, 12, 84, 570, 8, 0.5, 55, 48, "Mix", 0.68, 60, ["2021 floods — worst in decades"]],
  ["H61", "Mahabaleshwar", "Satara", "Mahabaleshwar", 17.9214, 73.6518, 12000, 2400, 30, 12, 82, 1350, 26, 4, 60, 38, "Spring", 0.5, 50, ["6000mm monsoon slope failures", "2021 road landslides"]],
  ["H62", "Miraj", "Sangli", "Miraj", 16.8282, 74.6317, 90000, 18000, 34, 12, 84, 550, 2, 0.5, 90, 60, "Mix", 0.68, 58, ["Aug 2019 Krishna flood — worst in 50 years", "July 2021 flood"]],
  ["H63", "Ashta", "Sangli", "Walwa", 16.95, 74.6, 35000, 7000, 40, 14, 79, 560, 2, 0.8, 95, 62, "River", 0.54, 50, ["2019 flood — village submerged 5 days"]],
  ["H64", "Walwa (Islampur)", "Sangli", "Walwa", 17.0444, 74.7153, 40000, 8000, 34, 14, 82, 570, 3, 2.5, 100, 63, "Mix", 0.6, 54, ["Krishna floods 2019/2021"]],
  ["H65", "Khanapur (Vita)", "Sangli", "Khanapur", 16.9833, 74.5167, 20000, 4000, 42, 18, 76, 580, 3, 4.5, 105, 60, "River", 0.46, 44, ["Warna floods 2021"]],
  ["H66", "Kolhapur City", "Kolhapur", "Karvir", 16.705, 74.2433, 150000, 30000, 30, 12, 85, 570, 3, 0.6, 85, 55, "Mix", 0.7, 60, ["Aug 2019 Panchganga flood — 70% city affected", "July 2021 flood"]],
  ["H67", "Ichalkaranji", "Kolhapur", "Hatkanangale", 16.6906, 74.4606, 80000, 16000, 34, 12, 82, 560, 2, 1.5, 95, 58, "Mix", 0.62, 56, ["2019/2021 floods"]],
  ["H68", "Shirol", "Kolhapur", "Shirol", 16.75, 74.5167, 25000, 5000, 40, 16, 78, 540, 2, 1, 100, 60, "River", 0.5, 48, ["2019 Krishna flood — villages evacuated"]],
  ["H69", "Gaganbawada", "Kolhapur", "Gaganbawada", 16.35, 73.8833, 8000, 1600, 52, 28, 70, 750, 26, 3, 40, 50, "Spring", 0.32, 36, ["Ghat landslides", "2021 floods"]],
  ["H70", "Ajara", "Kolhapur", "Ajara", 16.1167, 73.9833, 12000, 2400, 44, 22, 75, 600, 18, 0.8, 30, 52, "River", 0.4, 40, ["2021 flood & landslides"]],
  ["H71", "Pandharpur", "Solapur", "Pandharpur", 17.6789, 75.3306, 55000, 11000, 38, 14, 79, 450, 1.5, 0.5, 190, 145, "River", 0.58, 52, ["Bhima floods 2019/2021", "Chronic drought"]],
  ["H72", "Mangalwedha", "Solapur", "Mangalwedha", 17.5167, 75.4333, 18000, 3600, 46, 20, 72, 480, 2, 4, 200, 148, "Borewell", 0.4, 38, ["Drought 2016/2019"]],
  ["H73", "Solapur City", "Solapur", "Solapur North", 17.6599, 75.9064, 200000, 40000, 30, 14, 84, 460, 1.5, 3, 235, 160, "Mix", 0.68, 60, ["Heatwaves 42-45°C", "Sina floods", "Drought"]],
  ["H74", "Barshi", "Solapur", "Barshi", 18.2333, 75.7, 40000, 8000, 36, 16, 80, 460, 2, 2.5, 250, 150, "Mix", 0.54, 50, ["Drought + hailstorms"]],
  ["H75", "Killari", "Latur", "Ausa", 18.0833, 76.5333, 1200, 240, 42, 24, 70, 560, 3, 3, 300, 2, "Borewell", 0.32, 40, ["30 Sep 1993 Latur earthquake M6.2 — ~9,700 deaths; village rebuilt 2 km away"]],
  ["H76", "Ausa", "Latur", "Ausa", 18.25, 76.4833, 15000, 3000, 48, 22, 72, 570, 3, 2, 305, 22, "Borewell", 0.38, 38, ["1993 earthquake", "Chronic drought"]],
  ["H77", "Latur City", "Latur", "Latur", 18.4058, 76.58, 120000, 24000, 28, 14, 84, 580, 2, 2.5, 310, 25, "Mix", 0.66, 60, ["1993 earthquake", "2016 drought crisis"]],
  ["H78", "Beed City", "Beed", "Beed", 18.9833, 75.7667, 60000, 12000, 38, 16, 78, 510, 3, 0.8, 300, 120, "Mix", 0.54, 46, ["Drought 2013/2016/2019", "Sindhphana flash flood 2021"]],
  ["H79", "Ashti", "Beed", "Ashti", 18.3167, 75.15, 15000, 3000, 50, 24, 70, 540, 4, 4, 280, 128, "Borewell", 0.34, 33, ["Chronic drought"]],
  ["H80", "Georai", "Beed", "Georai", 19.2667, 75.75, 20000, 4000, 44, 18, 74, 480, 2, 1.5, 320, 118, "River", 0.44, 42, ["Godavari floods + drought"]],
  ["H81", "Tuljapur", "Dharashiv", "Tuljapur", 18.0114, 76.2117, 12000, 2400, 46, 20, 74, 590, 4, 3.5, 280, 75, "Borewell", 0.4, 38, ["1993 earthquake impact", "Chronic drought"]],
  ["H82", "Umarga", "Dharashiv", "Umarga", 17.8333, 76.6167, 10000, 2000, 48, 22, 72, 560, 3, 2, 300, 55, "Borewell", 0.36, 36, ["Drought 2019"]],
  ["H83", "Paithan", "Chh. Sambhajinagar", "Paithan", 19.4667, 75.3833, 35000, 7000, 40, 16, 78, 500, 2, 0.5, 280, 105, "Canal", 0.52, 50, ["Jayakwadi downstream flood risk", "Drought"]],
  ["H84", "Chh. Sambhajinagar City", "Chh. Sambhajinagar", "Aurangabad", 19.8762, 75.3433, 120000, 24000, 32, 12, 84, 570, 2, 1.5, 300, 112, "Mix", 0.66, 58, ["Urban floods 2021", "Drought belt"]],
  ["H85", "Nanded City", "Nanded", "Nanded", 19.1522, 77.3025, 150000, 30000, 32, 14, 83, 360, 2, 0.7, 330, 45, "River", 0.64, 56, ["Godavari floods 2006/2021"]],
  ["H86", "Deglur", "Nanded", "Deglur", 18.55, 77.5833, 15000, 3000, 44, 20, 74, 340, 3, 1.5, 360, 35, "River", 0.42, 44, ["Godavari flood 2021"]],
  ["H87", "Dhule", "Dhule", "Dhule", 20.9042, 74.7742, 60000, 12000, 36, 14, 80, 250, 2, 1, 120, 150, "Mix", 0.58, 52, ["Panzara floods 2019"]],
  ["H88", "Nandurbar", "Nandurbar", "Nandurbar", 21.3667, 74.2333, 30000, 6000, 46, 40, 72, 180, 3, 1.5, 130, 130, "River", 0.44, 40, ["Tapi floods", "Tribal deprivation belt"]],
  ["H89", "Jalgaon", "Jalgaon", "Jalgaon", 21.0075, 75.5625, 100000, 20000, 32, 12, 82, 210, 2, 1.2, 140, 170, "Mix", 0.62, 56, ["Tapi floods 2021"]],
  ["H90", "Nagpur", "Nagpur", "Nagpur", 21.1458, 79.0882, 200000, 40000, 26, 14, 87, 310, 1.5, 1.5, 400, 220, "Municipal", 0.72, 62, ["Urban floods 2020/2021"]],
  ["H91", "Chandrapur", "Chandrapur", "Chandrapur", 19.97, 79.2961, 60000, 12000, 34, 18, 81, 190, 2, 1, 420, 240, "Mix", 0.56, 50, ["Irai floods 2013", "Heat extremes"]],
  ["H92", "Gadchiroli", "Gadchiroli", "Gadchiroli", 20.1, 80, 15000, 3000, 48, 34, 72, 160, 6, 1, 450, 260, "River", 0.38, 38, ["Monsoon floods 2020/2021"]],
  ["H93", "Bhandara", "Bhandara", "Bhandara", 21.1667, 79.65, 25000, 5000, 36, 18, 81, 250, 1.5, 1.2, 430, 235, "River", 0.5, 46, ["Wainganga floods 2021"]],
  ["H94", "Yavatmal", "Yavatmal", "Yavatmal", 20.3888, 78.1306, 40000, 8000, 40, 20, 78, 380, 3, 2, 420, 260, "Borewell", 0.48, 44, ["Drought + farmer distress"]],
];

// [id, name, district, taluka, lat, lng, landHa, landUse, waterIdx, infraIdx, connKm, amenities[]]
type SRow = [string, string, string, string, number, number, number, string, number, number, number, string[]];
const SITES: SRow[] = [
  ["SS01", "Kharbao Govt Land", "Thane", "Bhiwandi", 19.295, 73.078, 120, "government", 0.75, 0.72, 3.5, ["Primary School", "PHC", "Water Tank", "HT Power"]],
  ["SS02", "Panvel Growth Centre", "Raigad", "Panvel", 18.9894, 73.1174, 180, "government", 0.82, 0.78, 2.5, ["ZP School", "Rural Hospital", "Pipeline Water", "Bus Depot"]],
  ["SS03", "Khalapur MIDC Fringe", "Raigad", "Khalapur", 18.828, 73.35, 150, "barren", 0.7, 0.6, 4, ["Anganwadi", "Borewell", "Road Access"]],
  ["SS04", "Chakan MIDC Extension", "Pune", "Khed", 18.761, 73.863, 200, "barren", 0.68, 0.75, 3, ["Secondary School", "PHC", "Pipeline", "Power Grid"]],
  ["SS05", "Rajgurunagar Plateau", "Pune", "Khed", 18.855, 73.895, 130, "plateau", 0.72, 0.58, 4.5, ["Primary School", "Well", "Bus Stop"]],
  ["SS06", "Uruli Kanchan Uplands", "Pune", "Haveli", 18.465, 74.025, 160, "farmland", 0.65, 0.55, 3.5, ["Anganwadi", "Canal Water", "Railway 8km"]],
  ["SS07", "Sinnar MIDC East", "Nashik", "Sinnar", 19.345, 74.045, 210, "government", 0.78, 0.8, 2, ["High School", "Hospital", "Pipeline", "Substation"]],
  ["SS08", "Dindori Foothills Site", "Nashik", "Dindori", 20.225, 73.865, 140, "plateau", 0.62, 0.45, 5.5, ["Primary School", "Borewell"]],
  ["SS09", "Igatpuri Safe Ridge", "Nashik", "Igatpuri", 19.715, 73.595, 90, "barren", 0.66, 0.5, 4, ["Anganwadi", "Spring-fed Tank"]],
  ["SS10", "Shirdi–Rahata Corridor (Kanhegaon)", "Ahilyanagar", "Rahata", 19.735, 74.425, 160, "barren", 0.74, 0.62, 2.8, ["ZP School", "PHC", "Water Tank", "Road Access"]],
  ["SS11", "Kopargaon Upland (Chas)", "Ahilyanagar", "Kopargaon", 19.935, 74.515, 150, "farmland", 0.7, 0.58, 3.2, ["Primary School", "Canal Water", "Bus Stop"]],
  ["SS12", "Sangamner Malunje Site", "Ahilyanagar", "Sangamner", 19.605, 74.15, 130, "plateau", 0.68, 0.54, 3.8, ["Anganwadi", "Borewell", "Power"]],
  ["SS13", "Newasa Command Area", "Ahilyanagar", "Newasa", 19.58, 74.755, 170, "farmland", 0.85, 0.5, 4.2, ["ZP School", "Canal Water", "PHC"]],
  ["SS14", "Pathardi Uplands", "Ahilyanagar", "Pathardi", 19.205, 75.105, 120, "pasture", 0.42, 0.35, 6, ["Primary School", "Borewell"]],
  ["SS15", "Jamkhed Cluster Site", "Ahilyanagar", "Jamkhed", 18.775, 75.275, 110, "pasture", 0.38, 0.32, 6.5, ["Anganwadi", "Borewell"]],
  ["SS16", "Koregaon Midlands", "Satara", "Koregaon", 17.61, 74.06, 140, "farmland", 0.72, 0.52, 4, ["Primary School", "Well", "Road Access"]],
  ["SS17", "Tasgaon Uplands", "Sangli", "Tasgaon", 17.04, 74.59, 130, "plateau", 0.66, 0.48, 4.5, ["Anganwadi", "Borewell", "Bus Stop"]],
  ["SS18", "Shirol East Highland", "Kolhapur", "Shirol", 16.795, 74.595, 150, "farmland", 0.76, 0.5, 3.6, ["ZP School", "Canal Water", "PHC"]],
  ["SS19", "Gaganbawada Plateau", "Kolhapur", "Gaganbawada", 16.385, 73.855, 100, "barren", 0.6, 0.3, 7, ["Primary School", "Spring"]],
  ["SS20", "Sudhagad Uplands", "Raigad", "Sudhagad", 18.435, 73.335, 120, "plateau", 0.7, 0.42, 5, ["Anganwadi", "Well", "Road Access"]],
  ["SS21", "Dapoli Coastal Plateau", "Ratnagiri", "Dapoli", 17.865, 73.195, 110, "plateau", 0.68, 0.45, 4.8, ["Primary School", "Borewell"]],
  ["SS22", "Latur Rural Resettlement Cluster", "Latur", "Latur", 18.475, 76.52, 150, "farmland", 0.5, 0.5, 3.4, ["School", "Borewell", "Road Access"]],
  ["SS23", "Kaij Uplands", "Beed", "Kaij", 18.775, 75.775, 130, "pasture", 0.4, 0.34, 5.8, ["Anganwadi", "Borewell"]],
  ["SS24", "Paithan South Site", "Chh. Sambhajinagar", "Paithan", 19.415, 75.41, 140, "farmland", 0.8, 0.48, 4, ["ZP School", "Canal Water", "PHC"]],
  ["SS25", "Kalmeshwar Rural Belt", "Nagpur", "Kalmeshwar", 21.23, 78.915, 300, "farmland", 0.62, 0.58, 3.5, ["School", "Borewell", "Power Grid"]],
  ["SS26", "Yavatmal Uplands", "Yavatmal", "Yavatmal", 20.43, 78.18, 200, "pasture", 0.45, 0.4, 5, ["Primary School", "Borewell"]],
  ["SS27", "Chandrapur West Belt", "Chandrapur", "Chandrapur", 19.99, 79.25, 250, "farmland", 0.66, 0.5, 4.2, ["School", "Canal Water", "PHC"]],
  ["SS28", "Dharashiv Uplands", "Dharashiv", "Tuljapur", 18.05, 76.25, 180, "pasture", 0.4, 0.36, 5.5, ["Anganwadi", "Borewell"]],
  ["SS29", "Nanded Rural Site", "Nanded", "Nanded", 19.2, 77.35, 220, "farmland", 0.68, 0.5, 3.8, ["ZP School", "Well", "Bus Stop"]],
  ["SS30", "Amravati Belt Site", "Amravati", "Nandgaon Khandeshwar", 20.85, 77.85, 200, "farmland", 0.6, 0.52, 4, ["School", "Borewell", "Road Access"]],
];

async function main() {
  console.log("Seeding ResQX — Maharashtra disaster dataset…");

  await prisma.fieldReport.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.reliefProject.deleteMany();
  await prisma.infraItem.deleteMany();
  await prisma.shelter.deleteMany();
  await prisma.safeSite.deleteMany();
  await prisma.habitation.deleteMany();

  // ---- Habitations with engine-computed scores ----
  const habRows = HABITATIONS.map(([id, name, district, taluka, lat, lng, pop, hh, kutcha, scst, lit, elev, slope, riverKm, coastKm, faultKm, water, infra, prot, events]) => {
    const base = DISTRICT_BASE[district] ?? { flood: 40, landslide: 20, earthquake: 30, cyclone: 10, drought: 40 };
    const scores = applyLocalModifiers(base, { riverDistKm: riverKm, slopeDeg: slope, coastDistKm: coastKm, faultDistKm: faultKm, elevationM: elev });
    const hazardScore = Math.round(compositeScore(scores) * 10) / 10;
    const vulnerability = vulnerabilityIndex({ kutchaPct: kutcha, scstPct: scst, literacyPct: lit, infraAccess: infra, population: pop });
    const urgency = urgencyIndex(hazardScore, vulnerability);
    return {
      id, name, district, taluka, lat, lng, population: pop, households: hh,
      kutchaPct: kutcha, scstPct: scst, literacyPct: lit,
      elevationM: elev, slopeDeg: slope, riverDistKm: riverKm, coastDistKm: coastKm, faultDistKm: faultKm,
      flood: scores.flood, landslide: scores.landslide, earthquake: scores.earthquake, cyclone: scores.cyclone, drought: scores.drought,
      hazardScore, vulnerability, urgency, riskLevel: zoneFor(hazardScore),
      protectionScore: prot, waterSource: water, infraAccess: infra, events: JSON.stringify(events),
      priorityRank: 0,
    };
  });

  const priorityOrder = [...habRows].sort((a, b) => b.urgency - a.urgency);
  priorityOrder.forEach((h, i) => (h.priorityRank = i + 1));

  for (const h of habRows) await prisma.habitation.create({ data: h });
  console.log(`  habitations: ${habRows.length}`);

  // ---- Safe sites with computed capacity (land banks doubled for township-scale planning) ----
  const siteRows = SITES.map(([id, name, district, taluka, lat, lng, landHa, landUse, waterIdx, infraIdx, connKm, amenities]) => ({
    id, name, district, taluka, lat, lng, landHa: landHa * 2, landUse, waterIndex: waterIdx, infraIndex: infraIdx,
    connectivityKm: connKm, capacity: computeCapacity(landHa * 2, landUse, waterIdx, infraIdx),
    amenities: JSON.stringify(amenities),
  }));
  for (const s of siteRows) await prisma.safeSite.create({ data: s });
  console.log(`  safe sites: ${siteRows.length}`);

  // ---- Greedy matching audit copy ----
  const habDTOs = habRows.map((h) => ({
    ...h, scores: { flood: h.flood, landslide: h.landslide, earthquake: h.earthquake, cyclone: h.cyclone, drought: h.drought },
    events: JSON.parse(h.events),
  }));
  const siteDTOs = siteRows.map((s) => ({ ...s, amenities: JSON.parse(s.amenities), occupied: 0, suitability: 0 }));
  // Matching is recomputed live inside /api/bootstrap (runMatching) — nothing persisted here.
  const { matches } = runMatching(habDTOs as any, siteDTOs as any);
  console.log(`  matches computed: ${matches.filter((m) => m.status === "matched").length} matched / ${matches.length}`);

  const now = Date.now();
  const iso = (d: number) => new Date(now - d).toISOString();

  // ---- Alerts ----
  const alerts = [
    {
      id: "AL01", title: "IMD Red Alert — Extremely Heavy Rainfall", severity: "critical", hazard: "flood",
      district: "Kolhapur / Sangli / Satara", lat: 16.85, lng: 74.35,
      message: "IMD Mumbai has issued a RED alert for Kolhapur, Sangli and Satara ghat sections. 200–250 mm rainfall expected in the next 24–48 hours. Panchganga and Krishna likely to cross warning level at Rajaram Bandhara and Sangli.",
      source: "IMD Mumbai", issuedAt: iso(2 * 3600e3), validUntil: iso(-48 * 3600e3), active: true,
      instructions: "Move livestock and grain to higher ground. Villages within 500m of rivers: prepare for evacuation. Do NOT cross flooded causeways.",
    },
    {
      id: "AL02", title: "CWC Warning — Godavari Rising at Kopargaon", severity: "critical", hazard: "flood",
      district: "Ahilyanagar", lat: 19.8853, lng: 74.4798,
      message: "Central Water Commission reports Godavari rising 0.4 m/hr at Kopargaon after upstream rainfall. Warning level expected to be crossed within 12 hours. Low-lying wards of Kopargaon and Shirdi (Lendi nalla) at risk.",
      source: "CWC / Godavari-Marathwada IB", issuedAt: iso(40 * 60e3), validUntil: iso(-24 * 3600e3), active: true,
      instructions: "Shift residents of riverbank wards to Shirdi–Rahata corridor shelters. Temple trusts to coordinate pilgrim movement. Keep SDRF boats on standby at Rahata.",
    },
    {
      id: "AL03", title: "Landslide Risk — Saturated Ghat Slopes", severity: "warning", hazard: "landslide",
      district: "Raigad / Ratnagiri", lat: 18.35, lng: 73.42,
      message: "10-day rainfall at 85% of monthly average has saturated slopes along Mahad–Poladpur, Ambenali and Kumbharli ghats. GSDMA landslide susceptibility now HIGH. Traffic advisory on NH-66.",
      source: "GSDMA / IMD", issuedAt: iso(5 * 3600e3), validUntil: iso(-72 * 3600e3), active: true,
      instructions: "Avoid night travel on ghats. Villages below escarpments (Taliye-type terrain): watch for cracks, tilting trees, muddy springs. Report slope cracks via Field Reports.",
    },
    {
      id: "AL04", title: "Krishna Approaching Danger Mark — Miraj", severity: "warning", hazard: "flood",
      district: "Sangli", lat: 16.8282, lng: 74.6317,
      message: "Krishna at Sangli is 0.8 m below danger mark and rising. Koyna dam discharge increased to 2,500 cusecs. Miraj, Ashta and Walwa riverbank wards on standby.",
      source: "CWC / Krishna Bhagya Jala Nigam", issuedAt: iso(7 * 3600e3), validUntil: iso(-36 * 3600e3), active: true,
      instructions: "Pre-position country boats at Ashta and Bhilawadi. Move cattle to elevated gocharan land. Monitor ResQX Alerts every 3 hours.",
    },
    {
      id: "AL05", title: "Heatwave Orange Alert — Marathwada", severity: "advisory", hazard: "drought",
      district: "Solapur / Latur / Beed", lat: 18.4, lng: 76.0,
      message: "IMD orange alert: maximum temperatures 42–44°C for next 4 days across Solapur, Latur, Beed, Dharashiv. Elevated heat-stroke risk for outdoor workers and the elderly.",
      source: "IMD Mumbai", issuedAt: iso(10 * 3600e3), validUntil: iso(-96 * 3600e3), active: true,
      instructions: "Avoid outdoor work 12:00–16:00. Ensure ORS distribution at worksites (MGNREGA sites). Cattle: shade + water. Report heat-stroke cases to nearest PHC.",
    },
    {
      id: "AL06", title: "Depression Watch — Arabian Sea", severity: "watch", hazard: "cyclone",
      district: "Sindhudurg / Ratnagiri coast", lat: 15.8, lng: 73.2,
      message: "A low-pressure area over east-central Arabian Sea is likely to intensify into a depression and track north-northwest along the Konkan coast in 72 hours. Squally winds 40–50 km/h gusting 60.",
      source: "IMD / RSMC New Delhi", issuedAt: iso(12 * 3600e3), validUntil: iso(-80 * 3600e3), active: true,
      instructions: "Fishermen: do NOT venture into sea for 72h. Complete cyclone-shelter readiness checks (Alibag–Malvan). Secure scaffolding & hoardings.",
    },
    {
      id: "AL07", title: "Groundwater Crisis — Pathardi & Jamkhed", severity: "advisory", hazard: "drought",
      district: "Ahilyanagar", lat: 19.0, lng: 75.2,
      message: "GSDA readings show groundwater below 10% of extractable threshold in Pathardi, Jamkhed, Karjat and Parner blocks. 120 water tankers deployed; 34 more sanctioned.",
      source: "GSDA / Collector Office Ahilyanagar", issuedAt: iso(24 * 3600e3), validUntil: iso(-30 * 24 * 3600e3), active: true,
      instructions: "Drinking water priority for humans & cattle. Livestock camps activating at Jamkhed. Jalyukt Shivar works to continue under MGNREGA.",
    },
    {
      id: "AL08", title: "Mula River Rising — Khadakwasla Outflow", severity: "warning", hazard: "flood",
      district: "Pune", lat: 18.4789, lng: 73.8142,
      message: "Khadakwasla outflow raised to 4,800 cusecs after catchment rainfall. Mula–Mutha expected to swell through the night. Riverside settlements (Wadarwadi, Vitthalwadi, Yerawada stretch) on alert.",
      source: "Irrigation Dept Pune", issuedAt: iso(3 * 3600e3), validUntil: iso(-18 * 3600e3), active: true,
      instructions: "Pune Municipal Corporation to hoot sirens at riverside wards. No night bathing/rituals near ghats. PMC rescue teams at Uttamnagar & Vitthalwadi.",
    },
  ];
  for (const a of alerts) await prisma.alert.create({ data: a });
  console.log(`  alerts: ${alerts.length}`);

  // ---- Field reports ----
  const reports = [
    ["FR01", "Sanjay Pawar", "+91 98220 XXXX1", "flood", "warning", "Godavari water entered Chhatri ward street. About 1.5 ft on the road near the temple steps. Families moving cattle to the school.", 19.888, 74.481, "Ahilyanagar", "Kopargaon", "pending"],
    ["FR02", "Meena Jadhav", "+91 98607 XXXX2", "landslide", "critical", "New cracks (2 inch wide, 20 m long) appeared in the slope 50 m above the village well after last night's rain. Three houses below.", 18.079, 73.458, "Raigad", "Taliye", "verified"],
    ["FR03", "Imran Shaikh", "+91 99301 XXXX3", "flood", "advisory", "Water logging under Andheri subway for 3 hours after 2 hours of rain. Traffic diverted. Pumps working.", 19.114, 72.87, "Mumbai Suburban", "Andheri East", "resolved"],
    ["FR04", "Kailas Wagh", "+91 97631 XXXX4", "drought", "warning", "Village well completely dried. Tanker last came 4 days ago. 40 families dependent on 3 km walk to the next borewell.", 18.736, 75.318, "Ahilyanagar", "Jamkhed", "pending"],
    ["FR05", "Prakash Kamble", "+91 98227 XXXX5", "flood", "warning", "Panchganga has come up to the second step of the ghat near Khasbag Maidan. Smell of sewage mixing. Request boat patrol.", 16.709, 74.239, "Kolhapur", "Kolhapur City", "verified"],
    ["FR06", "Vaishali Deshmukh", "+91 99708 XXXX6", "landslide", "advisory", "Small mud-fall on the Igatpuri ghat nearkm 102 stone. One lane blocked. Engineers notified.", 19.697, 73.565, "Nashik", "Igatpuri", "resolved"],
    ["FR07", "Bhima Shinde", "+91 98341 XXXX7", "flood", "advisory", "Mutha river high near Vitthalwadi ghat after dam release announcement. Water still 2 m below the wall.", 18.48, 73.815, "Pune", "Vitthalwadi", "pending"],
    ["FR08", "Rukhsana Bano", "+91 90217 XXXX8", "drought", "advisory", "Hand pump giving muddy water for 2 weeks. Children having stomach problems. Need water-quality check.", 19.17, 75.14, "Ahilyanagar", "Pathardi", "pending"],
    ["FR09", "Ganesh Patil", "+91 96733 XXXX9", "cyclone", "warning", "Sea rough at Malvan jetty since morning. Fishing boats recalled. Wind picking up.", 16.057, 73.465, "Sindhudurg", "Malvan", "verified"],
    ["FR10", "Sunita More", "+91 94208 XXXXA", "flood", "warning", "Savitri flowing 1 m below the bridge arch at Mahad market. Shopkeepers shifting goods.", 18.084, 73.423, "Raigad", "Mahad", "pending"],
  ] as const;
  for (let i = 0; i < reports.length; i++) {
    const [id, name, phone, hazard, severity, description, lat, lng, district, place, status] = reports[i];
    await prisma.fieldReport.create({
      data: { id, reporterName: name, phone: phone, hazard, severity, description, lat, lng, district, place, status, createdAt: iso((i + 1) * 2.5 * 3600e3) },
    });
  }
  console.log(`  field reports: ${reports.length}`);

  // ---- Shelters ----
  const shelters = [
    ["SH01", "ZP School No. 2, Kopargaon", "school", "Ahilyanagar", 19.886, 74.478, 850, 120, ["Drinking Water", "Toilets", "Kitchen", "Generator"], "108 / Taluka Control Room"],
    ["SH02", "Pravaranagar Community Hall", "community_hall", "Ahilyanagar", 19.742, 74.54, 400, 0, ["Water", "Toilets"], "Talathi Rahata"],
    ["SH03", "Municipal School, Miraj", "school", "Sangli", 16.832, 74.638, 900, 210, ["Water", "Toilets", "Medical Desk", "Kitchen"], "108 / Sangli CR"],
    ["SH04", "Kolhapur Municipal School 12", "school", "Kolhapur", 16.712, 74.238, 700, 160, ["Water", "Toilets", "Boats Nearby"], "112 / Kolhapur CR"],
    ["SH05", "Mahad Community Hall", "community_hall", "Raigad", 18.085, 73.419, 450, 80, ["Water", "Generator"], "SDRF Roha"],
    ["SH06", "Chiplun High School Shelter", "school", "Ratnagiri", 17.536, 73.512, 550, 90, ["Water", "Toilets", "Kitchen"], "108 / Ratnagiri CR"],
    ["SH07", "Alibag Cyclone Shelter", "cyclone_shelter", "Raigad", 18.643, 72.87, 600, 0, ["Cyclone-rated", "Water", "First Aid", "Radio"], "GSDMA Alibag"],
    ["SH08", "Malvan Cyclone Shelter", "cyclone_shelter", "Sindhudurg", 16.06, 73.462, 500, 0, ["Cyclone-rated", "Water", "First Aid"], "GSDMA Sindhudurg"],
    ["SH09", "Ward Hall, Yerawada", "community_hall", "Pune", 18.553, 73.884, 300, 0, ["Water", "Toilets"], "PMC Control 108"],
    ["SH10", "Satara ZP Hall", "community_hall", "Satara", 17.689, 74.02, 350, 0, ["Water", "Kitchen"], "Collector Satara"],
    ["SH11", "Ahmednagar ZP Hall", "community_hall", "Ahilyanagar", 19.096, 74.747, 400, 0, ["Water", "Toilets"], "Collector ANR"],
    ["SH12", "Shirdi Prasadalaya Annexe", "camp", "Ahilyanagar", 19.772, 74.479, 1200, 0, ["Mass Kitchen", "Water", "Medical Desk", "Big Capacity"], "Shirdi Sansthan + CR"],
  ] as const;
  for (const [id, name, type, district, lat, lng, capacity, occupancy, facilities, contact] of shelters) {
    const status = occupancy >= capacity ? "full" : occupancy > capacity * 0.6 ? "limited" : "available";
    await prisma.shelter.create({ data: { id, name, type, district, lat, lng, capacity, occupancy, facilities: JSON.stringify(facilities), contact, status } });
  }
  console.log(`  shelters: ${shelters.length}`);

  // ---- Infrastructure ----
  const infra = [
    ["IF01", "District Hospital Kolhapur", "hospital", "Kolhapur", 16.702, 74.236, "operational", 84, "2025-06-12", "Post-flood audit passed; flood-proof drug storage done in 2022"],
    ["IF02", "District Hospital Sangli", "hospital", "Sangli", 16.852, 74.588, "operational", 81, "2025-06-15", "Generator fuel for 48h maintained"],
    ["IF03", "Sub-district Hospital Mahad", "hospital", "Raigad", 18.081, 73.418, "degraded", 58, "2025-05-30", "Ground floor equipment lifted after 2021 flood; ramp needed"],
    ["IF04", "Rural Hospital Chiplun", "hospital", "Ratnagiri", 17.53, 73.515, "operational", 76, "2025-06-01", "New flood-line marking done"],
    ["IF05", "District Hospital Ahmednagar", "hospital", "Ahilyanagar", 19.092, 74.745, "operational", 80, "2025-05-20", "Heat-wave ward activated"],
    ["IF06", "Fire Station Kopargaon", "fire_station", "Ahilyanagar", 19.884, 74.477, "degraded", 55, "2025-04-18", "1 of 2 water tenders awaiting replacement"],
    ["IF07", "Fire Station Mumbai Central", "fire_station", "Mumbai City", 18.972, 72.824, "operational", 90, "2025-06-20", "High-capacity pumps for subway flooding"],
    ["IF08", "Shirol Bridge (Krishna)", "bridge", "Kolhapur", 16.752, 74.52, "damaged", 22, "2025-05-10", "Pier scour from 2021 flood; single-lane; load restricted"],
    ["IF09", "Chiplun Bridge (Vashishti)", "bridge", "Ratnagiri", 17.531, 73.52, "degraded", 48, "2025-04-22", "Scour protection apron works ongoing"],
    ["IF10", "Mahad–Poladpur Ghat Road", "road", "Raigad", 18.05, 73.44, "damaged", 30, "2025-06-25", "Landslide cut off 200m stretch; PWD restoring"],
    ["IF11", "Koyna Dam", "dam", "Satara", 17.402, 73.752, "at_risk", 68, "2025-03-30", "Seismic zone IV — instrumentation OK; discharge protocol reviewed"],
    ["IF12", "Khadakwasla Dam", "dam", "Pune", 18.432, 73.77, "operational", 82, "2025-06-05", "Outflow alerts via sirens functioning"],
    ["IF13", "Jayakwadi Dam", "dam", "Chh. Sambhajinagar", 19.46, 75.395, "operational", 78, "2025-05-12", "Siltation 18% — desilting planned"],
    ["IF14", "Manjara Dam", "dam", "Beed", 18.72, 75.72, "degraded", 61, "2025-04-02", "Low storage; gates servicing pending"],
    ["IF15", "Ambulance Fleet — Ahilyanagar 108", "ambulance", "Ahilyanagar", 19.095, 74.75, "degraded", 62, "2025-06-10", "Avg response 22 min; 6 new ALS vans ordered"],
    ["IF16", "Water Tanker Fleet Pathardi", "water", "Ahilyanagar", 19.167, 75.133, "operational", 75, "2025-06-18", "120 tankers deployed; 34 sanctioned"],
    ["IF17", "Mumbai-Agra NH3 Igatpuri Stretch", "road", "Nashik", 19.7, 73.57, "at_risk", 52, "2025-06-22", "Recurring landslide point km-102; netting works sanctioned"],
    ["IF18", "Panchavati Bund (Godavari)", "dam", "Nashik", 20.012, 73.793, "degraded", 57, "2025-05-25", "Bund height +0.5m required for 2019-level floods"],
  ] as const;
  for (const [id, name, type, district, lat, lng, status, conditionScore, lastAudit, note] of infra) {
    await prisma.infraItem.create({ data: { id, name, type, district, lat, lng, status, conditionScore, lastAudit, note } });
  }
  console.log(`  infra items: ${infra.length}`);

  // ---- Relief projects ----
  const relief = [
    ["RP01", "Krishna–Panchganga Flood Rehabilitation 2019–21", "Kolhapur / Sangli", "housing", 312, 212.2, 18400, 68, "ongoing", "2021–2026", "MahaRera / Collector Cell"],
    ["RP02", "Malin Landslide Resettlement (Ambegaon)", "Pune", "housing", 48.5, 44.6, 168, 92, "completed", "2014–2023", "Collector Pune / MGNREGS"],
    ["RP03", "Taliye Village Relocation (Mahad)", "Raigad", "housing", 36, 19.8, 170, 55, "delayed", "2020–2025", "Collector Raigad"],
    ["RP04", "Chiplun Flood Reconstruction Programme", "Ratnagiri", "infrastructure", 126, 51.7, 42000, 41, "ongoing", "2021–2027", "PWD / JICA tranche"],
    ["RP05", "Marathwada Drought Mitigation (Jalyukt Shivar-II)", "Beed / Latur / Dharashiv", "livelihood", 425, 263.5, 310000, 62, "ongoing", "2022–2026", "Water Conservation Dept"],
    ["RP06", "Godavari Embankment Upgrade (Kopargaon–Rahata)", "Ahilyanagar", "infrastructure", 87, 28.7, 95000, 33, "tendered", "2025–2027", "Water Resources Dept"],
    ["RP07", "Konkan Cyclone Shelter Network", "Raigad / Ratnagiri / Sindhudurg", "infrastructure", 154, 89.3, 210000, 58, "ongoing", "2021–2026", "GSDMA"],
    ["RP08", "SDRF Ex-Gratia Disbursement FY 2024–25", "All Districts", "compensation", 286, 223.1, 61000, 78, "ongoing", "2024–2025", "Relief & Rehabilitation Commissioner"],
  ] as const;
  for (const [id, name, district, category, budgetCr, spentCr, beneficiaries, progressPct, status, timeline, agency] of relief) {
    await prisma.reliefProject.create({ data: { id, name, district, category, budgetCr, spentCr, beneficiaries, progressPct, status, timeline, agency } });
  }
  console.log(`  relief projects: ${relief.length}`);

  console.log("Seed complete ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
