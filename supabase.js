// supabase.js - Integration with Supabase for article management

// Supabase client initialization - CORRECT VERSION FOR CDN
const supabaseUrl = 'https://bzznurbfcjszrvdlxabj.supabase.co';  // Replace with your URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6em51cmJmY2pzenJ2ZGx4YWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMDcyMzMsImV4cCI6MjA1NTc4MzIzM30.9PqT8vvFy8OxQD3Xf0eTEIIu116oaGlCPBwWdH9DlZg';  // Replace with your key
// const supabase = supabaseClient.createClient(supabaseUrl, supabaseKey);


let supabase;
try {
  if (SUPABASE_DEBUG) console.log("Initializing Supabase client with:", { url: supabaseUrl, keyLength: supabaseKey.length });
  
  // Check if using the global client from CDN or module import
  if (typeof supabaseClient !== 'undefined') {
    if (SUPABASE_DEBUG) console.log("Using global supabaseClient from CDN");
    supabase = supabaseClient.createClient(supabaseUrl, supabaseKey);
  } else if (typeof createClient !== 'undefined') {
    if (SUPABASE_DEBUG) console.log("Using imported createClient function");
    supabase = createClient(supabaseUrl, supabaseKey);
  } else {
    throw new Error("Neither supabaseClient nor createClient is available");
  }
  
  // Test the connection immediately
  (async function() {
    try {
      if (SUPABASE_DEBUG) console.log("Testing Supabase connection...");
      const { data, error } = await supabase.from('articles').select('id').limit(1);
      
      if (error) {
        console.error("Supabase connection test failed:", error);
        alert("Database connection error: " + error.message);
      } else {
        console.log("Supabase connection successful! Found", data.length, "articles");
      }
    } catch (e) {
      console.error("Error testing Supabase connection:", e);
    }
  })();
  
} catch (e) {
  console.error("Error initializing Supabase client:", e);
}


/**
 * Fetch all articles from Supabase
 * @param {string} status - Optional status filter ('published' or 'draft')
 * @returns {Promise<Array>} - Array of article objects
 */
async function fetchArticles(status = null) {
  try {
    if (SUPABASE_DEBUG) console.log("Fetching articles with status filter:", status);
    
    let query = supabase.from('articles').select('*');
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) {
      console.error("Error fetching articles:", error);
      return [];
    }
    
    if (SUPABASE_DEBUG) console.log("Fetched articles:", data ? data.length : 0, "results");
    return data || [];
  } catch (e) {
    console.error("Exception fetching articles:", e);
    return [];
  }
}
/**
 * Fetch a single article by ID
 * @param {string} id - Article ID
 * @returns {Promise<Object|null>} - Article object or null if not found
 */
async function fetchArticleById(id) {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching article:', error);
    return null;
  }
  
  return data;
}

/**
 * Create a new article
 * @param {Object} article - Article object
 * @returns {Promise<Object|null>} - Created article or null if failed
 */

async function createArticle(article) {
  try {
    if (SUPABASE_DEBUG) console.log("Creating article:", article);
    
    // Ensure we have a unique ID and current date
    const newArticle = {
      ...article,
      id: article.id || Date.now().toString(),
      date: new Date().toISOString()
    };
    
    // Log the exact payload being sent
    if (SUPABASE_DEBUG) console.log("Sending to Supabase:", newArticle);
    
    const { data, error } = await supabase
      .from('articles')
      .insert([newArticle])
      .select();
    
    if (error) {
      console.error("Error creating article:", error);
      // Show user feedback
      if (typeof showNotification === 'function') {
        showNotification('Failed to save article: ' + error.message, 'error');
      } else {
        alert('Failed to save article: ' + error.message);
      }
      return null;
    }
    
    if (SUPABASE_DEBUG) console.log("Article created successfully:", data);
    return data[0];
  } catch (e) {
    console.error("Exception creating article:", e);
    // Show user feedback
    if (typeof showNotification === 'function') {
      showNotification('Error: ' + e.message, 'error');
    } else {
      alert('Error: ' + e.message);
    }
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
  // Always update the date when article is modified
  const updatedFields = {
    ...updates,
    date: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('articles')
    .update(updatedFields)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating article:', error);
    return null;
  }
  
  return data;
}

/**
 * Delete an article
 * @param {string} id - Article ID
 * @returns {Promise<boolean>} - Success status
 */
async function deleteArticle(id) {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting article:', error);
    return false;
  }
  
  return true;
}

/**
 * Add a comment to an article
 * @param {string} articleId - Article ID
 * @param {Object} comment - Comment object
 * @returns {Promise<boolean>} - Success status
 */
async function addComment(articleId, comment) {
  const newComment = {
    article_id: articleId,
    id: Date.now().toString(),
    author: comment.author || 'Guest User',
    content: comment.content,
    date: new Date().toISOString()
  };
  
  const { error } = await supabase
    .from('comments')
    .insert([newComment]);
  
  if (error) {
    console.error('Error adding comment:', error);
    return false;
  }
  
  return true;
}

/**
 * Fetch comments for an article
 * @param {string} articleId - Article ID
 * @returns {Promise<Array>} - Array of comment objects
 */
async function fetchComments(articleId) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('article_id', articleId)
    .order('date', { ascending: true });
  
  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Search articles by query string
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of matching article objects
 */
async function searchArticles(query) {
  // This searches the title, content, and excerpt columns for the query
  // Only returns published articles
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%,category.ilike.%${query}%`)
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error searching articles:', error);
    return [];
  }
  
  return data || [];
}

// Export all functions to be used in the main app
export {
  fetchArticles,
  fetchArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  addComment,
  fetchComments,
  searchArticles
};
