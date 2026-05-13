import { readFileSync, writeFileSync, existsSync } from 'fs';

const FILE = 'blacklist.json';

let blacklist = [];

if (existsSync(FILE)) {
  try {
    blacklist = JSON.parse(readFileSync(FILE, 'utf8'));
    if (!Array.isArray(blacklist)) blacklist = [];
  } catch {
    blacklist = [];
  }
}

function persist() {
  try {
    writeFileSync(FILE, JSON.stringify(blacklist, null, 2));
  } catch (err) {
    console.error('Failed to persist blacklist:', err);
  }
}

export function getBlacklist() {
  return [...blacklist];
}

export function addToBlacklist(name) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const exists = blacklist.some((b) => b.toLowerCase() === trimmed.toLowerCase());
  if (exists) return false;
  blacklist.push(trimmed);
  persist();
  return true;
}

export function removeFromBlacklist(name) {
  const trimmed = name.trim().toLowerCase();
  const before = blacklist.length;
  blacklist = blacklist.filter((b) => b.toLowerCase() !== trimmed);
  if (blacklist.length === before) return false;
  persist();
  return true;
}

export function isBlacklisted(placeName) {
  if (!placeName) return false;
  const lower = placeName.toLowerCase();
  return blacklist.some((b) => lower.includes(b.toLowerCase()));
}
