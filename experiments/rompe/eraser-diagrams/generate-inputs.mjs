import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const out = resolve('D:/ware/represent/experiments/rompe/eraser-diagrams/inputs')
mkdirSync(out, { recursive: true })
const shape = (id, x, y, width, height, text, color, opts = {}) => ({
  tag: 'Shape', id, x, y, width, height,
  shape: opts.shape || 'rectangle', color,
  styleMode: 'plain', cornerRadius: opts.radius || 'round', borderWidth: 2,
  texts: [{ text, fontSize: opts.fontSize || 18, typeface: 'clean', hAlign: opts.align || 'center', ...(opts.textColor ? { color: opts.textColor } : {}) }],
  ...(opts.borderColor ? { borderColor: opts.borderColor } : {}),
  ...(opts.bgColor ? { bgColor: opts.bgColor } : {}),
  ...(opts.borderStyle ? { borderStyle: opts.borderStyle } : {})
})
const text = (id, x, y, width, height, value, size = 22, color = '#18243A') => ({
  tag: 'Textbox', id, x, y, width, height, text: value, fontSize: size, typeface: 'clean', color
})
const rel = (from, to, label = '', options = {}) => ({
  from, to, ...(label ? { label } : {}), endArrowhead: 'triangle',
  connectorStyle: 'elbow', cornerStyle: 'straight',
  ...(options.color ? { color: options.color } : {}),
  ...(options.lineStyle ? { lineStyle: options.lineStyle } : {}),
  ...(options.fontSize ? { fontSize: options.fontSize } : {})
})
const save = (file, entities, connections) => writeFileSync(resolve(out, file), JSON.stringify({ entities, connections }, null, 2) + '\n')

// Prompt 1 / economy: no-death sales and zone-conditioned death diverge after entering risk.
{
  const e = [
    text('title', 40, 24, 1380, 48, 'ROMPE · Economy loop (planned design)', 32),
    text('subtitle', 40, 70, 1380, 34, 'Want → source materials → craft → risk → either keep value moving or rebuild after a qualifying death', 17, '#40506A'),
    shape('want', 70, 190, 190, 98, 'WANT\nChoose any recipe', '#DDEBFF'),
    shape('ledger', 350, 190, 205, 98, 'LEDGER\nWhere materials come from', '#E6E1FF'),
    shape('gather', 650, 190, 230, 98, 'HUNT · GATHER · BUY\nDrops · surges · board', '#E1F4E8'),
    shape('craft', 980, 190, 245, 98, 'CRAFT\nKafra · account crafter · commission', '#FFF0D8', { fontSize: 16 }),
    shape('socket', 980, 365, 245, 90, 'SOCKET CARDS\nWear crafted gear', '#FFE7D6'),
    shape('zones', 650, 365, 230, 90, 'ENTER A RISK ZONE\nRules vary by colour', '#FBE1E5'),
    shape('survive', 340, 365, 230, 90, 'SURVIVE\nKeep your gear', '#DCEFEA'),
    shape('sale', 70, 365, 190, 90, 'SELL OR HAUL\nCity board · caravan', '#E1F4E8', { fontSize: 16 }),
    shape('death', 340, 555, 230, 96, 'DIE IN A DROP ZONE?\nOnly where DeathDrop applies', '#FFE2DC', { fontSize: 16 }),
    shape('grave', 650, 555, 230, 96, 'GRAVE\nDropped value; 30% share destroyed*', '#EEE1D4', { fontSize: 15 }),
    shape('demand', 980, 555, 245, 96, 'REBUILD DEMAND\nMaterials feed the next Want', '#E6E1FF', { fontSize: 16 }),
    text('note', 70, 715, 1170, 70, '*Design starting point: a Grave lasts 2 minutes; anyone may loot by default. Red is inventory (+ equipped crafted only if flagged); black is full loot of crafted gear, with named abyss-map exception. See risk diagram.', 15, '#40506A'),
    text('status', 70, 790, 1200, 28, 'DESIGN ONLY · qualifying death depends on map rules; no claim that these systems are implemented', 14, '#8A3E36')
  ]
  const c = [rel('want','ledger'), rel('ledger','gather'), rel('gather','craft'), rel('craft','socket'), rel('socket','zones'), rel('zones','survive','survive'), rel('survive','sale'), rel('sale','want','fund next Want'), rel('zones','death','death'), rel('death','grave'), rel('grave','demand'), rel('demand','want','rebuild')]
  save('prompt1-economy.json', e, c)
}

// Prompt 1 / risk-zone rules. Zone caps are active companions, not roster size.
{
  const e = [
    text('title', 40, 24, 1320, 48, 'Risk is a place · planned map rules', 32),
    text('subtitle', 40, 72, 1320, 30, 'Every border makes the PvP and loss rule visible before entry', 18, '#40506A'),
    shape('blue', 60, 150, 285, 135, 'BLUE · SAFE\nPvP off · no drops', '#DCEBFF', { fontSize: 18 }),
    shape('yellow', 380, 150, 285, 135, 'YELLOW · OPT IN\nFlag to fight · no drops', '#FFF0BF', { fontSize: 18 }),
    shape('red', 700, 150, 285, 135, 'RED · PVP ON\nInventory drops*', '#FFD9D6', { fontSize: 18 }),
    shape('black', 1020, 150, 285, 135, 'BLACK · FULL LOOT*\nCrafted gear only', '#252936', { fontSize: 18, textColor: '#FFFFFF' }),
    text('detail1', 60, 310, 1245, 44, 'ACTIVE COMPANIONS: blue ≤3 · yellow ≤2 · red/black ≤1. Account roster (12 characters) is separate.', 16, '#25364A'),
    text('detail2', 60, 365, 1245, 58, 'Blue is normally PvP-off; event-side rules may still permit fighting. Yellow drops no items; crafted durability wears. Red drops inventory, plus equipped crafted gear only if flagged.', 16, '#25364A'),
    text('detail3', 60, 435, 1245, 58, 'Black is full loot of crafted gear. Named abyss black maps are the exception: vanilla gear is also allowed and lootable.', 16, '#25364A'),
    text('status', 60, 535, 1200, 38, 'DESIGN ONLY · proposed World Dials / map tags, not current universal runtime behavior', 15, '#8A3E36')
  ]
  const c = []
  save('prompt1-risk-zones.json', e, c)
}

// Prompt 1 / party, account tags, guild permanence and temporary war side override.
{
  const e = [
    text('title', 40, 24, 1320, 48, 'Who is with you? · planned grouping model', 32),
    text('subtitle', 40, 70, 1320, 32, 'Party is the active group; account and hire are member tags; guild persists alongside it', 17, '#40506A'),
    shape('you', 65, 180, 190, 110, 'YOU\nParty member', '#DDEBFF'),
    shape('account', 300, 130, 240, 95, 'ACCOUNT TAG\nRoster: 12 characters', '#E6E1FF', { fontSize: 17 }),
    shape('hire', 300, 250, 240, 95, 'HIRE TAG\nHired / rented', '#FFF0D8', { fontSize: 17 }),
    shape('others', 300, 370, 240, 95, 'GUILD / OTHER TAGS\nParty members', '#E1F4E8', { fontSize: 16 }),
    shape('party', 610, 145, 300, 305, 'PARTY\nTemporary · no size cap', '#EAF1F7', { fontSize: 18 }),
    shape('guild', 1010, 180, 255, 130, 'GUILD\nPermanent · one per account', '#FFF0BF', { fontSize: 17 }),
    shape('war', 1010, 380, 255, 130, 'WAR / EVENT SIDE\nTemporary · guild-only', '#FFD9D6', { fontSize: 17 }),
    text('note', 65, 565, 1200, 42, 'Account is a member tag, not a hierarchy tier. Party order: account → hires → guild → others; you have two command slots.', 16, '#40506A'),
    text('note2', 65, 610, 1200, 42, 'Promoting a party forms the guild and ends that party. During WoE / GvG, a temporary Engagement side overrides ordinary party relations.', 16, '#40506A'),
    text('status', 65, 660, 1200, 32, 'DESIGN ONLY · roster size (12) is distinct from active companion caps', 15, '#8A3E36')
  ]
  const c = [rel('you','party'), rel('account','party'), rel('hire','party'), rel('others','party'), rel('party','guild'), rel('guild','war')]
  save('prompt1-grouping.json', e, c)
}

// Prompt 2 / portrait explainer poster. Pixel silhouettes are geometric primitives only.
{
  const e = [
    shape('background', 0, 0, 940, 1970, '', '#F8F5ED', { radius: 'sharp', borderColor: '#F8F5ED' }),
    text('title', 48, 36, 844, 58, 'ROMPE · Albion inside Ragnarok', 34),
    text('subtitle', 48, 92, 844, 34, 'A planned risk-and-rebuild sandbox in classic RO', 18, '#40506A'),
    shape('badge', 48, 135, 844, 42, 'PLANNED DESIGN · not yet implemented', '#FFF0BF', { fontSize: 16 }),
    // Tiny geometric adventurer and Kafra helper marks; no stock avatar/icon or external art.
    shape('hero-head', 98, 215, 38, 38, '', '#F2C9A5', { radius: 'sharp' }),
    shape('hero-body', 92, 255, 50, 78, '', '#3975B8', { radius: 'sharp' }),
    shape('hero-sword', 148, 242, 12, 106, '', '#8493A8', { radius: 'sharp' }),
    shape('kafra-head', 757, 215, 38, 38, '', '#F2C9A5', { radius: 'sharp' }),
    shape('kafra-cap', 748, 204, 56, 16, '', '#D55A69', { radius: 'sharp' }),
    shape('kafra-body', 751, 255, 50, 78, '', '#F5F0E8', { radius: 'sharp' }),
    shape('kafra-link', 806, 285, 18, 24, '', '#9FD8AE', { radius: 'sharp' }),
    text('callout-left', 175, 232, 255, 72, 'Classic jobs stay.\nThe economy takes risks.', 20),
    text('callout-right', 500, 232, 245, 72, 'Kafra Link guides\nwith short nudges.', 20),
    text('loop-head', 48, 365, 844, 38, 'THE CORE LOOP', 23),
    shape('p-want', 48, 420, 245, 86, 'WANT\nAny recipe', '#DDEBFF', { fontSize: 17 }),
    shape('p-ledger', 347, 420, 245, 86, 'LEDGER\nFind materials', '#E6E1FF', { fontSize: 17 }),
    shape('p-hunt', 646, 420, 245, 86, 'HUNT · GATHER · BUY', '#E1F4E8', { fontSize: 17 }),
    shape('p-craft', 646, 570, 245, 86, 'CRAFT · SOCKET', '#FFF0D8', { fontSize: 17 }),
    shape('p-risk', 347, 570, 245, 86, 'ENTER RISK ZONES', '#FBE1E5', { fontSize: 17 }),
    shape('p-loss', 48, 570, 245, 86, 'DIE? GRAVE + LOOT*', '#EEE1D4', { fontSize: 17 }),
    shape('p-keep', 48, 700, 394, 78, 'SURVIVE → board sale / caravan haul', '#DCEFEA', { fontSize: 16 }),
    shape('p-rebuild', 495, 700, 396, 78, 'DROP ZONE DEATH → demand → Want', '#FFE2DC', { fontSize: 16 }),
    text('zones-head', 48, 835, 844, 36, 'RISK IS A PLACE', 22),
    shape('p-blue', 48, 885, 198, 126, 'BLUE\nSafe · no item drop', '#DCEBFF', { fontSize: 16 }),
    shape('p-yellow', 264, 885, 198, 126, 'YELLOW · opt in\nNo item drop', '#FFF0BF', { fontSize: 16 }),
    shape('p-red', 480, 885, 198, 126, 'RED\nInventory drops*', '#FFD9D6', { fontSize: 16 }),
    shape('p-black', 696, 885, 198, 126, 'BLACK\nCrafted gear · full loot*', '#252936', { fontSize: 15, textColor: '#FFFFFF' }),
    text('zone-foot', 48, 1018, 844, 62, 'Active companions: blue ≤3 · yellow ≤2 · red/black ≤1; roster 12 is separate. Blue is normally PvP-off; event sides may still fight. Red: inventory + equipped crafted only if flagged. Named abyss black maps also allow vanilla loot.', 13, '#40506A'),
    text('timeline-head', 48, 1092, 844, 36, 'FIRST 15 MINUTES · PLAYTEST SKETCH', 21),
    shape('time-0', 48, 1145, 260, 78, '0′ · Poporing ate a knife', '#EDF3F8', { fontSize: 16 }),
    shape('time-3', 340, 1145, 260, 78, '3′ · Triple healing\nStarter field', '#EDF3F8', { fontSize: 16 }),
    shape('time-5', 632, 1145, 260, 78, '5′ · First Want', '#EDF3F8', { fontSize: 16 }),
    shape('time-8', 48, 1250, 260, 78, '8′ · Level-80 rental\n2 minutes', '#EDF3F8', { fontSize: 16 }),
    shape('time-10', 340, 1250, 260, 78, '10′ · First craft', '#EDF3F8', { fontSize: 16 }),
    shape('time-12', 632, 1250, 260, 78, '12′ · Job change', '#EDF3F8', { fontSize: 16 }),
    text('group-head', 48, 1370, 844, 36, 'WHO IS WITH YOU?', 21),
    shape('p-party', 48, 1425, 390, 112, 'PARTY · temporary · no cap\nRoster 12; tags: account / hire / guild / other', '#EAF1F7', { fontSize: 15 }),
    shape('p-guild', 500, 1425, 390, 112, 'GUILD · permanent\nPromotion ends the party', '#FFF0BF', { fontSize: 15 }),
    shape('p-war', 48, 1560, 842, 80, 'WAR MODE · guild-only event side', '#FBE1E5', { fontSize: 16 }),
    text('war-note', 48, 1642, 844, 28, 'Temporary Engagement overrides ordinary party relations during WoE / GvG.', 14, '#40506A'),
    text('events-head', 48, 1682, 844, 36, 'WORLD EVENTS', 21),
    shape('event-caravan', 48, 1725, 190, 72, 'CARAVAN', '#E1F4E8', { fontSize: 16 }),
    shape('event-rift', 264, 1725, 190, 72, 'RIFT', '#E6E1FF', { fontSize: 16 }),
    shape('event-surge', 480, 1725, 190, 72, 'SURGE', '#FFF0D8', { fontSize: 16 }),
    shape('event-roads', 696, 1725, 198, 72, 'ROADS', '#DDEBFF', { fontSize: 16 }),
    shape('event-outposts', 48, 1820, 260, 72, 'OUTPOSTS · WOE', '#FFF0BF', { fontSize: 16 }),
    shape('event-defense', 340, 1820, 260, 72, 'CITY DEFENSE', '#FFD9D6', { fontSize: 16 }),
    shape('event-killboard', 632, 1820, 260, 72, 'KILLBOARD', '#EAF1F7', { fontSize: 16 }),
    text('footer', 48, 1905, 844, 54, 'Classic jobs · pinned formulas · new risk layers\n*Death loot follows zone rules; black abyss exception applies.', 15, '#40506A')
  ]
  const c = [
    rel('p-want','p-ledger'), rel('p-ledger','p-hunt'), rel('p-hunt','p-craft'),
    rel('p-craft','p-risk'), rel('p-risk','p-loss'), rel('p-loss','p-want','rebuild',{fontSize:13}),
    rel('p-risk','p-keep','survive',{fontSize:13}), rel('p-loss','p-rebuild','rebuild'),
    rel('p-party','p-guild','',{lineStyle:'dashed'}),
    rel('p-guild','p-war','',{lineStyle:'dashed'})
  ]
  save('prompt2-poster.json', e, c)
}
