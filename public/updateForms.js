const fs = require('fs');
const path = require('path');

const dir = __dirname;

// 1. Remove `<html class="dark"` from all files
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
for (const file of files) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    if (content.includes('<html class="dark"')) {
        content = content.replace(/<html class="dark"/g, '<html');
        fs.writeFileSync(p, content);
    }
}

// 2. Districts of Nepal Generator
const districts = [
    "Achham", "Arghakhanchi", "Baglung", "Baitadi", "Bajhang", "Bajura", "Banke", 
    "Bara", "Bardiya", "Bhaktapur", "Bhojpur", "Chitwan", "Dadeldhura", "Dailekh", 
    "Dang", "Darchula", "Dhading", "Dhankuta", "Dhanusa", "Dolakha", "Dolpa", 
    "Doti", "Eastern Rukum", "Gorkha", "Gulmi", "Humla", "Ilam", "Jajarkot", 
    "Jhapa", "Jumla", "Kailali", "Kalikot", "Kanchanpur", "Kapilvastu", "Kaski", 
    "Kathmandu", "Kavrepalanchok", "Khotang", "Lalitpur", "Lamjung", "Mahottari", 
    "Makwanpur", "Manang", "Morang", "Mugu", "Mustang", "Myagdi", "Nawalpur", 
    "Nuwakot", "Okhaldhunga", "Palpa", "Panchthar", "Parasi", "Parbat", "Parsa", 
    "Pyuthan", "Ramechhap", "Rasuwa", "Rautahat", "Rolpa", "Rupandehi", "Salyan", 
    "Sankhuwasabha", "Saptari", "Sarlahi", "Sindhuli", "Sindhupalchok", "Siraha", 
    "Solukhumbu", "Sunsari", "Surkhet", "Syangja", "Tanahun", "Taplejung", 
    "Terhathum", "Udayapur", "Western Rukum"
];

let districtOptions = `<option disabled selected value="">Select District</option>\n`;
for (const d of districts) {
    districtOptions += `                                    <option value="${d}">${d}</option>\n`;
}

// Replace in signin.html & signup.html
for (const target of ['signin.html', 'signup.html']) {
    const p = path.join(dir, target);
    if (!fs.existsSync(p)) continue;
    
    let content = fs.readFileSync(p, 'utf8');
    
    content = content.replace(/<select id="districtSelect"[^>]*>[\s\S]*?<\/select>/, `<select id="districtSelect" class="field-input appearance-none cursor-pointer bg-surface-container">\n${districtOptions}                                </select>`);
    content = content.replace(/<select class="field-input appearance-none cursor-pointer bg-surface-container">\s*<option disabled selected value="">Select District<\/option>[\s\S]*?<\/select>/, `<select class="field-input appearance-none cursor-pointer bg-surface-container" id="districtSelect">\n${districtOptions}                                </select>`);
    
    fs.writeFileSync(p, content);
}

// 3. Products/Crop List for Dashboard
const crops = [
    { name: "Rice (Dhan)" }, { name: "Wheat (Gahun)" }, { name: "Maize (Makai)" },
    { name: "Millet (Kodo)" }, { name: "Buckwheat (Phapar)" }, { name: "Barley (Jau)" },
    { name: "Potato (Aalu)" }, { name: "Tomato (Golbheda)" }, { name: "Onion (Pyaaj)" },
    { name: "Garlic (Lasun)" }, { name: "Ginger (Aduwa)" }, { name: "Turmeric (Besar)" },
    { name: "Sugarcane (Ukhu)" }, { name: "Tea (Chiya)" }, { name: "Coffee (Kapi)" },
    { name: "Cardamom (Alaichi)" }, { name: "Apples (Syau)" }, { name: "Oranges (Suntala)" },
    { name: "Bananas (Kera)" }, { name: "Mangoes (Aanp)" }, { name: "Lentils (Musuro)" },
    { name: "Chickpeas (Chana)" }, { name: "Mustard (Tori)" }, { name: "Jute" },
    { name: "Honey (Maha)" }, { name: "Cabbage (Banda Kobhi)" }, { name: "Cauliflower (Kauli)" },
    { name: "Radish (Mula)" }, { name: "Spinach (Palungo)" }, { name: "Eggplant (Bhanta)" },
    { name: "Pumpkin (Pharsi)" }, { name: "Habanero (Akabare Khursani)" }, { name: "Soybean (Bhatmas)" },
    { name: "Bamboo Shoots (Tama)" }, { name: "Coriander (Dhania)" }, { name: "Cowpea (Bodi)" }
];

let cropOptions = `<option disabled selected value="">Select Product...</option>\n`;
for (const crop of crops) {
    cropOptions += `                        <option value="${crop.name}">${crop.name}</option>\n`;
}

const dashPath = path.join(dir, 'dashboard.html');
let dashContent = fs.readFileSync(dashPath, 'utf8');

// Replace the cropName input and datalist with a proper select dropdown
const cropSelectRegex = /<input id="cropName" class="field-input" list="crop-suggestions" placeholder="e.g. Carrot">[\s\S]*?<\/datalist>/;
const newCropSelect = `<select id="cropName" class="field-input appearance-none cursor-pointer bg-surface-container">\n${cropOptions}                        </select>`;
dashContent = dashContent.replace(cropSelectRegex, newCropSelect);

fs.writeFileSync(dashPath, dashContent);

console.log("Forms updated successfully.");
