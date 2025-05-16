import type { GraphData } from '../../services/dataLoader';

export interface WordCollection {
  id: string;
  title: string;
  description: string;
  words: string[];
  startDate?: Date; // Optional: for time-limited collections
  endDate?: Date;   // Optional: for time-limited collections
  icon?: string;    // Optional: icon name for the collection
  isWordlistViewable: boolean; // Add this flag to control wordlist visibility
}

// Helper function to ensure no duplicate words in collections
const deduplicateArray = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

// Theme-based word lists - filtered to ensure they only contain words from our graph
const thematicWordLists = {
  colors: deduplicateArray([
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'violet',
    'brown', 'black', 'white', 'gray', 'silver', 'gold', 'bronze', 'azure', 'sapphire',
    'pearl', 'navy', 'tan', 'cream', 'lavender', 'lilac', 'mint', 'olive', 'shadow',
    'highlight', 'spectrum', 'shade', 'tint', 'vibrant', 'glow', 'gleam', 'sparkle',
    'flash', 'beam', 'ray', 'radiant', 'bright', 'dim', 'fade', 'dark', 'light',
    'dazzle', 'flicker', 'illuminate', 'absorb', 'transparent', 'opaque', 'translucent',
    'burn', 'brass', 'rose', 'slate'
  ]),
  
  shapes: deduplicateArray([
    'spiral', 'wave', 'circle', 'square', 'triangle', 'rectangle', 'oval', 'sphere',
    'cube', 'pyramid', 'cone', 'cylinder', 'pentagon', 'hexagon', 'octagon', 'star',
    'heart', 'diamond', 'arrow', 'curve', 'line', 'point', 'angle', 'edge', 'corner',
    'surface', 'volume', 'dimension', 'pattern', 'maze', 'web', 'ripple', 'swirl',
    'twist', 'coil', 'loop', 'knot', 'tangle', 'overlap', 'parallel', 'diagonal',
    'horizontal', 'vertical', 'skew', 'bent', 'straight', 'smooth', 'rough', 'flat',
    'round', 'pointed', 'sharp', 'hollow', 'solid', 'convex', 'concave', 'fold', 'crease'
  ]),
  
  movement: deduplicateArray([
    'glide', 'tumble', 'echo', 'walk', 'run', 'jump', 'skip', 'hop', 'slide', 'roll',
    'spin', 'twist', 'turn', 'pivot', 'rotate', 'swing', 'sway', 'bounce', 'float',
    'sink', 'rise', 'fall', 'drop', 'lift', 'soar', 'dive', 'dash', 'rush', 'race',
    'crawl', 'creep', 'leap', 'bound', 'march', 'stroll', 'wander', 'swim', 'sail',
    'drift', 'fly', 'hover', 'speed', 'stop', 'start', 'reverse', 'advance', 'retreat',
    'shake', 'quake', 'beat', 'flow', 'stream', 'trickle', 'drip', 'pour', 'spill',
    'splash', 'spray', 'burst', 'crash', 'smash', 'shatter', 'scatter', 'gather',
    'expand', 'contract', 'stretch', 'bend', 'pull', 'push', 'toss', 'throw', 'catch',
    'grasp', 'release'
  ]),
  
  textures: deduplicateArray([
    'smooth', 'rough', 'soft', 'hard', 'bumpy', 'silky', 'furry', 'fuzzy', 'fluffy',
    'sticky', 'slimy', 'moist', 'dry', 'wet', 'damp', 'cold', 'warm', 'hot', 'cool',
    'wooden', 'plastic', 'rubber', 'glass', 'paper', 'cloth', 'leather', 'cotton',
    'wool', 'silk', 'nylon', 'polyester', 'canvas', 'cork', 'foam', 'sponge', 'clay',
    'mud', 'sand', 'soil', 'dirt', 'dust', 'powder', 'grain', 'pebble', 'rock',
    'boulder', 'concrete', 'cement', 'brick', 'steel', 'iron', 'copper', 'brass',
    'bronze', 'aluminum', 'gold', 'silver', 'wood', 'bark', 'chip', 'fiber', 'thread',
    'rope', 'string', 'wire', 'metal', 'paint', 'ink', 'rust', 'layer', 'texture'
  ]),
  
  sounds: deduplicateArray([
    'rustle', 'murmur', 'silence', 'quiet', 'noise', 'sound', 'loud', 'soft',
    'echo', 'whisper', 'shout', 'scream', 'yell', 'cry', 'laugh', 'giggle', 'sob',
    'sigh', 'moan', 'groan', 'growl', 'howl', 'roar', 'shriek', 'squeak', 'chirp',
    'tweet', 'cheep', 'croak', 'hiss', 'buzz', 'hum', 'purr', 'bark', 'moo', 'honk',
    'quack', 'cluck', 'oink', 'chatter', 'click', 'tick', 'tock', 'beep', 'ding',
    'ring', 'chime', 'jingle', 'rattle', 'crash', 'boom', 'bang', 'thud', 'thump',
    'slap', 'crack', 'snap', 'pop', 'splash', 'crunch', 'crackle', 'tap', 'knock',
    'slam', 'creak', 'static', 'beat', 'bass', 'volume', 'tone'
  ]),
  
  creatures: deduplicateArray([
    'otter', 'beetle', 'sphinx', 'ghost', 'angel', 'demon', 'lion', 'tiger', 'bear',
    'deer', 'camel', 'elephant', 'hippopotamus', 'zebra', 'horse', 'donkey', 'cow',
    'goat', 'sheep', 'pig', 'dog', 'cat', 'rabbit', 'mouse', 'rat', 'squirrel',
    'beaver', 'porcupine', 'bat', 'whale', 'dolphin', 'shark', 'seal', 'pelican',
    'flamingo', 'stork', 'duck', 'owl', 'cardinal', 'parrot', 'ostrich', 'turtle',
    'snake', 'frog', 'fish', 'salmon', 'tuna', 'clam', 'oyster', 'crab', 'lobster',
    'shrimp', 'octopus', 'spider', 'bee', 'wasp', 'butterfly', 'cricket', 'grasshopper',
    'locust', 'worm', 'slug', 'snail'
  ]),
  
  tools: deduplicateArray([
    'gear', 'quill', 'lens', 'hammer', 'nail', 'screw', 'bolt', 'wrench', 'saw',
    'drill', 'file', 'sandpaper', 'clamp', 'level', 'ruler', 'tape', 'scale', 'compass',
    'scissors', 'knife', 'blade', 'axe', 'shovel', 'rake', 'hoe', 'trowel', 'ladder',
    'rope', 'chain', 'pulley', 'lever', 'wedge', 'wheel', 'spring', 'coil', 'valve',
    'pump', 'anvil', 'needle', 'thread', 'yarn', 'pen', 'pencil', 'chalk', 'brush',
    'canvas', 'piano', 'violin', 'guitar', 'flute', 'drum', 'bell', 'camera', 'torch',
    'lamp', 'bulb', 'switch', 'battery', 'wire', 'radio', 'telephone', 'computer',
    'keyboard', 'screen', 'mouse', 'printer', 'clock', 'watch', 'map', 'globe',
    'calculator'
  ]),
  
  journeys: deduplicateArray([
    'harbor', 'trail', 'compass', 'pass', 'echo', 'map', 'journey', 'voyage', 'quest',
    'adventure', 'discovery', 'traveler', 'tourist', 'guide', 'landmark', 'fork',
    'junction', 'path', 'route', 'road', 'highway', 'street', 'bridge', 'tunnel',
    'ferry', 'station', 'terminal', 'airport', 'port', 'dock', 'bay', 'cove',
    'beach', 'shore', 'coast', 'island', 'strait', 'channel', 'river', 'stream',
    'creek', 'lake', 'pond', 'ocean', 'sea', 'gulf', 'valley', 'canyon', 'mountain',
    'hill', 'peak', 'ridge', 'plain', 'forest', 'jungle', 'desert', 'swamp', 'marsh',
    'oasis', 'north', 'south', 'east', 'west', 'distance', 'destination', 'origin',
    'arrival', 'border', 'horizon', 'vista', 'scenery', 'landscape', 'terrain',
    'elevation', 'depth', 'current', 'tide', 'star', 'galaxy', 'universe', 'space'
  ]),
  
  fantasy: deduplicateArray([
    'spell', 'veil', 'magic', 'enchant', 'charm', 'sorcerer', 'oracle',
    'mystic', 'familiar', 'curse', 'realm', 'domain', 'kingdom', 'castle',
    'keep', 'hollow', 'path', 'trail', 'journey', 'hero', 'champion', 'guide', 'elder',
    'artifact', 'treasure', 'gold', 'silver', 'gem', 'jewel', 'crown', 'staff', 'rod',
    'shield', 'sword', 'blade', 'bow', 'arrow', 'mount', 'beast', 'shadow', 'light',
    'dawn', 'midnight', 'moon', 'star', 'sun', 'cosmic', 'celestial', 'dream',
    'prophecy', 'myth', 'tale', 'epic', 'song', 'puzzle', 'secret', 'mystery',
    'whisper', 'echo'
  ]),
  
  time: deduplicateArray([
    'dusk', 'shift', 'echo', 'rust', 'sprout', 'time', 'clock', 'watch', 'second',
    'minute', 'hour', 'day', 'week', 'month', 'year', 'decade', 'century',
    'era', 'future', 'past', 'present', 'history', 'memory', 'tradition', 'heritage',
    'legacy', 'ancestor', 'generation', 'evolution', 'transition', 'transformation',
    'change', 'alter', 'modify', 'adjust', 'adapt', 'convert', 'switch',
    'vary', 'proceed', 'progress', 'develop', 'grow', 'mature', 'wither',
    'decay', 'erode', 'fade', 'dim', 'birth', 'death', 'renewal', 'revival',
    'beginning', 'middle', 'end', 'start', 'finish', 'origin', 'conclusion', 'dawn',
    'morning', 'noon', 'afternoon', 'evening', 'night', 'midnight', 'sunrise',
    'sunset', 'season', 'spring', 'summer', 'autumn', 'fall', 'winter', 'cycle',
    'routine', 'rhythm', 'tempo', 'pace', 'speed', 'swift', 'slow', 'sudden',
    'instant', 'moment', 'while', 'duration', 'forever', 'temporary', 'appear',
    'disappear', 'phase', 'stage', 'step', 'process', 'pattern', 'repeat', 'regular',
    'constant', 'fixed'
  ]),
  
  machines: deduplicateArray([
    'gear', 'lever', 'piston', 'coil', 'dial', 'machine', 'mechanism', 'device',
    'apparatus', 'gadget', 'contraption', 'appliance', 'instrument', 'tool',
    'implement', 'motor', 'engine', 'turbine', 'generator', 'circuit', 'wire', 'cable',
    'switch', 'button', 'handle', 'knob', 'gauge', 'meter', 'display',
    'screen', 'monitor', 'sensor', 'antenna', 'signal', 'battery', 'power', 'energy',
    'current', 'electric', 'electronic', 'mechanical', 'robot', 'computer', 'processor',
    'memory', 'storage', 'data', 'input', 'output', 'network', 'system', 'program',
    'digital', 'automatic', 'manual', 'wheel', 'axle', 'shaft', 'spring',
    'bolt', 'pump'
  ]),
  
  gardens: deduplicateArray([
    'bud', 'moss', 'bloom', 'garden', 'sprout', 'root', 'stem', 'leaf', 'plant',
    'soil', 'grow', 'nurture', 'harvest', 'sow', 'reap', 'weed', 'water', 'shade',
    'bulb', 'hedge', 'tree', 'plot', 'row', 'bed', 'path', 'fence', 'spade', 'rake',
    'till', 'sift', 'dig', 'bury', 'thrive', 'wither', 'verdant', 'lush', 'ripe',
    'branch', 'evergreen', 'climate', 'zone', 'hybrid', 'bee', 'butterfly', 'oasis',
    'paradise', 'cycle', 'transform', 'yield', 'life', 'vigor', 'robust', 'fragile',
    'hardy', 'resilient'
  ]),
  
  seasons: deduplicateArray([
    'spring', 'summer', 'autumn', 'fall', 'winter', 'snow', 'thunder', 'frost',
    'blossom', 'rain', 'storm', 'cloud', 'breeze', 'wind', 'hurricane', 'tornado',
    'hail', 'sleet', 'fog', 'mist', 'rainbow', 'humid', 'dry', 'wet', 'cold', 'hot',
    'warm', 'cool', 'freeze', 'thaw', 'drought', 'flood', 'shower', 'drizzle',
    'temperature', 'climate', 'seasonal', 'solstice', 'bloom', 'harvest', 'sunlight',
    'shadow', 'sunset', 'twilight', 'night', 'forecast', 'weather', 'sky', 'lightning'
  ]),
  
  halloween: deduplicateArray([
    'ghost', 'shadow', 'dark', 'night', 'moon', 'bat', 'web', 'spider', 'witch', 
    'brew', 'spell', 'potion', 'magic', 'spirit', 'soul', 'hollow', 'mystery',
    'fear', 'scare', 'spooky', 'trick', 'treat', 'mask', 'costume', 'disguise',
    'bone', 'skull', 'skeleton', 'grave', 'tomb', 'howl', 'creature', 'beast', 
    'monster', 'myth', 'legend', 'tale', 'story', 'whisper', 'fog', 'mist'
  ]),
  
  valentines: deduplicateArray([
    'love', 'heart', 'rose', 'pink', 'red', 'sweet', 'kiss', 'passion', 'hug',
    'embrace', 'adore', 'affection', 'care', 'cherish', 'romance', 'poem', 'verse',
    'note', 'card', 'gift', 'date', 'couple', 'partner', 'pair', 'flower', 'bouquet',
    'chocolate', 'candy', 'treat', 'charm', 'arrow', 'soul', 'mate', 'tender', 'warm'
  ])
};

// Template function for creating collections
const createCollection = (
  id: string,
  title: string,
  description: string,
  words: string[],
  options?: {
    startDate?: Date;
    endDate?: Date;
    icon?: string;
    isWordlistViewable?: boolean; // Add this flag to control wordlist visibility
  }
): WordCollection => ({
  id,
  title,
  description,
  words,
  isWordlistViewable: options?.isWordlistViewable ?? false, // Default to false (disabled)
  ...options
});

// Define raw collections (before filtering)
export const rawWordCollections: WordCollection[] = [
  // Thematic collections
  createCollection(
    'colors',
    'Colors & Light',
    '',
    thematicWordLists.colors,
    { icon: 'palette', isWordlistViewable: true }
  ),
  createCollection(
    'shapes',
    'Shapes & Patterns',
    '',
    thematicWordLists.shapes,
    { icon: 'shape', isWordlistViewable: true }
  ),
  createCollection(
    'movement',
    'Movement & Motion',
    '',
    thematicWordLists.movement,
    { icon: 'run', isWordlistViewable: true }
  ),
  createCollection(
    'textures',
    'Textures & Materials',
    '',
    thematicWordLists.textures,
    { icon: 'texture-box', isWordlistViewable: true }
  ),
  createCollection(
    'sounds',
    'Sounds & Silence',
    '',
    thematicWordLists.sounds,
    { icon: 'volume-high', isWordlistViewable: true }
  ),
  createCollection(
    'creatures',
    'Creatures Real & Imagined',
    '',
    thematicWordLists.creatures,
    { icon: 'paw', isWordlistViewable: true }
  ),
  createCollection(
    'tools',
    'Tools & Instruments',
    '',
    thematicWordLists.tools,
    { icon: 'tools', isWordlistViewable: true }
  ),
  createCollection(
    'journeys',
    'Maps & Journeys',
    '',
    thematicWordLists.journeys,
    { icon: 'map', isWordlistViewable: true }
  ),
  createCollection(
    'fantasy',
    'Light Fantasy',
    '',
    thematicWordLists.fantasy,
    { icon: 'magic-staff', isWordlistViewable: true }
  ),
  createCollection(
    'time',
    'Time & Change',
    '',
    thematicWordLists.time,
    { icon: 'clock-time-eight', isWordlistViewable: true }
  ),
  createCollection(
    'machines',
    'Machines & Mechanisms',
    '',
    thematicWordLists.machines,
    { icon: 'cog', isWordlistViewable: true }
  ),
  createCollection(
    'gardens',
    'Gardens & Growth',
    '',
    thematicWordLists.gardens,
    { icon: 'flower', isWordlistViewable: true }
  ),
  createCollection(
    'seasons',
    'Seasons & Weather',
    '',
    thematicWordLists.seasons,
    { icon: 'weather-sunny-alert', isWordlistViewable: true }
  ),
  
  // Seasonal collections
  createCollection(
    'halloween',
    'Halloween Spooktacular',
    'Collect words that evoke the spooky season. Available annually during October!',
    thematicWordLists.halloween,
    { 
      icon: 'ghost',
      isWordlistViewable: true,
      // Halloween collection available every October 1-31
      startDate: new Date(new Date().getFullYear(), 9, 1), // October 1st (0-indexed months)
      endDate: new Date(new Date().getFullYear(), 9, 31) // October 31st
    }
  ),
  
  createCollection(
    'valentines',
    'Valentine\'s Day',
    'Words of love and affection. Available annually from February 1-14.',
    thematicWordLists.valentines,
    { 
      icon: 'heart',
      isWordlistViewable: true,
      // Valentine's collection available February 1-14 every year
      startDate: new Date(new Date().getFullYear(), 1, 1), // February 1st
      endDate: new Date(new Date().getFullYear(), 1, 14) // February 14th
    }
  ),
];

// Helper function to filter collections by date
export const filterCollectionsByDate = (
  collections: WordCollection[],
  testDate?: Date // Optional parameter for testing specific dates
): WordCollection[] => {
  const now = testDate || new Date();
  
  return collections.filter(collection => {
    // If no dates are specified, the collection is always available
    if (!collection.startDate && !collection.endDate) {
      return true;
    }
    
    // Extract month and day for year-agnostic comparison
    const currentMonth = now.getMonth(); // 0-11
    const currentDay = now.getDate();   // 1-31
    
    // Check if collection is within date range (ignoring year)
    if (collection.startDate && collection.endDate) {
      const startMonth = collection.startDate.getMonth();
      const startDay = collection.startDate.getDate();
      const endMonth = collection.endDate.getMonth();
      const endDay = collection.endDate.getDate();
      
      // Simple case: both dates in same month
      if (startMonth === endMonth) {
        return (currentMonth === startMonth) && 
               (currentDay >= startDay) && 
               (currentDay <= endDay);
      }
      
      // Complex case: spans multiple months (e.g., winter holidays)
      if (startMonth < endMonth) {
        // Normal range (e.g., Oct 1 - Dec 25)
        return (
          (currentMonth > startMonth && currentMonth < endMonth) || // Middle months
          (currentMonth === startMonth && currentDay >= startDay) || // Start month
          (currentMonth === endMonth && currentDay <= endDay)       // End month
        );
      } else {
        // Wrapping around year (e.g., Dec 1 - Feb 28)
        return (
          (currentMonth > startMonth) || // Rest of year after start
          (currentMonth < endMonth) ||   // Beginning of next year
          (currentMonth === startMonth && currentDay >= startDay) || // Start month
          (currentMonth === endMonth && currentDay <= endDay)        // End month
        );
      }
    }
    
    // Check just start date (specific day only, like Thanksgiving)
    if (collection.startDate && !collection.endDate) {
      const startMonth = collection.startDate.getMonth();
      const startDay = collection.startDate.getDate();
      return (currentMonth === startMonth && currentDay === startDay);
    }
    
    // Check just end date (available until specific date)
    if (!collection.startDate && collection.endDate) {
      const endMonth = collection.endDate.getMonth();
      const endDay = collection.endDate.getDate();
      
      if (currentMonth < endMonth) {
        return true;
      } else if (currentMonth === endMonth) {
        return currentDay <= endDay;
      } else {
        return false;
      }
    }
    
    return true;
  });
};

// Utility function to test collections visibility for a specific month and day
export const testCollectionsForDate = (
  collections: WordCollection[], 
  month: number, // 1-12 (January is 1)
  day: number
): WordCollection[] => {
  // Create a test date for the current year with the given month and day
  const testDate = new Date(new Date().getFullYear(), month - 1, day); // Month is 0-indexed
  return filterCollectionsByDate(collections, testDate);
};

// Filter collections to ensure they only contain words from our graph
export const filterWordCollections = (
  collections: WordCollection[],
  graphData: GraphData
): WordCollection[] => {
  return collections.map(collection => {
    const filteredWords = collection.words.filter(word => word in graphData);
    return {
      ...collection,
      words: filteredWords,
      description: collection.description || `Collect ${collection.title.toLowerCase()} words as you play.`
    };
  }).filter(collection => collection.words.length > 0);
};

// Get filtered word collections that only contain words from our graph
export const getFilteredWordCollections = async (
  graphData: GraphData,
  testDate?: Date
): Promise<WordCollection[]> => {
  // First filter to ensure all words exist in our graph
  const filteredByGraph = filterWordCollections(rawWordCollections, graphData);
  
  // Then filter by date to only show time-appropriate collections
  const filteredByDate = filterCollectionsByDate(filteredByGraph, testDate);
  
  return filteredByDate;
}; 