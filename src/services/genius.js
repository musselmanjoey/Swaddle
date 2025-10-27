import axios from 'axios';
import * as cheerio from 'cheerio';
import { WordTokenizer, SentimentAnalyzer, PorterStemmer } from 'natural';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

class GeniusService {
  constructor() {
    this.accessToken = process.env.REACT_APP_GENIUS_ACCESS_TOKEN;
    this.baseURL = 'https://api.genius.com';
    this.webBaseURL = 'https://genius.com';
    
    // Initialize sentiment analyzer
    this.tokenizer = new WordTokenizer();
    this.analyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');
    
    if (!this.accessToken) {
      console.warn('⚠️  Genius API token not configured. Lyrics analysis will be disabled.');
    }
  }

  // Search for a song on Genius
  async searchSong(title, artist) {
    if (!this.accessToken) {
      throw new Error('Genius API token not configured');
    }

    try {
      const query = `${title} ${artist}`.trim();
      const response = await axios.get(`${this.baseURL}/search`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
          // Removed User-Agent - browsers don't allow custom User-Agent headers
        },
        params: {
          q: query
        }
      });

      const hits = response.data.response.hits;
      
      // Find the best match and return array format expected by worker
      const matches = [];
      for (const hit of hits) {
        const song = hit.result;
        if (this.isGoodMatch(song, title, artist)) {
          matches.push({
            id: song.id,
            title: song.title,
            primary_artist: { name: song.primary_artist.name },
            url: song.url,
            thumbnail: song.song_art_image_thumbnail_url,
            lyrics_state: song.lyrics_state
          });
        }
      }

      console.log(`🔍 [GENIUS] Found ${matches.length} matches for "${title}" by "${artist}"`);
      return matches;
    } catch (error) {
      console.error('Genius search error:', error.response?.data || error.message);
      return []; // Return empty array on error
    }
  }

  // Check if song match is good enough
  isGoodMatch(geniusSong, searchTitle, searchArtist) {
    const normalizeText = (text) => text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const geniusTitle = normalizeText(geniusSong.title);
    const geniusArtist = normalizeText(geniusSong.primary_artist.name);
    const searchTitleNorm = normalizeText(searchTitle);
    const searchArtistNorm = normalizeText(searchArtist);

    // Check for title similarity (allow for some variation)
    const titleSimilarity = this.calculateSimilarity(geniusTitle, searchTitleNorm);
    const titleMatch = geniusTitle.includes(searchTitleNorm) || 
                      searchTitleNorm.includes(geniusTitle) ||
                      titleSimilarity > 0.6; // Lowered threshold

    // Check for artist similarity
    const artistSimilarity = this.calculateSimilarity(geniusArtist, searchArtistNorm);
    const artistMatch = geniusArtist.includes(searchArtistNorm) || 
                       searchArtistNorm.includes(geniusArtist) ||
                       artistSimilarity > 0.6; // Lowered threshold

    const isMatch = titleMatch && artistMatch;
    
    console.log(`🔍 [GENIUS] Checking "${geniusTitle}" vs "${searchTitleNorm}" (${titleSimilarity.toFixed(2)}) - Title: ${titleMatch}`);
    console.log(`🔍 [GENIUS] Checking "${geniusArtist}" vs "${searchArtistNorm}" (${artistSimilarity.toFixed(2)}) - Artist: ${artistMatch} - Overall: ${isMatch}`);

    return isMatch;
  }

  // Simple string similarity calculation
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Calculate Levenshtein distance
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Scrape lyrics from Genius web page (respecting copyright)
  async scrapeLyrics(geniusUrl) {
    try {
      const response = await axios.get(geniusUrl, {
        // Removed User-Agent - browsers don't allow custom User-Agent headers
      });

      const $ = cheerio.load(response.data);
      
      // Extract basic metadata only - we don't store full lyrics
      const title = $('h1').first().text() || '';
      const artist = $('.header_with_cover_art-primary_info-primary_artist').text() || '';
      
      // Instead of full lyrics, we analyze structure and themes
      const lyricsElements = $('[data-lyrics-container="true"], .lyrics, [class*="Lyrics__Container"]');
      
      if (lyricsElements.length === 0) {
        throw new Error('No lyrics container found');
      }

      // Extract only thematic keywords and structure for analysis
      let textForAnalysis = '';
      lyricsElements.each((i, element) => {
        textForAnalysis += $(element).text() + ' ';
      });

      // Return full analysis including lyrics text
      const analysis = this.extractThemesOnly(textForAnalysis);
      return {
        ...analysis,
        lyrics_text: textForAnalysis.trim() // Include full lyrics for hobby use
      };
    } catch (error) {
      console.error('Lyrics analysis error:', error.message);
      throw new Error(`Failed to analyze lyrics: ${error.message}`);
    }
  }

  // Extract themes without storing full lyrics (copyright compliant)
  extractThemesOnly(fullText) {
    const words = this.tokenizer.tokenize(fullText.toLowerCase());
    const themes = this.detectThemes(fullText.toLowerCase());
    
    // Calculate sentiment from keywords only
    const keyWords = words.filter(word => word.length > 3);
    const sentiment = keyWords.length > 0 ? this.analyzer.getSentiment(keyWords) : 0;
    
    // Check for explicit content markers
    const explicitWords = ['explicit', 'parental', 'advisory'];
    const hasExplicit = explicitWords.some(word => 
      fullText.toLowerCase().includes(word)
    );

    return {
      themes,
      sentiment_score: Math.max(-1, Math.min(1, sentiment)),
      word_count: words.length,
      has_explicit_content: hasExplicit,
      language: 'en'
    };
  }

  // Detect lyrical themes based on keyword patterns
  detectThemes(lyricsText) {
    const themePatterns = {
      'love': ['love', 'heart', 'kiss', 'romance', 'together', 'forever', 'baby', 'honey'],
      'heartbreak': ['broken', 'cry', 'tears', 'goodbye', 'miss', 'alone', 'hurt', 'pain'],
      'party': ['party', 'dance', 'club', 'drink', 'tonight', 'celebrate', 'fun'],
      'nostalgia': ['remember', 'memories', 'past', 'yesterday', 'childhood', 'miss', 'used to'],
      'freedom': ['free', 'escape', 'run', 'away', 'break', 'chains', 'liberty'],
      'money': ['money', 'cash', 'rich', 'poor', 'dollar', 'wealth', 'broke'],
      'family': ['mother', 'father', 'mom', 'dad', 'sister', 'brother', 'family', 'home'],
      'friendship': ['friend', 'together', 'crew', 'team', 'buddy', 'pal'],
      'struggle': ['fight', 'battle', 'hard', 'difficult', 'struggle', 'survive'],
      'hope': ['hope', 'dream', 'future', 'tomorrow', 'believe', 'faith'],
      'nature': ['sun', 'moon', 'stars', 'sky', 'ocean', 'mountain', 'tree', 'rain'],
      'city': ['city', 'street', 'downtown', 'urban', 'lights', 'traffic'],
      'spiritual': ['god', 'pray', 'heaven', 'soul', 'spirit', 'faith', 'believe'],
      'rebellion': ['rebel', 'fight', 'system', 'change', 'revolution', 'protest']
    };

    const detectedThemes = [];
    
    for (const [theme, keywords] of Object.entries(themePatterns)) {
      const matches = keywords.filter(keyword => 
        lyricsText.includes(keyword)
      ).length;
      
      // Require at least 2 keyword matches for theme detection
      if (matches >= 2) {
        detectedThemes.push(theme);
      }
    }

    return detectedThemes;
  }

  // Get song analysis (themes and sentiment only)
  async getSongAnalysis(title, artist) {
    try {
      const searchResults = await this.searchSong(title, artist);
      
      if (!searchResults || searchResults.length === 0) {
        return {
          found: false,
          error: 'Song not found on Genius',
          query: `${title} ${artist}`
        };
      }

      const bestMatch = searchResults[0];
      
      if (bestMatch.lyrics_state !== 'complete') {
        return {
          found: true,
          genius_id: bestMatch.id,
          genius_url: bestMatch.url,
          analysis: null,
          warning: 'Lyrics marked as incomplete on Genius'
        };
      }

      const analysis = await this.scrapeLyrics(bestMatch.url);

      return {
        found: true,
        genius_id: bestMatch.id,
        genius_url: bestMatch.url,
        analysis
      };
    } catch (error) {
      console.error('Song analysis error:', error.message);
      return {
        found: false,
        error: error.message,
        query: `${title} ${artist}`
      };
    }
  }

  // Batch process songs with rate limiting
  async batchProcessSongs(songs, onProgress = null, maxConcurrent = 2) {
    const results = [];
    
    for (let i = 0; i < songs.length; i++) {
      try {
        await this.delay(300); // Rate limiting
        const result = await this.getSongAnalysis(songs[i].title, songs[i].artist);
        results.push(result);
        
        if (onProgress) {
          onProgress(i + 1, songs.length);
        }
      } catch (error) {
        results.push({
          found: false,
          error: error.message,
          query: `${songs[i].title} ${songs[i].artist}`
        });
      }
    }
    
    return results;
  }

  // Utility functions
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  findSimilarThemes(song1Themes, song2Themes) {
    if (!song1Themes || !song2Themes) return [];
    return song1Themes.filter(theme => song2Themes.includes(theme));
  }

  calculateThematicSimilarity(song1Analysis, song2Analysis) {
    if (!song1Analysis || !song2Analysis) return 0;
    
    const themes1 = song1Analysis.themes || [];
    const themes2 = song2Analysis.themes || [];
    
    if (themes1.length === 0 && themes2.length === 0) return 0;
    if (themes1.length === 0 || themes2.length === 0) return 0;
    
    const commonThemes = this.findSimilarThemes(themes1, themes2);
    const totalUniqueThemes = new Set([...themes1, ...themes2]).size;
    
    const similarity = commonThemes.length / totalUniqueThemes;
    
    const sentimentDiff = Math.abs(
      (song1Analysis.sentiment_score || 0) - 
      (song2Analysis.sentiment_score || 0)
    );
    const sentimentBonus = sentimentDiff < 0.3 ? 0.1 : 0;
    
    return Math.min(1, similarity + sentimentBonus);
  }

  isConfigured() {
    return !!this.accessToken;
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      baseURL: this.baseURL,
      hasToken: !!this.accessToken
    };
  }
}

export default new GeniusService();
