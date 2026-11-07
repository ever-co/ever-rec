/**
 * Writes the seeded test project of the anonymous usage statistics suites:
 *
 * - `rtdb-seed.json`: the Realtime Database (42 users, 6 workspaces with 9 teams, screenshots and
 *   videos with file names, titles and share links);
 * - `auth-seed.json`: the Firebase Authentication users;
 * - `storage-seed.json`: the stored objects (path and size) of every media file;
 * - `canary-values.json`: every identifying string of the seed (names, e-mail addresses, uids,
 *   workspace and team names, file names, titles, storage paths, share ids), which no statistics
 *   report may ever contain.
 *
 * Deterministic (no randomness): run `node test/fixtures/generate-seed.mjs` from `apps/api` after
 * changing it, and commit the four files. Every person, company and address here is fictional.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const FIRST = [
  'Amelia',
  'Bastien',
  'Chiara',
  'Dmitri',
  'Elif',
  'Farouk',
  'Greta',
  'Hiroshi',
  'Ines',
  'Jonas',
  'Kalani',
  'Lucia',
  'Mateo',
  'Nadia',
];
const LAST = ['Okonkwo', 'Lindqvist', 'Moreau'];
const DOMAINS = ['example.com', 'example.org', 'example.net'];
const WORKSPACES = [
  'Northwind Studio',
  'Bluefin Analytics',
  'Harbor Lane Clinic',
  'Quillstone Legal',
  'Maple Ridge School',
  'Copperleaf Design',
];
const TEAMS_PER_WORKSPACE = [3, 2, 1, 1, 2, 0];
const TEAM_NAMES = [
  'Design Crew',
  'Night Shift',
  'Field Reporters',
  'Billing Desk',
  'Onboarding Squad',
  'Launch Team',
  'Support Heroes',
  'Research Guild',
  'Video Lab',
];
const TITLES = [
  'Quarterly roadmap review',
  'Invoice dispute for Acme',
  'Patient intake form',
  'Salary bands draft',
  'Board meeting notes',
  'Login bug repro',
];

const pad = (n, w = 4) => String(n).padStart(w, '0');
const created = (i) =>
  new Date(Date.UTC(2026, 9, 1 + (i % 27), 10, i % 60)).toISOString();

const users = [];
for (let i = 0; i < 42; i += 1) {
  const first = FIRST[i % FIRST.length];
  const last = LAST[Math.floor(i / FIRST.length) % LAST.length];
  const uid = `seedUid${pad(i)}x${(i * 7919).toString(36)}`;
  users.push({
    uid,
    displayName: `${first} ${last}`,
    email: `${first}.${last}${i}@${DOMAINS[i % DOMAINS.length]}`.toLowerCase(),
  });
}

const db = { users: {}, workspaces: {}, shared: {}, sharedVideos: {} };
const objects = [];
let teamCounter = 0;
let media = 0;

const addObject = (name, size) => objects.push({ name, size });

for (const [i, user] of users.entries()) {
  const node = {
    email: user.email,
    displayName: user.displayName,
    photoURL: null,
    googleCredentials: null,
    workspaceIds: [],
  };
  if (i % 3 === 0) {
    node.screenshots = {};
    for (let k = 0; k < 2; k += 1) {
      media += 1;
      const id = `seedShot${pad(media)}`;
      const refName = `${user.displayName.replace(' ', '_')}_screen_${k}.png`;
      node.screenshots[id] = {
        id,
        uid: user.uid,
        refName,
        title: `${TITLES[media % TITLES.length]} ${k}`,
        parentId: false,
        created: created(media),
        trash: false,
        views: 0,
      };
      addObject(
        `users/${user.uid}/screenshots/${refName}`,
        20_000 + media * 13,
      );
      addObject(
        `users/${user.uid}/screenshots/thumbnails/${refName}`,
        3_000 + media,
      );
      const share = `seedShare${pad(media)}`;
      db.shared[share] = { uid: user.uid, uidImageId: `${user.uid}/${id}` };
    }
  }
  if (i % 5 === 0) {
    node.videos = {};
    media += 1;
    const id = `seedVideo${pad(media)}`;
    const refName = `${user.displayName.replace(' ', '_')}_walkthrough.webm`;
    node.videos[id] = {
      id,
      uid: user.uid,
      refName,
      title: `${TITLES[media % TITLES.length]} (video)`,
      parentId: false,
      created: created(media),
      trash: false,
      views: 0,
    };
    addObject(`users/${user.uid}/videos/${refName}`, 1_500_000 + media * 101);
    const share = `seedVideoShare${pad(media)}`;
    db.sharedVideos[share] = { uid: user.uid, uidVideoId: `${user.uid}/${id}` };
  }
  db.users[user.uid] = node;
}

for (const [w, name] of WORKSPACES.entries()) {
  const id = `seedWorkspace${pad(w, 2)}AbCdEfGhIjKlMn`;
  const admin = users[w * 7];
  const members = users
    .filter((_, i) => i % 6 === w)
    .map((u) => ({ id: u.uid }));
  const teams = [];
  for (let t = 0; t < TEAMS_PER_WORKSPACE[w]; t += 1) {
    const team = TEAM_NAMES[teamCounter];
    teamCounter += 1;
    teams.push({
      id: `seedTeam${pad(teamCounter)}`,
      admin: admin.uid,
      name: team,
      members: [{ id: admin.uid }],
      workspaceId: id,
    });
  }
  media += 1;
  const shotId = `seedWsShot${pad(media)}`;
  const refName = `${name.replace(/ /g, '-')}-whiteboard.png`;
  addObject(`workspaces/${id}/screenshots/${refName}`, 40_000 + media * 17);
  const ws = {
    id,
    admin: admin.uid,
    name,
    members,
    folders: [],
    created: Date.UTC(2026, 8, 1 + w),
    screenshots: {
      [shotId]: {
        id: shotId,
        uid: admin.uid,
        refName,
        title: `${name} whiteboard`,
        parentId: false,
        created: created(media),
      },
    },
  };
  if (teams.length) ws.teams = teams;
  db.workspaces[id] = ws;
  for (const m of members) db.users[m.id].workspaceIds.push(id);
  if (!db.users[admin.uid].workspaceIds.includes(id))
    db.users[admin.uid].workspaceIds.push(id);
}
for (const node of Object.values(db.users))
  if (!node.workspaceIds.length) delete node.workspaceIds;

const canary = new Set();
for (const user of users)
  [
    user.uid,
    user.email,
    user.displayName,
    ...user.displayName.split(' '),
  ].forEach((v) => canary.add(v));
for (const ws of Object.values(db.workspaces)) {
  canary.add(ws.id);
  canary.add(ws.name);
  for (const team of ws.teams ?? [])
    [team.id, team.name].forEach((v) => canary.add(v));
  for (const shot of Object.values(ws.screenshots))
    [shot.id, shot.refName, shot.title].forEach((v) => canary.add(v));
}
for (const node of Object.values(db.users)) {
  for (const item of [
    ...Object.values(node.screenshots ?? {}),
    ...Object.values(node.videos ?? {}),
  ])
    [item.id, item.refName, item.title].forEach((v) => canary.add(v));
}
for (const id of [...Object.keys(db.shared), ...Object.keys(db.sharedVideos)])
  canary.add(id);
for (const object of objects) canary.add(object.name);
for (const domain of DOMAINS) canary.add(domain);

const write = (name, value) =>
  writeFileSync(join(here, name), `${JSON.stringify(value, null, 2)}\n`);
write('rtdb-seed.json', db);
write('auth-seed.json', { users });
write('storage-seed.json', { objects });
write('canary-values.json', {
  description:
    'Every identifying string of the seeded project (generate-seed.mjs). No statistics report may contain any of them.',
  values: [...canary].sort(),
});
console.log(
  `users ${users.length}, workspaces ${WORKSPACES.length}, teams ${teamCounter}, objects ${objects.length}, canary ${canary.size}`,
);
