// app.js - Main application code with Supabase integration

import {
  fetchArticles,
  fetchArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  addComment,
  fetchComments,
  searchArticles
} from './supabase.js';

/***********************************************************************
 * 1) Global state (much smaller now that we use Supabase)
 ***********************************************************************/
const appState = {
  theme: localStorage.getItem('theme') || 'light'
};

/***********************************************************************
 * 2) Basic Theme Toggle, Mobile Menu, and Navigation Router
 ***********************************************************************/
function initializeThemeAndUI() {
  const body = document.body;
  const themeToggle = document.getElementById('theme-toggle');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuClose = document.getElementById('mobile-menu-close');

  // Apply stored theme on load
  if (appState.theme === 'dark') {
    body.setAttribute('data-theme', 'dark');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }

  // Toggle theme button
  themeToggle.addEventListener('click', () => {
    if (body.getAttribute('data-theme') === 'dark') {
      body.removeAttribute('data-theme');
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
      appState.theme = 'light';
      localStorage.setItem('theme', 'light');
    } else {
      body.setAttribute('data-theme', 'dark');
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      appState.theme = 'dark';
      localStorage.setItem('theme', 'dark');
    }
  });

  // Mobile menu controls
  mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.add('active');
  });
  mobileMenuClose.addEventListener('click', () => {
    mobileMenu.classList.remove('active');
  });
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('active');
    });
  });
}

function navigateTo(pageId) {
  showPage(pageId);
}

function showPage(pageId) {
  // Hide all .page elements
  document.querySelectorAll('.page').forEach(page => {
    page.style.display = 'none';
  });
  // Show the chosen page
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.style.display = 'block';
    window.scrollTo(0, 0);
  } else {
    console.warn('Page not found:', pageId);
    // fallback to home if not found
    document.getElementById('home-page').style.display = 'block';
  }
  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-page') === pageId) {
      link.classList.add('active');
    }
  });
}

/***********************************************************************
 * 3) Utility Functions
 ***********************************************************************/
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function calculateReadTime(content) {
  // average ~200 words/min
  const wordCount = (content.match(/\b\w+\b/g) || []).length;
  const minutes = Math.ceil(wordCount / 200);
  return `${minutes} min read`;
}

function formatContentAsHtml(content) {
  let html = '';
  const paragraphs = content.split(/\n\n+/);
  paragraphs.forEach(par => {
    par = par.trim();
    if (!par) return;
    if (par.startsWith('# ')) {
      html += `<h2>${par.substring(2)}</h2>`;
    } else if (par.startsWith('## ')) {
      html += `<h3>${par.substring(3)}</h3>`;
    } else if (par.startsWith('* ') || par.startsWith('- ')) {
      html += '<ul>';
      const items = par.split(/\n/);
      items.forEach(item => {
        const trimmed = item.trim();
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          html += `<li>${trimmed.substring(2)}</li>`;
        }
      });
      html += '</ul>';
    } else if (/^\d+\.\s/.test(par)) {
      html += '<ol>';
      const items = par.split(/\n/);
      items.forEach(item => {
        const trimmed = item.trim();
        if (/^\d+\.\s/.test(trimmed)) {
          html += `<li>${trimmed.substring(trimmed.indexOf(' ') + 1)}</li>`;
        }
      });
      html += '</ol>';
    } else if (par.startsWith('>')) {
      html += `<blockquote>${par.substring(1).trim()}</blockquote>`;
    } else {
      html += `<p>${par}</p>`;
    }
  });
  return html;
}

/***********************************************************************
 * 4) Display Articles (Updated for Supabase)
 ***********************************************************************/
async function displayArticles() {
  try {
    // Featured Posts
    const featuredPostsGrid = document.getElementById('featured-posts-grid');
    if (featuredPostsGrid) {
      const publishedArticles = await fetchArticles('published');
      
      featuredPostsGrid.innerHTML = '';
      if (publishedArticles.length === 0) {
        featuredPostsGrid.innerHTML = '<p class="no-articles-message">No published articles yet. Create your first article in Publish!</p>';
      } else {
        const sortedArticles = [...publishedArticles].sort((a, b) => new Date(b.date) - new Date(a.date));
        const featured = sortedArticles.slice(0, 3);
        
        featured.forEach(article => {
          const card = document.createElement('article');
          card.className = 'post-card';
          card.innerHTML = `
            <div class="card-image" style="background-image: url('${article.imageUrl}');"></div>
            <div class="card-content">
              <span class="post-category">${article.category}</span>
              <h3 class="post-title">${article.title}</h3>
              <p class="post-excerpt">${article.excerpt}</p>
              <div class="post-meta">
                <span>${formatDate(article.date)}</span>
                <span>${article.readTime || calculateReadTime(article.content)}</span>
              </div>
            </div>
          `;
          card.addEventListener('click', () => {
            loadArticle(article.id);
            navigateTo('blog-post-page');
          });
          featuredPostsGrid.appendChild(card);
        });
        
        setTimeout(() => {
          document.querySelectorAll('.post-card').forEach(c => c.classList.add('fade-in'));
        }, 100);
      }
    }

    // All Blog List
    const allPostsGrid = document.getElementById('all-posts-grid');
    if (allPostsGrid) {
      const publishedArticles = await fetchArticles('published');
      
      allPostsGrid.innerHTML = '';
      if (publishedArticles.length === 0) {
        allPostsGrid.innerHTML = '<p class="no-articles-message">No published articles yet. Create your first article in Publish!</p>';
      } else {
        const sortedAll = [...publishedArticles].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sortedAll.forEach(article => {
          const card = document.createElement('article');
          card.className = 'post-card';
          card.setAttribute('data-category', article.category);
          card.innerHTML = `
            <div class="card-image" style="background-image: url('${article.imageUrl}');"></div>
            <div class="card-content">
              <span class="post-category">${article.category}</span>
              <h3 class="post-title">${article.title}</h3>
              <p class="post-excerpt">${article.excerpt}</p>
              <div class="post-meta">
                <span>${formatDate(article.date)}</span>
                <span>${article.readTime || calculateReadTime(article.content)}</span>
              </div>
            </div>
          `;
          card.addEventListener('click', () => {
            loadArticle(article.id);
            navigateTo('blog-post-page');
          });
          allPostsGrid.appendChild(card);
        });
      }
    }

    // My Articles Tab
    const articlesList = document.getElementById('articles-list');
    if (articlesList) {
      const allArticles = await fetchArticles(); // Get all articles including drafts
      
      articlesList.innerHTML = '';
      if (allArticles.length === 0) {
        articlesList.innerHTML = '<p class="no-articles-message">No articles yet. Create your first article!</p>';
        return;
      }
      
      // Sort: published first, then by date
      allArticles.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'published' ? -1 : 1;
        }
        return new Date(b.date) - new Date(a.date);
      });
      
      allArticles.forEach(article => {
        const aDate = formatDate(article.date);
        const card = document.createElement('div');
        card.className = 'article-card';
        card.innerHTML = `
          <div class="article-image" style="background-image: url('${article.imageUrl}');"></div>
          <div class="article-details">
            <span class="article-status status-${article.status}">${article.status === 'published' ? 'Published' : 'Draft'}</span>
            <h3 class="article-title">${article.title}</h3>
            <p class="article-excerpt">${article.excerpt}</p>
            <div class="article-meta">
              ${article.status === 'published'
                ? `Published on: ${aDate}`
                : `Last edited: ${aDate}`
              }
            </div>
            <div class="article-actions">
              <button class="article-action-btn edit-btn" data-id="${article.id}">Edit</button>
              ${article.status === 'published'
                ? `<button class="article-action-btn view-btn" data-id="${article.id}">View</button>`
                : `<button class="article-action-btn publish-btn" data-id="${article.id}">Publish</button>`
              }
              <button class="article-action-btn delete-btn" data-id="${article.id}">Delete</button>
            </div>
          </div>
        `;
        articlesList.appendChild(card);
      });

      // Attach listeners
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          editArticle(btn.getAttribute('data-id'));
        });
      });
      
      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          loadArticle(btn.getAttribute('data-id'));
          navigateTo('blog-post-page');
        });
      });
      
      document.querySelectorAll('.publish-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          publishDraft(btn.getAttribute('data-id'));
        });
      });
      
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.stopPropagation();
          if (confirm('Are you sure you want to delete this article?')) {
            await deleteArticleHandler(btn.getAttribute('data-id'));
          }
        });
      });
    }
  } catch (error) {
    console.error('Error displaying articles:', error);
    showNotification('Failed to load articles', 'error');
  }
}

/***********************************************************************
 * 5) Article Operations (Updated for Supabase)
 ***********************************************************************/

// Load Single Article
async function loadArticle(articleId) {
  try {
    const article = await fetchArticleById(articleId);
    
    if (!article) {
      showNotification('Article not found', 'error');
      return;
    }
    
    // Set data-article-id for the comments to know which article
    const blogPost = document.querySelector('.blog-post');
    if (blogPost) {
      blogPost.setAttribute('data-article-id', articleId);
    }
    
    // Populate
    document.getElementById('post-category').textContent = article.category;
    document.getElementById('post-title').textContent = article.title;
    document.getElementById('post-date').textContent = formatDate(article.date);
    document.getElementById('post-read-time').textContent = article.readTime || calculateReadTime(article.content);
    document.getElementById('post-image').src = article.imageUrl;
    document.getElementById('post-content').innerHTML = article.content;
    
    // Timeline show/hide
    const timeline = document.getElementById('ai-agents-timeline');
    if (timeline) {
      timeline.style.display = article.showTimeline ? 'block' : 'none';
    }
    
    // Load comments
    const comments = await fetchComments(articleId);
    loadCommentsUI(comments);
  } catch (error) {
    console.error('Error loading article:', error);
    showNotification('Failed to load article', 'error');
  }
}

// Load comments for an article
function loadCommentsUI(comments) {
  const commentsList = document.getElementById('comments-list');
  if (!commentsList) return;
  
  commentsList.innerHTML = '';
  if (!comments || comments.length === 0) {
    commentsList.innerHTML = '<p>No comments yet. Be the first to comment!</p>';
    return;
  }
  
  comments.forEach(comment => {
    const cEl = document.createElement('div');
    cEl.className = 'comment';
    cEl.innerHTML = `
      <div class="comment-header">
        <span class="comment-author">${comment.author}</span>
        <span class="comment-date">${formatDate(comment.date)}</span>
      </div>
      <div class="comment-content">
        ${comment.content}
      </div>
    `;
    commentsList.appendChild(cEl);
  });
}

// Add a new comment
async function addCommentHandler(articleId) {
  const commentText = document.getElementById('comment-text').value.trim();
  
  if (!commentText) {
    showNotification('Please enter a comment', 'error');
    return;
  }
  
  try {
    const commentObj = {
      content: commentText,
      author: 'Guest User'
    };
    
    const success = await addComment(articleId, commentObj);
    
    if (success) {
      const comments = await fetchComments(articleId);
      loadCommentsUI(comments);
      document.getElementById('comment-text').value = '';
      showNotification('Comment added successfully', 'success');
    } else {
      showNotification('Failed to add comment', 'error');
    }
  } catch (error) {
    console.error('Error adding comment:', error);
    showNotification('Failed to add comment', 'error');
  }
}

// Publish an article
async function publishArticleHandler() {
  try {
    const title = document.getElementById('article-title').value.trim();
    const category = document.getElementById('article-category').value;
    const excerpt = document.getElementById('article-excerpt').value.trim();
    const content = document.getElementById('article-content').value.trim();
    const imageUrl = document.getElementById('article-image').value || '/api/placeholder/800/400';
    
    if (!title || !category || !excerpt || !content) {
      showNotification('Please fill out all required fields', 'error');
      return;
    }
    
    const readTime = calculateReadTime(content);
    
    const newArticle = {
      title,
      category,
      excerpt,
      content: formatContentAsHtml(content),
      imageUrl,
      status: 'published',
      readTime,
      showTimeline: false
    };
    
    const createdArticle = await createArticle(newArticle);
    
    if (createdArticle) {
      // Reset form
      document.getElementById('article-title').value = '';
      document.getElementById('article-category').value = '';
      document.getElementById('article-excerpt').value = '';
      document.getElementById('article-content').value = '';
      document.getElementById('article-image').value = '';
      
      await displayArticles();
      showPublishSuccessDialog(createdArticle);
    } else {
      showNotification('Failed to publish article', 'error');
    }
  } catch (error) {
    console.error('Error publishing article:', error);
    showNotification('Failed to publish article', 'error');
  }
}

// Publish a draft
async function publishDraft(id) {
  try {
    const success = await updateArticle(id, { status: 'published' });
    
    if (success) {
      await displayArticles();
      const article = await fetchArticleById(id);
      showPublishSuccessDialog(article);
    } else {
      showNotification('Failed to publish draft', 'error');
    }
  } catch (error) {
    console.error('Error publishing draft:', error);
    showNotification('Failed to publish draft', 'error');
  }
}

// Delete article
async function deleteArticleHandler(id) {
  try {
    const success = await deleteArticle(id);
    
    if (success) {
      await displayArticles();
      showNotification('Article deleted successfully', 'success');
    } else {
      showNotification('Failed to delete article', 'error');
    }
  } catch (error) {
    console.error('Error deleting article:', error);
    showNotification('Failed to delete article', 'error');
  }
}

// Edit an article
async function editArticle(id) {
  try {
    const article = await fetchArticleById(id);
    
    if (!article) {
      showNotification('Article not found', 'error');
      return;
    }
    
    // Switch to New Article tab
    document.querySelector('[data-tab="new-article"]').click();
    
    // Fill form
    document.getElementById('article-id').value = article.id;
    document.getElementById('article-title').value = article.title;
    document.getElementById('article-category').value = article.category;
    document.getElementById('article-excerpt').value = article.excerpt;
    
    // Remove HTML tags from content for editing
    const cleanContent = article.content.replace(/<[^>]*>/g, '');
    document.getElementById('article-content').value = cleanContent;
    document.getElementById('article-image').value = article.imageUrl;
    
    // Update button text
    document.getElementById('publish-btn').textContent = 'Update Article';
    document.getElementById('save-draft-btn').textContent = 'Save Changes as Draft';
  } catch (error) {
    console.error('Error editing article:', error);
    showNotification('Failed to load article for editing', 'error');
  }
}

// Show notification
function showNotification(message, type) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = 'notification';
  notification.classList.add(`notification-${type}`);
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Success dialog after publishing
function showPublishSuccessDialog(article) {
  const successDialog = document.getElementById('success-dialog');
  const viewButton = document.getElementById('view-article-btn');
  const homeButton = document.getElementById('go-home-btn');
  const closeButton = document.getElementById('close-dialog-btn');
  
  viewButton.onclick = () => {
    successDialog.classList.remove('show');
    loadArticle(article.id);
    navigateTo('blog-post-page');
  };
  
  homeButton.onclick = () => {
    successDialog.classList.remove('show');
    navigateTo('home-page');
  };
  
  closeButton.onclick = () => {
    successDialog.classList.remove('show');
    document.querySelector('[data-tab="my-articles"]').click();
  };
  
  successDialog.classList.add('show');
}

// Save draft
async function saveDraftHandler() {
  try {
    const title = document.getElementById('article-title').value.trim();
    const category = document.getElementById('article-category').value;
    const excerpt = document.getElementById('article-excerpt').value.trim();
    const content = document.getElementById('article-content').value.trim();
    const imageUrl = document.getElementById('article-image').value || '/api/placeholder/800/400';
    const articleId = document.getElementById('article-id').value;
    
    if (!title) {
      showNotification('Please enter a title for your article', 'error');
      return;
    }
    
    if (articleId) {
      // Update existing
      const success = await updateArticle(articleId, {
        title,
        category,
        excerpt,
        content: formatContentAsHtml(content),
        imageUrl,
        status: 'draft'
      });
      
      if (!success) {
        showNotification('Failed to update draft', 'error');
        return;
      }
    } else {
      // New draft
      const newDraft = {
        title,
        category,
        excerpt,
        content: formatContentAsHtml(content),
        imageUrl,
        status: 'draft'
      };
      
      const result = await createArticle(newDraft);
      
      if (!result) {
        showNotification('Failed to save draft', 'error');
        return;
      }
    }
    
    // Reset form
    document.getElementById('article-id').value = '';
    document.getElementById('article-title').value = '';
    document.getElementById('article-category').value = '';
    document.getElementById('article-excerpt').value = '';
    document.getElementById('article-content').value = '';
    document.getElementById('article-image').value = '';
    document.getElementById('publish-btn').textContent = 'Publish Article';
    document.getElementById('save-draft-btn').textContent = 'Save as Draft';
    
    await displayArticles();
    document.querySelector('[data-tab="my-articles"]').click();
    showNotification('Article saved as draft', 'success');
  } catch (error) {
    console.error('Error saving draft:', error);
    showNotification('Failed to save draft', 'error');
  }
}

// Update article
async function updateArticleHandler() {
  try {
    const articleId = document.getElementById('article-id').value;
    
    if (!articleId) {
      // If no ID, it's a new article
      await publishArticleHandler();
      return;
    }
    
    const title = document.getElementById('article-title').value.trim();
    const category = document.getElementById('article-category').value;
    const excerpt = document.getElementById('article-excerpt').value.trim();
    const content = document.getElementById('article-content').value.trim();
    const imageUrl = document.getElementById('article-image').value || '/api/placeholder/800/400';
    
    if (!title || !category || !excerpt || !content) {
      showNotification('Please fill out all required fields', 'error');
      return;
    }
    
    const readTime = calculateReadTime(content);
    
    const updates = {
      title,
      category,
      excerpt,
      content: formatContentAsHtml(content),
      imageUrl,
      status: 'published',
      readTime
    };
    
    const updated = await updateArticle(articleId, updates);
    
    if (updated) {
      // Reset form
      document.getElementById('article-id').value = '';
      document.getElementById('article-title').value = '';
      document.getElementById('article-category').value = '';
      document.getElementById('article-excerpt').value = '';
      document.getElementById('article-content').value = '';
      document.getElementById('article-image').value = '';
      document.getElementById('publish-btn').textContent = 'Publish Article';
      document.getElementById('save-draft-btn').textContent = 'Save as Draft';
      
      await displayArticles();
      showPublishSuccessDialog(updated);
    } else {
      showNotification('Failed to update article', 'error');
    }
  } catch (error) {
    console.error('Error updating article:', error);
    showNotification('Failed to update article', 'error');
  }
}

/***********************************************************************
 * 6) Category Filtering & Search
 ***********************************************************************/

// Category Filtering
function setupCategoryFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const category = btn.getAttribute('data-category');
      const cards = document.querySelectorAll('#all-posts-grid .post-card');
      cards.forEach(card => {
        if (category === 'all' || card.getAttribute('data-category') === category) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
  
  // For category links
  document.querySelectorAll('[data-category]').forEach(link => {
    if (link.tagName === 'A') { 
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = link.getAttribute('data-category');
        filterCategory(cat);
      });
    }
  });
}

function filterCategory(category) {
  navigateTo('blog-list-page');
  setTimeout(() => {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(b => {
      if (b.getAttribute('data-category') === category) {
        b.click();
      }
    });
  }, 100);
}

// Search Results display
async function displaySearchResults(results, query) {
  const searchResultsList = document.getElementById('search-results-list');
  const searchQuery = document.getElementById('search-query');
  
  if (searchQuery) {
    searchQuery.textContent = query;
  }
  
  if (searchResultsList) {
    searchResultsList.innerHTML = '';
    
    if (results.length === 0) {
      searchResultsList.innerHTML = '<p>No results found for your search. Please try different keywords.</p>';
      return;
    }
    
    results.forEach(article => {
      const div = document.createElement('div');
      div.className = 'search-result-item';
      div.innerHTML = `
        <span class="search-result-category">${article.category}</span>
        <h3 class="search-result-title">${article.title}</h3>
        <p class="search-result-excerpt">${article.excerpt}</p>
        <div class="search-result-meta">
          <span>${formatDate(article.date)}</span>
          <span>${article.readTime || calculateReadTime(article.content)}</span>
        </div>
      `;
      div.addEventListener('click', () => {
        loadArticle(article.id);
        navigateTo('blog-post-page');
      });
      searchResultsList.appendChild(div);
    });
  }
}

/***********************************************************************
 * 7) UI Components
 ***********************************************************************/

// Tab Functionality
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  if (tabs.length > 0) {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(`${tabId}-content`).classList.add('active');
      });
    });
  }
}

// Fade In on Scroll
function fadeInOnScroll() {
  const elements = document.querySelectorAll('.post-card:not(.fade-in), .category-card:not(.fade-in), .about-content:not(.fade-in)');
  elements.forEach(el => {
    const top = el.getBoundingClientRect().top;
    const screenPosition = window.innerHeight;
    if (top < screenPosition - 100) {
      el.classList.add('fade-in');
    }
  });
}

/***********************************************************************
 * 8) Event Listeners & Initialization
 ***********************************************************************/
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize UI elements first
  initializeThemeAndUI();
  setupTabs();
  setupCategoryFilter();
  
  // Set up navigation
  document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const pageId = link.getAttribute('data-page');
      navigateTo(pageId);
    });
  });
  
  // Default to home page
  navigateTo('home-page');
  
  // Load data from Supabase
  await displayArticles();
  
  // Search form
  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', async e => {
      e.preventDefault();
      const query = document.getElementById('search-input').value.trim();
      if (!query) return;
      
      try {
        const results = await searchArticles(query);
        displaySearchResults(results, query);
        // Navigate to a search results page if you have one
        // or create a modal to display results
        if (document.getElementById('search-results-page')) {
          navigateTo('search-results-page');
        }
      } catch (error) {
        console.error('Error searching:', error);
        showNotification('Search failed', 'error');
      }
    });
  }
  
  // Newsletter form
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', e => {
      e.preventDefault();
      showNotification('Thank you for subscribing to our newsletter!', 'success');
      newsletterForm.reset();
    });
  }
  
  // Comment submission
  const commentSubmit = document.getElementById('comment-submit');
  if (commentSubmit) {
    commentSubmit.addEventListener('click', () => {
      const articleId = document.querySelector('.blog-post').getAttribute('data-article-id');
      if (articleId) {
        addCommentHandler(articleId);
      }
    });
  }
  
  // Save as draft
  const saveDraftBtn = document.getElementById('save-draft-btn');
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', () => {
      saveDraftHandler();
    });
  }
  
  // Publish
  const publishBtn = document.getElementById('publish-btn');
  if (publishBtn) {
    publishBtn.addEventListener('click', () => {
      const articleId = document.getElementById('article-id').value;
      if (articleId) {
        updateArticleHandler();
      } else {
        publishArticleHandler();
      }
    });
  }
  
  // Animate on scroll
  window.addEventListener('scroll', fadeInOnScroll);
  fadeInOnScroll();
});
