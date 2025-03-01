// supabase.js - Enhanced Integration with Supabase for article and comment management

// Debug mode - you can turn this off in production
const SUPABASE_DEBUG = true;

// Get the global supabase instance that was created in the inline script
let supabase;

// Initialize with global client
if (typeof window.supabase !== 'undefined') {
  console.log("Using global supabase client");
  supabase = window.supabase;
} else {
  console.error("Global supabase client not found - using fallback initialization");
  
  // Fallback initialization - this is just in case, but shouldn't be needed
  const supabaseUrl = 'https://bzznurbfcjszrvdlxabj.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6em51cmJmY2pzenJ2ZGx4YWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMDcyMzMsImV4cCI6MjA1NTc4MzIzM30.9PqT8vvFy8OxQD3Xf0eTEIIu116oaGlCPBwWdH9DlZg';
  
  try {
    // Check if the global supabase object with createClient is available
    if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
      supabase = supabase.createClient(supabaseUrl, supabaseKey);
    } else {
      console.error("CRITICAL ERROR: Supabase library not loaded correctly");
      alert("Database initialization failed. Please check console for details.");
    }
  } catch (e) {
    console.error("Exception in Supabase initialization:", e);
    alert("Database initialization failed. Please check console for details.");
  }
}

// Test the connection - enhanced with retry logic
async function testConnection(retries = 3) {
  console.log("Testing Supabase connection...");
  let currentRetry = 0;
  
  async function attemptConnection() {
    try {
      if (!supabase) {
        throw new Error("Supabase client is not initialized");
      }
      
      const { data, error } = await supabase.from('articles').select('id').limit(1);
      
      if (error) {
        console.error("Supabase connection test failed:", error);
        return false;
      }
      
      console.log("Supabase connection successful! Found", data.length, "articles");
      return true;
    } catch (e) {
      console.error("Error testing Supabase connection:", e);
      return false;
    }
  }
  
  while (currentRetry < retries) {
    const success = await attemptConnection();
    if (success) return true;
    
    currentRetry++;
    if (currentRetry < retries) {
      console.log(`Retrying connection (attempt ${currentRetry + 1}/${retries})...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
    }
  }
  
  console.error(`Failed to connect after ${retries} attempts`);
  return false;
}

// Call the test on initialization
testConnection();

/**
 * Fetch all articles from Supabase
 * @param {string} status - Optional status filter ('published' or 'draft')
 * @param {number} limit - Maximum number of articles to fetch (default: 50)
 * @returns {Promise<Array>} - Array of article objects
 */
async function fetchArticles(status = null, limit = 50) {
  try {
    if (SUPABASE_DEBUG) console.log("Fetching articles with status filter:", status);
    
    if (!supabase) {
      console.error("Cannot fetch articles - supabase is not initialized");
      return [];
    }
    
    let query = supabase.from('articles').select('*');
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query
      .order('date', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error("Error fetching articles:", error);
      return [];
    }
    
    if (SUPABASE_DEBUG) console.log("Fetched articles:", data ? data.length : 0, "results");
    
    // Process the articles to ensure all expected properties exist
    return (data || []).map(article => ({
      ...article,
      readTime: article.readTime || calculateReadTime(article.content || ''),
      imageUrl: article.imageUrl || '/api/placeholder/800/400'
    }));
  } catch (e) {
    console.error("Exception fetching articles:", e);
    return [];
  }
}

/**
 * Calculate estimated read time for an article
 * @param {string} content - Article content
 * @returns {string} - Formatted read time string
 */
function calculateReadTime(content) {
  const wordCount = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

/**
 * Fetch a single article by ID with error handling
 * @param {string} id - Article ID
 * @returns {Promise<Object|null>} - Article object or null if not found
 */
async function fetchArticleById(id) {
  try {
    if (!supabase) {
      console.error("Cannot fetch article - supabase is not initialized");
      return null;
    }
    
    if (!id) {
      console.error("Invalid article ID provided");
      return null;
    }
    
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // This is the "not found" error
        console.log(`Article with ID ${id} not found`);
        return null;
      }
      console.error("Error fetching article:", error);
      return null;
    }
    
    if (!data) {
      console.log(`Article with ID ${id} not found`);
      return null;
    }
    
    // Ensure all expected properties exist
    return {
      ...data,
      readTime: data.readTime || calculateReadTime(data.content || ''),
      imageUrl: data.imageUrl || '/api/placeholder/800/400'
    };
  } catch (e) {
    console.error("Exception fetching article:", e);
    return null;
  }
}

/**
 * Create a new article with proper validation
 * @param {Object} article - Article object
 * @returns {Promise<Object|null>} - Created article or null if failed
 */
async function createArticle(article) {
  try {
    if (SUPABASE_DEBUG) console.log("Creating article:", article);
    
    if (!supabase) {
      console.error("Cannot create article - supabase is not initialized");
      return null;
    }
    
    // Validate required fields
    if (!article.title) {
      console.error("Cannot create article - title is required");
      return null;
    }
    
    // Create a new article object with exact column names matching the database
    const newArticle = {
      id: article.id || Date.now().toString(),
      title: article.title,
      category: article.category || 'Uncategorized',
      excerpt: article.excerpt || article.title,
      content: article.content || '',
      status: article.status || 'published',
      date: new Date().toISOString(),
      imageUrl: article.imageUrl || '/api/placeholder/800/400',
      readTime: article.readTime || calculateReadTime(article.content || ''),
      showTimeline: article.showTimeline || false
    };
    
    if (SUPABASE_DEBUG) console.log("Sending to Supabase:", newArticle);
    
    const { data, error } = await supabase
      .from('articles')
      .insert([newArticle])
      .select();
    
    if (error) {
      console.error("Error creating article:", error);
      return null;
    }
    
    if (SUPABASE_DEBUG) console.log("Article created successfully:", data);
    return data[0];
  } catch (e) {
    console.error("Exception creating article:", e);
    return null;
  }
}

/**
 * Update an existing article
 * @param {string} id - Article ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} - Updated article or null if failed
 */
async function updateArticle(id, updates) {
  try {
    if (!supabase) {
      console.error("Cannot update article - supabase is not initialized");
      return null;
    }
    
    if (!id) {
      console.error("Cannot update article - article ID is required");
      return null;
    }
    
    // Map JavaScript properties directly to database columns (now matching exactly)
    const updatedFields = {
      title: updates.title,
      category: updates.category,
      excerpt: updates.excerpt,
      content: updates.content,
      status: updates.status,
      date: updates.date || new Date().toISOString(),
      imageUrl: updates.imageUrl,
      readTime: updates.readTime || (updates.content ? calculateReadTime(updates.content) : undefined),
      showTimeline: updates.showTimeline
    };
    
    // Remove undefined fields
    Object.keys(updatedFields).forEach(key => 
      updatedFields[key] === undefined && delete updatedFields[key]
    );
    
    if (SUPABASE_DEBUG) console.log("Updating article:", id, updatedFields);
    
    const { data, error } = await supabase
      .from('articles')
      .update(updatedFields)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating article:", error);
      return null;
    }
    
    if (SUPABASE_DEBUG) console.log("Article updated successfully:", data);
    return data;
  } catch (e) {
    console.error("Exception updating article:", e);
    return null;
  }
}

/**
 * Add a comment to an article with validation
 * @param {string} articleId - Article ID
 * @param {Object} comment - Comment object
 * @returns {Promise<boolean>} - Success status
 */
async function addComment(articleId, comment) {
  try {
    if (!supabase) {
      console.error("Cannot add comment - supabase is not initialized");
      return false;
    }
    
    if (!articleId) {
      console.error("Cannot add comment - article ID is required");
      return false;
    }
    
    if (!comment.content) {
      console.error("Cannot add comment - comment content is required");
      return false;
    }
    
    const newComment = {
      id: Date.now().toString(),
      article_id: articleId,
      author: comment.author || 'Guest User',
      content: comment.content,
      date: new Date().toISOString()
    };
    
    if (SUPABASE_DEBUG) console.log("Adding comment:", newComment);
    
    const { error } = await supabase
      .from('comments')
      .insert([newComment]);
    
    if (error) {
      console.error("Error adding comment:", error);
      return false;
    }
    
    if (SUPABASE_DEBUG) console.log("Comment added successfully");
    return true;
  } catch (e) {
    console.error("Error adding comment:", e);
    return false;
  }
}

/**
 * Delete an article with confirmation
 * @param {string} id - Article ID
 * @returns {Promise<boolean>} - Success status
 */
async function deleteArticle(id) {
  try {
    if (!supabase) {
      console.error("Cannot delete article - supabase is not initialized");
      return false;
    }
    
    if (!id) {
      console.error("Cannot delete article - article ID is required");
      return false;
    }
    
    if (SUPABASE_DEBUG) console.log("Deleting article:", id);
    
    // First delete associated comments
    const { error: commentsError } = await supabase
      .from('comments')
      .delete()
      .eq('article_id', id);
    
    if (commentsError) {
      console.error("Error deleting article comments:", commentsError);
      // Continue with article deletion despite comment deletion error
    }
    
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("Error deleting article:", error);
      return false;
    }
    
    if (SUPABASE_DEBUG) console.log("Article deleted successfully");
    return true;
  } catch (e) {
    console.error("Exception deleting article:", e);
    return false;
  }
}

/**
 * Fetch comments for an article
 * @param {string} articleId - Article ID
 * @returns {Promise<Array>} - Array of comment objects
 */
async function fetchComments(articleId) {
  try {
    if (!supabase) {
      console.error("Cannot fetch comments - supabase is not initialized");
      return [];
    }
    
    if (!articleId) {
      console.error("Cannot fetch comments - article ID is required");
      return [];
    }
    
    if (SUPABASE_DEBUG) console.log("Fetching comments for article:", articleId);
    
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('article_id', articleId)
      .order('date', { ascending: true });
    
    if (error) {
      console.error("Error fetching comments:", error);
      return [];
    }
    
    if (SUPABASE_DEBUG) console.log("Fetched comments:", data ? data.length : 0, "results");
    return data || [];
  } catch (e) {
    console.error("Error fetching comments:", e);
    return [];
  }
}

/**
 * Search articles by query string with improved relevance
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of matching article objects
 */
async function searchArticles(query) {
  try {
    if (!supabase) {
      console.error("Cannot search articles - supabase is not initialized");
      return [];
    }
    
    if (!query || query.trim() === '') {
      console.error("Empty search query");
      return [];
    }
    
    const trimmedQuery = query.trim();
    if (SUPABASE_DEBUG) console.log("Searching articles for:", trimmedQuery);
    
    // This searches the title, content, and excerpt columns for the query
    // Only returns published articles
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('status', 'published')
      .or(`title.ilike.%${trimmedQuery}%,content.ilike.%${trimmedQuery}%,excerpt.ilike.%${trimmedQuery}%,category.ilike.%${trimmedQuery}%`)
      .order('date', { ascending: false });
    
    if (error) {
      console.error("Error searching articles:", error);
      return [];
    }
    
    // Process the search results to add the readTime if missing
    const processedResults = (data || []).map(article => ({
      ...article,
      readTime: article.readTime || calculateReadTime(article.content || '')
    }));
    
    if (SUPABASE_DEBUG) console.log("Found articles:", processedResults.length, "results");
    return processedResults;
  } catch (e) {
    console.error("Error searching articles:", e);
    return [];
  }
}

/**
 * Get article categories with count
 * @returns {Promise<Array>} - Array of category objects with counts
 */
async function getCategories() {
  try {
    if (!supabase) {
      console.error("Cannot fetch categories - supabase is not initialized");
      return [];
    }
    
    if (SUPABASE_DEBUG) console.log("Fetching article categories");
    
    const { data, error } = await supabase
      .from('articles')
      .select('category')
      .eq('status', 'published');
    
    if (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
    
    // Process categories to get counts
    const categories = data.reduce((acc, article) => {
      const category = article.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    
    // Convert to array format
    const categoryList = Object.entries(categories).map(([name, count]) => ({
      name,
      count
    }));
    
    if (SUPABASE_DEBUG) console.log("Fetched categories:", categoryList);
    return categoryList;
  } catch (e) {
    console.error("Error fetching categories:", e);
    return [];
  }
}

// Export all functions to be used in the main app
export {
  supabase,  // Export the client itself
  testConnection,
  fetchArticles,
  fetchArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  addComment,
  fetchComments,
  searchArticles,
  getCategories,
  calculateReadTime
};
