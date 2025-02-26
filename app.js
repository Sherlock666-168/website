// app.js - Final Consolidated Version

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

const appState = { theme: localStorage.getItem('theme') || 'light' };

function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  const page = document.getElementById(pageId);
  if (page) {
    page.style.display = 'block';
    window.scrollTo(0, 0);
  } else {
    document.getElementById('home-page').style.display = 'block';
  }
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-page') === pageId) link.classList.add('active');
  });
}

function showNotification(message, type) {
  const notif = document.getElementById('notification');
  if (!notif) return;
  notif.textContent = message;
  notif.className = 'notification notification-' + type + ' show';
  setTimeout(() => { notif.classList.remove('show'); }, 3000);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function calculateReadTime(content) {
  const words = content.trim().split(/\s+/).length;
  return `${Math.ceil(words / 200)} min read`;
}

async function displayArticles() {
  try {
    // Featured Posts
    const featured = document.getElementById('featured-posts-grid');
    if (featured) {
      const articles = await fetchArticles('published');
      featured.innerHTML = articles.length ? '' : '<p class="no-articles-message">No published articles yet. Create your first article in Publish!</p>';
      articles.sort((a, b) => new Date(b.date) - new Date(a.date));
      const featuredArticles = articles.slice(0, 3);
      featuredArticles.forEach(article => {
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
        featured.appendChild(card);
      });
      setTimeout(() => { document.querySelectorAll('.post-card').forEach(c => c.classList.add('fade-in')); }, 100);
    }

    // All Blog Posts
    const allPosts = document.getElementById('all-posts-grid');
    if (allPosts) {
      const articles = await fetchArticles('published');
      allPosts.innerHTML = articles.length ? '' : '<p class="no-articles-message">No published articles yet. Create your first article in Publish!</p>';
      articles.sort((a, b) => new Date(b.date) - new Date(a.date));
      articles.forEach(article => {
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
        allPosts.appendChild(card);
      });
    }

    // My Articles (if available)
    const myArticles = document.getElementById('articles-list');
    if (myArticles) {
      const articles = await fetchArticles();
      myArticles.innerHTML = articles.length ? '' : '<p class="no-articles-message">No articles yet. Create your first article!</p>';
      articles.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'published' ? -1 : 1;
        return new Date(b.date) - new Date(a.date);
      });
      articles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'article-card';
        card.innerHTML = `
          <div class="article-image" style="background-image: url('${article.imageUrl}');"></div>
          <div class="article-details">
            <span class="article-status status-${article.status}">${article.status === 'published' ? 'Published' : 'Draft'}</span>
            <h3 class="article-title">${article.title}</h3>
            <p class="article-excerpt">${article.excerpt}</p>
            <div class="article-meta">
              ${article.status === 'published' ? `Published on: ${formatDate(article.date)}` : `Last edited: ${formatDate(article.date)}`}
            </div>
            <div class="article-actions">
              <button class="article-action-btn edit-btn" data-id="${article.id}">Edit</button>
              ${article.status === 'published' ?
                `<button class="article-action-btn view-btn" data-id="${article.id}">View</button>` :
                `<button class="article-action-btn publish-btn" data-id="${article.id}">Publish</button>`
              }
              <button class="article-action-btn delete-btn" data-id="${article.id}">Delete</button>
            </div>
          </div>
        `;
        myArticles.appendChild(card);
      });
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
  } catch (err) {
    console.error('Error displaying articles:', err);
    showNotification('Failed to load articles', 'error');
  }
}

async function loadArticle(articleId) {
  try {
    const article = await fetchArticleById(articleId);
    if (!article) {
      showNotification('Article not found', 'error');
      return;
    }
    const bp = document.querySelector('.blog-post');
    if (bp) bp.setAttribute('data-article-id', articleId);
    document.getElementById('post-category').textContent = article.category;
    document.getElementById('post-title').textContent = article.title;
    document.getElementById('post-date').textContent = formatDate(article.date);
    document.getElementById('post-read-time').textContent = article.readTime || calculateReadTime(article.content);
    document.getElementById('post-image').src = article.imageUrl;
    document.getElementById('post-content').innerHTML = article.content;
    const timeline = document.getElementById('ai-agents-timeline');
    if (timeline) timeline.style.display = article.showTimeline ? 'block' : 'none';
    const comments = await fetchComments(articleId);
    loadCommentsUI(comments);
  } catch (err) {
    console.error('Error loading article:', err);
    showNotification('Failed to load article', 'error');
  }
}

function loadCommentsUI(comments) {
  const list = document.getElementById('comments-list');
  if (!list) return;
  list.innerHTML = '';
  if (!comments || !comments.length) {
    list.innerHTML = '<p>No comments yet. Be the first to comment!</p>';
    return;
  }
  comments.forEach(comment => {
    const div = document.createElement('div');
    div.className = 'comment';
    div.innerHTML = `
      <div class="comment-header">
        <span class="comment-author">${comment.author}</span>
        <span class="comment-date">${formatDate(comment.date)}</span>
      </div>
      <div class="comment-content">${comment.content}</div>
    `;
    list.appendChild(div);
  });
}

async function addCommentHandler(articleId) {
  const txt = document.getElementById('comment-text').value.trim();
  if (!txt) {
    showNotification('Please enter a comment', 'error');
    return;
  }
  try {
    const success = await addComment(articleId, { content: txt, author: 'Guest User' });
    if (success) {
      const comments = await fetchComments(articleId);
      loadCommentsUI(comments);
      document.getElementById('comment-text').value = '';
      showNotification('Comment added successfully', 'success');
    } else {
      showNotification('Failed to add comment', 'error');
    }
  } catch (err) {
    console.error('Error adding comment:', err);
    showNotification('Failed to add comment', 'error');
  }
}

function publishArticleHandler() {
  try {
    const title = document.getElementById('article-title').value.trim();
    const category = document.getElementById('article-category').value;
    const excerpt = document.getElementById('article-excerpt').value.trim();
    const content = document.getElementById('article-content').value.trim();
    const imageUrl = document.getElementById('article-image').value || '/api/placeholder/800/400';
    const articleId = document.getElementById('article-id').value;
    if (!title || !category || !excerpt || !content) {
      showNotification('Please fill out all required fields', 'error');
      return;
    }
    const words = content.split(/\s+/).length;
    const readTime = Math.max(1, Math.ceil(words / 200)) + ' min read';
    const article = {
      id: articleId || Date.now().toString(),
      title,
      category,
      excerpt,
      content,
      imageUrl,
      readTime,
      showTimeline: false,
      status: 'published'
    };
    supabase.from('articles')
      .insert([article])
      .select()
      .then(({ data, error }) => {
        if (error) {
          showNotification('Error: ' + error.message, 'error');
          return;
        }
        showNotification('Article published successfully!', 'success');
        document.getElementById('publication-form').reset();
        const dlg = document.getElementById('success-dialog');
        if (dlg) dlg.classList.add('show');
      })
      .catch(err => {
        console.error('Exception publishing article:', err);
        showNotification('Error: ' + err.message, 'error');
      });
  } catch (e) {
    console.error('Error in publish handler:', e);
    showNotification('Error: ' + e.message, 'error');
  }
}

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
  } catch (err) {
    console.error('Error publishing draft:', err);
    showNotification('Failed to publish draft', 'error');
  }
}

async function deleteArticleHandler(id) {
  try {
    const success = await deleteArticle(id);
    if (success) {
      await displayArticles();
      showNotification('Article deleted successfully', 'success');
    } else {
      showNotification('Failed to delete article', 'error');
    }
  } catch (err) {
    console.error('Error deleting article:', err);
    showNotification('Failed to delete article', 'error');
  }
}

async function editArticle(id) {
  try {
    const article = await fetchArticleById(id);
    if (!article) {
      showNotification('Article not found', 'error');
      return;
    }
    document.querySelector('[data-tab="new-article"]').click();
    document.getElementById('article-id').value = article.id;
    document.getElementById('article-title').value = article.title;
    document.getElementById('article-category').value = article.category;
    document.getElementById('article-excerpt').value = article.excerpt;
    const cleanContent = article.content.replace(/<[^>]*>/g, '');
    document.getElementById('article-content').value = cleanContent;
    document.getElementById('article-image').value = article.imageUrl;
    document.getElementById('publish-btn').textContent = 'Update Article';
    document.getElementById('save-draft-btn').textContent = 'Save Changes as Draft';
  } catch (err) {
    console.error('Error editing article:', err);
    showNotification('Failed to load article for editing', 'error');
  }
}

function showPublishSuccessDialog(article) {
  const dlg = document.getElementById('success-dialog');
  if (!dlg) return;
  const viewBtn = document.getElementById('view-article-btn');
  const homeBtn = document.getElementById('go-home-btn');
  const closeBtn = document.getElementById('close-dialog-btn');
  viewBtn.onclick = () => {
    dlg.classList.remove('show');
    loadArticle(article.id);
    navigateTo('blog-post-page');
  };
  homeBtn.onclick = () => {
    dlg.classList.remove('show');
    navigateTo('home-page');
  };
  closeBtn.onclick = () => {
    dlg.classList.remove('show');
    document.querySelector('[data-tab="my-articles"]').click();
  };
  dlg.classList.add('show');
}

function saveDraftHandler() {
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
    const words = content.split(/\s+/).length;
    const readTime = Math.max(1, Math.ceil(words / 200)) + ' min read';
    const article = {
      id: articleId || Date.now().toString(),
      title,
      category: category || 'Uncategorized',
      excerpt: excerpt || '',
      content,
      imageUrl,
      readTime,
      showTimeline: false,
      status: 'draft'
    };
    supabase.from('articles')
      .insert([article])
      .select()
      .then(({ data, error }) => {
        if (error) {
          showNotification('Error: ' + error.message, 'error');
          return;
        }
        showNotification('Draft saved successfully!', 'success');
      })
      .catch(err => {
        console.error('Exception saving draft:', err);
        showNotification('Error: ' + err.message, 'error');
      });
  } catch (e) {
    console.error('Error in save draft handler:', e);
    showNotification('Error: ' + e.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Theme setup
  const body = document.body;
  if (appState.theme === 'dark') {
    body.setAttribute('data-theme', 'dark');
    const tt = document.getElementById('theme-toggle');
    if (tt) tt.innerHTML = '<i class="fas fa-sun"></i>';
  }
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        appState.theme = 'light';
      } else {
        body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        appState.theme = 'dark';
      }
      localStorage.setItem('theme', appState.theme);
    });
  }

  // Mobile menu setup
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuClose = document.getElementById('mobile-menu-close');
  if (mobileMenuBtn && mobileMenu && mobileMenuClose) {
    mobileMenuBtn.addEventListener('click', () => mobileMenu.classList.add('active'));
    mobileMenuClose.addEventListener('click', () => mobileMenu.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => mobileMenu.classList.remove('active'));
    });
  }

  // Tabs and category filter
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const tid = tab.getAttribute('data-tab');
      document.getElementById(`${tid}-content`).classList.add('active');
    });
  });
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-category');
      const cards = document.querySelectorAll('#all-posts-grid .post-card');
      cards.forEach(card => {
        card.style.display = (cat === 'all' || card.getAttribute('data-category') === cat) ? 'block' : 'none';
      });
    });
  });

  // Publish / Save Draft buttons
  const publishBtn = document.getElementById('publish-btn');
  if (publishBtn) {
    publishBtn.addEventListener('click', () => {
      const aId = document.getElementById('article-id').value;
      if (aId) updateArticleHandler();
      else publishArticleHandler();
    });
  }
  const saveDraftBtn = document.getElementById('save-draft-btn');
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', saveDraftHandler);
  }

  // Other forms
  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', async e => {
      e.preventDefault();
      const query = document.getElementById('search-input').value.trim();
      if (!query) return;
      try {
        const results = await searchArticles(query);
        displaySearchResults(results, query);
        if (document.getElementById('search-results-page')) navigateTo('search-results-page');
      } catch (err) {
        console.error('Error searching:', err);
        showNotification('Search failed', 'error');
      }
    });
  }
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', e => {
      e.preventDefault();
      showNotification('Thank you for subscribing to our newsletter!', 'success');
      newsletterForm.reset();
    });
  }
  const commentSubmit = document.getElementById('comment-submit');
  if (commentSubmit) {
    commentSubmit.addEventListener('click', () => {
      const aId = document.querySelector('.blog-post').getAttribute('data-article-id');
      if (aId) addCommentHandler(aId);
    });
  }

  window.addEventListener('scroll', () => {
    const els = document.querySelectorAll('.post-card:not(.fade-in), .category-card:not(.fade-in), .about-content:not(.fade-in)');
    els.forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight - 100) el.classList.add('fade-in');
    });
  });

  navigateTo('home-page');
  await displayArticles();
});
