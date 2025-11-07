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

// Common English words for quick validation (top 1000 most common)
const commonWords = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'student', 'students', 'class', 'teacher', 'school', 'lesson', 'homework',
  'assignment', 'test', 'exam', 'grade', 'subject', 'learning', 'education'
])

// Check if word is likely correct (exists in common words or is capitalized name)
function isLikelyCorrect(word: string): boolean {
  const lower = word.toLowerCase()
  
  // Check common words
  if (commonWords.has(lower)) return true
  
  // Proper nouns (capitalized)
  if (word.length > 1 && word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase()) {
    return true
  }
  
  // Numbers or dates
  if (/^\d+$/.test(word) || /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(word)) {
    return true
  }
  
  // Acronyms (all caps, 2-5 letters)
  if (/^[A-Z]{2,5}$/.test(word)) {
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

// Generate possible corrections based on common patterns
function generateCorrections(word: string): string[] {
  const corrections: string[] = []
  const lower = word.toLowerCase()

  // Check manual dictionary first
  if (autocorrectDictionary[lower]) {
    corrections.push(autocorrectDictionary[lower])
  }

  // Common letter swaps
  const commonSwaps: [string, string][] = [
    ['ei', 'ie'], ['ie', 'ei'],
    ['tion', 'sion'], ['sion', 'tion'],
    ['ance', 'ence'], ['ence', 'ance'],
    ['er', 're'], ['re', 'er']
  ]

  for (const [from, to] of commonSwaps) {
    if (lower.includes(from)) {
      corrections.push(lower.replace(from, to))
    }
  }

  // Double letter corrections
  const doubled = lower.replace(/(.)\1/, '$1')
  if (doubled !== lower) {
    corrections.push(doubled)
  }

  // Check against common words with Levenshtein distance
  for (const commonWord of commonWords) {
    if (Math.abs(commonWord.length - lower.length) <= 2) {
      const distance = levenshteinDistance(lower, commonWord)
      if (distance === 1 || distance === 2) {
        corrections.push(commonWord)
      }
    }
  }

  return corrections
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
      if (commonWords.has(correction.toLowerCase())) {
        return correction
      }
    }
  }

  return null
}

// Synchronous version (uses cache and patterns only)
export function shouldAutocorrect(word: string): string | null {
  if (isLikelyCorrect(word)) {
    return null
  }

  const lowerWord = word.toLowerCase()
  const correction = autocorrectDictionary[lowerWord]
  
  if (correction && correction !== word) {
    return correction
  }

  // Check cache
  if (spellCheckCache.has(word)) {
    return spellCheckCache.get(word) || null
  }

  // Quick pattern-based corrections
  const corrections = generateCorrections(word)
  for (const correction of corrections) {
    if (commonWords.has(correction.toLowerCase())) {
      return correction
    }
  }
  
  return null
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
