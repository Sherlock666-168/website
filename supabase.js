// supabase.js - Integration with Supabase for article management

// Supabase client initialization - CORRECT VERSION FOR CDN
const supabaseUrl = 'https://bzznurbfcjszrvdlxabj.supabase.co';  // Replace with your URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6em51cmJmY2pzenJ2ZGx4YWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMDcyMzMsImV4cCI6MjA1NTc4MzIzM30.9PqT8vvFy8OxQD3Xf0eTEIIu116oaGlCPBwWdH9DlZg';  // Replace with your key
const supabase = supabaseClient.createClient(supabaseUrl, supabaseKey);

/**
 * Fetch all articles from Supabase
 * @param {string} status - Optional status filter ('published' or 'draft')
 * @returns {Promise<Array>} - Array of article objects
 */
async function fetchArticles(status = null) {
  let query = supabase.from('articles').select('*');
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query.order('date', { ascending: false });
  
  if (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
  
  return data || [];
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
  // Ensure we have a unique ID and current date
  const newArticle = {
    ...article,
    id: article.id || Date.now().toString(),
    date: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('articles')
    .insert([newArticle])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating article:', error);
    return null;
  }
  
  return data;
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