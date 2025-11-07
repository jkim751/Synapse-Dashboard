// Common typos and their corrections (fallback dictionary)
export const autocorrectDictionary: Record<string, string> = {
  // Common typos
  'teh': 'the',
  'hte': 'the',
  'recieve': 'receive',
  'recieved': 'received',
  'occured': 'occurred',
  'seperate': 'separate',
  'definately': 'definitely',
  'wierd': 'weird',
  'untill': 'until',
  'thier': 'their',
  'freind': 'friend',
  'becuase': 'because',
  'beleive': 'believe',
  'acheive': 'achieve',
  'occassion': 'occasion',
  'accomodate': 'accommodate',
  'tommorrow': 'tomorrow',
  'neccessary': 'necessary',
  'enviroment': 'environment',
  'begining': 'beginning',
  'occuring': 'occurring',
  'recomend': 'recommend',
  'adress': 'address',
  'refered': 'referred',
  'havent': "haven't",
  'dont': "don't",
  'cant': "can't",
  'wont': "won't",
  'shouldnt': "shouldn't",
  'wouldnt': "wouldn't",
  'couldnt': "couldn't",
  'doesnt': "doesn't",
  'didnt': "didn't",
  'isnt': "isn't",
  'arent': "aren't",
  'wasnt': "wasn't",
  'werent': "weren't",
  
  // Education-specific terms
  'acheivement': 'achievement',
  'assesment': 'assessment',
  'curriculm': 'curriculum',
  'curriculums': 'curricula',
  'explaination': 'explanation',
  'grammer': 'grammar',
  'liason': 'liaison',
  'liase': 'liaise',
  'prefered': 'preferred',
  'priviledge': 'privilege',
  'seperated': 'separated',
  'sucessful': 'successful',
  'suceed': 'succeed',
  
  // Days of the week
  'monday': 'Monday',
  'tuesday': 'Tuesday',
  'wednesday': 'Wednesday',
  'thursday': 'Thursday',
  'friday': 'Friday',
  'saturday': 'Saturday',
  'sunday': 'Sunday',
  
  // Months
  'january': 'January',
  'february': 'February',
  'march': 'March',
  'april': 'April',
  'may': 'May',
  'june': 'June',
  'july': 'July',
  'august': 'August',
  'september': 'September',
  'october': 'October',
  'november': 'November',
  'december': 'December',
}

// Cache for API spell check results to avoid repeated calls
const spellCheckCache = new Map<string, string | null>()

// Levenshtein distance algorithm for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

// Expanded common words set (includes top 3000+ common words)
const commonWords = new Set([
  // Basic words
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'is', 'was', 'are', 'been', 'has', 'had', 'were', 'said', 'did', 'having',
  'may', 'should', 'am', 'being', 'here', 'where', 'why', 'how', 'during', 'before',
  
  // Education-specific
  'student', 'students', 'class', 'classes', 'teacher', 'teachers', 'school', 'schools',
  'lesson', 'lessons', 'homework', 'assignment', 'assignments', 'test', 'tests', 'exam', 'exams',
  'grade', 'grades', 'subject', 'subjects', 'learning', 'education', 'study', 'studied', 'studying',
  'taught', 'teaching', 'course', 'courses', 'semester', 'quarter', 'year', 'classroom',
  'curriculum', 'curricula', 'textbook', 'textbooks', 'notebook', 'notes', 'quiz', 'quizzes',
  'project', 'projects', 'presentation', 'presentations', 'report', 'reports', 'essay', 'essays',
  'lecture', 'lectures', 'tutorial', 'tutorials', 'workshop', 'workshops', 'seminar', 'seminars',
  'attendance', 'absent', 'present', 'tardy', 'behavior', 'participation', 'performance',
  'progress', 'improvement', 'achievement', 'achievements', 'goal', 'goals', 'objective', 'objectives',
  'math', 'mathematics', 'science', 'history', 'english', 'literature', 'reading', 'writing',
  'art', 'music', 'physical', 'education', 'geography', 'biology', 'chemistry', 'physics',
  'algebra', 'geometry', 'calculus', 'statistics', 'language', 'languages', 'spanish', 'french',
  'understand', 'understanding', 'learned', 'knowledge', 'skill', 'skills', 'practice', 'review',
  
  // Common verbs
  'show', 'shows', 'showed', 'shown', 'showing', 'tell', 'tells', 'told', 'telling',
  'ask', 'asks', 'asked', 'asking', 'work', 'works', 'worked', 'working',
  'seem', 'seems', 'seemed', 'seeming', 'feel', 'feels', 'felt', 'feeling',
  'try', 'tries', 'tried', 'trying', 'leave', 'leaves', 'left', 'leaving',
  'call', 'calls', 'called', 'calling', 'need', 'needs', 'needed', 'needing',
  'help', 'helps', 'helped', 'helping', 'turn', 'turns', 'turned', 'turning',
  'start', 'starts', 'started', 'starting', 'might', 'show', 'every', 'still',
  'play', 'plays', 'played', 'playing', 'move', 'moves', 'moved', 'moving',
  'pay', 'pays', 'paid', 'paying', 'hear', 'hears', 'heard', 'hearing',
  'meet', 'meets', 'met', 'meeting', 'include', 'includes', 'included', 'including',
  'continue', 'continues', 'continued', 'continuing', 'set', 'sets', 'setting',
  'learn', 'learns', 'learned', 'learnt', 'change', 'changes', 'changed', 'changing',
  'lead', 'leads', 'led', 'leading', 'understand', 'understands', 'understood', 'understanding',
  'watch', 'watches', 'watched', 'watching', 'follow', 'follows', 'followed', 'following',
  'stop', 'stops', 'stopped', 'stopping', 'create', 'creates', 'created', 'creating',
  'speak', 'speaks', 'spoke', 'spoken', 'speaking', 'read', 'reads', 'reading',
  'allow', 'allows', 'allowed', 'allowing', 'add', 'adds', 'added', 'adding',
  'spend', 'spends', 'spent', 'spending', 'grow', 'grows', 'grew', 'grown', 'growing',
  'open', 'opens', 'opened', 'opening', 'walk', 'walks', 'walked', 'walking',
  'win', 'wins', 'won', 'winning', 'offer', 'offers', 'offered', 'offering',
  'remember', 'remembers', 'remembered', 'remembering', 'love', 'loves', 'loved', 'loving',
  'consider', 'considers', 'considered', 'considering', 'appear', 'appears', 'appeared', 'appearing',
  'buy', 'buys', 'bought', 'buying', 'wait', 'waits', 'waited', 'waiting',
  'serve', 'serves', 'served', 'serving', 'die', 'dies', 'died', 'dying',
  'send', 'sends', 'sent', 'sending', 'expect', 'expects', 'expected', 'expecting',
  'build', 'builds', 'built', 'building', 'stay', 'stays', 'stayed', 'staying',
  'fall', 'falls', 'fell', 'fallen', 'falling', 'cut', 'cuts', 'cutting',
  'reach', 'reaches', 'reached', 'reaching', 'kill', 'kills', 'killed', 'killing',
  'remain', 'remains', 'remained', 'remaining', 'suggest', 'suggests', 'suggested', 'suggesting',
  'raise', 'raises', 'raised', 'raising', 'pass', 'passes', 'passed', 'passing',
  
  // Common adjectives
  'great', 'better', 'best', 'worse', 'worst', 'good', 'bad', 'long', 'short',
  'little', 'big', 'large', 'small', 'high', 'low', 'early', 'late', 'young', 'old',
  'different', 'same', 'few', 'many', 'much', 'next', 'last', 'right', 'wrong',
  'important', 'public', 'able', 'sure', 'true', 'false', 'real', 'full', 'complete',
  'special', 'easy', 'hard', 'difficult', 'clear', 'ready', 'simple', 'common', 'certain',
  'possible', 'impossible', 'recent', 'strong', 'weak', 'free', 'whole', 'nice', 'fine',
  'excellent', 'poor', 'rich', 'happy', 'sad', 'angry', 'calm', 'quiet', 'loud',
  
  // Common nouns
  'thing', 'things', 'person', 'people', 'man', 'men', 'woman', 'women', 'child', 'children',
  'life', 'lives', 'hand', 'hands', 'part', 'parts', 'place', 'places', 'case', 'cases',
  'point', 'points', 'week', 'weeks', 'company', 'companies', 'number', 'numbers',
  'group', 'groups', 'problem', 'problems', 'fact', 'facts', 'area', 'areas',
  'money', 'story', 'stories', 'result', 'results', 'question', 'questions',
  'lot', 'right', 'study', 'studies', 'book', 'books', 'word', 'words',
  'business', 'issue', 'issues', 'side', 'sides', 'kind', 'kinds', 'head', 'heads',
  'house', 'houses', 'service', 'services', 'friend', 'friends', 'father', 'mother',
  'power', 'hour', 'hours', 'game', 'games', 'line', 'lines', 'end', 'ends',
  'member', 'members', 'law', 'laws', 'car', 'cars', 'city', 'cities',
  'community', 'communities', 'name', 'names', 'president', 'team', 'teams',
  'minute', 'minutes', 'idea', 'ideas', 'kid', 'kids', 'body', 'bodies',
  'information', 'back', 'parent', 'parents', 'face', 'faces', 'level', 'levels',
  'office', 'offices', 'door', 'doors', 'health', 'art', 'war', 'history',
  'party', 'parties', 'within', 'result', 'change', 'morning', 'reason', 'reasons',
  'research', 'girl', 'girls', 'guy', 'guys', 'moment', 'moments', 'air', 'teacher',
  'force', 'education', 'foot', 'feet', 'boy', 'boys', 'age', 'ages',
  'policy', 'policies', 'everything', 'love', 'process', 'music', 'including',
  'mind', 'state', 'experience', 'body', 'upon', 'among', 'toward', 'towards',
  
  // Prepositions and conjunctions
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around',
  'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'during',
  'except', 'inside', 'into', 'near', 'off', 'outside', 'over', 'through',
  'throughout', 'toward', 'towards', 'under', 'underneath', 'until', 'upon', 'within', 'without',
  'although', 'though', 'unless', 'whereas', 'whether', 'while', 'since',
])

// Check if word is likely correct (exists in common words or is capitalized name)
function isLikelyCorrect(word: string): boolean {
  // Empty or very short words
  if (!word || word.length <= 1) return true
  
  const lower = word.toLowerCase()
  
  // Check common words
  if (commonWords.has(lower)) return true
  
  // Proper nouns (capitalized) - be more lenient
  if (word.length > 1 && word[0] === word[0].toUpperCase()) {
    return true
  }
  
  // Numbers or dates
  if (/^\d+$/.test(word) || /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(word)) {
    return true
  }
  
  // Acronyms (all caps)
  if (word.length >= 2 && word === word.toUpperCase()) {
    return true
  }
  
  // Words with apostrophes (contractions, possessives)
  if (word.includes("'")) {
    return true
  }
  
  // Words with hyphens (compound words)
  if (word.includes('-')) {
    return true
  }
  
  // Technical terms with underscores
  if (word.includes('_')) {
    return true
  }
  
  // URLs or emails
  if (word.includes('.') || word.includes('@')) {
    return true
  }
  
  // Longer words are often specialized/technical terms - be conservative
  if (word.length > 12) {
    return true
  }
  
  return false
}

// Use free spell check API
async function checkSpellingAPI(word: string): Promise<string | null> {
  // Check cache first
  if (spellCheckCache.has(word)) {
    return spellCheckCache.get(word) || null
  }

  try {
    // Using LanguageTool API (free tier)
    const response = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: word,
        language: 'en-GB'
      })
    })

    if (response.ok) {
      const data = await response.json()
      
      if (data.matches && data.matches.length > 0) {
        const firstMatch = data.matches[0]
        if (firstMatch.replacements && firstMatch.replacements.length > 0) {
          const suggestion = firstMatch.replacements[0].value
          spellCheckCache.set(word, suggestion)
          return suggestion
        }
      }
    }
  } catch (error) {
    console.warn('Spell check API failed:', error)
  }

  spellCheckCache.set(word, null)
  return null
}

// Generate possible corrections based on common patterns with confidence scores
function generateCorrections(word: string): Array<{ word: string; confidence: number }> {
  const corrections: Array<{ word: string; confidence: number }> = []
  const lower = word.toLowerCase()

  // Check manual dictionary first - highest confidence
  if (autocorrectDictionary[lower]) {
    corrections.push({ word: autocorrectDictionary[lower], confidence: 100 })
    return corrections
  }

  // Check against common words with Levenshtein distance
  const candidates: Array<{ word: string; distance: number }> = []
  
  for (const commonWord of commonWords) {
    // Only consider words of similar length
    if (Math.abs(commonWord.length - lower.length) <= 2) {
      const distance = levenshteinDistance(lower, commonWord)
      // Accept distance of 1 or 2
      if (distance === 1 || 2) {
        candidates.push({ word: commonWord, distance })
      }
    }
  }

  // Sort by distance and assign confidence scores
  candidates.sort((a, b) => a.distance - b.distance)
  
  for (const candidate of candidates.slice(0, 5)) {
    const confidence = candidate.distance === 1 ? 90 : 70
    corrections.push({ word: candidate.word, confidence })
  }

  return corrections
}

// Get multiple autocorrect suggestions
export function getAutocorrectSuggestions(word: string): string[] {
  // Skip empty or very short
  if (!word || word.length <= 1) return []
  
  if (isLikelyCorrect(word)) {
    return []
  }

  const lowerWord = word.toLowerCase()
  
  // Check manual dictionary first
  const manualCorrection = autocorrectDictionary[lowerWord]
  if (manualCorrection && manualCorrection !== word) {
    return [manualCorrection]
  }

  // Check cache
  if (spellCheckCache.has(word)) {
    const cached = spellCheckCache.get(word)
    return cached ? [cached] : []
  }

  // Get multiple suggestions
  const corrections = generateCorrections(word)
  
  // Filter by confidence and remove duplicates
  const suggestions = corrections
    .filter(c => c.confidence >= 70)
    .map(c => c.word)
    .filter((word, index, self) => self.indexOf(word) === index)
  
  return suggestions.slice(0, 3) // Return top 3 suggestions
}

// Main autocorrect function with API support
export async function shouldAutocorrectAsync(word: string): Promise<string | null> {
  // Skip if likely correct
  if (isLikelyCorrect(word)) {
    return null
  }

  // Check manual dictionary first
  const lowerWord = word.toLowerCase()
  const manualCorrection = autocorrectDictionary[lowerWord]
  if (manualCorrection && manualCorrection !== word) {
    return manualCorrection
  }

  // Try API spell check
  try {
    const apiSuggestion = await checkSpellingAPI(word)
    if (apiSuggestion && apiSuggestion !== word) {
      return apiSuggestion
    }
  } catch (error) {
    console.warn('API spell check failed, using fallback')
  }

  // Fallback to pattern-based corrections
  const corrections = generateCorrections(word)
  if (corrections.length > 0) {
    // Return the first suggestion that's in common words
    for (const correction of corrections) {
      if (commonWords.has(correction.word.toLowerCase())) {
        return correction.word
      }
    }
  }

  return null
}

// Synchronous version (uses cache and patterns only)
export function shouldAutocorrect(word: string): string | null {
  const suggestions = getAutocorrectSuggestions(word)
  return suggestions.length > 0 ? suggestions[0] : null
}

// Additional patterns for capitalization after punctuation
export function autocorrectText(text: string): string {
  let corrected = text

  // Apply dictionary corrections
  const words = corrected.split(/\b/)
  const correctedWords = words.map(word => {
    const lowerWord = word.toLowerCase()
    return autocorrectDictionary[lowerWord] || word
  })
  corrected = correctedWords.join('')

  // Capitalize first letter of sentences (after . ! ?)
  corrected = corrected.replace(/([.!?]\s+)([a-z])/g, (match, punctuation, letter) => {
    return punctuation + letter.toUpperCase()
  })

  // Capitalize first letter of the text
  corrected = corrected.replace(/^([a-z])/, (match, letter) => {
    return letter.toUpperCase()
  })

  // Fix double spaces
  corrected = corrected.replace(/\s{2,}/g, ' ')

  return corrected
}

// Get the last word being typed
export function getLastWord(text: string, cursorPos: number): { word: string; startPos: number } {
  const textBeforeCursor = text.substring(0, cursorPos)
  const words = textBeforeCursor.split(/\s/)
  const lastWord = words[words.length - 1] || ''
  const startPos = cursorPos - lastWord.length
  
  return { word: lastWord, startPos }
}
