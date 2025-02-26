// supabase.js - Integration with Supabase for article management

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

// Rest of your code remains the same...

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
    
    // Map the article object to match the database schema exactly
    // This way we only send fields that exist in the database
    const newArticle = {
      id: article.id || Date.now().toString(),
      title: article.title || 'Untitled Article',
      category: article.category || 'Uncategorized',
      excerpt: article.excerpt || '',
      content: article.content || '',
      status: article.status || 'published',
      date: new Date().toISOString(),
      imageUrl: article.imageUrl || '/api/placeholder/800/400',
      readTime: article.readTime || '3 min read',
      showTimeline: article.showTimeline || false
    };
    
    if (SUPABASE_DEBUG) console.log("Sending to Supabase:", newArticle);
    
    // First try with camelCase fields
    try {
      const { data, error } = await supabase
        .from('articles')
        .insert([newArticle])
        .select();
      
      if (error) {
        console.error("Error creating article with camelCase:", error);
        throw error; // Let the catch block handle it
      }
      
      if (SUPABASE_DEBUG) console.log("Article created successfully:", data);
      return data[0];
    } catch (camelCaseError) {
      // If camelCase fails, try snake_case as a fallback
      console.log("Trying snake_case field names as fallback");
      
      // Convert to snake_case
      const snakeCaseArticle = {
        id: newArticle.id,
        title: newArticle.title,
        category: newArticle.category,
        excerpt: newArticle.excerpt,
        content: newArticle.content,
        status: newArticle.status,
        date: newArticle.date,
        image_url: newArticle.imageUrl, // snake_case version
        read_time: newArticle.readTime, // snake_case version
        show_timeline: newArticle.showTimeline // snake_case version
      };
      
      const { data, error } = await supabase
        .from('articles')
        .insert([snakeCaseArticle])
        .select();
      
      if (error) {
        console.error("Error creating article with snake_case:", error);
        // Both camelCase and snake_case failed
        throw new Error(`Failed with both camelCase and snake_case: ${error.message}`);
      }
      
      if (SUPABASE_DEBUG) console.log("Article created successfully with snake_case:", data);
      return data[0];
    }
  } catch (e) {
    console.error("Exception creating article:", e);
    alert(`Error creating article: ${e.message}`);
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
      .eq('article_id', articleId)
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
