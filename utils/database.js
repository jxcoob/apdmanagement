const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'infractions.json');
const countersPath = path.join(__dirname, '..', 'data', 'counters.json');
const permissionsPath = path.join(__dirname, '..', 'data', 'permissions.json');
const reviewsPath = path.join(__dirname, '..', 'data', 'reviews.json');
const logsPath = path.join(__dirname, '..', 'data', 'logs.json');
const retiredUsersPath = path.join(__dirname, '..', 'data', 'retired_users.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Infractions
function loadDB() {
  if (fs.existsSync(dbPath)) return JSON.parse(fs.readFileSync(dbPath));
  return { infractions: [] };
}

function saveDB(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function generateID(db) {
  const ids = db.infractions
    .map(i => {
      const numPart = i.id.substring(2);
      return isNaN(parseInt(numPart)) ? 0 : parseInt(numPart);
    })
    .filter(num => num > 0);
  
  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return `IF${maxId + 1}`;
}

// Permissions
function loadPermissions() {
  if (fs.existsSync(permissionsPath)) return JSON.parse(fs.readFileSync(permissionsPath));
  return {};
}

function savePermissions(permissions) {
  fs.writeFileSync(permissionsPath, JSON.stringify(permissions, null, 2));
}

// Counters
function loadCounter() {
  if (fs.existsSync(countersPath)) {
    const data = JSON.parse(fs.readFileSync(countersPath));
    return data.counter || 0;
  }
  return 0;
}

function saveCounter(counter) {
  fs.writeFileSync(countersPath, JSON.stringify({ counter }, null, 2));
}

// Retired Users
function loadRetiredUsers() {
  if (fs.existsSync(retiredUsersPath)) {
    const data = JSON.parse(fs.readFileSync(retiredUsersPath));
    const map = new Map();
    for (const [userId, roles] of Object.entries(data)) {
      map.set(userId, Array.isArray(roles) ? roles : [roles]);
    }
    return map;
  }
  return new Map();
}

function saveRetiredUsers(retiredUsersMap) {
  const obj = {};
  for (const [userId, roles] of retiredUsersMap.entries()) {
    obj[userId] = roles;
  }
  fs.writeFileSync(retiredUsersPath, JSON.stringify(obj, null, 2));
}

// Reviews
function loadReviews() {
  if (fs.existsSync(reviewsPath)) return JSON.parse(fs.readFileSync(reviewsPath));
  return { reviews: [] };
}

function saveReviews(reviews) {
  fs.writeFileSync(reviewsPath, JSON.stringify(reviews, null, 2));
}

function generateReviewID(reviewDB) {
  const ids = reviewDB.reviews.map(r => parseInt(r.id.substring(2)));
  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return `RV${maxId + 1}`;
}

// Logs
function loadLogs() {
  if (fs.existsSync(logsPath)) return JSON.parse(fs.readFileSync(logsPath));
  return { citations: [], arrests: [], warrants: [], reports: [] };
}

function saveLogs(logs) {
  fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
}

function generateCitationID(counter) {
  return `#C${String(counter).padStart(5, '0')}`;
}

function generateArrestID(counter) {
  return `#A${String(counter).padStart(5, '0')}`;
}

function generateWarrantID(counter) {
  return `#W${String(counter).padStart(5, '0')}`;
}

function generateReportID(counter) {
  return `#R${String(counter).padStart(5, '0')}`;
}

module.exports = {
  loadDB,
  saveDB,
  generateID,
  loadPermissions,
  savePermissions,
  loadCounter,
  saveCounter,
  loadRetiredUsers,
  saveRetiredUsers,
  loadReviews,
  saveReviews,
  generateReviewID,
  loadLogs,
  saveLogs,
  generateCitationID,
  generateArrestID,
  generateWarrantID,
  generateReportID
};
