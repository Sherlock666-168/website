// supabase.js - Integration with Supabase for article and comment management

// Debug mode
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

// Test the connection
async function testConnection() {
  console.log("Testing Supabase connection...");
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

// Call the test
testConnection();

/**
 * Fetch all articles from Supabase
 * @param {string} status - Optional status filter ('published' or 'draft')
 * @returns {Promise<Array>} - Array of article objects
 */
async function fetchArticles(status = null) {
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
  try {
    if (!supabase) {
      console.error("Cannot fetch article - supabase is not initialized");
      return null;
    }
    
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error("Error fetching article:", error);
      return null;
    }
    
    return data;
  } catch (e) {
    console.error("Exception fetching article:", e);
    return null;
  }
}

/**
 * Create a new article
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
    
    // Create a new article object with exact column names matching the database
    // Now the JavaScript property names match exactly with the database column names
    const newArticle = {
      id: article.id || Date.now().toString(),
      title: article.title,
      category: article.category,
      excerpt: article.excerpt,
      content: article.content,
      status: article.status || 'published',
      date: new Date().toISOString(),
      imageUrl: article.imageUrl || '/api/placeholder/800/400',  // Matches exactly 
      readTime: article.readTime || '3 min read',                // Matches exactly
      showTimeline: article.showTimeline || false                // Matches exactly
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
    
    // Map JavaScript properties directly to database columns (now matching exactly)
    const updatedFields = {
      title: updates.title,
      category: updates.category,
      excerpt: updates.excerpt,
      content: updates.content,
      status: updates.status,
      date: new Date().toISOString(),
      imageUrl: updates.imageUrl,    // Now matches exactly
      readTime: updates.readTime,    // Now matches exactly
      showTimeline: updates.showTimeline  // Now matches exactly
    };
    
    // Remove undefined fields
    Object.keys(updatedFields).forEach(key => 
      updatedFields[key] === undefined && delete updatedFields[key]
    );
    
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
    
    return data;
  } catch (e) {
    console.error("Exception updating article:", e);
    return null;
  }
}

/**
 * Add a comment to an article
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
    
    const newComment = {
      id: Date.now().toString(),
      article_id: articleId,  // This matches our database column name with underscores
      author: comment.author || 'Guest User',
      content: comment.content,
      date: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('comments')
      .insert([newComment]);
    
    if (error) {
      console.error("Error adding comment:", error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error("Error adding comment:", e);
    return false;
  }
}

/**
 * Delete an article
 * @param {string} id - Article ID
 * @returns {Promise<boolean>} - Success status
 */
async function deleteArticle(id) {
  try {
    if (!supabase) {
      console.error("Cannot delete article - supabase is not initialized");
      return false;
    }
    
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("Error deleting article:", error);
      return false;
    }
    
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
    
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('article_id', articleId) // Using snake_case for column name
      .order('date', { ascending: true });
    
    if (error) {
      console.error("Error fetching comments:", error);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error("Error fetching comments:", e);
    return [];
  }
}

/**
 * Search articles by query string
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of matching article objects
 */
async function searchArticles(query) {
  try {
    if (!supabase) {
      console.error("Cannot search articles - supabase is not initialized");
      return [];
    }
    
    // This searches the title, content, and excerpt columns for the query
    // Only returns published articles
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('status', 'published')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%,category.ilike.%${query}%`)
      .order('date', { ascending: false });
    
    if (error) {
      console.error("Error searching articles:", error);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error("Error searching articles:", e);
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
  searchArticles
};
